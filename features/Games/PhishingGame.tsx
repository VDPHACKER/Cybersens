import React, { useMemo, useState } from 'react';
import {
  Fish,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Globe,
  MessageSquare,
  Check,
  X,
} from 'lucide-react';
import { audioService } from '../../services/audioService';
import { useI18n } from '../../services/i18n';
import { useL } from '../../components/ui';
import { GameShell, GameResult, Stat, pick, ringClass } from './GameShell';

type T3 = [string, string, string]; // [fr, en, es]

interface Item {
  kind: 'url' | 'sms';
  text: string | T3;
  phish: boolean;
  why: T3;
}

const ROUNDS = 10;

const ITEMS: Item[] = [
  {
    kind: 'url',
    text: 'https://paypa1-secure-login.com/verify',
    phish: true,
    why: [
      'Le « 1 » remplace le « l » de paypal et le domaine n’est pas le site officiel.',
      'The "1" replaces the "l" in paypal and the domain is not the official site.',
      'El «1» sustituye a la «l» de paypal y el dominio no es el sitio oficial.',
    ],
  },
  {
    kind: 'url',
    text: 'https://www.impots.gouv.fr/accueil',
    phish: false,
    why: [
      'Domaine officiel en .gouv.fr, connexion chiffrée (https).',
      'Official .gouv.fr domain, encrypted connection (https).',
      'Dominio oficial .gouv.fr, conexión cifrada (https).',
    ],
  },
  {
    kind: 'url',
    text: 'http://banque-populaire.security-alert.xyz/connexion',
    phish: true,
    why: [
      'Le vrai domaine est la fin : security-alert.xyz. Le nom de la banque au début est un leurre, et il n’y a pas de https.',
      'The real domain is the end: security-alert.xyz. The bank name first is a decoy, and there is no https.',
      'El dominio real es el final: security-alert.xyz. El nombre del banco al principio es un señuelo y no hay https.',
    ],
  },
  {
    kind: 'url',
    text: 'https://accounts.google.com/signin',
    phish: false,
    why: [
      'Le domaine google.com se termine bien après « accounts. » : c’est un sous-domaine officiel.',
      'The google.com domain does follow "accounts.": it is an official subdomain.',
      'El dominio google.com aparece tras «accounts.»: es un subdominio oficial.',
    ],
  },
  {
    kind: 'url',
    text: 'https://orange-money.verif-compte.top',
    phish: true,
    why: [
      '« verif-compte.top » est le vrai domaine ; l’extension .top et l’urgence de « vérifier » sont typiques des arnaques Mobile Money.',
      '"verif-compte.top" is the real domain; the .top extension and the urgency to "verify" are typical of Mobile Money scams.',
      '«verif-compte.top» es el dominio real; la extensión .top y la urgencia de «verificar» son típicas de estafas de Mobile Money.',
    ],
  },
  {
    kind: 'url',
    text: 'https://www.amazon.com.livraison-colis.net/suivi',
    phish: true,
    why: [
      '« amazon.com » n’est ici qu’un sous-domaine : le vrai domaine est livraison-colis.net.',
      '"amazon.com" is only a subdomain here: the real domain is livraison-colis.net.',
      '«amazon.com» es solo un subdominio aquí: el dominio real es livraison-colis.net.',
    ],
  },
  {
    kind: 'url',
    text: 'https://github.com/login',
    phish: false,
    why: [
      'Domaine exact github.com, chemin de connexion classique.',
      'Exact github.com domain, usual sign-in path.',
      'Dominio exacto github.com, ruta de inicio de sesión habitual.',
    ],
  },
  {
    kind: 'url',
    text: 'https://microsoft-support.help/alerte-virus',
    phish: true,
    why: [
      'Microsoft n’utilise pas « .help ». Une fausse alerte virus est une technique classique d’arnaque au support.',
      'Microsoft does not use ".help". A fake virus alert is a classic tech-support scam.',
      'Microsoft no usa «.help». Una falsa alerta de virus es una estafa clásica de soporte técnico.',
    ],
  },
  {
    kind: 'url',
    text: 'https://www.service-public.fr/particuliers/vosdroits',
    phish: false,
    why: [
      'Site officiel de l’administration française, https et domaine exact.',
      'Official French administration site, https and exact domain.',
      'Sitio oficial de la administración francesa, https y dominio exacto.',
    ],
  },
  {
    kind: 'url',
    text: 'https://bit.ly/3xR9-colis-gratuit',
    phish: true,
    why: [
      'Un lien raccourci cache la destination, et « colis gratuit » est trop beau pour être vrai.',
      'A shortened link hides the destination, and "free parcel" is too good to be true.',
      'Un enlace acortado oculta el destino y «paquete gratis» es demasiado bueno para ser verdad.',
    ],
  },
  {
    kind: 'url',
    text: 'https://mail.proton.me/login',
    phish: false,
    why: [
      'Sous-domaine officiel de proton.me, en https.',
      'Official subdomain of proton.me, over https.',
      'Subdominio oficial de proton.me, en https.',
    ],
  },
  {
    kind: 'url',
    text: 'https://facebook.com.profil-verification.info/',
    phish: true,
    why: [
      '« facebook.com » est un leurre : le vrai domaine est profil-verification.info.',
      '"facebook.com" is a decoy: the real domain is profil-verification.info.',
      '«facebook.com» es un señuelo: el dominio real es profil-verification.info.',
    ],
  },
  {
    kind: 'sms',
    text: [
      'Votre colis est en attente. Réglez 1,99 € de frais de douane : colis-suivi.top/x7',
      'Your parcel is on hold. Pay €1.99 customs fee: colis-suivi.top/x7',
      'Su paquete está retenido. Pague 1,99 € de aduana: colis-suivi.top/x7',
    ],
    phish: true,
    why: [
      'Petit montant + lien inconnu + urgence : le but est de récupérer vos données bancaires.',
      'Small amount + unknown link + urgency: the aim is to steal your card details.',
      'Importe pequeño + enlace desconocido + urgencia: el objetivo es robar sus datos bancarios.',
    ],
  },
  {
    kind: 'sms',
    text: [
      'Votre compte sera fermé dans 24 h. Répondez avec le code reçu par SMS pour le conserver.',
      'Your account will be closed in 24h. Reply with the code you received by SMS to keep it.',
      'Su cuenta se cerrará en 24 h. Responda con el código recibido por SMS para conservarla.',
    ],
    phish: true,
    why: [
      'On ne vous demande jamais votre code de vérification : c’est la clé de votre compte.',
      'You are never asked for your verification code: it is the key to your account.',
      'Nunca le piden su código de verificación: es la llave de su cuenta.',
    ],
  },
  {
    kind: 'sms',
    text: [
      'Votre code de vérification est 482913. Ne le communiquez à personne.',
      'Your verification code is 482913. Do not share it with anyone.',
      'Su código de verificación es 482913. No lo comparta con nadie.',
    ],
    phish: false,
    why: [
      'Message informatif, sans lien ni demande d’action. Attention : il n’est légitime que si vous venez de demander ce code.',
      'Informational message, no link, no request. Careful: it is only legitimate if you just requested that code.',
      'Mensaje informativo, sin enlace ni petición. Cuidado: solo es legítimo si acaba de pedir ese código.',
    ],
  },
  {
    kind: 'sms',
    text: [
      'Bravo ! Vous avez gagné un iPhone 16. Cliquez ici pour le réclamer : gagnant-premium.xyz',
      'Congrats! You won an iPhone 16. Click here to claim it: gagnant-premium.xyz',
      '¡Enhorabuena! Ha ganado un iPhone 16. Haga clic aquí para reclamarlo: gagnant-premium.xyz',
    ],
    phish: true,
    why: [
      'Vous ne pouvez pas gagner un concours auquel vous n’avez pas participé.',
      'You cannot win a contest you never entered.',
      'No se puede ganar un concurso en el que no se ha participado.',
    ],
  },
  {
    kind: 'sms',
    text: [
      'Rappel : votre rendez-vous est demain à 10 h. Répondez ANNULER pour l’annuler.',
      'Reminder: your appointment is tomorrow at 10 am. Reply CANCEL to cancel it.',
      'Recordatorio: su cita es mañana a las 10 h. Responda ANULAR para cancelarla.',
    ],
    phish: false,
    why: [
      'Aucun lien, aucune donnée sensible demandée, action simple et attendue.',
      'No link, no sensitive data requested, simple and expected action.',
      'Sin enlace, sin datos sensibles, acción sencilla y esperada.',
    ],
  },
];

const PhishingGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const L = useL();
  const { language } = useI18n();
  const idx = language === 'en' ? 1 : language === 'es' ? 2 : 0;
  const [seed, setSeed] = useState(0);
  const rounds = useMemo(() => pick(ITEMS, ROUNDS), [seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState<null | boolean>(null); // true = « hameçonnage »
  const done = step >= rounds.length;
  const item = rounds[step];

  const choose = (saysPhish: boolean) => {
    if (answer !== null) return;
    setAnswer(saysPhish);
    if (saysPhish === item.phish) {
      setScore((s) => s + 1);
      audioService.playSuccess();
    } else audioService.playError();
  };
  const next = () => {
    setAnswer(null);
    setStep((s) => s + 1);
  };
  const replay = () => {
    setSeed((s) => s + 1);
    setStep(0);
    setScore(0);
    setAnswer(null);
  };

  const verdict =
    score >= 9
      ? L('Œil de lynx !', 'Eagle eye!', '¡Ojo de lince!')
      : score >= 6
        ? L('Bon réflexe', 'Good instincts', 'Buenos reflejos')
        : L('Restez vigilant', 'Stay alert', 'Manténgase alerta');

  return (
    <GameShell
      title={L('Phishing ou légitime ?', 'Phishing or legit?', '¿Phishing o legítimo?')}
      subtitle={L(
        'Repérez les liens et messages piégés.',
        'Spot the trapped links and messages.',
        'Detecte los enlaces y mensajes trampa.',
      )}
      icon={Fish}
      tone="from-rose-500 to-red-700"
      onExit={onExit}
      right={
        !done && (
          <Stat
            label={L('Score', 'Score', 'Puntos')}
            value={`${score}/${rounds.length}`}
            tone="text-emerald-300"
          />
        )
      }
    >
      {done ? (
        <GameResult
          score={score}
          total={rounds.length}
          xp={score * 2}
          verdict={verdict}
          onReplay={replay}
          onExit={onExit}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {L('Question', 'Question', 'Pregunta')} {step + 1} / {rounds.length}
          </p>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={0}
            aria-valuemax={rounds.length}
          >
            <div
              className="h-full rounded-full bg-rose-500 transition-all"
              style={{ width: `${(step / rounds.length) * 100}%` }}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-ink-800 p-5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              {item.kind === 'url' ? (
                <Globe className="h-4 w-4" aria-hidden="true" />
              ) : (
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
              )}
              {item.kind === 'url'
                ? L('Adresse du site', 'Website address', 'Dirección del sitio')
                : L('Message reçu', 'Message received', 'Mensaje recibido')}
            </div>
            <p
              className={`mt-3 break-all rounded-xl bg-black/40 p-4 text-base text-white ${item.kind === 'url' ? 'font-mono' : 'leading-relaxed'}`}
            >
              {typeof item.text === 'string' ? item.text : item.text[idx]}
            </p>
          </div>

          {answer === null ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => choose(true)}
                className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 px-4 py-4 text-sm font-black text-white transition-transform hover:scale-[1.02] ${ringClass}`}
              >
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />{' '}
                {L('Hameçonnage', 'Phishing', 'Phishing')}
              </button>
              <button
                onClick={() => choose(false)}
                className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 px-4 py-4 text-sm font-black text-white transition-transform hover:scale-[1.02] ${ringClass}`}
              >
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />{' '}
                {L('Légitime', 'Legitimate', 'Legítimo')}
              </button>
            </div>
          ) : (
            <div
              className={`rounded-2xl border p-5 ${answer === item.phish ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-rose-400/40 bg-rose-500/10'}`}
              role="status"
            >
              <p
                className={`flex items-center gap-2 text-sm font-black ${answer === item.phish ? 'text-emerald-300' : 'text-rose-300'}`}
              >
                {answer === item.phish ? (
                  <Check className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <X className="h-5 w-5" aria-hidden="true" />
                )}
                {answer === item.phish
                  ? L('Bien vu !', 'Well spotted!', '¡Bien visto!')
                  : L('Raté.', 'Missed.', 'Fallaste.')}{' '}
                {item.phish
                  ? L('C’était de l’hameçonnage.', 'It was phishing.', 'Era phishing.')
                  : L('C’était légitime.', 'It was legitimate.', 'Era legítimo.')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">{item.why[idx]}</p>
              <button
                onClick={next}
                className={`mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-black text-white hover:bg-brand-light ${ringClass}`}
              >
                {step + 1 >= rounds.length
                  ? L('Voir le résultat', 'See the result', 'Ver el resultado')
                  : L('Suivant', 'Next', 'Siguiente')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
};

export default PhishingGame;
