import { useEffect, useRef, useState } from 'react';
import { useI18n } from './i18n';
import { liveMessage, type CommunityPostEvent, type NewsEvent } from './liveFeedMessages';
import { LIVE_PREF_EVENT, getLiveNotifications } from './liveNotificationsPref';

export const COMMUNITY_POST_EVENT = 'cybersens-community-post';

const notify = (message: string) =>
  window.dispatchEvent(new CustomEvent('cyber-notify', { detail: { message, type: 'info' } }));

/** Ouvre le flux temps réel pour l'utilisateur connecté et affiche un toast par événement. */
export const useLiveFeed = () => {
  const { language } = useI18n();
  const languageRef = useRef(language);
  languageRef.current = language;
  const [enabled, setEnabled] = useState(getLiveNotifications());

  useEffect(() => {
    const sync = () => setEnabled(getLiveNotifications());
    window.addEventListener(LIVE_PREF_EVENT, sync);
    return () => window.removeEventListener(LIVE_PREF_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') return;
    const source = new EventSource('/api/live/stream');
    const parse = <T>(e: Event): T | null => {
      try {
        return JSON.parse((e as MessageEvent).data) as T;
      } catch {
        return null;
      }
    };
    source.addEventListener('community_post', (e) => {
      const data = parse<CommunityPostEvent>(e);
      if (!data) return;
      notify(liveMessage('community_post', data, languageRef.current));
      window.dispatchEvent(new Event(COMMUNITY_POST_EVENT));
    });
    source.addEventListener('news', (e) => {
      const data = parse<NewsEvent>(e);
      if (data) notify(liveMessage('news', data, languageRef.current));
    });
    return () => source.close();
  }, [enabled]);
};
