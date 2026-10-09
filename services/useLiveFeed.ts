import { useEffect, useRef, useState } from 'react';
import { useI18n } from './i18n';
import {
  liveMessage,
  liveTitle,
  type CommunityPostEvent,
  type NewsEvent,
} from './liveFeedMessages';
import { showSystemNotification } from './systemNotification';
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
      const message = liveMessage('community_post', data, languageRef.current);
      notify(message);
      // Application en arrière-plan : vraie notification du système, comme WhatsApp
      void showSystemNotification({
        title: liveTitle('community_post', languageRef.current),
        body: message,
        url: '/?tab=community',
        tag: 'community',
      });
      window.dispatchEvent(new Event(COMMUNITY_POST_EVENT));
    });
    source.addEventListener('news', (e) => {
      const data = parse<NewsEvent>(e);
      if (!data) return;
      const message = liveMessage('news', data, languageRef.current);
      notify(message);
      void showSystemNotification({
        title: liveTitle('news', languageRef.current),
        body: message,
        url: '/?tab=news',
        tag: 'news',
      });
    });
    // Annonce d'une nouveauté par l'équipe : le push serveur est masqué quand l'application est au premier plan
    source.addEventListener('announce', (e) => {
      const data = parse<{ title: string; body: string }>(e);
      if (!data) return;
      notify(`${data.title} : ${data.body}`);
      void showSystemNotification({
        title: data.title,
        body: data.body,
        url: '/',
        tag: 'announce',
      });
    });
    // Trop d'onglets ouverts : ce flux a été remplacé, inutile de se reconnecter en boucle
    source.addEventListener('replaced', () => source.close());
    return () => source.close();
  }, [enabled]);
};
