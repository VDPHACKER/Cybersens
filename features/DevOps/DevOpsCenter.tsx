import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  RefreshCw,
  Cpu,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Terminal,
  Zap,
  Users,
  Download,
  Lock,
  LockOpen,
  Loader2,
} from 'lucide-react';
import { api, ApiError } from '../../services/apiClient';
import { useI18n } from '../../services/i18n';

interface SystemStatus {
  status: string;
  uptime: number;
  nodeVersion: string;
  platform: string;
  memory: {
    rss: string;
    heapUsed: string;
  };
  stats: {
    users: number;
    certificates: number;
    activeSessions: number;
  };
  timestamp: string;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  points: number;
  level: number;
  lessons: number;
  certificates: number;
  posts: number;
  createdAt: string;
  lastLoginAt: string | null;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
}

// Neutralise l'injection de formules dans Excel/Sheets (=, +, -, @ en début de cellule)
const csvCell = (value: string | number | null) => {
  const s = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const DevOpsCenter: React.FC = () => {
  const { t, language } = useI18n();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userFilter, setUserFilter] = useState('');
  const [confirmResetId, setConfirmResetId] = useState<number | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(
    null,
  );
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  // null : vérification en cours ; false : mot de passe administrateur requis ; true : espace déverrouillé
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Efface de l'écran toutes les données personnelles et redemande le mot de passe administrateur
  const lockUi = () => {
    setUnlocked(false);
    setUsers([]);
    setStatus(null);
    setTempPassword(null);
    setConfirmResetId(null);
    setMessage(null);
  };
  const isLockedError = (err: unknown) => err instanceof ApiError && err.status === 423;

  const fetchStatus = async () => {
    try {
      const data = await api<SystemStatus>('GET', '/api/devops/status');
      setStatus(data);
    } catch (err) {
      // Aucune donnée factice : l'accès est réservé aux administrateurs du serveur
      setStatus(null);
      if (isLockedError(err)) lockUi();
      else if (err instanceof ApiError && [401, 403, 404].includes(err.status)) setDenied(true);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api<{ users: AdminUser[] }>('GET', '/api/admin/users');
      setUsers(data.users);
    } catch (err) {
      setUsers([]);
      if (isLockedError(err)) lockUi();
    }
  };

  const resetMemberPassword = async (userId: number) => {
    setConfirmResetId(null);
    setMessage(null);
    try {
      const res = await api<{ email: string; temporaryPassword: string }>(
        'POST',
        '/api/admin/users/reset-password',
        { userId },
      );
      setTempPassword({ email: res.email, password: res.temporaryPassword });
    } catch (err: any) {
      if (isLockedError(err)) return lockUi();
      setMessage({ text: err.message || 'Réinitialisation impossible.', type: 'error' });
    }
  };

  const exportUsersCsv = () => {
    const header = [
      'id',
      'nom',
      'email',
      'profil',
      'points',
      'niveau',
      'lecons',
      'certificats',
      'messages',
      'inscription',
      'derniere_connexion',
      'cgu_acceptees_le',
      'cgu_version',
    ];
    const rows = users.map((u) =>
      [
        u.id,
        u.name,
        u.email,
        u.role,
        u.points,
        u.level,
        u.lessons,
        u.certificates,
        u.posts,
        u.createdAt,
        u.lastLoginAt,
        u.termsAcceptedAt,
        u.termsVersion,
      ]
        .map(csvCell)
        .join(','),
    );
    const blob = new Blob(['﻿' + [header.join(','), ...rows].join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cybersens-membres-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const filteredUsers = users.filter((u) =>
    `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(userFilter.trim().toLowerCase()),
  );

  useEffect(() => {
    api<{ unlocked: boolean }>('GET', '/api/admin/status')
      .then((res) => setUnlocked(res.unlocked))
      .catch((err) => {
        if (err instanceof ApiError && [401, 403, 404].includes(err.status)) setDenied(true);
        else setUnlocked(false);
      });
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    fetchStatus();
    fetchUsers();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [unlocked]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlocking(true);
    setUnlockError('');
    try {
      await api('POST', '/api/admin/unlock', { password: adminPassword });
      setAdminPassword('');
      setUnlocked(true);
    } catch (err: any) {
      setUnlockError(err.message || 'Déverrouillage impossible.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleLock = async () => {
    try {
      await api('POST', '/api/admin/lock', {});
    } catch {
      // le verrouillage de l'écran a lieu dans tous les cas
    }
    lockUi();
  };

  const handleBackup = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await api<unknown>('GET', '/api/devops/backup');
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cybersens-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setMessage({
        text: 'Sauvegarde téléchargée. Elle contient des données personnelles : gardez-la en lieu sûr.',
        type: 'success',
      });
    } catch (err: any) {
      if (isLockedError(err)) return lockUi();
      setMessage({ text: err.message || 'Erreur lors de la sauvegarde.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExecAction = async (action: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api<{ success: boolean; message: string }>('POST', '/api/devops/exec', {
        action,
      });
      setMessage({ text: res.message || 'Action exécutée avec succès.', type: 'success' });
      fetchStatus();
    } catch (err: any) {
      if (isLockedError(err)) return lockUi();
      setMessage({ text: err.message || 'Erreur lors de l’exécution.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  if (denied) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <ShieldCheck className="w-12 h-12 mx-auto text-slate-400" aria-hidden="true" />
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          Accès réservé aux administrateurs
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Le Centre DevOps n'est disponible que pour les comptes déclarés dans la variable
          ADMIN_EMAILS du serveur, lorsque le mot de passe administrateur (ADMIN_PASSWORD) est
          configuré.
        </p>
      </div>
    );
  }

  if (unlocked === null) {
    return (
      <div className="flex justify-center py-24" role="status" aria-label="Chargement">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 space-y-5">
        <div className="text-center space-y-2">
          <Lock className="w-12 h-12 mx-auto text-slate-400" aria-hidden="true" />
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            Espace administrateur
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Saisissez le mot de passe administrateur pour afficher les membres inscrits et les
            outils d'exploitation.
          </p>
        </div>
        <form onSubmit={handleUnlock} className="space-y-3" noValidate>
          <input
            type="password"
            autoComplete="off"
            placeholder="Mot de passe administrateur"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            maxLength={200}
            required
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
          />
          {unlockError && (
            <p
              role="alert"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-xs text-rose-800 dark:text-rose-200"
            >
              {unlockError}
            </p>
          )}
          <button
            type="submit"
            disabled={unlocking || !adminPassword}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-60 text-white text-sm font-black"
          >
            {unlocking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LockOpen className="w-4 h-4" />
            )}
            Déverrouiller
          </button>
        </form>
        <p className="text-[11px] text-center text-slate-400">
          Le déverrouillage dure 30 minutes et prend fin à la déconnexion.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Operations & DevOps
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            Centre de Contrôle DevOps & Mises à Jour
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Superviser l'infrastructure, déclencher des sauvegardes à chaud et gérer les opérations
            post-déploiement.
          </p>
        </div>

        <div className="self-start sm:self-auto flex gap-2">
          <button
            onClick={handleLock}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-black hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <Lock className="w-4 h-4" />
            <span>Verrouiller</span>
          </button>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 text-xs font-black shadow-md hover:scale-105 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser les métriques</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <ShieldCheck className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">État Service</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white capitalize">
            {status?.status || 'En ligne'}
          </div>
          <div className="text-[10px] text-slate-500">
            Uptime : {formatUptime(status?.uptime || 0)}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Mémoire RSS</span>
            <Cpu className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {status?.memory.rss || '—'}
          </div>
          <div className="text-[10px] text-slate-500">Heap : {status?.memory.heapUsed || '—'}</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Apprenants</span>
            <Server className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {status?.stats.users || 0} inscrits
          </div>
          <div className="text-[10px] text-slate-500">
            {status?.stats.activeSessions || 0} sessions actives
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Certificats</span>
            <Zap className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {status?.stats.certificates || 0} émis
          </div>
          <div className="text-[10px] text-slate-500">Signés cryptographiquement</div>
        </div>
      </div>

      {/* Operations & Maintenance Actions */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-sky-600" />
          <span>Actions d'Administration & Maintenance Post-Déploiement</span>
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Sauvegarde de la base
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Télécharge un export JSON complet des données (membres, progression, messages).
              </p>
            </div>
            <button
              onClick={handleBackup}
              disabled={loading}
              className="w-full py-2 px-3 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-black shadow-sm transition-all"
            >
              Télécharger une sauvegarde
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Purge des Sessions Expirées
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Nettoie la table des sessions obsolètes pour optimiser la mémoire.
              </p>
            </div>
            <button
              onClick={() => handleExecAction('clear_sessions')}
              disabled={loading}
              className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-sm transition-all"
            >
              Purger les Sessions
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Optimisation (VACUUM)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Nettoie et met à jour les statistiques de la base de données.
              </p>
            </div>
            <button
              onClick={() => handleExecAction('vacuum')}
              disabled={loading}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm transition-all"
            >
              Optimiser (VACUUM)
            </button>
          </div>
        </div>
      </div>

      {/* Membres inscrits */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            <span>Membres inscrits ({users.length})</span>
          </h2>
          <div className="flex gap-2">
            <input
              type="search"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Rechercher un nom, e-mail…"
              aria-label="Rechercher un membre"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
            <button
              onClick={exportUsersCsv}
              disabled={users.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 text-xs font-black disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>
        {tempPassword && (
          <div
            role="status"
            className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 space-y-2"
          >
            <p>
              Mot de passe temporaire pour <strong>{tempPassword.email}</strong> (affiché une seule
              fois, toutes ses sessions sont fermées). Transmettez-le par un canal sûr et demandez à
              la personne de le changer dès la connexion.
            </p>
            <p className="font-mono text-base font-black select-all">{tempPassword.password}</p>
            <button
              onClick={() => setTempPassword(null)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold"
            >
              J’ai noté le mot de passe
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500 dark:text-slate-400">
              <tr>
                {[
                  'Nom',
                  'E-mail',
                  'Profil',
                  'Pts',
                  'Leçons',
                  'Certifs',
                  'Inscrit le',
                  'Dernière connexion',
                  'CGU',
                  '',
                ].map((h) => (
                  <th key={h} className="py-2 pr-3 font-bold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-800 dark:text-slate-200">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3 font-semibold whitespace-nowrap">{u.name}</td>
                  <td className="py-2 pr-3">{u.email}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{u.role}</td>
                  <td className="py-2 pr-3">{u.points}</td>
                  <td className="py-2 pr-3">{u.lessons}</td>
                  <td className="py-2 pr-3">{u.certificates}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{u.createdAt.slice(0, 10)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {u.lastLoginAt ? u.lastLoginAt.slice(0, 16) : '—'}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {u.termsAcceptedAt ? u.termsAcceptedAt.slice(0, 10) : '—'}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {confirmResetId === u.id ? (
                      <span className="flex gap-1">
                        <button
                          onClick={() => resetMemberPassword(u.id)}
                          className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmResetId(null)}
                          className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600"
                        >
                          Annuler
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmResetId(u.id)}
                        className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Réinitialiser le mot de passe
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-4 text-center text-slate-500">
                    Aucun membre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Données personnelles : à consulter uniquement pour administrer le service. Les mots de
          passe ne sont jamais accessibles (hachés).
        </p>
      </div>

      {/* Deployment & Environment Info */}
      <div className="rounded-3xl bg-slate-900 text-white p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span>Informations sur l'Environnement d'Exécution</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-slate-400">Environnement Node :</span>
            <span className="font-mono font-bold text-sky-200">
              {status?.nodeVersion || 'v24.x'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-slate-400">Plateforme :</span>
            <span className="font-mono font-bold text-emerald-200">
              {status?.platform || 'Production Container'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-slate-400">Sécurité TLS / HSTS :</span>
            <span className="font-bold text-emerald-400">Actif (Strict-Transport-Security)</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-slate-400">Dernière synchro :</span>
            <span className="font-mono text-slate-300">
              {status?.timestamp
                ? new Date(status.timestamp).toLocaleTimeString()
                : 'Juste à l’instant'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
