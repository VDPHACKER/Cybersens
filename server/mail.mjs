// Envoi d'e-mails transactionnels (réinitialisation de mot de passe) via une API HTTPS : Brevo ou Resend.
// Les ports SMTP sont bloqués sur plusieurs hébergeurs gratuits (Render) : on n'utilise donc que des API HTTPS.
//  - Brevo  : BREVO_API_KEY (offre gratuite, 300 e-mails/jour, un expéditeur validé par e-mail suffit)
//  - Resend : RESEND_API_KEY (exige un nom de domaine vérifié)
// Il faut aussi MAIL_FROM (« Nom <adresse> ») et PUBLIC_URL. Sans configuration complète, la fonctionnalité est
// désactivée : l'application renvoie alors vers l'administrateur (npm run admin:reset-password).

let transport = null;

/** Réservé aux tests : remplace l'envoi réel. */
export const setMailTransport = (fn) => {
  transport = fn;
};

export const mailConfigured = () =>
  Boolean(transport) ||
  Boolean(
    (process.env.BREVO_API_KEY || process.env.RESEND_API_KEY) &&
    process.env.MAIL_FROM &&
    process.env.PUBLIC_URL,
  );

export const publicUrl = () => (process.env.PUBLIC_URL || 'http://localhost').replace(/\/+$/, '');

/** « Nom <adresse@exemple.com> » ou « adresse@exemple.com » → { name, email }. */
export const parseSender = (from = '') => {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from);
  return m ? { name: m[1].trim() || undefined, email: m[2].trim() } : { email: from.trim() };
};

const post = async (url, headers, payload) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Envoi e-mail refusé (HTTP ${res.status})`);
};

export const sendMail = async ({ to, subject, text }) => {
  if (transport) return transport({ to, subject, text });
  if (process.env.BREVO_API_KEY) {
    return post(
      'https://api.brevo.com/v3/smtp/email',
      { 'api-key': process.env.BREVO_API_KEY },
      {
        sender: parseSender(process.env.MAIL_FROM),
        to: [{ email: to }],
        subject,
        textContent: text,
      },
    );
  }
  return post(
    'https://api.resend.com/emails',
    { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    { from: process.env.MAIL_FROM, to: [to], subject, text },
  );
};
