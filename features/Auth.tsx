import React, { useEffect, useRef, useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Check,
  X,
  ArrowLeft,
} from 'lucide-react';
import { UserPreferences } from '../types';
import { LanguageSelector, useI18n } from '../services/i18n';
import { useL } from '../components/ui';
import { TermsDialog } from './Legal/TermsDialog';
import {
  AccountRole,
  AuthConfig,
  MIN_PASSWORD_LENGTH,
  getAuthConfig,
  loginAccount,
  loginWithGoogle,
  registerAccount,
  requestPasswordReset,
  resetPassword,
  validatePassword,
} from '../services/authService';

interface AuthProps {
  onAuthenticated: (prefs: UserPreferences) => void;
  /** Mode affiché à l'ouverture (ignoré si un lien de réinitialisation est présent dans l'URL). */
  initialMode?: 'login' | 'register';
  /** Si fourni, affiche un bouton de retour (ex. vers la page d'accueil publique). */
  onBack?: () => void;
}

const ROLES: AccountRole[] = ['Étudiant', 'Particulier', 'Professionnel', 'Entreprise'];

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: { credential: string }) => void;
      }) => void;
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

let googleScript: Promise<void> | null = null;
const loadGoogleScript = () => {
  if (!googleScript) {
    googleScript = new Promise<void>((resolve, reject) => {
      const el = document.createElement('script');
      el.src = 'https://accounts.google.com/gsi/client';
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        googleScript = null;
        reject(new Error('Google indisponible'));
      };
      document.head.appendChild(el);
    });
  }
  return googleScript;
};

const inputClass =
  'w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition';

