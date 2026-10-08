import React, { useState, useEffect } from 'react';
import { AppTab, UserPreferences } from './types';
import Layout from './components/Layout';
import { Home } from './features/Home';
import { Learn } from './features/Learn';
import { BestPractices } from './features/BestPractices';
import { News } from './features/News';
import { Profile } from './features/Profile';
import { Onboarding } from './features/Onboarding';
import AIChat from './features/AIChat';
import QuizContainer from './features/Quiz/QuizContainer';
import SecurityTools from './features/Tools/SecurityTools';
import GamesHub from './features/Games/GamesHub';
import CTFArena from './features/CTF/CTFArena';
import About from './features/About';
import Donate from './features/Donate';
import { DevOpsCenter } from './features/DevOps/DevOpsCenter';
import { Leaderboard } from './features/Leaderboard';
import { Community } from './features/Community';
import { ArenaSurface } from './components/ui';
import { getPreferences, savePreferences } from './services/persistenceService';
import { I18nProvider, useI18n } from './services/i18n';
import { Auth } from './features/Auth';
import { Landing } from './features/Landing';
import { restoreSession } from './services/authService';
import { clearUserCache } from './services/persistenceService';
import { SESSION_EXPIRED_EVENT } from './services/apiClient';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';

// Onglet demandé via un raccourci de l'application installée (ex. /?tab=quiz)
const initialTab = (): AppTab => {
  const params = new URLSearchParams(window.location.search);
  // Lien d'invitation à une salle de quiz multijoueur : /?join=123456
  const join = params.get('join');
  if (join && /^\d{6}$/.test(join)) {
    try {
      sessionStorage.setItem('cybersens-join-room', join);
    } catch {
      /* stockage indisponible : le code se saisit à la main */
    }
    window.history.replaceState(null, '', window.location.pathname);
    return AppTab.QUIZ;
  }
  // Lien d'invitation à une salle de CTF en équipe : /?joinctf=123456
  const joinCtf = params.get('joinctf');
  if (joinCtf && /^\d{6}$/.test(joinCtf)) {
    try {
      sessionStorage.setItem('cybersens-join-ctf', joinCtf);
    } catch {
      /* stockage indisponible : le code se saisit à la main */
    }
    window.history.replaceState(null, '', window.location.pathname);
    return AppTab.CTF;
  }
  const requested = params.get('tab');
  if (requested) window.history.replaceState(null, '', window.location.pathname);
  return (Object.values(AppTab) as string[]).includes(requested || '')
    ? (requested as AppTab)
    : AppTab.HOME;
};

