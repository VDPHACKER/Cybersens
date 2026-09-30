// Envoi d'e-mails transactionnels (réinitialisation de mot de passe) via l'API HTTP de Resend.
// Sans RESEND_API_KEY, MAIL_FROM et PUBLIC_URL, la fonctionnalité est désactivée : l'application indique
// alors de contacter l'administrateur (npm run admin:reset-password).

let transport = null;

/** Réservé aux tests : remplace l'envoi réel. */
export const setMailTransport = (fn) => {
  transport = fn;
};

export const mailConfigured = () =>
  Boolean(transport) ||
  Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM && process.env.PUBLIC_URL);

export const publicUrl = () => (process.env.PUBLIC_URL || 'http://localhost').replace(/\/+$/, '');

export const sendMail = async ({ to, subject, text }) => {
  if (transport) return transport({ to, subject, text });
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Envoi e-mail refusé (HTTP ${res.status})`);
};
