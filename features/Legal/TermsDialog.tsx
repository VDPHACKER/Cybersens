import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../../services/i18n';
import { getTerms } from './termsContent';

interface TermsDialogProps {
  contactEmail: string | null;
  onClose: () => void;
}

/** Fenêtre de lecture des conditions d'utilisation (fermeture : bouton, Échap ou clic sur le fond). */
export const TermsDialog: React.FC<TermsDialogProps> = ({ contactEmail, onClose }) => {
  const { language } = useI18n();
  const doc = getTerms(language, contactEmail);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-700">
          <div>
            <h2 id="terms-title" className="text-lg font-black text-slate-900 dark:text-white">
              {doc.title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{doc.updated}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {doc.sections.map((s) => (
            <section key={s.title}>
              <h3 className="mb-1.5 font-bold text-slate-900 dark:text-white">{s.title}</h3>
              {s.paragraphs.map((p) => (
                <p key={p} className="mb-2">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
