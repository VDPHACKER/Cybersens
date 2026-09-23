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
import { getPreferences, savePreferences } from './services/persistenceService';
import { I18nProvider } from './services/i18n';
import { Auth } from './features/Auth';
import { restoreSession } from './services/authService';
import { clearUserCache } from './services/persistenceService';
import { SESSION_EXPIRED_EVENT } from './services/apiClient';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';

// Onglet demandé via un raccourci de l'application installée (ex. /?tab=quiz)
const initialTab = (): AppTab => {
  const requested = new URLSearchParams(window.location.search).get('tab');
  if (requested) window.history.replaceState(null, '', window.location.pathname);
  return (Object.values(AppTab) as string[]).includes(requested || '')
    ? (requested as AppTab)
    : AppTab.HOME;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(initialTab);
  const [prefs, setPrefs] = useState<UserPreferences>(getPreferences());
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);
  const [showOnboarding, setShowOnboarding] = useState(false);
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
    const newTheme = prefs.theme === 'dark' ? 'light' : 'dark';
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
        return <CTFArena onBack={goHome} onOpenAIChat={handleOpenAIChat} />;
      case AppTab.TOOLS:
        return <SecurityTools onBack={goHome} />;
      case AppTab.GAMES:
        return <GamesHub onBack={goHome} />;
      case AppTab.ABOUT:
        return <About onBack={goHome} />;
      default:
        return <Home onStart={setActiveTab} />;
    }
  };

  return (
    <I18nProvider>
      <PWAUpdatePrompt />
      {session === 'loading' ? (
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-950">
          Chargement de votre espace…
        </div>
      ) : session === 'offline' ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center bg-slate-50 dark:bg-slate-950">
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm">
            Impossible de joindre le serveur CyberSens. Connectez-vous une première fois avec une
            connexion Internet : l’application fonctionnera ensuite aussi hors ligne sur cet
            appareil.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold"
          >
            Réessayer
          </button>
        </div>
      ) : session === 'anonymous' ? (
        <Auth
          onAuthenticated={(updated) => {
            setPrefs(updated);
            setActiveTab(AppTab.HOME);
            setSession('authenticated');
          }}
        />
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
    </I18nProvider>
  );
};

export default App;
