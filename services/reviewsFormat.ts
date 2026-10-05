// Libellé du nombre de membres (fonction pure : testable sans navigateur).
export const membersLabel = (count: number, lang: string): string => {
  const n = new Intl.NumberFormat(
    lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR',
  ).format(count);
  const one = count <= 1;
  if (lang === 'en') return `${n} registered member${one ? '' : 's'}`;
  if (lang === 'es') return `${n} miembro${one ? '' : 's'} registrado${one ? '' : 's'}`;
  return `${n} membre${one ? '' : 's'} inscrit${one ? '' : 's'}`;
};
