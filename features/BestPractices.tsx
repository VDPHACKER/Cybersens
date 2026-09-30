import React, { useState } from 'react';
import { BEST_PRACTICES } from '../services/learningContent';
import { BestPracticeItem } from '../types';
import {
  Key,
  ShieldCheck,
  RefreshCw,
  Link2,
  UserCheck,
  ShieldAlert,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Cpu,
} from 'lucide-react';
import { addPoints } from '../services/persistenceService';
import { useI18n } from '../services/i18n';
import { DeepfakeTester } from '../components/DeepfakeTester';

interface BestPracticesProps {
  onBack?: () => void;
}

export const BestPractices: React.FC<BestPracticesProps> = () => {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<'practices' | 'deepfakes'>('practices');
  const [expandedId, setExpandedId] = useState<string | null>('bp-1');
  const [checkedMap, setCheckedMap] = useState<{ [key: string]: boolean }>({});

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Key':
        return <Key className="w-5 h-5 text-white" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-white" />;
      case 'RefreshCw':
        return <RefreshCw className="w-5 h-5 text-white" />;
      case 'Link2':
        return <Link2 className="w-5 h-5 text-white" />;
      case 'UserCheck':
        return <UserCheck className="w-5 h-5 text-white" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-5 h-5 text-white" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-white" />;
    }
  };

  const toggleCheck = (itemId: string, checkIdx: number) => {
    const key = `${itemId}-${checkIdx}`;
    const next = !checkedMap[key];
    setCheckedMap((prev) => ({ ...prev, [key]: next }));
    if (next) {
      addPoints(10);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Navigation Switch between Reflexes and Deepfake Tester */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveSection('practices')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSection === 'practices'
              ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{t('practices.tab_reflexes', 'Guide des Réflexes Vitaux')}</span>
        </button>

        <button
          onClick={() => setActiveSection('deepfakes')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSection === 'deepfakes'
              ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4 text-amber-500" />
          <span>{t('practices.tab_deepfakes', 'Testeur de Deepfakes IA')}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-400 text-[10px] font-black">
            {t('practices.badge_new', 'Nouveau')}
          </span>
        </button>
      </div>

      {activeSection === 'deepfakes' ? (
        <DeepfakeTester />
      ) : (
        <>
          {/* Header matching Screen 5 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('practices.title', 'Bonnes pratiques')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t(
                  'practices.subtitle',
                  'Des gestes simples et quotidiens pour une cyber-protection maximale.',
                )}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20 flex items-center gap-1.5 text-xs font-bold shadow-sm">
              <Sparkles className="w-4 h-4 text-sky-700" />
              <span className="hidden sm:inline">
                {t('practices.vital_count', '6 réflexes vitaux')}
              </span>
            </div>
          </div>

          {/* Best Practices Cards List */}
          <div className="space-y-3.5">
            {BEST_PRACTICES.map((item: BestPracticeItem) => {
              const isExpanded = expandedId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all overflow-hidden shadow-sm ${
                    isExpanded
                      ? 'bg-white dark:bg-slate-900 border-sky-500/50 shadow-md ring-1 ring-sky-500/20'
                      : 'bg-white dark:bg-slate-900/80 border-slate-200/90 dark:border-slate-800 hover:border-sky-400'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex items-center justify-between p-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow-md`}
                      >
                        {getIcon(item.icon)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0 ml-2">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {/* Card Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/50 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {item.details}
                      </div>

                      {/* Checklist */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                          {t(
                            'practices.actions_title',
                            'Actions recommandées (+10 XP par validation) :',
                          )}
                        </span>
                        <div className="space-y-1.5">
                          {item.checklist.map((action, idx) => {
                            const isDone = checkedMap[`${item.id}-${idx}`];
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleCheck(item.id, idx)}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                                  isDone
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold'
                                    : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                                    isDone
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'border-slate-300 dark:border-slate-600'
                                  }`}
                                >
                                  {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className={isDone ? 'line-through opacity-80' : ''}>
                                  {action}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
