import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  Bot,
  HelpCircle,
  Wrench,
  Gamepad2,
  Info,
  LifeBuoy,
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
  HeartHandshake,
  Bell,
  LogOut,
  LogIn,
  Camera,
  ChevronDown,
  Terminal,
  Trophy,
  Users,
  Search,
  Ellipsis,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { AppTab, UserPreferences } from '../types';
import { audioService } from '../services/audioService';
import { useI18n, LanguageSelector } from '../services/i18n';
import { getPreferences, logoutLearnerAccount } from '../services/persistenceService';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { GlobalSearch } from './GlobalSearch';
import { DonatePopup } from './DonatePopup';
import { useL } from './ui';

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  at: number;
}

interface LayoutProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  children: React.ReactNode;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

interface NavItem {
  id: AppTab;
  label: string;
  icon: LucideIcon;
}

const Layout: React.FC<LayoutProps> = ({
  activeTab,
  setActiveTab,
  children,
  theme,
  onToggleTheme,
}) => {
  const { t } = useI18n();
  const L = useL();
  const [isMusicOn, setIsMusicOn] = useState(false);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [history, setHistory] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences>(getPreferences());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    const sync = () => setPrefs(getPreferences());
    window.addEventListener('cybersens-prefs-changed', sync);
    return () => window.removeEventListener('cybersens-prefs-changed', sync);
  }, []);

  // Notifications : toast éphémère + historique consultable via la cloche
  useEffect(() => {
    const onNotify = (e: Event) => {
      const { message, type = 'info' } = (e as CustomEvent).detail;
      const n: Notification = { id: Date.now() + Math.random(), message, type, at: Date.now() };
      setToasts((prev) => [...prev, n]);
      setHistory((prev) => [n, ...prev].slice(0, 30));
      setUnread(true);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== n.id)), 4000);
    };
    window.addEventListener('cyber-notify', onNotify);
    return () => window.removeEventListener('cyber-notify', onNotify);
  }, []);

  const go = useCallback(
    (tab: AppTab) => {
      setActiveTab(tab);
      setShowMore(false);
      setShowUserMenu(false);
      setShowMobileSearch(false);
      window.scrollTo({ top: 0 });
    },
    [setActiveTab],
  );

  const mainNav: NavItem[] = [
    {
      id: AppTab.HOME,
      label: t('nav.dashboard', L('Tableau de bord', 'Dashboard', 'Panel')),
      icon: House,
    },
    {
      id: AppTab.LEARN,
      label: t('nav.courses', L('Formations', 'Courses', 'Formaciones')),
      icon: BookOpen,
    },
    { id: AppTab.QUIZ, label: 'Quiz', icon: HelpCircle },
    { id: AppTab.CTF, label: t('nav.ctf', L('Arène CTF', 'CTF Arena', 'Arena CTF')), icon: Flag },
    {
      id: AppTab.GAMES,
      label: t('nav.minigames', L('Mini-jeux', 'Mini-games', 'Minijuegos')),
      icon: Gamepad2,
    },
    {
      id: AppTab.TOOLS,
      label: t(
        'nav.security_tools',
        L('Outils de sécurité', 'Security tools', 'Herramientas de seguridad'),
      ),
      icon: Wrench,
    },
    {
      id: AppTab.AI_CHAT,
      label: t('nav.ai_assistant', L('Assistant IA', 'AI assistant', 'Asistente IA')),
      icon: Bot,
    },
    { id: AppTab.NEWS, label: t('nav.news', L('Actualités', 'News', 'Noticias')), icon: Newspaper },
    {
      id: AppTab.LEADERBOARD,
      label: L('Classements', 'Leaderboard', 'Clasificaciones'),
      icon: Trophy,
    },
    { id: AppTab.COMMUNITY, label: L('Communauté', 'Community', 'Comunidad'), icon: Users },
    { id: AppTab.GUIDE, label: L('Guide', 'Guide', 'Guía'), icon: LifeBuoy },
  ];

  const moreNav: NavItem[] = [
    { id: AppTab.PROFILE, label: L('Mon profil', 'My profile', 'Mi perfil'), icon: User },
    {
      id: AppTab.PRACTICES,
      label: L('Bonnes pratiques', 'Best practices', 'Buenas prácticas'),
      icon: ShieldCheck,
    },
    {
      id: AppTab.DONATE,
      label: L('Faire un don', 'Donate', 'Hacer una donación'),
      icon: HeartHandshake,
    },
    { id: AppTab.ABOUT, label: L('À propos', 'About', 'Acerca de'), icon: Info },
    ...(prefs.isAdmin ? [{ id: AppTab.DEVOPS, label: 'DevOps', icon: Terminal }] : []),
  ];

  // Barre du bas (mobile / PWA) : les 5 destinations principales + « Plus »
  const bottomNav: NavItem[] = [
    { id: AppTab.HOME, label: L('Accueil', 'Home', 'Inicio'), icon: House },
    { id: AppTab.LEARN, label: L('Formations', 'Courses', 'Cursos'), icon: BookOpen },
    { id: AppTab.CTF, label: 'CTF', icon: Flag },
    { id: AppTab.TOOLS, label: L('Outils', 'Tools', 'Útiles'), icon: Wrench },
    { id: AppTab.PROFILE, label: L('Profil', 'Profile', 'Perfil'), icon: User },
  ];
  const sheetNav = [
    ...mainNav.filter((n) => ![AppTab.HOME, AppTab.LEARN, AppTab.CTF, AppTab.TOOLS].includes(n.id)),
    ...moreNav.filter((n) => n.id !== AppTab.PROFILE),
  ];
  const moreActive = sheetNav.some((n) => n.id === activeTab);

  const handleToggleMusic = () => {
    const next = !isMusicOn;
    setIsMusicOn(next);
    audioService.toggleBackgroundMusic(next);
    if (next) audioService.setBackgroundVolume(0.5);
  };

  const fallbackAvatar =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const firstName = prefs.isAuthenticated
    ? prefs.userName.split(' ')[0]
    : t('header.guest_badge', L('Invité', 'Guest', 'Invitado'));

  const ring =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';
  const iconBtn = `relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand dark:border-white/10 dark:bg-ink-800/80 dark:text-slate-300 dark:hover:bg-ink-700 dark:hover:text-white ${ring}`;

  const Logo = ({ compact = false }: { compact?: boolean }) => (
    <button
      onClick={() => go(AppTab.HOME)}
      className={`flex items-center gap-3 text-left ${ring} rounded-xl`}
      aria-label="CyberSens"
    >
      <img src="/favicon.svg" alt="" className={compact ? 'h-9 w-9' : 'h-11 w-11'} />
      <span>
        <span
          className={`block font-black leading-tight text-slate-900 dark:text-white ${compact ? 'text-lg' : 'text-xl'}`}
        >
          Cyber<span className="text-brand-light">Sens</span>
        </span>
        {!compact && (
          <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {L(
              'Apprendre • Pratiquer • Se protéger',
              'Learn • Practice • Protect',
              'Aprender • Practicar • Protegerse',
            )}
          </span>
        )}
      </span>
    </button>
  );

  const SideLink: React.FC<{ item: NavItem; small?: boolean }> = ({ item, small }) => {
    const Icon = item.icon;
    const active = activeTab === item.id;
    return (
      <button
        onClick={() => go(item.id)}
        aria-current={active ? 'page' : undefined}
        className={`flex w-full items-center gap-3 rounded-xl px-3.5 ${small ? 'py-2 text-xs' : 'py-2.5 text-sm'} text-left font-semibold transition-all ${ring} ${
          active
            ? 'bg-brand text-white shadow-glow'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
        }`}
      >
        <Icon className={small ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-ink-950 dark:text-slate-100 dark:[background-image:radial-gradient(60rem_40rem_at_100%_-10%,rgba(37,99,235,0.18),transparent),radial-gradient(50rem_30rem_at_-10%_110%,rgba(124,58,237,0.14),transparent)]">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        {L('Aller au contenu', 'Skip to content', 'Ir al contenido')}
      </a>
      <OfflineIndicator />

      {/* Toasts */}
      <div
        className="pointer-events-none fixed left-0 right-0 top-20 z-[200] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        {toasts.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3.5 rounded-2xl border p-4 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-top-4 duration-300 ${
              n.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-200'
                : n.type === 'warning'
                  ? 'border-amber-500/40 bg-amber-950/90 text-amber-200'
                  : n.type === 'error'
                    ? 'border-red-500/40 bg-red-950/90 text-red-200'
                    : 'border-sky-500/40 bg-ink-800/95 text-sky-100'
            }`}
            role="status"
          >
            <div className="shrink-0">
              {n.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : n.type === 'warning' ? (
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              ) : n.type === 'error' ? (
                <AlertOctagon className="h-5 w-5 text-red-400" />
              ) : (
                <Shield className="h-5 w-5 text-sky-400" />
              )}
            </div>
            <div className="flex-1 text-xs font-semibold leading-snug md:text-sm">{n.message}</div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== n.id))}
              aria-label={L('Fermer', 'Close', 'Cerrar')}
              className="rounded p-1 text-white/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Barre latérale (bureau) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 dark:border-white/5 dark:bg-ink-900 lg:flex">
        <div className="px-1.5 pb-5">
          <Logo />
        </div>
        <nav
          className="flex-1 space-y-1 overflow-y-auto pr-1"
          aria-label={L('Navigation principale', 'Main navigation', 'Navegación principal')}
        >
          {mainNav.map((item) => (
            <SideLink key={item.id} item={item} />
          ))}
          <div className="my-3 border-t border-slate-200 dark:border-white/10" />
          {moreNav.map((item) => (
            <SideLink key={item.id} item={item} small />
          ))}
        </nav>
        <div className="mt-4 rounded-2xl border border-violet-500/30 [@media(max-height:800px)]:hidden bg-gradient-to-br from-violet-600/30 via-ink-800 to-ink-900 p-4 text-center">
          <Trophy className="mx-auto h-10 w-10 text-gold" aria-hidden="true" />
          <p className="mt-2 text-sm font-black text-white">
            {L('Relève le défi !', 'Take the challenge!', '¡Acepta el reto!')}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-300">
            {L(
              'Relève des quiz chronométrés et grimpe dans le classement.',
              'Take timed quizzes and climb the leaderboard.',
              'Juega quizzes cronometrados y sube en la clasificación.',
            )}
          </p>
          <button
            onClick={() => go(AppTab.QUIZ)}
            className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-light ${ring}`}
          >
            {L('Jouer maintenant', 'Play now', 'Jugar ahora')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Barre du haut */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur-md dark:border-white/5 dark:bg-ink-950/80 md:px-6">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <Logo compact />
            </div>
            <div className="hidden max-w-xl flex-1 lg:block">
              <GlobalSearch onNavigate={go} />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowMobileSearch((v) => !v)}
                className={`${iconBtn} lg:hidden`}
                aria-label={L('Rechercher', 'Search', 'Buscar')}
                aria-expanded={showMobileSearch}
              >
                <Search className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
              <div className="hidden sm:block">
                <PWAInstallButton variant="header" />
              </div>
              <button
                onClick={() => {
                  setShowNotifications(true);
                  setUnread(false);
                }}
                className={iconBtn}
                aria-label={L('Notifications', 'Notifications', 'Notificaciones')}
              >
                <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
                {unread && (
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500 dark:border-ink-800" />
                )}
              </button>
              <button
                onClick={handleToggleMusic}
                className={`${iconBtn} hidden sm:flex ${isMusicOn ? 'text-brand dark:text-brand-light' : ''}`}
                aria-label={
                  isMusicOn
                    ? L('Couper l’ambiance sonore', 'Mute ambient sound', 'Silenciar ambiente')
                    : L('Activer l’ambiance sonore', 'Enable ambient sound', 'Activar ambiente')
                }
                aria-pressed={isMusicOn}
              >
                {isMusicOn ? (
                  <Volume2 className="h-[18px] w-[18px]" />
                ) : (
                  <VolumeX className="h-[18px] w-[18px]" />
                )}
              </button>
              <button
                onClick={onToggleTheme}
                className={`${iconBtn} hidden sm:flex`}
                aria-label={
                  isDark
                    ? L('Passer en mode clair', 'Switch to light mode', 'Modo claro')
                    : L('Passer en mode sombre', 'Switch to dark mode', 'Modo oscuro')
                }
              >
                {isDark ? (
                  <Sun className="h-[18px] w-[18px] text-amber-400" />
                ) : (
                  <Moon className="h-[18px] w-[18px]" />
                )}
              </button>
              <div className="hidden sm:block">
                <LanguageSelector />
              </div>

              {/* Profil */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  aria-expanded={showUserMenu}
                  aria-haspopup="menu"
                  className={`flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-2 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-ink-800/80 dark:hover:bg-ink-700 sm:pr-3 ${ring}`}
                >
                  <img
                    src={prefs.userAvatar || fallbackAvatar}
                    alt=""
                    className="h-8 w-8 rounded-lg object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fallbackAvatar;
                    }}
                  />
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-[110px] truncate text-xs font-black leading-tight">
                      {prefs.isAuthenticated ? prefs.userName : firstName}
                    </span>
                    <span className="block text-[10px] font-medium leading-tight text-slate-500 dark:text-slate-400">
                      {prefs.isAuthenticated
                        ? `${L('Niveau', 'Level', 'Nivel')} ${prefs.level ?? 1}`
                        : L('Non connecté', 'Signed out', 'Sin conexión')}
                    </span>
                  </span>
                  <ChevronDown
                    className="hidden h-3.5 w-3.5 text-slate-400 sm:block"
                    aria-hidden="true"
                  />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div
                      role="menu"
                      className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 dark:border-white/10 dark:bg-ink-800"
                    >
                      <div className="border-b border-slate-100 p-3 dark:border-white/5">
                        <div className="truncate text-sm font-extrabold">
                          {prefs.isAuthenticated
                            ? prefs.userName
                            : L('Mode invité', 'Guest mode', 'Modo invitado')}
                        </div>
                        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {prefs.isAuthenticated
                            ? prefs.userEmail || prefs.userTitle
                            : L('Non connecté', 'Signed out', 'Sin conexión')}
                        </div>
                      </div>
                      <div className="space-y-0.5 py-1.5 text-xs font-semibold">
                        <button
                          role="menuitem"
                          onClick={() => go(AppTab.PROFILE)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                          <User className="h-4 w-4 text-brand" aria-hidden="true" />
                          {t('header.my_profile', L('Mon profil', 'My profile', 'Mi perfil'))}
                        </button>
                        <button
                          role="menuitem"
                          onClick={() => {
                            go(AppTab.PROFILE);
                            window.dispatchEvent(new CustomEvent('open-avatar-modal'));
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                          <Camera className="h-4 w-4 text-violet-500" aria-hidden="true" />
                          {t(
                            'header.change_avatar',
                            L('Changer ma photo', 'Change my photo', 'Cambiar mi foto'),
                          )}
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-white/5" />
                        {prefs.isAuthenticated ? (
                          <button
                            role="menuitem"
                            onClick={() => {
                              setPrefs(logoutLearnerAccount());
                              setShowUserMenu(false);
                              window.dispatchEvent(
                                new CustomEvent('cyber-notify', {
                                  detail: {
                                    message: t(
                                      'profile.logout_success',
                                      L('Déconnexion réussie.', 'Signed out.', 'Sesión cerrada.'),
                                    ),
                                    type: 'info',
                                  },
                                }),
                              );
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            <LogOut className="h-4 w-4" aria-hidden="true" />
                            {t('header.logout', L('Se déconnecter', 'Sign out', 'Cerrar sesión'))}
                          </button>
                        ) : (
                          <button
                            role="menuitem"
                            onClick={() => go(AppTab.PROFILE)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          >
                            <LogIn className="h-4 w-4" aria-hidden="true" />
                            {t(
                              'header.login',
                              L(
                                'Connexion / Inscription',
                                'Sign in / Sign up',
                                'Iniciar sesión / Registrarse',
                              ),
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {showMobileSearch && (
            <div className="mt-3 lg:hidden">
              <GlobalSearch onNavigate={go} />
            </div>
          )}
        </header>

        <main
          id="contenu"
          className="mx-auto w-full max-w-7xl flex-1 p-4 pb-28 md:p-6 lg:p-8 lg:pb-8"
        >
          {children}
        </main>
      </div>

      {/* Barre d'onglets du bas (mobile / PWA) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[100] border-t border-slate-200 bg-white/95 px-1 pt-1 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-ink-900/95 lg:hidden"
        style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
        aria-label={L('Navigation mobile', 'Mobile navigation', 'Navegación móvil')}
      >
        <div className="flex items-stretch justify-around">
          {bottomNav.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => go(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors ${ring} ${
                  active ? 'text-brand dark:text-brand-light' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} aria-hidden="true" />
                <span
                  className={`max-w-full truncate text-[10px] ${active ? 'font-black' : 'font-semibold'}`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setShowMore(true)}
            aria-haspopup="dialog"
            className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors ${ring} ${moreActive ? 'text-brand dark:text-brand-light' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <Ellipsis className="h-5 w-5" aria-hidden="true" />
            <span className={`text-[10px] ${moreActive ? 'font-black' : 'font-semibold'}`}>
              {L('Plus', 'More', 'Más')}
            </span>
          </button>
        </div>
      </nav>

      {/* Feuille « Plus » (mobile) */}
      {showMore && (
        <div
          className="fixed inset-0 z-[130] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={L('Plus de sections', 'More sections', 'Más secciones')}
        >
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMore(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-white p-4 pb-8 shadow-2xl animate-in slide-in-from-bottom-8 dark:bg-ink-900">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
            <div className="grid grid-cols-3 gap-3">
              {sheetNav.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item.id)}
                    className={`flex flex-col items-center gap-2 rounded-2xl p-3 text-center text-[11px] font-bold transition-colors ${ring} ${
                      active
                        ? 'bg-brand text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-ink-800 dark:text-slate-200'
                    }`}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                    <span className="leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 sm:hidden">
              <button
                onClick={onToggleTheme}
                className={`flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-white/10 ${ring}`}
              >
                {isDark ? (
                  <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
                {isDark
                  ? L('Mode clair', 'Light mode', 'Modo claro')
                  : L('Mode sombre', 'Dark mode', 'Modo oscuro')}
              </button>
              <PWAInstallButton variant="header" />
              <LanguageSelector />
            </div>
          </div>
        </div>
      )}

      {/* Bouton flottant Assistant IA (mobile uniquement : sur bureau, il est dans la barre latérale) */}
      {activeTab !== AppTab.AI_CHAT && activeTab !== AppTab.HOME && (
        <button
          onClick={() => go(AppTab.AI_CHAT)}
          aria-label={L('Ouvrir l’assistant IA', 'Open the AI assistant', 'Abrir el asistente IA')}
          className={`fixed bottom-[76px] right-4 z-[95] flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand to-cyan-500 text-white shadow-2xl shadow-brand/40 transition-all hover:brightness-110 active:scale-95 lg:hidden ${ring}`}
        >
          <Bot className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {/* Panneau de don : 15 s toutes les minutes, fermable */}
      <DonatePopup activeTab={activeTab} onLearnMore={() => go(AppTab.DONATE)} />

      {/* Notifications */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-[140] flex items-start justify-end bg-black/60 p-4 backdrop-blur-sm sm:items-start"
          role="dialog"
          aria-modal="true"
          aria-label={L('Notifications', 'Notifications', 'Notificaciones')}
          onClick={() => setShowNotifications(false)}
        >
          <div
            className="mt-14 w-full max-w-sm space-y-3 rounded-3xl border border-white/10 bg-ink-900 p-5 text-slate-100 shadow-2xl animate-in slide-in-from-top-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-light" aria-hidden="true" />
                <h2 className="text-sm font-extrabold">
                  {L('Notifications', 'Notifications', 'Notificaciones')}
                </h2>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                aria-label={L('Fermer', 'Close', 'Cerrar')}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {history.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                {L(
                  'Aucune notification pour le moment.',
                  'No notifications yet.',
                  'Aún no hay notificaciones.',
                )}
              </p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto text-xs">
                {history.map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-xl border p-3 ${n.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : n.type === 'error' ? 'border-red-500/20 bg-red-500/10 text-red-200' : n.type === 'warning' ? 'border-amber-500/20 bg-amber-500/10 text-amber-200' : 'border-sky-500/20 bg-sky-500/10 text-sky-100'}`}
                  >
                    <p className="font-semibold leading-snug">{n.message}</p>
                    <p className="mt-1 text-[10px] opacity-60">
                      {new Date(n.at).toLocaleTimeString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="w-full rounded-xl bg-white/5 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10"
              >
                {L('Tout effacer', 'Clear all', 'Borrar todo')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
