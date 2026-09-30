import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyRound, Lightbulb, SkipForward, Check } from 'lucide-react';
import { audioService } from '../../services/audioService';
import { useL } from '../../components/ui';
import { GameShell, GameResult, Stat, shuffle, ringClass } from './GameShell';

// Décodeur de César : chaque lettre est décalée dans l'alphabet. Il faut retrouver le mot d'origine.
const WORDS = [
  'FIREWALL',
  'PASSWORD',
  'PHISHING',
  'MALWARE',
  'ENCRYPT',
  'TROJAN',
  'BOTNET',
  'SPYWARE',
  'BACKDOOR',
  'EXPLOIT',
  'PAYLOAD',
  'KEYLOGGER',
  'RANSOMWARE',
  'SNIFFING',
  'HASHING',
  'DECRYPT',
];
const TOTAL_SECONDS = 90;
const SHOWN_SHIFT_ROUNDS = 3; // les premiers mots affichent la clé de décalage

const caesar = (word: string, shift: number) =>
  word.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65));

const CipherGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const L = useL();
  const [seed, setSeed] = useState(0);
  const words = useMemo(() => shuffle(WORDS), [seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [round, setRound] = useState(0);
  const [solved, setSolved] = useState(0);
  const [shift, setShift] = useState(() => 1 + Math.floor(Math.random() * 25));
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const inputRef = useRef<HTMLInputElement>(null);
  const done = timeLeft <= 0;

  const answer = words[round % words.length];
  const cipher = caesar(answer, shift);
  const shiftVisible = round < SHOWN_SHIFT_ROUNDS || hintUsed;

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [done, seed]);

  useEffect(() => {
    if (!done) inputRef.current?.focus();
  }, [round, done]);

  const nextWord = () => {
    setRound((r) => r + 1);
    setShift(1 + Math.floor(Math.random() * 25));
    setInput('');
    setWrong(false);
    setHintUsed(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (done) return;
    if (input.trim().toUpperCase() === answer) {
      setSolved((s) => s + 1);
      audioService.playSuccess();
      nextWord();
    } else {
      setWrong(true);
      audioService.playError();
    }
  };

  const replay = () => {
    setSeed((s) => s + 1);
    setRound(0);
    setSolved(0);
    setShift(1 + Math.floor(Math.random() * 25));
    setInput('');
    setWrong(false);
    setHintUsed(false);
    setTimeLeft(TOTAL_SECONDS);
  };

  const verdict =
    solved >= 8
      ? L('Cryptanalyste !', 'Cryptanalyst!', '¡Criptoanalista!')
      : solved >= 4
        ? L('Bon décodeur', 'Good decoder', 'Buen decodificador')
        : L('Continuez à vous exercer', 'Keep practising', 'Siga practicando');

  return (
    <GameShell
      title={L('Décodeur César', 'Caesar decoder', 'Decodificador César')}
      subtitle={L(
        'Déchiffrez un maximum de mots en 90 secondes.',
        'Decrypt as many words as you can in 90 seconds.',
        'Descifre tantas palabras como pueda en 90 segundos.',
      )}
      icon={KeyRound}
      tone="from-cyan-500 to-blue-700"
      onExit={onExit}
      right={
        !done && (
          <div className="flex gap-2">
            <Stat
              label={L('Trouvés', 'Solved', 'Resueltas')}
              value={solved}
              tone="text-emerald-300"
            />
            <Stat
              label={L('Temps', 'Time', 'Tiempo')}
              value={`${timeLeft}s`}
              tone={timeLeft <= 15 ? 'text-rose-300' : 'text-white'}
            />
          </div>
        )
      }
    >
      {done ? (
        <GameResult
          score={solved}
          total={Math.max(round + 1, solved)}
          xp={solved * 3}
          verdict={verdict}
          detail={L(
            `${solved} mot(s) déchiffré(s)`,
            `${solved} word(s) decrypted`,
            `${solved} palabra(s) descifrada(s)`,
          )}
          onReplay={replay}
          onExit={onExit}
        />
      ) : (
        <div className="space-y-4">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={timeLeft}
            aria-valuemin={0}
            aria-valuemax={TOTAL_SECONDS}
          >
            <div
              className={`h-full rounded-full transition-all ${timeLeft <= 15 ? 'bg-rose-500' : 'bg-cyan-400'}`}
              style={{ width: `${(timeLeft / TOTAL_SECONDS) * 100}%` }}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-ink-800 p-6 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {L('Mot chiffré', 'Encrypted word', 'Palabra cifrada')}
            </p>
            <p
              className="mt-3 break-all font-mono text-4xl font-black tracking-[0.25em] text-cyan-300"
              aria-label={cipher.split('').join(' ')}
            >
              {cipher}
            </p>
            <p className="mt-4 text-sm text-slate-300">
              {shiftVisible ? (
                <>
                  {L('Décalage de', 'Shift of', 'Desplazamiento de')}{' '}
                  <strong className="text-white">{shift}</strong>{' '}
                  {L('lettres : A devient', 'letters: A becomes', 'letras: A se convierte en')}{' '}
                  <strong className="text-white">{caesar('A', shift)}</strong>
                </>
              ) : (
                <span className="text-slate-400">
                  {L(
                    'Décalage inconnu : à vous de le deviner !',
                    'Unknown shift: work it out!',
                    'Desplazamiento desconocido: ¡adivínelo!',
                  )}
                </span>
              )}
            </p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="cipher-answer" className="sr-only">
              {L('Votre réponse', 'Your answer', 'Su respuesta')}
            </label>
            <input
              id="cipher-answer"
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''));
                setWrong(false);
              }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={L('Mot déchiffré', 'Decrypted word', 'Palabra descifrada')}
              aria-invalid={wrong}
              className={`min-w-0 flex-1 rounded-xl border bg-black/40 px-4 py-3.5 font-mono text-lg font-black uppercase tracking-widest text-white placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-500 focus:outline-none focus:ring-2 ${wrong ? 'border-rose-400 focus:ring-rose-400' : 'border-white/15 focus:ring-cyan-400'}`}
            />
            <button
              type="submit"
              disabled={!input}
              className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-black text-white transition-colors hover:bg-brand-light disabled:opacity-50 ${ringClass}`}
            >
              <Check className="h-4 w-4" aria-hidden="true" /> {L('Valider', 'Submit', 'Validar')}
            </button>
          </form>
          {wrong && (
            <p role="alert" className="text-sm font-bold text-rose-300">
              {L(
                'Ce n’est pas le bon mot, réessayez.',
                'That is not the right word, try again.',
                'No es la palabra correcta, inténtelo de nuevo.',
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {!shiftVisible && (
              <button
                type="button"
                onClick={() => setHintUsed(true)}
                className={`inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/5 ${ringClass}`}
              >
                <Lightbulb className="h-4 w-4 text-amber-300" aria-hidden="true" />{' '}
                {L('Révéler le décalage', 'Reveal the shift', 'Revelar el desplazamiento')}
              </button>
            )}
            <button
              type="button"
              onClick={nextWord}
              className={`inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/5 ${ringClass}`}
            >
              <SkipForward className="h-4 w-4" aria-hidden="true" />{' '}
              {L('Passer ce mot', 'Skip this word', 'Saltar esta palabra')}
            </button>
          </div>
        </div>
      )}
    </GameShell>
  );
};

export default CipherGame;
