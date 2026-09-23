import React, { useState } from 'react';
import { COURSE_MODULES } from '../services/learningContent';
import { CourseModule, Certificate } from '../types';
import { CourseReaderModal } from '../components/CourseReaderModal';
import { CertificateModal } from '../components/CertificateModal';
import {
  Search,
  Shield,
  Lock,
  AlertTriangle,
  Share2,
  Smartphone,
  Building2,
  BookOpen,
  ChevronRight,
  Award,
  Sparkles,
  CheckCircle2,
  GraduationCap,
  Cpu,
  Terminal,
} from 'lucide-react';
import { getCertificates, getCompletedLessons } from '../services/persistenceService';
import { useI18n } from '../services/i18n';

interface LearnProps {
  onBack?: () => void;
}

export const Learn: React.FC<LearnProps> = () => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<
    'Tous' | 'Débutant' | 'Intermédiaire' | 'Avancé'
  >('Tous');
  const [activeCourse, setActiveCourse] = useState<CourseModule | null>(null);
  const [viewingCertificate, setViewingCertificate] = useState<Certificate | null>(null);

  const certificates = getCertificates();

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield':
        return <Shield className="w-5 h-5 text-white" />;
      case 'Lock':
        return <Lock className="w-5 h-5 text-white" />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-5 h-5 text-white" />;
      case 'Share2':
        return <Share2 className="w-5 h-5 text-white" />;
      case 'Smartphone':
        return <Smartphone className="w-5 h-5 text-white" />;
      case 'Building2':
        return <Building2 className="w-5 h-5 text-white" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-white" />;
      case 'Terminal':
        return <Terminal className="w-5 h-5 text-white" />;
      case 'Search':
        return <Search className="w-5 h-5 text-white" />;
      default:
        return <BookOpen className="w-5 h-5 text-white" />;
    }
  };

  const filteredModules = COURSE_MODULES.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'Tous' || m.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 sm:py-7 space-y-6">
      {/* Header matching Screen 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('learn.title', 'Apprendre & Se Former')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t(
              'learn.subtitle',
              'Parcours e-learning complets avec cas réels, audio et certificat officiel de réussite.',
            )}
          </p>
        </div>

        {/* Certificate Quick Badge */}
        {certificates.length > 0 && (
          <button
            onClick={() => setViewingCertificate(certificates[0])}
            className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold hover:scale-105 transition-transform shadow-sm"
          >
            <Award className="w-4 h-4 text-amber-600" />
            <span>
              {certificates.length} {t('learn.unlocked_certs', 'Certificat(s) Débloqué(s)')}
            </span>
          </button>
        )}
      </div>

      {/* E-Learning Feature Highlights Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-1">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            6 {t('learn.stat_courses', 'Formations')}
          </span>
          <span className="text-[10px] text-slate-400">
            {t('learn.stat_courses_sub', 'Pratiques & interactives')}
          </span>
        </div>

        <div className="flex flex-col items-center border-x border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {t('learn.stat_cert', 'Certificat')}
          </span>
          <span className="text-[10px] text-slate-400">
            {t('learn.stat_cert_sub', 'À chaque module réussi')}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {t('learn.stat_audio', 'Synthèse Audio')}
          </span>
          <span className="text-[10px] text-slate-400">
            {t('learn.stat_audio_sub', 'Écoute en mobilité')}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t(
            'learn.search_placeholder',
            'Rechercher une formation (ex: Phishing, Mots de passe, Mobile Money)...',
          )}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            {t('home.clear', 'Effacer')}
          </button>
        )}
      </div>

      {/* Level Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'Tous' as const, label: t('learn.all', 'Tous') },
          { key: 'Débutant' as const, label: t('learn.beginner', 'Débutant') },
          { key: 'Intermédiaire' as const, label: t('learn.intermediate', 'Intermédiaire') },
          { key: 'Avancé' as const, label: t('learn.advanced', 'Avancé') },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setSelectedLevel(item.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedLevel === item.key
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shadow-sm'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Courses List matching Screen 3 with cards */}
      <div className="space-y-3.5">
        {filteredModules.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
            <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">
              {t('learn.no_results', 'Aucune formation trouvée')}
            </p>
            <p className="text-xs text-slate-400 mt-1">Essayez un autre mot-clé ou niveau.</p>
          </div>
        ) : (
          filteredModules.map((module) => {
            const hasCertificate = certificates.some((c) => c.courseId === module.id);
            const doneCount = getCompletedLessons(module.id).filter((id) =>
              module.lessons.some((l) => l.id === id),
            ).length;
            const progress = hasCertificate
              ? 100
              : Math.round((doneCount / module.lessons.length) * 100);
            return (
              <div
                key={module.id}
                onClick={() => setActiveCourse(module)}
                className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 hover:border-sky-500 hover:shadow-md transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Module Icon Badge */}
                  <div
                    className={`w-12 h-12 rounded-2xl ${module.color} flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform`}
                  >
                    {getModuleIcon(module.icon)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors truncate">
                        {module.title}
                      </h3>
                      {hasCertificate && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-black border border-amber-200 dark:border-amber-800">
                          <Award className="w-3 h-3" /> {t('learn.certified_badge', 'Certifié')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {module.lessonsCount} {t('learn.lessons', 'leçons')}
                      </span>
                      <span>•</span>
                      <span>{module.duration}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline text-sky-600 dark:text-sky-400 font-medium">
                        {module.level}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress percentage & CTA */}
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-sky-600">
                      {progress}%
                    </span>
                    <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${hasCertificate ? 'bg-amber-500' : 'bg-sky-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reader Modal */}
      {activeCourse && (
        <CourseReaderModal course={activeCourse} onClose={() => setActiveCourse(null)} />
      )}

      {/* Certificate Viewer Modal */}
      {viewingCertificate && (
        <CertificateModal
          certificate={viewingCertificate}
          onClose={() => setViewingCertificate(null)}
        />
      )}
    </div>
  );
};
