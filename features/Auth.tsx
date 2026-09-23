import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import { UserPreferences } from '../types';
import {
  AccountRole,
  MIN_PASSWORD_LENGTH,
  loginAccount,
  registerAccount,
  validatePassword,
} from '../services/authService';

interface AuthProps {
  onAuthenticated: (prefs: UserPreferences) => void;
}

const ROLES: AccountRole[] = ['Étudiant', 'Particulier', 'Professionnel', 'Entreprise'];

const inputClass =
  'w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition';

export const Auth: React.FC<AuthProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<AccountRole>('Étudiant');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';
  const passwordIssue = isRegister && password ? validatePassword(password, { name, email }) : null;

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
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

    setLoading(true);
    try {
      const prefs = isRegister
        ? await registerAccount({ name, email, password, role })
        : await loginAccount(email, password);
      onAuthenticated(prefs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
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

          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {isRegister ? 'Créer votre compte apprenant' : 'Bon retour parmi nous'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            {isRegister
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

            {isRegister && (
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
              </>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-sm font-black shadow-md shadow-sky-600/20 transition-all active:scale-[0.99]"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading
                ? isRegister
                  ? 'Création du compte…'
                  : 'Vérification…'
                : isRegister
                  ? 'Créer mon compte'
                  : 'Se connecter'}
            </button>
          </form>

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
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Votre mot de passe n’est jamais stocké en clair : le serveur n’en conserve qu’une
          empreinte (scrypt).
        </p>
      </div>
    </div>
  );
};
