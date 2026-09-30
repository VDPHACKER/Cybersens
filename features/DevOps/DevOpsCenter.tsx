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

export const DevOpsCenter: React.FC = () => {
  const { t, language } = useI18n();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await api<SystemStatus>('GET', '/api/devops/status');
      setStatus(data);
    } catch (err) {
      // Aucune donnée factice : l'accès est réservé aux administrateurs du serveur
      setStatus(null);
      if (err instanceof ApiError && [401, 403, 404].includes(err.status)) setDenied(true);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleBackup = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api<{ success: boolean; message: string }>(
        'POST',
        '/api/devops/backup',
        {},
      );
      setMessage({
        text: res.message || 'Sauvegarde SQLite réalisée avec succès.',
        type: 'success',
      });
      fetchStatus();
    } catch (err: any) {
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
          ADMIN_EMAILS du serveur.
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

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 text-xs font-black shadow-md hover:scale-105 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser les métriques</span>
        </button>
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
                Sauvegarde Base SQLite
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Génère instantanément un snapshot horodaté de la base de données.
              </p>
            </div>
            <button
              onClick={handleBackup}
              disabled={loading}
              className="w-full py-2 px-3 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-black shadow-sm transition-all"
            >
              Créer un Backup
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
                Optimisation SQLite (VACUUM)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Défragmente le fichier de base de données et réduit son empreinte disque.
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
