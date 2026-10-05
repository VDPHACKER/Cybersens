import React, { useState, useEffect } from 'react';
import {
  User,
  Award,
  BookOpen,
  Settings,
  Bookmark,
  HelpCircle,
  ChevronRight,
  LogOut,
  Edit3,
  CheckCircle2,
  X,
  Info,
  UserPlus,
  LogIn,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Lock,
  Mail,
  Briefcase,
  Check,
  Download,
  Camera,
  Upload,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import {
  getPreferences,
  savePreferences,
  getBookmarks,
  getQuizHistory,
  clearQuizHistory,
  getDynamicBadges,
  getCertificates,
  registerLearnerAccount,
  logoutLearnerAccount,
} from '../services/persistenceService';
import { AppTab, UserPreferences, Certificate, UserBadge } from '../types';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { CertificateModal } from '../components/CertificateModal';
import { BadgeIcon } from '../components/BadgeIcon';
import { PasswordChangeCard } from '../components/PasswordChangeCard';
import { LiveNotificationsCard } from '../components/LiveNotificationsCard';
import { MyReviewCard } from '../components/MyReviewCard';
import { useI18n } from '../services/i18n';
import { compressImageFile, testImageUrl } from '../services/imageUtils';

const AVATAR_PRESETS = [
  {
    id: 'av-1',
    label: 'Hacker Éthique',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=250&auto=format&fit=crop&q=80',
  },
  {
    id: 'av-2',
    label: 'Analyste Cyber',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=250&auto=format&fit=crop&q=80',
  },
  {
    id: 'av-3',
    label: 'Apprenant CyberSens',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80',
  },
  {
    id: 'av-4',
    label: 'Expert Forensics',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80',
  },
  {
    id: 'av-5',
    label: 'Sentinelle Défensive',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=250&auto=format&fit=crop&q=80',
  },
  {
    id: 'av-6',
    label: 'Chercheur en Sécurité',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80',
  },
];

interface ProfileProps {
  onNavigate: (tab: AppTab) => void;
  onOpenAIChat: (msg?: string) => void;
  onOpenOnboarding: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ onNavigate, onOpenAIChat, onOpenOnboarding }) => {
  const { t, language, setLanguage } = useI18n();
  const [activeTab, setActiveTab] = useState<'profile' | 'inscription' | 'badges' | 'certificats'>(
    'profile',
  );
  const [prefs, setPrefs] = useState<UserPreferences>(getPreferences());
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [badgeFilter, setBadgeFilter] = useState<'tous' | 'cours' | 'quiz' | 'points' | 'expert'>(
    'tous',
  );
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);

  // Avatar Management
  const [tempAvatar, setTempAvatar] = useState(prefs.userAvatar || AVATAR_PRESETS[2].url);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Profile Edit fields
  const [editName, setEditName] = useState(prefs.userName);
  const [editTitle, setEditTitle] = useState(prefs.userTitle || 'Apprenant engagé');
  const [editEmail, setEditEmail] = useState(prefs.userEmail || '');
  const [lang, setLang] = useState<any>(language || prefs.language || 'fr');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<
    'Étudiant' | 'Professionnel' | 'Particulier' | 'Entreprise'
  >('Étudiant');
  const [regAvatar, setRegAvatar] = useState(prefs.userAvatar);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  const refreshData = () => {
    const current = getPreferences();
    setPrefs(current);
    setBookmarks(getBookmarks());
    setQuizHistory(getQuizHistory());
    setCertificates(getCertificates());
    setBadges(getDynamicBadges());
    setTempAvatar(current.userAvatar || AVATAR_PRESETS[2].url);
  };

  useEffect(() => {
    refreshData();
    const handlePrefsChange = () => refreshData();
    window.addEventListener('cybersens-prefs-changed', handlePrefsChange);
    return () => window.removeEventListener('cybersens-prefs-changed', handlePrefsChange);
  }, []);

  // Listen to open-avatar-modal event from header or anywhere
  useEffect(() => {
    const handleOpenAvatar = () => {
      setActiveTab('profile');
      setShowAvatarModal(true);
    };
    window.addEventListener('open-avatar-modal', handleOpenAvatar);
    return () => window.removeEventListener('open-avatar-modal', handleOpenAvatar);
  }, []);

  useEffect(() => {
    setLang(language);
  }, [language]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      // Automatically compress and resize to max 256x256 (~15KB)
      const compressedDataUrl = await compressImageFile(file, 256, 0.85);
      setTempAvatar(compressedDataUrl);
      // Auto-save immediately to guarantee persistence
      handleSaveAvatar(compressedDataUrl);
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('cyber-notify', {
          detail: {
            message: err?.message || 'Erreur lors du traitement de votre image.',
            type: 'error',
          },
        }),
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveAvatar = (urlToSave?: string) => {
    const chosen = urlToSave || tempAvatar;
    const updated: UserPreferences = {
      ...prefs,
      userAvatar: chosen,
    };
    savePreferences(updated);
    setPrefs(updated);
    setRegAvatar(chosen);
    setAvatarSuccess(true);
    window.dispatchEvent(
      new CustomEvent('cyber-notify', {
        detail: {
          message: t('profile.avatar_saved_success', 'Photo de profil mise à jour avec succès !'),
          type: 'success',
        },
      }),
    );
    setTimeout(() => {
      setAvatarSuccess(false);
      setShowAvatarModal(false);
    }, 700);
  };

  const handleSaveSettings = () => {
    const updated: UserPreferences = {
      ...prefs,
      userName: editName.trim() || prefs.userName,
      userTitle: editTitle.trim() || 'Apprenant engagé',
      // L'e-mail est l'identifiant de connexion : il n'est pas modifiable ici
      language: lang,
    };
    savePreferences(updated);
    setPrefs(updated);
    setLanguage(lang);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setShowSettingsModal(false);
    }, 800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      window.dispatchEvent(
        new CustomEvent('cyber-notify', {
          detail: {
            message: 'Veuillez renseigner votre nom complet et votre e-mail.',
            type: 'error',
          },
        }),
      );
      return;
    }

    const updated = registerLearnerAccount({
      name: regName,
      email: regEmail,
      password: regPassword,
      role: regRole,
      avatar: regAvatar,
    });

    setPrefs(updated);
    setAuthSuccessMsg(
      isLoginMode
        ? 'Connexion réussie ! Vos certificats et progression sont synchronisés.'
        : "Compte apprenant créé avec succès ! Bienvenue sur l'académie CyberSens.",
    );
    refreshData();

    window.dispatchEvent(
      new CustomEvent('cyber-notify', {
        detail: {
          message: isLoginMode ? 'Session ouverte avec succès !' : 'Bienvenue sur CyberSens !',
          type: 'success',
        },
      }),
    );

    setTimeout(() => {
      setAuthSuccessMsg('');
      setActiveTab('profile');
    }, 1500);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    const updated = logoutLearnerAccount();
    setPrefs(updated);
    refreshData();
    setShowLogoutModal(false);
    setLogoutNotice(true);
    window.dispatchEvent(
      new CustomEvent('cyber-notify', {
        detail: {
          message: 'Déconnexion effectuée. Vous êtes maintenant en session invité.',
          type: 'info',
        },
      }),
    );
    setActiveTab('profile');
    setTimeout(() => {
      setLogoutNotice(false);
    }, 5000);
  };

  const handleResetData = () => {
    setShowResetModal(true);
  };

  const confirmResetData = () => {
    clearQuizHistory();
    localStorage.removeItem('cybersens_certificates');
    setQuizHistory([]);
    setCertificates([]);
    setBadges(getDynamicBadges());
    setShowResetModal(false);
    setResetNotice(true);
    setTimeout(() => {
      setResetNotice(false);
    }, 4000);
  };

  const filteredBadges = badges.filter((b) => {
    if (badgeFilter === 'tous') return true;
    return b.category === badgeFilter;
  });

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 sm:py-7 space-y-6 animate-in fade-in duration-300">
      {/* Dynamic Feedback Banners */}
      {logoutNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>
              Vous avez été déconnecté avec succès. Votre progression et vos certificats restent
              sauvegardés.
            </span>
          </div>
          <button
            onClick={() => setLogoutNotice(false)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {resetNotice && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0" />
            <span>L'historique des quiz et les données locales ont été réinitialisés.</span>
          </div>
          <button
            onClick={() => setResetNotice(false)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Navigation Tabs matching User Request */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-sm overflow-x-auto no-scrollbar gap-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-sky-700 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{t('profile.tab_profile', 'Mon Profil')}</span>
        </button>

        <button
          onClick={() => setActiveTab('inscription')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'inscription'
              ? 'bg-sky-700 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('profile.tab_register', 'Inscription / Membre')}</span>
        </button>

        <button
          onClick={() => setActiveTab('badges')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'badges'
              ? 'bg-sky-700 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" />
          <span>
            {t('profile.tab_badges', 'Badges')} ({unlockedCount}/{badges.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('certificats')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'certificats'
              ? 'bg-sky-700 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-emerald-500" />
          <span>
            {t('profile.tab_certs', 'Certificats')} ({certificates.length})
          </span>
        </button>
      </div>

      {/* TAB 1: MON PROFIL (Screen 8 matching photo) */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Guest Warning Banner if disconnected */}
          {!prefs.isAuthenticated && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                <div>
                  <span className="font-extrabold text-amber-900 dark:text-amber-200 block text-sm">
                    {t('profile.guest_warning', 'Vous êtes actuellement en session invité.')}
                  </span>
                  <span className="text-amber-700 dark:text-amber-400">
                    Connectez-vous ou créez un compte pour valider et certifier officiellement vos
                    résultats.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('inscription')}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black whitespace-nowrap shadow-sm transition-all active:scale-95"
              >
                {t('profile.btn_connect', 'Se connecter maintenant')}
              </button>
            </div>
          )}

          {/* User Profile Card */}
          <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar with Status Ring & Edit Controls */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => {
                  setTempAvatar(prefs.userAvatar || AVATAR_PRESETS[2].url);
                  setShowAvatarModal(true);
                }}
                className="block w-24 h-24 rounded-3xl overflow-hidden border-2 border-sky-500 shadow-md focus:outline-none focus:ring-4 focus:ring-sky-400/30 transition-transform active:scale-95"
                title="Cliquer pour changer votre photo de profil"
              >
                <img
                  src={
                    prefs.userAvatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={prefs.userName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTempAvatar(prefs.userAvatar || AVATAR_PRESETS[2].url);
                  setShowAvatarModal(true);
                }}
                className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl bg-sky-700 text-white shadow-md hover:bg-sky-600 transition-colors"
                title="Changer ma photo de profil"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {prefs.userName}
                </h2>
                {prefs.isAuthenticated && (
                  <span className="inline-flex items-center gap-1 self-center sm:self-auto px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Compte Certifié ({prefs.role || 'Étudiant'})</span>
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                {prefs.userTitle || 'Apprenant engagé'} •{' '}
                {prefs.userEmail || 'etudiant@cybersens.bf'}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold">
                  Niveau {prefs.level || 2} Cyber
                </span>
                <span className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
                  {prefs.points || 450} Points d'expérience
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="self-stretch sm:self-auto flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title={t('profile.settings_btn', 'Paramètres')}
              >
                <Settings className="w-4 h-4" />
                <span>{t('profile.settings_btn', 'Paramètres')}</span>
              </button>

              {prefs.isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title={t('profile.btn_logout', 'Se déconnecter')}
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('profile.btn_logout', 'Déconnexion')}</span>
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('inscription')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('header.login', 'Connexion')}</span>
                </button>
              )}
            </div>
          </div>

          {/* 3 Metrics Cards matching Screen 8 */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center shadow-sm">
              <div className="text-sky-700 dark:text-sky-400 mb-1">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {t('profile.level_prefix', 'Niveau')} {prefs.level || 2}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t('profile.stat_progression', 'Progression')}
              </span>
            </div>

            <div
              onClick={() => setActiveTab('badges')}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center shadow-sm cursor-pointer hover:border-amber-400 transition-colors"
            >
              <div className="text-amber-500 mb-1">
                <Award className="w-5 h-5" />
              </div>
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {unlockedCount} / {badges.length}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t('profile.stat_badges', 'Badges acquis')}
              </span>
            </div>

            <div
              onClick={() => setActiveTab('certificats')}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center shadow-sm cursor-pointer hover:border-emerald-400 transition-colors"
            >
              <div className="text-emerald-500 mb-1">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {certificates.length}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t('profile.stat_certs', 'Certificats')}
              </span>
            </div>
          </div>

          {/* PWA In-App Install Callout */}
          <PWAInstallButton variant="profile" />

          {/* Navigation Options matching Screen 8 */}
          <div className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
            <button
              onClick={() => onNavigate(AppTab.LEARN)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t('profile.link_courses', 'Mes formations e-learning')}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate(AppTab.QUIZ)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t('profile.link_quizzes', 'Mes quiz')} ({quizHistory.length} terminés)
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>

            <button
              onClick={() => setActiveTab('badges')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t('profile.link_badges', 'Mes badges de progression')} ({unlockedCount}{' '}
                  débloqués)
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>

            <button
              onClick={() => setActiveTab('certificats')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t('profile.link_certs', 'Mes certificats officiels')} ({certificates.length})
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>

            <button
              onClick={() => setShowFavoritesModal(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400">
                  <Bookmark className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t('profile.link_favorites', 'Mes favoris')} ({bookmarks.length})
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>

            <button
              onClick={() =>
                onOpenAIChat("Peux-tu m'aider à comprendre les règles de cybersécurité ?")
              }
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t('profile.link_help', 'Aide & support CyberGuard IA')}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          {/* Disconnect or Log Out */}
          <div className="flex gap-2">
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('profile.btn_logout', 'Changer de compte / Déconnexion')}</span>
            </button>
            <button
              onClick={handleResetData}
              className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs font-bold transition-colors"
              title="Réinitialiser l'historique"
            >
              <span>{t('profile.btn_reset', 'Réinitialiser')}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: INSCRIPTION & AUTHENTIFICATION (Requested explicitly by user) */}
      {activeTab === 'inscription' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-3xl bg-sky-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-sky-600/30">
              {isLoginMode ? <LogIn className="w-7 h-7" /> : <UserPlus className="w-7 h-7" />}
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {isLoginMode ? 'Connexion à CyberSens' : 'Inscription Apprenant CyberSens'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isLoginMode
                ? 'Retrouvez votre progression, vos scores et vos certificats officiels.'
                : 'Créez votre profil pour certifier vos compétences et sauvegarder vos diplômes en cybersécurité.'}
            </p>
          </div>

          {authSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>{authSuccessMsg}</span>
            </div>
          )}

          {/* Registration Form Card */}
          <form
            onSubmit={handleRegisterSubmit}
            className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
          >
            {/* Mode Switcher */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => setIsLoginMode(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  !isLoginMode
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Créer un compte
              </button>
              <button
                type="button"
                onClick={() => setIsLoginMode(true)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  isLoginMode
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                J'ai déjà un compte
              </button>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nom complet (tel qu'il apparaîtra sur vos certificats) *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ex: Wendpanga Gédéon Koala"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Adresse e-mail professionnelle ou personnelle *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Ex: gedeon@organisation.bf"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mot de passe sécurisé (12+ caractères recommandés) *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            {/* Role / Profile */}
            {!isLoginMode && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Type d'apprenant / Secteur :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Étudiant', 'Professionnel', 'Particulier', 'Entreprise'] as const).map(
                    (r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRegRole(r)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          regRole === r
                            ? 'bg-sky-700 text-white border-sky-500 shadow-md shadow-sky-500/20'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {r}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Avatar choice on registration */}
            {!isLoginMode && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Choisissez votre avatar Cyber :
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTempAvatar(regAvatar || AVATAR_PRESETS[2].url);
                      setShowAvatarModal(true);
                    }}
                    className="text-[11px] font-bold text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Ou téléverser une photo</span>
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_PRESETS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setRegAvatar(av.url)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                        regAvatar === av.url
                          ? 'border-sky-500 ring-2 ring-sky-400/50 scale-105 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 opacity-70 hover:opacity-100'
                      }`}
                      title={av.label}
                    >
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                      {regAvatar === av.url && (
                        <div className="absolute inset-0 bg-sky-600/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-sky-700 hover:bg-sky-600 text-white font-black text-sm shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {isLoginMode ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>
                  {isLoginMode ? 'Accéder à mon espace apprenant' : 'Créer mon compte CyberSens'}
                </span>
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 pt-1">
              En vous inscrivant, vous accédez gratuitement à toutes les formations et
              certifications officielles CyberSens.
            </p>
          </form>
        </div>
      )}

      {/* TAB 3: BADGES DE PROGRESSION DYNAMIQUES (User Request) */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-500" />
                <span>Badges de Progression Dynamiques</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Débloquez de nouveaux titres d'honneur en réussissant les quiz et modules
                d'apprentissage.
              </p>
            </div>

            {/* Badges Count Indicator */}
            <div className="self-start sm:self-auto px-3.5 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>
                {unlockedCount} sur {badges.length} débloqués
              </span>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(['tous', 'cours', 'quiz', 'points', 'expert'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setBadgeFilter(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  badgeFilter === cat
                    ? 'bg-sky-700 text-white shadow-md shadow-sky-500/20'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {cat === 'tous' ? 'Tous les badges' : cat}
              </button>
            ))}
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredBadges.map((badge) => (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                  badge.unlocked
                    ? 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700/60 shadow-md'
                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                }`}
              >
                {/* Badge Icon Emblem */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                    badge.unlocked
                      ? 'bg-gradient-to-br from-amber-100 to-amber-300 dark:from-amber-950 dark:to-amber-800 border-2 border-amber-400 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <BadgeIcon name={badge.icon} className="w-7 h-7" />
                </div>

                {/* Badge Info */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {badge.title}
                    </h3>
                    {badge.unlocked ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        <Check className="w-3 h-3" /> Débloqué
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        <Lock className="w-3 h-3" /> {badge.progressPercent}%
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">{badge.description}</p>

                  {/* Progress Bar */}
                  <div className="pt-1">
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          badge.unlocked ? 'bg-amber-500' : 'bg-sky-500'
                        }`}
                        style={{ width: `${badge.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {badge.unlockedAt && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block pt-0.5">
                      Obtenu le {badge.unlockedAt}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MES CERTIFICATS OFFICIELS */}
      {activeTab === 'certificats' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-emerald-700" />
                <span>Mes Certificats Officiels CyberSens</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Diplômes et attestations de compétences vérifiables avec identifiant unique.
              </p>
            </div>
          </div>

          {certificates.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
              <GraduationCap className="w-12 h-12 text-slate-500 dark:text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                Aucun certificat pour le moment
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Suivez une formation dans l'onglet Apprendre et validez l'évaluation finale pour
                obtenir votre premier certificat officiel.
              </p>
              <button
                onClick={() => onNavigate(AppTab.LEARN)}
                className="px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-600/20"
              >
                Démarrer une formation
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  onClick={() => setSelectedCert(cert)}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-amber-400 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center shadow-sm">
                      <Award className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                      {cert.certificateNumber}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                      Certificat d'Aptitude
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors">
                      {cert.courseTitle}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Délivré à {cert.recipientName} • Score : {cert.score}%
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-400">
                    <span>Voir & Imprimer</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                Paramètres de compte
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Photo section in Settings Modal */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-sky-500 shadow-sm shrink-0">
                  <img
                    src={prefs.userAvatar || AVATAR_PRESETS[2].url}
                    alt={prefs.userName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    Photo de profil
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Téléversement ou avatars cyber
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    setTempAvatar(prefs.userAvatar || AVATAR_PRESETS[2].url);
                    setShowAvatarModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1 shrink-0"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  readOnly
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Identifiant de connexion, non modifiable.
                </p>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">
                  Titre / Statut
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">
                  Langue de l'interface
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['fr', 'en', 'es'] as const).map((code) => (
                    <button
                      key={code}
                      onClick={() => setLang(code)}
                      className={`p-2.5 rounded-xl border font-bold uppercase transition-all ${
                        lang === code
                          ? 'bg-sky-700 text-white border-sky-400 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {code === 'fr' ? 'Français' : code === 'en' ? 'English' : 'Español'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {savedSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Modifications enregistrées !
              </div>
            ) : (
              <button
                onClick={handleSaveSettings}
                className="w-full py-3 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-600/30 transition-all"
              >
                Enregistrer les paramètres
              </button>
            )}
          </div>
        </div>
      )}

      {/* Favorites Modal */}
      {showFavoritesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-rose-500" />
                Mes favoris ({bookmarks.length})
              </h3>
              <button
                onClick={() => setShowFavoritesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span>Comment repérer une arnaque en ligne ?</span>
                <span className="text-sky-700 dark:text-sky-400 font-bold">Article</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span>Les bases de la cybersécurité</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Formation</span>
              </div>
            </div>

            <button
              onClick={() => setShowFavoritesModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-sky-700 dark:text-sky-400" />
                Changer ma photo de profil
              </h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current / Selected Preview */}
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <div className="relative w-28 h-28 rounded-3xl overflow-hidden border-4 border-sky-500 shadow-xl bg-slate-100 dark:bg-slate-800">
                <img
                  src={tempAvatar}
                  alt="Aperçu avatar"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                  }}
                />
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white text-[11px] font-bold p-2 text-center animate-pulse">
                    <Sparkles className="w-5 h-5 text-sky-400 mb-1 animate-spin" />
                    <span>Compression HD...</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold text-center">
                Aperçu instantané de votre profil
              </p>
            </div>

            {/* Option 1: Upload from device or take photo */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                1. Téléverser depuis votre téléphone ou ordinateur
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-sky-300 dark:border-sky-800 hover:border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 cursor-pointer text-sky-700 dark:text-sky-300 text-xs font-bold transition-all active:scale-95 text-center">
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>Choisir un fichier (PNG/JPG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploadingAvatar}
                  />
                </label>

                <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 cursor-pointer text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all active:scale-95 text-center">
                  <Camera className="w-4 h-4 shrink-0" />
                  <span>Prendre une photo (Caméra)</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploadingAvatar}
                  />
                </label>
              </div>
            </div>

            {/* Option 2: Choose from curated cybersecurity avatars */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                2. Ou choisir parmi les avatars cybersécurité prédéfinis
              </label>
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_PRESETS.map((av) => {
                  const isSelected = tempAvatar === av.url;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setTempAvatar(av.url);
                        handleSaveAvatar(av.url);
                      }}
                      className={`relative rounded-2xl overflow-hidden border-2 p-1.5 text-left transition-all ${
                        isSelected
                          ? 'border-sky-500 ring-2 ring-sky-400/50 bg-sky-50 dark:bg-sky-950/40 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                      title={`Sélectionner et appliquer ${av.label}`}
                    >
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-[10px] font-bold text-center mt-1 truncate text-slate-700 dark:text-slate-300">
                        {av.label}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-sky-700 text-white flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Option 3: Custom image URL */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                3. Ou coller l'URL directe d'une photo web
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (customAvatarUrl.trim()) {
                      const valid = await testImageUrl(customAvatarUrl.trim());
                      if (valid) {
                        setTempAvatar(customAvatarUrl.trim());
                        handleSaveAvatar(customAvatarUrl.trim());
                      } else {
                        window.dispatchEvent(
                          new CustomEvent('cyber-notify', {
                            detail: {
                              message: 'Image inaccessible ou lien invalide.',
                              type: 'error',
                            },
                          }),
                        );
                      }
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition-colors"
                >
                  Appliquer
                </button>
              </div>
            </div>

            {avatarSuccess ? (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Photo de profil enregistrée avec succès !
              </div>
            ) : (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => handleSaveAvatar()}
                  className="flex-1 py-3 rounded-2xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmer & Sauvegarder</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 mx-auto flex items-center justify-center">
              <LogOut className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base">Déconnexion de la session</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Voulez-vous vous déconnecter de votre compte apprenant « {prefs.userName} » ? Vos
                badges acquis et certificats resteront sauvegardés.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmLogout}
                className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all"
              >
                Oui, me déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {prefs.isAuthenticated && (
        <div className="mt-6 space-y-6">
          <MyReviewCard />
          <LiveNotificationsCard />
          <PasswordChangeCard />
        </div>
      )}

      {/* Reset Data Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base">Réinitialiser les données locales</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Attention : Cette action effacera l'historique de vos quiz et certificats sur cet
                appareil.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmResetData}
                className="py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition-all"
              >
                Confirmer le reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {selectedCert && (
        <CertificateModal certificate={selectedCert} onClose={() => setSelectedCert(null)} />
      )}
    </div>
  );
};