const AppShell: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<AppTab>(initialTab);
  const [prefs, setPrefs] = useState<UserPreferences>(getPreferences());
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Page d'accueil publique avant connexion : sautée si l'URL est un lien de réinitialisation de mot
  // de passe ou une invitation à une salle de quiz (initialTab() a déjà consommé ce dernier ci-dessus).
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(() => {
    const hasResetLink = /(?:^|[?&])reset=/.test(window.location.search);
    const hasRoomInvite =
      !!sessionStorage.getItem('cybersens-join-room') ||
      !!sessionStorage.getItem('cybersens-join-ctf');
    return hasResetLink || hasRoomInvite ? 'login' : null;
  });
  // État de session : vérifié auprès du serveur au démarrage (cookie HttpOnly)
  const [session, setSession] = useState<'loading' | 'anonymous' | 'authenticated' | 'offline'>(
    'loading',
  );

  useEffect(() => {
    restoreSession()
      .then((restored) => {
        if (restored) setPrefs(restored.prefs);
        setSession(restored ? 'authenticated' : 'anonymous');
      })
      .catch(() => setSession('offline'));
  }, []);

  // Retour du réseau : envoi des modifications faites hors ligne puis rechargement depuis le serveur
  useEffect(() => {
    const onOnline = () => {
      if (session === 'offline') {
        window.location.reload();
        return;
      }
      if (session !== 'authenticated') return;
      restoreSession()
        .then((restored) => {
          if (restored) setPrefs(restored.prefs);
        })
        .catch(() => {
          /* toujours hors ligne : nouvel essai au prochain retour du réseau */
        });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [session]);

  // Session expirée ou déconnexion (depuis n'importe quel écran) : retour à l'écran de connexion
  useEffect(() => {
    const onExpired = () => {
      clearUserCache();
      setSession('anonymous');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    if (session === 'authenticated' && !prefs.isAuthenticated) setSession('anonymous');
  }, [prefs.isAuthenticated, session]);

  useEffect(() => {
    // Apply theme to document root
    if (prefs.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('bg-slate-950', 'text-slate-100');
      document.body.classList.add('bg-slate-50', 'text-slate-900');
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('bg-slate-50', 'text-slate-900');
      document.body.classList.add('bg-slate-950', 'text-slate-100');
    }
  }, [prefs.theme]);

  // Sync prefs across all views when changed anywhere (e.g. Profile, Header, Auth)
  useEffect(() => {
    const handlePrefsChange = () => {
      setPrefs(getPreferences());
    };
    window.addEventListener('cybersens-prefs-changed', handlePrefsChange);
    return () => window.removeEventListener('cybersens-prefs-changed', handlePrefsChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = (prefs.theme === 'dark' ? 'light' : 'dark') as 'dark' | 'light';
    const updated = { ...prefs, theme: newTheme };
    setPrefs(updated);
    savePreferences(updated);
  };

  const goHome = () => {
    setChatInitialPrompt(undefined);
    setActiveTab(AppTab.HOME);
  };

  const handleOpenAIChat = (prompt?: string) => {
    setChatInitialPrompt(prompt);
    setActiveTab(AppTab.AI_CHAT);
  };

  const handleFinishOnboarding = () => {
    setShowOnboarding(false);
    const updated = { ...prefs, onboarded: true };
    setPrefs(updated);
    savePreferences(updated);
  };

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.HOME:
        return <Home onStart={setActiveTab} />;
      case AppTab.LEARN:
        return <Learn onBack={goHome} />;
      case AppTab.PRACTICES:
        return <BestPractices onBack={goHome} />;
      case AppTab.DONATE:
        return (
          <ArenaSurface>
            <Donate onBack={goHome} />
          </ArenaSurface>
        );
      case AppTab.QUIZ:
        return <QuizContainer onBack={goHome} />;
      case AppTab.NEWS:
        return <News onBack={goHome} />;
      case AppTab.PROFILE:
        return (
          <Profile
            onNavigate={setActiveTab}
            onOpenOnboarding={() => setShowOnboarding(true)}
            onOpenAIChat={handleOpenAIChat}
          />
        );
      case AppTab.AI_CHAT:
        return <AIChat onBack={goHome} initialPrompt={chatInitialPrompt} />;
      case AppTab.CTF:
        return (
          <ArenaSurface>
            <CTFArena onBack={goHome} onOpenAIChat={handleOpenAIChat} />
          </ArenaSurface>
        );
      case AppTab.TOOLS:
        return <SecurityTools onBack={goHome} />;
      case AppTab.GAMES:
        return (
          <ArenaSurface>
            <GamesHub onBack={goHome} />
          </ArenaSurface>
        );
      case AppTab.LEADERBOARD:
        return <Leaderboard onBack={goHome} />;
      case AppTab.COMMUNITY:
        return <Community onBack={goHome} />;
      case AppTab.DEVOPS:
        return <DevOpsCenter />;
      case AppTab.ABOUT:
        return <About onBack={goHome} onNavigate={setActiveTab} />;
      default:
        return <Home onStart={setActiveTab} />;
    }
  };

  return (
    <>
      <PWAUpdatePrompt />
      {session === 'loading' ? (
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-950">
          {t('app.loading', 'Chargement de votre espace…')}
        </div>
      ) : session === 'offline' ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center bg-slate-50 dark:bg-slate-950">
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm">
            {t(
              'app.offline',
              'Impossible de joindre le serveur CyberSens. Connectez-vous une première fois avec une connexion Internet : l’application fonctionnera ensuite aussi hors ligne sur cet appareil.',
            )}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold"
          >
            {t('app.retry', 'Réessayer')}
          </button>
        </div>
      ) : session === 'anonymous' ? (
        authMode ? (
          <Auth
            initialMode={authMode}
            onBack={() => setAuthMode(null)}
            onAuthenticated={(updated) => {
              setPrefs(updated);
              // Invitation à une salle reçue avant la connexion : on y retourne au lieu de l'accueil
              setActiveTab(
                sessionStorage.getItem('cybersens-join-room')
                  ? AppTab.QUIZ
                  : sessionStorage.getItem('cybersens-join-ctf')
                    ? AppTab.CTF
                    : AppTab.HOME,
              );
              setSession('authenticated');
            }}
          />
        ) : (
          <Landing onEnter={setAuthMode} />
        )
      ) : showOnboarding ? (
        <Onboarding onComplete={handleFinishOnboarding} />
      ) : (
        <Layout
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          theme={prefs.theme}
          onToggleTheme={toggleTheme}
        >
          <div className="animate-in fade-in duration-300">{renderContent()}</div>
        </Layout>
      )}
    </>
  );
};

const App: React.FC = () => (
  <I18nProvider>
    <AppShell />
  </I18nProvider>
);

export default App;
