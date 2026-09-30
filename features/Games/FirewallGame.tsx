import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrickWall, Check, X, ShieldCheck, ShieldX, ArrowRight } from 'lucide-react';
import { audioService } from '../../services/audioService';
import { useL } from '../../components/ui';
import { GameShell, GameResult, Stat, pick, shuffle, ringClass } from './GameShell';

type Action = 'allow' | 'deny';
interface Rule {
  action: Action;
  proto: 'tcp' | 'udp' | 'any';
  ports: number[] | 'any';
  from: 'any' | 'internal' | 'external';
}
interface Packet {
  proto: 'tcp' | 'udp';
  port: number;
  internal: boolean;
  ip: string;
}

const PACKETS = 12;
const SECONDS_PER_PACKET = 7;

// Ensembles de règles : la première règle qui correspond s'applique, sinon tout est refusé.
const PRESETS: Rule[][] = [
  [
    { action: 'allow', proto: 'tcp', ports: [443], from: 'any' },
    { action: 'allow', proto: 'tcp', ports: [22], from: 'internal' },
  ],
  [
    { action: 'deny', proto: 'tcp', ports: [23, 3389], from: 'external' },
    { action: 'allow', proto: 'tcp', ports: [80, 443], from: 'any' },
    { action: 'allow', proto: 'udp', ports: [53], from: 'internal' },
  ],
  [
    { action: 'allow', proto: 'tcp', ports: [443], from: 'any' },
    { action: 'allow', proto: 'tcp', ports: [25, 3306], from: 'internal' },
  ],
];

const SERVICES: { proto: 'tcp' | 'udp'; port: number; name: string }[] = [
  { proto: 'tcp', port: 22, name: 'SSH' },
  { proto: 'tcp', port: 23, name: 'Telnet' },
  { proto: 'tcp', port: 25, name: 'SMTP' },
  { proto: 'udp', port: 53, name: 'DNS' },
  { proto: 'tcp', port: 80, name: 'HTTP' },
  { proto: 'tcp', port: 443, name: 'HTTPS' },
  { proto: 'tcp', port: 3306, name: 'MySQL' },
  { proto: 'tcp', port: 3389, name: 'RDP' },
  { proto: 'udp', port: 123, name: 'NTP' },
];

const serviceName = (p: { proto: string; port: number }) =>
  SERVICES.find((s) => s.proto === p.proto && s.port === p.port)?.name ?? '?';
const rand = (n: number) => Math.floor(Math.random() * n);

const matches = (r: Rule, p: Packet) =>
  (r.proto === 'any' || r.proto === p.proto) &&
  (r.ports === 'any' || r.ports.includes(p.port)) &&
  (r.from === 'any' || (r.from === 'internal') === p.internal);

/** Décision du pare-feu : première règle correspondante, sinon refus par défaut. */
const decide = (rules: Rule[], p: Packet): { action: Action; rule: number | null } => {
  const i = rules.findIndex((r) => matches(r, p));
  return i === -1 ? { action: 'deny', rule: null } : { action: rules[i].action, rule: i };
};

const makePacket = (): Packet => {
  const s = SERVICES[rand(SERVICES.length)];
  const internal = Math.random() < 0.5;
  const ip = internal
    ? `10.0.${rand(250) + 1}.${rand(250) + 1}`
    : `${['203.0.113', '198.51.100', '192.0.2'][rand(3)]}.${rand(250) + 1}`;
  return { proto: s.proto, port: s.port, internal, ip };
};

const FirewallGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const L = useL();
  const [seed, setSeed] = useState(0);
  const { rules, packets } = useMemo(() => {
    const rules = pick(PRESETS, 1)[0];
    // Mélange équilibré : autant de paquets à autoriser qu'à bloquer, environ
    const allow: Packet[] = [];
    const deny: Packet[] = [];
    let guard = 0;
    while ((allow.length < PACKETS / 2 || deny.length < PACKETS / 2) && guard++ < 500) {
      const p = makePacket();
      const bucket = decide(rules, p).action === 'allow' ? allow : deny;
      if (bucket.length < PACKETS / 2) bucket.push(p);
    }
    return { rules, packets: shuffle([...allow, ...deny]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_PACKET);
  const [feedback, setFeedback] = useState<null | {
    ok: boolean;
    timeout: boolean;
    expected: Action;
    rule: number | null;
  }>(null);
  const done = step >= packets.length;
  const packet = packets[step];
  const feedbackRef = useRef(feedback);
  feedbackRef.current = feedback;

  const answer = useCallback(
    (chosen: Action | null) => {
      if (feedbackRef.current || !packet) return;
      const verdict = decide(rules, packet);
      const ok = chosen === verdict.action;
      if (ok) {
        setScore((s) => s + 1);
        audioService.playSuccess();
      } else audioService.playError();
      setFeedback({ ok, timeout: chosen === null, expected: verdict.action, rule: verdict.rule });
    },
    [packet, rules],
  );

  // Compte à rebours par paquet
  useEffect(() => {
    if (done || feedback) return;
    setTimeLeft(SECONDS_PER_PACKET);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 0.1) {
          clearInterval(id);
          answer(null);
          return 0;
        }
        return +(t - 0.1).toFixed(1);
      });
    }, 100);
    return () => clearInterval(id);
  }, [step, done, feedback, answer]);

  const replay = () => {
    setSeed((s) => s + 1);
    setStep(0);
    setScore(0);
    setFeedback(null);
  };

  const describe = (r: Rule) => {
    const proto =
      r.proto === 'any'
        ? L('tout protocole', 'any protocol', 'cualquier protocolo')
        : r.proto.toUpperCase();
    const ports =
      r.ports === 'any'
        ? L('tout port', 'any port', 'cualquier puerto')
        : `${L('port', 'port', 'puerto')} ${r.ports.join(', ')}`;
    const from =
      r.from === 'any'
        ? L('de partout', 'from anywhere', 'desde cualquier origen')
        : r.from === 'internal'
          ? L(
              'depuis le réseau interne (10.0.x.x)',
              'from the internal network (10.0.x.x)',
              'desde la red interna (10.0.x.x)',
            )
          : L('depuis l’extérieur', 'from outside', 'desde el exterior');
    return `${proto} · ${ports} · ${from}`;
  };

  const verdictText =
    score >= 11
      ? L('Administrateur réseau !', 'Network admin!', '¡Administrador de redes!')
      : score >= 8
        ? L('Bonne configuration', 'Solid configuration', 'Buena configuración')
        : L('Revoyez vos règles', 'Review your rules', 'Revise sus reglas');

  return (
    <GameShell
      title={L('Pare-feu', 'Firewall', 'Cortafuegos')}
      subtitle={L(
        'Autorisez ou bloquez chaque paquet selon les règles.',
        'Allow or block each packet according to the rules.',
        'Permita o bloquee cada paquete según las reglas.',
      )}
      icon={BrickWall}
      tone="from-orange-500 to-red-700"
      onExit={onExit}
      right={
        !done && (
          <Stat
            label={L('Score', 'Score', 'Puntos')}
            value={`${score}/${packets.length}`}
            tone="text-emerald-300"
          />
        )
      }
    >
      {done ? (
        <GameResult
          score={score}
          total={packets.length}
          xp={(score / packets.length) * 20}
          verdict={verdictText}
          onReplay={replay}
          onExit={onExit}
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-ink-800 p-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {L('Règles (dans l’ordre)', 'Rules (in order)', 'Reglas (en orden)')}
            </p>
            <ol className="mt-2 space-y-1.5">
              {rules.map((r, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${feedback?.rule === i ? 'bg-cyan-500/15 ring-1 ring-cyan-400/50' : 'bg-white/5'}`}
                >
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 font-black ${r.action === 'allow' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}
                  >
                    {r.action === 'allow'
                      ? L('AUTORISER', 'ALLOW', 'PERMITIR')
                      : L('BLOQUER', 'BLOCK', 'BLOQUEAR')}
                  </span>
                  <span className="text-slate-200">{describe(r)}</span>
                </li>
              ))}
              <li
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${feedback && feedback.rule === null ? 'bg-cyan-500/15 ring-1 ring-cyan-400/50' : 'bg-white/5'}`}
              >
                <span className="shrink-0 rounded bg-rose-500/20 px-1.5 py-0.5 font-black text-rose-300">
                  {L('BLOQUER', 'BLOCK', 'BLOQUEAR')}
                </span>
                <span className="text-slate-200">
                  {L(
                    'tout le reste (règle par défaut)',
                    'everything else (default rule)',
                    'todo lo demás (regla por defecto)',
                  )}
                </span>
              </li>
            </ol>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>
              {L('Paquet', 'Packet', 'Paquete')} {step + 1} / {packets.length}
            </span>
            <span className={timeLeft <= 2 ? 'text-rose-300' : ''}>
              {feedback ? '' : `${timeLeft.toFixed(1)} s`}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div
              className={`h-full rounded-full transition-all duration-100 ${timeLeft <= 2 ? 'bg-rose-500' : 'bg-cyan-400'}`}
              style={{ width: `${feedback ? 0 : (timeLeft / SECONDS_PER_PACKET) * 100}%` }}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 font-mono text-sm text-white">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <div className="text-[10px] uppercase text-slate-500">
                  {L('Source', 'Source', 'Origen')}
                </div>
                <div>{packet.ip}</div>
                <div className="text-[10px] text-slate-400">
                  {packet.internal
                    ? L('interne', 'internal', 'interna')
                    : L('extérieur', 'outside', 'exterior')}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">
                  {L('Protocole', 'Protocol', 'Protocolo')}
                </div>
                <div className="uppercase">{packet.proto}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">
                  {L('Port', 'Port', 'Puerto')}
                </div>
                <div>{packet.port}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">
                  {L('Service', 'Service', 'Servicio')}
                </div>
                <div>{serviceName(packet)}</div>
              </div>
            </div>
          </div>

          {!feedback ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => answer('allow')}
                className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 px-4 py-4 text-sm font-black text-white transition-transform hover:scale-[1.02] ${ringClass}`}
              >
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />{' '}
                {L('Autoriser', 'Allow', 'Permitir')}
              </button>
              <button
                onClick={() => answer('deny')}
                className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 px-4 py-4 text-sm font-black text-white transition-transform hover:scale-[1.02] ${ringClass}`}
              >
                <ShieldX className="h-5 w-5" aria-hidden="true" />{' '}
                {L('Bloquer', 'Block', 'Bloquear')}
              </button>
            </div>
          ) : (
            <div
              className={`rounded-2xl border p-4 ${feedback.ok ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-rose-400/40 bg-rose-500/10'}`}
              role="status"
            >
              <p
                className={`flex items-center gap-2 text-sm font-black ${feedback.ok ? 'text-emerald-300' : 'text-rose-300'}`}
              >
                {feedback.ok ? (
                  <Check className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <X className="h-5 w-5" aria-hidden="true" />
                )}
                {feedback.timeout
                  ? L('Temps écoulé. ', 'Time is up. ', 'Tiempo agotado. ')
                  : feedback.ok
                    ? L('Correct. ', 'Correct. ', 'Correcto. ')
                    : L('Erreur. ', 'Wrong. ', 'Error. ')}
                {L('Il fallait', 'It should have been', 'Debía')}{' '}
                {feedback.expected === 'allow'
                  ? L('autoriser', 'allowed', 'permitir')
                  : L('bloquer', 'blocked', 'bloquear')}{' '}
                {feedback.rule === null
                  ? L('(règle par défaut).', '(default rule).', '(regla por defecto).')
                  : `(${L('règle', 'rule', 'regla')} ${feedback.rule + 1}).`}
              </p>
              <button
                onClick={() => {
                  setFeedback(null);
                  setStep((s) => s + 1);
                }}
                className={`mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-black text-white hover:bg-brand-light ${ringClass}`}
              >
                {step + 1 >= packets.length
                  ? L('Voir le résultat', 'See the result', 'Ver el resultado')
                  : L('Paquet suivant', 'Next packet', 'Siguiente paquete')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
};

export default FirewallGame;
