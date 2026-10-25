// Copie complète des données d'une base PostgreSQL vers une autre (ex. Neon → Supabase).
//  - La source n'est JAMAIS modifiée : une seule transaction en lecture seule, uniquement des SELECT.
//  - La cible doit être vide (schéma de l'application déjà créé) : rien n'y est écrasé ni supprimé.
//  - Tout ou rien : la copie se fait dans une transaction, annulée en cas d'erreur ou d'écart de comptage.
//  - Les identifiants sont conservés ; les séquences sont relancées après le plus grand.
// `src` et `dst` sont des connexions uniques exposant `query(sql, params)` (un client `pg` ou un PGlite).

const quote = (name) => `"${String(name).replaceAll('"', '""')}"`;
const EXCLUDED_TABLES = new Set(['schema_migrations']);

const listTables = async (db) =>
  (
    await db.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    )
  ).rows.map((r) => r.table_name);

const listColumns = async (db, table) =>
  (
    await db.query(
      `SELECT column_name, is_identity FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [table],
    )
  ).rows.map((r) => ({ name: r.column_name, identity: r.is_identity === 'YES' }));

const countRows = async (db, table) =>
  Number((await db.query(`SELECT COUNT(*) AS n FROM ${quote(table)}`)).rows[0].n);

/** Tables triées pour que chaque table parente soit copiée avant celles qui la référencent (clés étrangères). */
const sortByDependencies = async (db, tables) => {
  const { rows } = await db.query(
    `SELECT c.relname AS child, p.relname AS parent
     FROM pg_constraint k
     JOIN pg_class c ON c.oid = k.conrelid
     JOIN pg_class p ON p.oid = k.confrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE k.contype = 'f' AND n.nspname = 'public'`,
  );
  const wanted = new Set(tables);
  const parents = new Map(tables.map((t) => [t, new Set()]));
  for (const { child, parent } of rows)
    if (child !== parent && wanted.has(child) && wanted.has(parent)) parents.get(child).add(parent);
  const ordered = [];
  const pending = new Set(tables);
  while (pending.size) {
    const ready = [...pending].filter((t) => [...parents.get(t)].every((p) => !pending.has(p)));
    const batch = ready.length ? ready : [...pending]; // cycle improbable : on avance quand même
    for (const t of batch) {
      ordered.push(t);
      pending.delete(t);
    }
  }
  return ordered;
};

export const copyData = async (src, dst, { log = console.log } = {}) => {
  const srcTables = await listTables(src);
  const dstTables = new Set(await listTables(dst));
  const missing = srcTables.filter((t) => !EXCLUDED_TABLES.has(t) && !dstTables.has(t));
  for (const t of missing)
    log(`Attention : la table « ${t} » n'existe pas dans la cible, elle ne sera pas copiée.`);
  const tables = await sortByDependencies(
    dst,
    srcTables.filter((t) => !EXCLUDED_TABLES.has(t) && dstTables.has(t)),
  );

  // La cible doit être vide : on ne touche jamais à des données déjà présentes
  for (const t of tables) {
    const n = await countRows(dst, t);
    if (n > 0)
      throw new Error(
        `La base cible contient déjà des données (table « ${t} » : ${n} lignes). Rien n'a été copié ni modifié : utilisez une base cible vide.`,
      );
  }

  const report = { ok: false, tables: [] };
  await src.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); // photo cohérente, aucune écriture possible
  await dst.query('BEGIN');
  try {
    let sourceLacksVerification = false;
    for (const table of tables) {
      const srcCols = await listColumns(src, table);
      const dstCols = await listColumns(dst, table);
      const common = dstCols.filter((c) => srcCols.some((s) => s.name === c.name));
      if (table === 'users' && !srcCols.some((c) => c.name === 'email_verified_at'))
        sourceLacksVerification = true;
      const hasIdentity = common.some((c) => c.identity);
      const names = common.map((c) => quote(c.name)).join(', ');
      const { rows } = await src.query(`SELECT ${names} FROM ${quote(table)}`);

      const perBatch = Math.max(1, Math.min(500, Math.floor(60_000 / common.length)));
      for (let i = 0; i < rows.length; i += perBatch) {
        const chunk = rows.slice(i, i + perBatch);
        const params = [];
        const tuples = chunk.map((row) => {
          const slots = common.map((c) => {
            params.push(row[c.name]);
            return `$${params.length}`;
          });
          return `(${slots.join(', ')})`;
        });
        await dst.query(
          `INSERT INTO ${quote(table)} (${names}) ${hasIdentity ? 'OVERRIDING SYSTEM VALUE ' : ''}VALUES ${tuples.join(', ')}`,
          params,
        );
      }
      for (const c of common.filter((x) => x.identity))
        await dst.query(
          `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE(MAX(${quote(c.name)}), 1), MAX(${quote(c.name)}) IS NOT NULL) FROM ${quote(table)}`,
          [quote(table), c.name],
        );
      report.tables.push({ name: table, rows: rows.length });
      log(`  ${table} : ${rows.length} lignes copiées`);
    }

    // Une source antérieure à la confirmation d'e-mail : ses comptes existent déjà, ils restent confirmés
    if (sourceLacksVerification) {
      await dst.query(
        'UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL',
      );
      log('  comptes existants marqués comme confirmés (source sans confirmation d’e-mail)');
    }

    // Contrôle final : mêmes nombres de lignes des deux côtés, sinon tout est annulé
    for (const { name, rows } of report.tables) {
      const copied = await countRows(dst, name);
      if (copied !== rows)
        throw new Error(
          `Écart de comptage sur « ${name} » : ${rows} à la source, ${copied} copiées.`,
        );
    }
    await dst.query('COMMIT');
    report.ok = true;
  } catch (err) {
    await dst.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await src.query('ROLLBACK').catch(() => {}); // fin de la lecture seule, rien à valider
  }
  return report;
};
