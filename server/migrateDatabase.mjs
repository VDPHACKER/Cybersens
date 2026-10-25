// Migration des données d'une base PostgreSQL vers une autre (ex. Neon → Supabase). Voir docs/MIGRATION-BASE.md.
//
//   SOURCE_DATABASE_URL=…  TARGET_DATABASE_URL=…  npm run db:migrate-data -- --check   (lecture seule, aucune écriture)
//   SOURCE_DATABASE_URL=…  TARGET_DATABASE_URL=…  npm run db:migrate-data              (copie)
//
// La source n'est jamais modifiée. La cible doit être une base VIDE : le schéma de l'application y est créé
// automatiquement, puis les données sont copiées en une seule transaction (tout ou rien).
import { copyData } from './migrateData.mjs';
import { loadCa, pgConnectionConfig } from './dbSsl.mjs';

const source = process.env.SOURCE_DATABASE_URL;
const target = process.env.TARGET_DATABASE_URL;
const checkOnly = process.argv.includes('--check');

if (!source || !target) {
  console.error(
    'Définissez SOURCE_DATABASE_URL (base actuelle) et TARGET_DATABASE_URL (nouvelle base, vide).',
  );
  process.exit(1);
}
if (source === target) {
  console.error('La source et la cible sont identiques : refus.');
  process.exit(1);
}

const hostOf = (url) => new URL(url).host; // jamais le mot de passe dans les messages

// Adresses incomplètes (emplacement « [...] » encore présent, texte qui n'est pas une adresse) : message clair
for (const [name, value] of [
  ['SOURCE_DATABASE_URL', source],
  ['TARGET_DATABASE_URL', target],
]) {
  let valid = !/\[[^\]]*\]/.test(value);
  try {
    new URL(value);
  } catch {
    valid = false;
  }
  if (!valid) {
    console.error(
      `${name} est incomplète : remplacez l'emplacement entre crochets par la vraie adresse (voir docs/MIGRATION-BASE.md).`,
    );
    process.exit(1);
  }
}

const { default: pg } = await import('pg');
// Certificat d'autorité propre à chaque base (ex. TARGET_DATABASE_CA_CERT_FILE pour Supabase), jamais de TLS désactivé
const caOf = (label) =>
  loadCa(process.env, label === 'source' ? 'SOURCE_DATABASE' : 'TARGET_DATABASE');
const connect = async (url, label) => {
  const client = new pg.Client({
    ...pgConnectionConfig(url, caOf(label)),
    connectionTimeoutMillis: 30_000,
  });
  try {
    await client.connect();
  } catch (err) {
    console.error(`Connexion impossible à la ${label} (${hostOf(url)}) : ${err.message}`);
    process.exit(1);
  }
  return client;
};

const counts = async (client) => {
  const tables = (
    await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    )
  ).rows.map((r) => r.table_name);
  const out = {};
  for (const t of tables)
    out[t] = Number((await client.query(`SELECT COUNT(*) AS n FROM "${t}"`)).rows[0].n);
  return out;
};

console.log(`Source : ${hostOf(source)}`);
console.log(`Cible  : ${hostOf(target)}`);

if (checkOnly) {
  const src = await connect(source, 'source');
  const dst = await connect(target, 'cible');
  console.log('\nContenu actuel de la source (lecture seule) :');
  console.table(await counts(src));
  console.log('Contenu actuel de la cible :');
  console.table(await counts(dst));
  await src.end();
  await dst.end();
  console.log('Vérification terminée : rien n’a été écrit.');
  process.exit(0);
}

// Crée le schéma de l'application dans la cible (migrations), sans y mettre de données
process.env.DATABASE_URL = target;
for (const suffix of ['CA_CERT', 'CA_CERT_FILE'])
  if (process.env[`TARGET_DATABASE_${suffix}`])
    process.env[`DATABASE_${suffix}`] = process.env[`TARGET_DATABASE_${suffix}`];
const { closeDb } = await import('./db.mjs');
await closeDb();

const src = await connect(source, 'source');
const dst = await connect(target, 'cible');
try {
  console.log('\nCopie en cours (source en lecture seule)…');
  const report = await copyData(src, dst);
  const total = report.tables.reduce((n, t) => n + t.rows, 0);
  console.log(
    `\nTerminé : ${total} lignes copiées dans ${report.tables.length} tables. La source est intacte.`,
  );
  console.log(
    'Étape suivante : définir DATABASE_URL sur la cible, puis redéployer (gardez le même CERT_SECRET).',
  );
} catch (err) {
  console.error(`\nÉchec : ${err.message}`);
  console.error(
    'La cible a été laissée telle quelle (copie annulée) et la source n’a pas été touchée.',
  );
  process.exitCode = 1;
} finally {
  await src.end();
  await dst.end();
}
