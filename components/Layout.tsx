import React, { useState, useEffect } from 'react';
import {
  Shield,
  Bot,
  HelpCircle,
  Wrench,
  Gamepad2,
  Info,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  House,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  X,
  Flag,
  BookOpen,
  Newspaper,
  User,
  ShieldCheck,
  Bell,
  LogOut,
  LogIn,
  Camera,
  ChevronDown,
} from 'lucide-react';
import { AppTab, UserPreferences } from '../types';
import { audioService } from '../services/audioService';
import { useI18n, LanguageSelector } from '../services/i18n';
import { getPreferences, logoutLearnerAccount } from '../services/persistenceService';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface LayoutProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  children: React.ReactNode;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  activeTab,
  setActiveTab,
  children,
  theme,
  onToggleTheme,
}) => {
  const { t } = useI18n();
  const [isMusicOn, setIsMusicOn] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences>(getPreferences());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLabsMenu, setShowLabsMenu] = useState(false);

  // Sync preferences (user name, avatar, auth status, theme)
  useEffect(() => {
    const handlePrefsSync = () => {
      setPrefs(getPreferences());
    };
    window.addEventListener('cybersens-prefs-changed', handlePrefsSync);
    return () => window.removeEventListener('cybersens-prefs-changed', handlePrefsSync);
  }, []);

  // Primary tabs with Outils Sécu fully restored and Pratiques placed before Profil
  const primaryTabs = [
    { id: AppTab.HOME, label: t('nav.home', 'Accueil'), icon: House },
    { id: AppTab.LEARN, label: t('nav.learn', 'Apprendre'), icon: BookOpen },
    { id: AppTab.TOOLS, label: t('nav.tools', 'Outils Sécu'), icon: Wrench },
    { id: AppTab.QUIZ, label: t('nav.quiz', 'Quiz'), icon: HelpCircle },
    { id: AppTab.NEWS, label: t('nav.news', 'Actualités'), icon: Newspaper },
    { id: AppTab.PRACTICES, label: t('nav.practices', 'Pratiques'), icon: ShieldCheck },
    { id: AppTab.PROFILE, label: t('nav.profile', 'Profil'), icon: User },
  ];

  // Secondary tabs for desktop and labs access
  const secondaryTabs = [
    { id: AppTab.AI_CHAT, label: t('nav.ai_chat', 'CyberGuard IA'), icon: Bot },
    { id: AppTab.CTF, label: t('nav.ctf', 'Arène CTF'), icon: Flag },
    { id: AppTab.GAMES, label: t('nav.games', 'Jeux Menaces'), icon: Gamepad2 },
  ];

  const isDark = theme === 'dark';

  // Global notification listener
  useEffect(() => {
    const handleNotify = (e: any) => {
      const { message, type = 'info' } = e.detail;
      const id = Date.now();
      setNotifications((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 4000);
    };

    window.addEventListener('cyber-notify' as any, handleNotify);
    return () => window.removeEventListener('cyber-notify' as any, handleNotify);
  }, []);

  const handleToggleMusic = () => {
    const newState = !isMusicOn;
    setIsMusicOn(newState);
    audioService.toggleBackgroundMusic(newState);
    if (newState) {
      audioService.setBackgroundVolume(volume);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    audioService.setBackgroundVolume(newVol);
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Floating Notifications */}
      <div className="fixed top-20 left-0 right-0 z-[200] pointer-events-none flex flex-col items-center gap-2 px-4">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto animate-in slide-in-from-top-4 duration-300 max-w-md w-full p-4 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-center gap-3.5 ${
              n.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : n.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : n.type === 'error'
                    ? 'bg-red-500/10 border-red-500/40 text-red-300'
                    : 'bg-sky-500/10 border-sky-500/40 text-sky-300'
            }`}
          >
            <div className="shrink-0">
              {n.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : n.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : n.type === 'error' ? (
                <AlertOctagon className="w-5 h-5 text-red-400" />
              ) : (
                <Shield className="w-5 h-5 text-sky-400" />
              )}
            </div>
            <div className="flex-1 text-xs md:text-sm font-semibold leading-snug">{n.message}</div>
            <button
              onClick={() => setNotifications((prev) => prev.filter((notif) => notif.id !== n.id))}
              className="text-white/40 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Global Header */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b px-4 py-2.5 md:py-3 transition-colors ${
          isDark
            ? 'bg-slate-950/85 border-slate-800/80 text-white'
            : 'bg-white/95 border-slate-200/90 shadow-sm text-slate-900'
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Brand matching CyberSens */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            onClick={() => setActiveTab(AppTab.HOME)}
          >
            <div className="relative w-9 h-9 md:w-10 md:h-10 rounded-2xl overflow-hidden shadow-md shadow-sky-600/20 transition-all group-hover:scale-105 border border-sky-500/30 bg-slate-950 flex items-center justify-center p-1">
              <img
                src="/favicon.svg"
                alt="CyberSens Emblem"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-lg md:text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}
                >
                  Cyber<span className="text-sky-600 dark:text-sky-400">Sens</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 uppercase tracking-wider hidden sm:inline-block">
                  PWA
                </span>
              </div>
              <p
                className={`text-[10px] hidden sm:block -mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                Sensibiliser • Protéger • Agir
              </p>
            </div>
          </div>

          {/* Desktop Navigation — Profil est déjà accessible via le menu avatar, pas besoin de le dupliquer ici.
              N'apparaît qu'à partir de lg : en dessous, la nav mobile (icônes + libellés courts) prend le relais,
              plutôt que de comprimer 6 libellés complets dans une largeur insuffisante. */}
          <nav className="hidden lg:flex items-center gap-1">
            {primaryTabs
              .filter((tab) => tab.id !== AppTab.PROFILE)
              .map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.label}
                    className={`px-2.5 lg:px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      active
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                        : `${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}

            {/* Desktop Labos & IA Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLabsMenu(!showLabsMenu)}
                className={`px-2.5 lg:px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  [AppTab.AI_CHAT, AppTab.CTF, AppTab.GAMES].includes(activeTab)
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title="Laboratoires & Défis IA"
              >
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>Labos & IA</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showLabsMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLabsMenu(false)} />
                  <div
                    className={`absolute right-0 mt-2 w-52 rounded-2xl border shadow-2xl z-50 p-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
                      isDark
                        ? 'bg-slate-900/95 border-slate-800 text-slate-200'
                        : 'bg-white/95 border-slate-200 text-slate-800'
                    }`}
                  >
                    {secondaryTabs.map((tab) => {
                      const Icon = tab.icon;
                      const active = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setShowLabsMenu(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-colors ${
                            active
                              ? 'bg-sky-500/10 text-sky-500 dark:text-sky-400'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-sky-500" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* Action Controls & PWA Install */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
            {/* PWA Install Button in Header */}
            <PWAInstallButton variant="header" />

            {/* Language Selector */}
            <LanguageSelector />

            {/* Notifications Bell */}
            <button
              onClick={() => setShowNotificationsModal(true)}
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors relative ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-sky-400'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-sky-600'
              }`}
              title="Alertes & Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-500"></span>
            </button>

            {/* Ambient Sound */}
            <button
              onClick={handleToggleMusic}
              className={`p-1.5 sm:p-2 rounded-xl border transition-transform active:scale-90 ${
                isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
              } ${isMusicOn ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 hover:text-slate-600'}`}
              title={isMusicOn ? 'Couper l’ambiance sonore' : 'Activer l’ambiance sonore'}
            >
              {isMusicOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Account / Quick Logout Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-xl border transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
                title={
                  prefs.isAuthenticated ? `Compte : ${prefs.userName}` : 'Connexion / Inscription'
                }
              >
                <div className="relative">
                  <img
                    src={
                      prefs.userAvatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                    }
                    alt="User Avatar"
                    className="w-7 h-7 rounded-full object-cover border border-sky-500/40"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                    }}
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
                      prefs.isAuthenticated ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </div>
                <span className="hidden lg:inline text-xs font-bold max-w-[90px] truncate text-slate-800 dark:text-slate-200">
                  {prefs.isAuthenticated
                    ? prefs.userName.split(' ')[0]
                    : t('header.guest_badge', 'Invité')}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div
                    className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-2xl z-50 p-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
                      isDark
                        ? 'bg-slate-900/95 border-slate-800 text-slate-200'
                        : 'bg-white/95 border-slate-200 text-slate-800'
                    }`}
                  >
                    {/* User Header */}
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <img
                        src={prefs.userAvatar}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover border border-sky-500/50"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">
                          {prefs.isAuthenticated ? prefs.userName : 'Mode Invité'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {prefs.isAuthenticated
                            ? prefs.userEmail || prefs.userTitle
                            : 'Non connecté'}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="py-1.5 space-y-1 text-xs">
                      <button
                        onClick={() => {
                          setActiveTab(AppTab.PROFILE);
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                      >
                        <User className="w-4 h-4 text-sky-500" />
                        <span>{t('header.my_profile', 'Mon Profil Apprenant')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab(AppTab.PROFILE);
                          setShowUserMenu(false);
                          window.dispatchEvent(new CustomEvent('open-avatar-modal'));
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Camera className="w-4 h-4 text-indigo-500" />
                        <span>{t('header.change_avatar', 'Changer ma photo de profil')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab(AppTab.TOOLS);
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                      >
                        <Wrench className="w-4 h-4 text-cyan-500" />
                        <span>{t('nav.tools', 'Outils Sécu & Testeurs')}</span>
                      </button>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                      {prefs.isAuthenticated ? (
                        <button
                          onClick={() => {
                            const updated = logoutLearnerAccount();
                            setPrefs(updated);
                            setShowUserMenu(false);
                            window.dispatchEvent(
                              new CustomEvent('cyber-notify', {
                                detail: {
                                  message: t(
                                    'profile.logout_success',
                                    'Déconnexion réussie ! Vous êtes en mode invité.',
                                  ),
                                  type: 'info',
                                },
                              }),
                            );
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{t('header.logout', 'Se déconnecter')}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveTab(AppTab.PROFILE);
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>{t('header.login', 'Connexion / Inscription')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 md:p-6 pb-24 lg:pb-8">{children}</main>

      {/* Mobile & Tablet Bottom Navigation (jusqu'à lg : voir la nav desktop ci-dessus) */}
      <nav
        className={`lg:hidden fixed bottom-0 left-0 right-0 border-t px-1 py-1 flex justify-around items-center z-[100] transition-colors safe-area-bottom shadow-2xl backdrop-blur-xl ${
          isDark ? 'bg-slate-950/95 border-slate-800/80' : 'bg-white/95 border-slate-200 shadow-md'
        }`}
      >
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center flex-1 min-w-0 py-1 px-0.5 rounded-xl transition-all active:scale-95 ${
                active
                  ? isDark
                    ? 'text-sky-400 font-extrabold'
                    : 'text-sky-600 font-extrabold'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-300'
                    : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div
                className={`p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-colors ${
                  active ? (isDark ? 'bg-sky-500/10' : 'bg-sky-50') : ''
                }`}
              >
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${active ? (isDark ? 'text-sky-400' : 'text-sky-600') : ''} transition-transform`}
                />
              </div>
              <span className="text-[9px] font-semibold mt-0.5 tracking-tight truncate max-w-[48px] text-center leading-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bouton flottant Assistant IA : accès direct au chat CyberGuard depuis n'importe quel écran */}
      {activeTab !== AppTab.AI_CHAT && (
        <button
          onClick={() => setActiveTab(AppTab.AI_CHAT)}
          title="Discuter avec l'assistant IA CyberGuard"
          className="fixed z-[95] bottom-20 lg:bottom-6 right-4 lg:right-6 flex items-center gap-2 pl-4 pr-5 py-3.5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold text-sm shadow-2xl shadow-sky-500/40 hover:brightness-110 active:scale-95 transition-all"
        >
          <Bot className="w-5 h-5" />
          <span className="hidden sm:inline">Assistant IA</span>
        </button>
      )}

      {/* Notifications Drawer Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-400" />
                <h3 className="font-extrabold text-sm text-white">Alertes CyberSens</h3>
              </div>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-200">
                <div className="font-bold text-white mb-0.5">Nouvelle alerte Mobile Money</div>
                <p className="text-slate-300 text-[11px]">
                  Attention aux faux messages USSD demandant la validation de soldes.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300">
                <div className="font-bold text-white mb-0.5">Rappel de mise à jour</div>
                <p className="text-slate-400 text-[11px]">
                  Mettez à jour vos navigateurs et applications pour corriger les failles zero-day.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <div className="font-bold text-white mb-0.5">Score de défense actualisé</div>
                <p className="text-emerald-400 text-[11px]">
                  Vous avez gagné 450 points d'expérience ! Continuez ainsi.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowNotificationsModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
