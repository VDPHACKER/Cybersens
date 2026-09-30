import type { Language } from '../types';
import { getUiLanguage } from './i18n';

/*
 * Le serveur répond toujours en français. Ce fichier traduit ses messages d'erreur pour l'interface :
 * messages fixes (table) et messages construits avec des valeurs (motifs).
 */

type Tr = { en: string; es: string };

const EXACT: Record<string, Tr> = {
  'Accès réservé aux administrateurs': {
    en: 'Access restricted to administrators',
    es: 'Acceso reservado a los administradores',
  },
  'Adresse e-mail invalide': { en: 'Invalid email address', es: 'Dirección de correo no válida' },
  'Connexion Google refusée.': {
    en: 'Google sign-in refused.',
    es: 'Inicio de sesión con Google rechazado.',
  },
  'E-mail ou mot de passe incorrect.': {
    en: 'Incorrect email or password.',
    es: 'Correo o contraseña incorrectos.',
  },
  'Erreur interne du serveur': { en: 'Internal server error', es: 'Error interno del servidor' },
  'Format de photo non autorisé': {
    en: 'Photo format not allowed',
    es: 'Formato de foto no permitido',
  },
  'Google est momentanément injoignable.': {
    en: 'Google is temporarily unreachable.',
    es: 'Google no está disponible en este momento.',
  },
  'La connexion Google n’est pas activée sur ce site.': {
    en: 'Google sign-in is not enabled on this site.',
    es: 'El inicio de sesión con Google no está activado en este sitio.',
  },
  'La réinitialisation par e-mail n’est pas activée. Contactez l’administrateur du site.': {
    en: 'Email password reset is not enabled. Contact the site administrator.',
    es: 'El restablecimiento por correo no está activado. Contacte con el administrador del sitio.',
  },
  'Le mot de passe actuel est incorrect.': {
    en: 'The current password is incorrect.',
    es: 'La contraseña actual es incorrecta.',
  },
  'Le mot de passe ne doit pas contenir votre adresse e-mail.': {
    en: 'The password must not contain your email address.',
    es: 'La contraseña no debe contener su correo electrónico.',
  },
  'Le mot de passe ne doit pas contenir votre nom.': {
    en: 'The password must not contain your name.',
    es: 'La contraseña no debe contener su nombre.',
  },
  'Le mot de passe ne doit pas dépasser 128 caractères.': {
    en: 'The password must not exceed 128 characters.',
    es: 'La contraseña no debe superar los 128 caracteres.',
  },
  'Le nouveau mot de passe doit être différent de l’ancien.': {
    en: 'The new password must be different from the old one.',
    es: 'La nueva contraseña debe ser distinta de la anterior.',
  },
  'Lien invalide ou expiré.': {
    en: 'Invalid or expired link.',
    es: 'Enlace no válido o caducado.',
  },
  'Lien invalide ou expiré. Refaites une demande.': {
    en: 'Invalid or expired link. Please make a new request.',
    es: 'Enlace no válido o caducado. Haga una nueva solicitud.',
  },
  'Mot de passe actuel invalide': {
    en: 'Invalid current password',
    es: 'Contraseña actual no válida',
  },
  'Mot de passe invalide': { en: 'Invalid password', es: 'Contraseña no válida' },
  'Photo de profil trop volumineuse': {
    en: 'Profile photo too large',
    es: 'Foto de perfil demasiado grande',
  },
  'Session expirée, veuillez vous reconnecter': {
    en: 'Session expired, please sign in again',
    es: 'Sesión caducada, vuelva a iniciar sesión',
  },
  'Trop de requêtes, réessayez plus tard': {
    en: 'Too many requests, please try again later',
    es: 'Demasiadas solicitudes, inténtelo más tarde',
  },
  'Un compte existe déjà avec cet e-mail. Connectez-vous.': {
    en: 'An account already exists with this email. Please sign in.',
    es: 'Ya existe una cuenta con este correo. Inicie sesión.',
  },
  'Vous ne pouvez pas signaler votre propre message.': {
    en: 'You cannot report your own message.',
    es: 'No puede denunciar su propio mensaje.',
  },
  'Serveur injoignable. Vérifiez votre connexion.': {
    en: 'Server unreachable. Check your connection.',
    es: 'Servidor inaccesible. Compruebe su conexión.',
  },
  'Une erreur est survenue.': { en: 'An error occurred.', es: 'Se ha producido un error.' },
};

const FIELDS: Record<string, Tr> = {
  Nom: { en: 'name', es: 'nombre' },
  'E-mail': { en: 'email', es: 'correo' },
  Titre: { en: 'title', es: 'título' },
  Commentaire: { en: 'comment', es: 'comentario' },
  Cours: { en: 'course', es: 'curso' },
  Leçon: { en: 'lesson', es: 'lección' },
  Difficulté: { en: 'difficulty', es: 'dificultad' },
};
const field = (name: string, lang: 'en' | 'es') => FIELDS[name]?.[lang] ?? name;

const PATTERNS: [RegExp, (m: RegExpExecArray) => Tr][] = [
  [
    /^Le mot de passe doit contenir au moins (\d+) caractères\.$/,
    (m) => ({
      en: `The password must be at least ${m[1]} characters long.`,
      es: `La contraseña debe tener al menos ${m[1]} caracteres.`,
    }),
  ],
  [
    /^Trop de tentatives\. Réessayez dans (\d+) min\.$/,
    (m) => ({
      en: `Too many attempts. Try again in ${m[1]} min.`,
      es: `Demasiados intentos. Inténtelo de nuevo en ${m[1]} min.`,
    }),
  ],
  [
    /^(.+) : entre (\d+) et (\d+) caractères$/,
    (m) => ({
      en: `${field(m[1], 'en')}: between ${m[2]} and ${m[3]} characters`,
      es: `${field(m[1], 'es')}: entre ${m[2]} y ${m[3]} caracteres`,
    }),
  ],
  [
    /^(.+) invalide$/,
    (m) => ({ en: `Invalid ${field(m[1], 'en')}`, es: `${field(m[1], 'es')} no válido` }),
  ],
];

/** Traduit un message d'erreur du serveur dans la langue de l'interface (français inchangé). */
export const localizeServerError = (message: string, language: Language = getUiLanguage()) => {
  if (language === 'fr') return message;
  const exact = EXACT[message];
  if (exact) return exact[language];
  for (const [pattern, build] of PATTERNS) {
    const match = pattern.exec(message);
    if (match) return build(match)[language];
  }
  return message;
};
