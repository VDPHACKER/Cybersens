import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, BookOpen, Wrench, LayoutGrid, FileText } from 'lucide-react';
import { AppTab } from '../types';
import { useI18n } from '../services/i18n';
import { getCourseModules } from '../services/learningContent';
import { useL } from './ui';

interface Result {
  key: string;
  label: string;
  hint: string;
  kind: 'page' | 'course' | 'lesson' | 'tool';
  go: () => void;
}

const ICONS = { page: LayoutGrid, course: BookOpen, lesson: FileText, tool: Wrench } as const;

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

interface Props {
  onNavigate: (tab: AppTab) => void;
  className?: string;
}

/** Recherche globale : pages, modules, leçons et outils. Raccourci : Ctrl/Cmd + K. */
export const GlobalSearch: React.FC<Props> = ({ onNavigate, className = '' }) => {
  const { language } = useI18n();
  const L = useL();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const index = useMemo<Result[]>(() => {
    const open_ = (tab: AppTab, storeKey?: string, storeValue?: string) => () => {
      try {
        if (storeKey && storeValue) sessionStorage.setItem(storeKey, storeValue);
      } catch {
        /* stockage indisponible : on navigue quand même */
      }
      onNavigate(tab);
    };
    const pages: [AppTab, string][] = [
      [AppTab.HOME, L('Tableau de bord', 'Dashboard', 'Panel')],
      [AppTab.LEARN, L('Formations', 'Courses', 'Formaciones')],
      [AppTab.QUIZ, 'Quiz'],
      [AppTab.CTF, L('Arène CTF', 'CTF Arena', 'Arena CTF')],
      [AppTab.GAMES, L('Mini-jeux', 'Mini-games', 'Minijuegos')],
      [AppTab.TOOLS, L('Outils de sécurité', 'Security tools', 'Herramientas de seguridad')],
      [AppTab.AI_CHAT, L('Assistant IA', 'AI assistant', 'Asistente IA')],
      [AppTab.NEWS, L('Actualités', 'News', 'Noticias')],
      [AppTab.LEADERBOARD, L('Classements', 'Leaderboard', 'Clasificaciones')],
      [AppTab.COMMUNITY, L('Communauté', 'Community', 'Comunidad')],
      [AppTab.PRACTICES, L('Bonnes pratiques', 'Best practices', 'Buenas prácticas')],
      [AppTab.PROFILE, L('Mon profil', 'My profile', 'Mi perfil')],
    ];
    const tools: [string, string][] = [
      ['deepfake', L('Détecteur de deepfake', 'Deepfake detector', 'Detector de deepfakes')],
      ['analyzer', L('Audit de logs IA', 'AI log audit', 'Auditoría de logs IA')],
      ['links', L('Analyseur de liens', 'Link checker', 'Comprobador de enlaces')],
      [
        'email',
        L(
          'Analyseur d’e-mails (phishing)',
          'Phishing email scanner',
          'Escáner de correos (phishing)',
        ),
      ],
      [
        'password',
        L('Testeur de mot de passe', 'Password strength tester', 'Medidor de contraseñas'),
      ],
      ['audit', L('Journal d’audit', 'System logs', 'Registros')],
    ];
    const out: Result[] = [
      ...pages.map(([tab, label]) => ({
        key: `p-${tab}`,
        label,
        hint: L('Page', 'Page', 'Página'),
        kind: 'page' as const,
        go: open_(tab),
      })),
      ...tools.map(([id, label]) => ({
        key: `t-${id}`,
        label,
        hint: L('Outil', 'Tool', 'Herramienta'),
        kind: 'tool' as const,
        go: open_(AppTab.TOOLS, 'cybersens-open-tool', id),
      })),
    ];
    for (const m of getCourseModules(language)) {
      out.push({
        key: `c-${m.id}`,
        label: m.title,
        hint: L('Formation', 'Course', 'Formación'),
        kind: 'course',
        go: open_(AppTab.LEARN, 'cybersens-open-course', m.id),
      });
      for (const lesson of m.lessons)
        out.push({
          key: `l-${m.id}-${lesson.id}`,
          label: lesson.title,
          hint: m.title,
          kind: 'lesson',
          go: open_(AppTab.LEARN, 'cybersens-open-course', m.id),
        });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, onNavigate]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (q.length < 2) return [];
    return index.filter((r) => norm(r.label).includes(q) || norm(r.hint).includes(q)).slice(0, 8);
  }, [query, index]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  const choose = (r: Result) => {
    r.go();
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showList = open && query.trim().length >= 2;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls="global-search-results"
          aria-autocomplete="list"
          aria-label={L(
            'Rechercher une leçon, un défi, un outil',
            'Search a lesson, a challenge, a tool',
            'Buscar una lección, un reto, una herramienta',
          )}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={L(
            'Rechercher une leçon, un défi, un outil…',
            'Search a lesson, a challenge, a tool…',
            'Buscar una lección, un reto, una herramienta…',
          )}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-white/10 dark:bg-ink-800/80 dark:text-white"
        />
      </div>

      {showList && (
        <ul
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-ink-800"
        >
          {results.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
              {L('Aucun résultat', 'No results', 'Sin resultados')}
            </li>
          ) : (
            results.map((r, i) => {
              const Icon = ICONS[r.kind];
              return (
                <li key={r.key} role="option" aria-selected={i === active}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(r)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none ${
                      i === active ? 'bg-brand/10' : ''
                    }`}
                  >
                    <Icon
                      className="h-4 w-4 shrink-0 text-brand dark:text-brand-light"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {r.label}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {r.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