export const Auth: React.FC<AuthProps> = ({ onAuthenticated, initialMode = 'login', onBack }) => {
  const L = useL();
  const { language } = useI18n();
  const resetToken = useRef(new URLSearchParams(window.location.search).get('reset') || '');
  const [mode, setMode] = useState<AuthMode>(resetToken.current ? 'reset' : initialMode);
  const [config, setConfig] = useState<AuthConfig>({ googleClientId: null, passwordReset: false });
  const [info, setInfo] = useState('');
  const googleRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<AccountRole>('Étudiant');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const isRegister = mode === 'register';
  // « Mot de passe oublié » sans service d'e-mail configuré : on renvoie vers l'administrateur
  const resetUnavailable = mode === 'forgot' && !config.passwordReset;
  const passwordIssue = isRegister && password ? validatePassword(password, { name, email }) : null;

  useEffect(() => {
    getAuthConfig().then(setConfig);
  }, []);

  const roleRef = useRef(role);
  roleRef.current = role;
  const termsRef = useRef(acceptTerms);
  termsRef.current = acceptTerms;
  const onAuthRef = useRef(onAuthenticated);
  onAuthRef.current = onAuthenticated;

  useEffect(() => {
    if (!config.googleClientId || (mode !== 'login' && mode !== 'register')) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        const target = googleRef.current;
        if (cancelled || !target) return;
        const google = (window as unknown as { google: GoogleIdentity }).google.accounts.id;
        google.initialize({
          client_id: config.googleClientId as string,
          callback: async ({ credential }) => {
            setError('');
            setLoading(true);
            try {
              onAuthRef.current(
                await loginWithGoogle(credential, roleRef.current, termsRef.current),
              );
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Connexion Google impossible.');
            } finally {
              setLoading(false);
            }
          },
        });
        target.innerHTML = '';
        google.renderButton(target, {
          theme: 'outline',
          size: 'large',
          width: 300,
          text: mode === 'register' ? 'signup_with' : 'signin_with',
          locale: language,
        });
      })
      .catch(() => {
        /* Google injoignable : la connexion par e-mail reste disponible */
      });
    return () => {
      cancelled = true;
    };
  }, [config.googleClientId, mode, language]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setInfo('');
    setError('');
    setPassword('');
    setConfirm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister && password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    if (isRegister && !acceptTerms) {
      setError(
        L(
          'Vous devez accepter les conditions d’utilisation pour créer un compte.',
          'You must accept the terms of use to create an account.',
          'Debe aceptar las condiciones de uso para crear una cuenta.',
        ),
      );
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        await requestPasswordReset(email, language);
        setInfo(
          L(
            'Si un compte existe pour cette adresse, un e-mail avec un lien de réinitialisation vient d’être envoyé (valable 30 minutes).',
            'If an account exists for this address, an email with a reset link has just been sent (valid for 30 minutes).',
            'Si existe una cuenta con esta dirección, se ha enviado un correo con un enlace de restablecimiento (válido 30 minutos).',
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'reset') {
      if (password !== confirm) {
        setError(
          L(
            'Les deux mots de passe ne correspondent pas.',
            'The two passwords do not match.',
            'Las dos contraseñas no coinciden.',
          ),
        );
        return;
      }
      setLoading(true);
      try {
        await resetPassword(resetToken.current, password);
        resetToken.current = '';
        window.history.replaceState(null, '', window.location.pathname);
        switchMode('login');
        setInfo(
          L(
            'Mot de passe modifié. Vous pouvez vous connecter.',
            'Password updated. You can now sign in.',
            'Contraseña actualizada. Ya puede iniciar sesión.',
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const prefs = isRegister
        ? await registerAccount({ name, email, password, role, acceptTerms })
        : await loginAccount(email, password);
      onAuthenticated(prefs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <LanguageSelector className="absolute top-4 right-4 z-10" />
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {L('Retour', 'Back', 'Volver')}
        </button>
      )}
      {showTerms && (
        <TermsDialog
          contactEmail={config.contactEmail ?? null}
          onClose={() => setShowTerms(false)}
        />
      )}
      <div className="w-full max-w-md">
        {/* Marque */}
        <div className="flex flex-col items-center text-center mb-6">
          <img src="/favicon.svg" alt="CyberSens" className="w-16 h-16 mb-3 drop-shadow-md" />
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">CyberSens</h1>
          <p className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
            Sensibiliser • Protéger • Agir
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-6 sm:p-7">
          {/* Onglets */}
          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 gap-1 p-1 mb-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`py-2 rounded-lg transition-all ${
                    mode === m
                      ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {m === 'login' ? 'Connexion' : 'Inscription'}
                </button>
              ))}
            </div>
          )}

          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {mode === 'forgot'
              ? L('Mot de passe oublié', 'Forgot your password', 'Contraseña olvidada')
              : mode === 'reset'
                ? L('Nouveau mot de passe', 'New password', 'Nueva contraseña')
                : isRegister
                  ? 'Créer votre compte apprenant'
                  : 'Bon retour parmi nous'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            {resetUnavailable
              ? ''
              : mode === 'forgot'
                ? L(
                    'Indiquez votre adresse e-mail : nous vous envoyons un lien pour choisir un nouveau mot de passe.',
                    'Enter your email address: we will send you a link to choose a new password.',
                    'Indique su correo: le enviaremos un enlace para elegir una nueva contraseña.',
                  )
                : mode === 'reset'
                  ? L(
                      'Choisissez un nouveau mot de passe pour votre compte.',
                      'Choose a new password for your account.',
                      'Elija una nueva contraseña para su cuenta.',
                    )
                  : isRegister
                    ? 'Suivez vos formations, passez les examens et obtenez vos certificats.'
                    : 'Connectez-vous pour retrouver vos formations et vos certificats.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {isRegister && (
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Nom complet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  required
                  className={inputClass}
                />
              </div>
            )}

            {mode !== 'reset' && !resetUnavailable && (
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Adresse e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                  required
                  className={inputClass}
                />
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={128}
                  required
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="pl-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
              >
                {L('Mot de passe oublié ?', 'Forgot your password?', '¿Olvidó su contraseña?')}
              </button>
            )}

            {resetUnavailable && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <p>
                  {L(
                    'La réinitialisation automatique par e-mail n’est pas activée sur ce site. Contactez l’administrateur : il peut réinitialiser votre mot de passe et vous transmettre un mot de passe temporaire.',
                    'Automatic reset by email is not enabled on this site. Contact the administrator: they can reset your password and give you a temporary one.',
                    'El restablecimiento automático por correo no está activado en este sitio. Contacte con el administrador: puede restablecer su contraseña y darle una temporal.',
                  )}
                </p>
                {config.contactEmail && (
                  <a
                    href={`mailto:${config.contactEmail}?subject=${encodeURIComponent(
                      L(
                        'CyberSens : mot de passe oublié',
                        'CyberSens: forgotten password',
                        'CyberSens: contraseña olvidada',
                      ),
                    )}&body=${encodeURIComponent(
                      email
                        ? `${email}
`
                        : '',
                    )}`}
                    className="inline-block font-bold underline"
                  >
                    {L(
                      'Écrire à l’administrateur',
                      'Email the administrator',
                      'Escribir al administrador',
                    )}
                  </a>
                )}
              </div>
            )}

            {(isRegister || mode === 'reset') && (
              <>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirmer le mot de passe"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    maxLength={128}
                    required
                    className={inputClass}
                  />
                </div>

                <ul className="text-[11px] space-y-1 pl-1">
                  {[
                    {
                      ok: password.length >= MIN_PASSWORD_LENGTH,
                      label: `Au moins ${MIN_PASSWORD_LENGTH} caractères (une phrase de passe est idéale)`,
                    },
                    {
                      ok: !!password && !passwordIssue,
                      label: 'Ne contient ni votre nom ni votre e-mail',
                    },
                    {
                      ok: !!confirm && password === confirm,
                      label: 'Les deux mots de passe correspondent',
                    },
                  ].map((rule) => (
                    <li
                      key={rule.label}
                      className={`flex items-center gap-1.5 ${rule.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                      {rule.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      {rule.label}
                    </li>
                  ))}
                </ul>

                {isRegister && (
                  <div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                      Vous êtes :
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                            role === r
                              ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-800 dark:text-sky-200'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {isRegister && (
              <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>
                  {L(
                    'J’ai lu et j’accepte les',
                    'I have read and accept the',
                    'He leído y acepto las',
                  )}{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="font-bold text-sky-600 dark:text-sky-400 underline"
                  >
                    {L(
                      'conditions d’utilisation et la politique de confidentialité',
                      'terms of use and privacy policy',
                      'condiciones de uso y la política de privacidad',
                    )}
                  </button>
                  .
                </span>
              </label>
            )}

            {info && (
              <div
                role="status"
                className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-200 flex gap-2"
              >
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{info}</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-xs text-rose-800 dark:text-rose-200 flex gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!resetUnavailable && (
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-60 text-white text-sm font-black shadow-md shadow-sky-600/20 transition-all active:scale-[0.99]"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading
                  ? isRegister
                    ? 'Création du compte…'
                    : 'Vérification…'
                  : mode === 'forgot'
                    ? L('Envoyer le lien', 'Send the link', 'Enviar el enlace')
                    : mode === 'reset'
                      ? L('Enregistrer le mot de passe', 'Save password', 'Guardar contraseña')
                      : isRegister
                        ? 'Créer mon compte'
                        : 'Se connecter'}
              </button>
            )}
          </form>

          {config.googleClientId && (mode === 'login' || mode === 'register') && (
            <div className="mt-4">
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase text-slate-400">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                {L('ou', 'or', 'o')}
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
              <div ref={googleRef} className="mt-3 flex min-h-[44px] justify-center" />
            </div>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <p className="mt-5 text-center text-xs">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-bold text-sky-600 dark:text-sky-400 hover:underline"
              >
                {L('Retour à la connexion', 'Back to sign in', 'Volver al inicio de sesión')}
              </button>
            </p>
          )}

          {(mode === 'login' || mode === 'register') && (
            <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
              {isRegister ? 'Déjà inscrit ?' : 'Pas encore de compte ?'}{' '}
              <button
                type="button"
                onClick={() => switchMode(isRegister ? 'login' : 'register')}
                className="font-bold text-sky-600 dark:text-sky-400 hover:underline"
              >
                {isRegister ? 'Se connecter' : 'Créer un compte'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
