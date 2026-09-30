import React, { useState } from 'react';
import { getCourseModules } from '../services/learningContent';
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
  LayoutGrid,
  Globe,
  ClipboardList,
  Bot,
  Swords,
  ScanSearch,
  Cloud,
} from 'lucide-react';
import { getCertificates, getCompletedLessons } from '../services/persistenceService';
import { useI18n } from '../services/i18n';
import { useL } from '../components/ui';

interface LearnProps {
  onBack?: () => void;
}

export const Learn: React.FC<LearnProps> = () => {
  const { t, language } = useI18n();
  const l = useL();
  const localizedModules = getCourseModules(language);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<
    'Tous' | 'Débutant' | 'Intermédiaire' | 'Avancé'
  >('Tous');
  const [selectedTrack, setSelectedTrack] = useState<string>('Tous');
  const [activeCourse, setActiveCourse] = useState<CourseModule | null>(() => {
    // Module demandé depuis l'accueil (« Reprendre ma formation ») ou la recherche globale
    try {
      const wanted = sessionStorage.getItem('cybersens-open-course');
      if (wanted) sessionStorage.removeItem('cybersens-open-course');
      return wanted ? (localizedModules.find((m) => m.id === wanted) ?? null) : null;
    } catch {
      return null;
    }
  });
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

  const filteredModules = localizedModules.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.curriculumTrack.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'Tous' || m.level === selectedLevel;
    const matchesTrack =
      selectedTrack === 'Tous' ||
      (selectedTrack === 'fondations' && ['module-1', 'module-2', 'module-3'].includes(m.id)) ||
      (selectedTrack === 'reseaux' && m.id === 'module-4') ||
      (selectedTrack === 'mobile' && m.id === 'module-5') ||
      (selectedTrack === 'gouvernance' && m.id === 'module-6') ||
      (selectedTrack === 'ia' && m.id === 'module-7') ||
      (selectedTrack === 'offensif' && m.id === 'module-8') ||
      (selectedTrack === 'dfir' && m.id === 'module-9') ||
      (selectedTrack === 'cloud' && ['module-10', 'module-11', 'module-12'].includes(m.id));
    return matchesSearch && matchesLevel && matchesTrack;
  });

  const totalLessons = localizedModules.reduce((sum, module) => sum + module.lessons.length, 0);
  const completedLessonsCount = localizedModules.reduce((sum, module) => {
    const done = getCompletedLessons(module.id);
    return sum + done.filter((id) => module.lessons.some((lesson) => lesson.id === id)).length;
  }, 0);
  const completedModulesCount = localizedModules.filter((module) => {
    const done = getCompletedLessons(module.id);
    return (
      done.length >= module.lessons.length ||
      certificates.some((cert) => cert.courseId === module.id)
    );
  }).length;
  const certificationProgress = Math.min(
    100,
    Math.round((completedModulesCount / localizedModules.length) * 100),
  );
  const featuredModule = filteredModules[0] ?? localizedModules[0];
  const certificationMilestones = [
    {
      title: l('Fondations', 'Foundations', 'Fundamentos'),
      subtitle: l(
        'Savoir, sécuriser, analyser',
        'Know, secure, analyse',
        'Saber, proteger, analizar',
      ),
      completed: completedModulesCount >= 2,
    },
    {
      title: l('Pratiques', 'Practice', 'Práctica'),
      subtitle: l(
        'Laboratoires et cas réels',
        'Labs and real cases',
        'Laboratorios y casos reales',
      ),
      completed: completedModulesCount >= 4,
    },
    {
      title: l('Certification', 'Certification', 'Certificación'),
      subtitle: l(
        'Examen final & badge officiel',
        'Final exam & official badge',
        'Examen final e insignia oficial',
      ),
      completed: certificates.length > 0,
    },
  ];

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
            <Award className="w-4 h-4 text-amber-700" />
            <span>
              {certificates.length} {t('learn.unlocked_certs', 'Certificat(s) Débloqué(s)')}
            </span>
          </button>
        )}
      </div>

      <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-100 via-sky-50 to-indigo-100 p-4 shadow-sm dark:border-amber-800/60 dark:from-amber-950/30 dark:via-sky-950/20 dark:to-indigo-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
                Certification premium
              </p>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Badge officiel CyberSens Academy
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Des parcours structurés, des évaluations et des compétences exploitables en
                entreprise.
              </p>
            </div>
          </div>

          <button
            onClick={() => certificates[0] && setViewingCertificate(certificates[0])}
            disabled={!certificates[0]}
            className="self-start rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
          >
            {certificates[0]
              ? l('Voir mon badge', 'View my badge', 'Ver mi insignia')
              : l('Badge à débloquer', 'Badge to unlock', 'Insignia por desbloquear')}
          </button>
        </div>
      </div>

      {/* E-Learning Feature Highlights Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col items-center rounded-2xl bg-slate-50/80 p-2 dark:bg-slate-800/60">
          <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 flex items-center justify-center mb-1">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {localizedModules.length} {t('learn.stat_courses', 'Formations')}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {t('learn.stat_courses_sub', 'Pratiques & interactives')}
          </span>
        </div>

        <div className="flex flex-col items-center rounded-2xl bg-amber-50/80 p-2 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-1">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {t('learn.stat_cert', 'Certificat')}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {t('learn.stat_cert_sub', 'À chaque module réussi')}
          </span>
        </div>

        <div className="flex flex-col items-center rounded-2xl bg-emerald-50/80 p-2 dark:bg-emerald-950/20">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-1">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {t('learn.stat_audio', 'Synthèse Audio')}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {t('learn.stat_audio_sub', 'Écoute en mobilité')}
          </span>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-sky-900 to-indigo-900 p-4 text-white shadow-xl shadow-sky-900/20 dark:border-slate-700">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">
                {l('Parcours de certification', 'Certification path', 'Ruta de certificación')}
              </p>
              <h2 className="text-lg sm:text-xl font-black">
                {l(
                  'Certificat CyberSens Academy',
                  'CyberSens Academy Certificate',
                  'Certificado CyberSens Academy',
                )}
              </h2>
              <p className="mt-1 text-sm text-sky-100">
                {l(
                  'Validez des compétences réelles, complétez les modules pratiques et obtenez un badge officiel.',
                  'Validate real skills, complete the practical modules and earn an official badge.',
                  'Valida competencias reales, completa los módulos prácticos y obtén una insignia oficial.',
                )}
              </p>
            </div>
          </div>

          <div className="min-w-[220px] lg:max-w-[290px] w-full lg:w-[290px]">
            <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-sky-100">
              <span>{l('Progression globale', 'Overall progress', 'Progreso global')}</span>
              <span>{certificationProgress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-sky-400 to-emerald-400 transition-all"
                style={{ width: `${certificationProgress}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-sky-100">
              {completedModulesCount}/{localizedModules.length} modules validés •{' '}
              {completedLessonsCount}/{totalLessons} leçons complétées
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {certificationMilestones.map((milestone, index) => (
            <div
              key={milestone.title}
              className={`rounded-2xl border p-3 ${
                milestone.completed
                  ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100'
                  : 'border-white/10 bg-white/5 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.15em]">
                <span>
                  {l('Étape', 'Step', 'Etapa')} {index + 1}
                </span>
                <span>{milestone.completed ? 'OK' : l('À faire', 'To do', 'Pendiente')}</span>
              </div>
              <div className="mt-2 text-sm font-bold">{milestone.title}</div>
              <div className="mt-1 text-[11px] text-sky-100/80">{milestone.subtitle}</div>
            </div>
          ))}
        </div>
      </div>

      {featuredModule && (
        <div className="rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-4 shadow-sm dark:border-sky-900/60 dark:from-sky-950/25 dark:via-slate-900 dark:to-indigo-950/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-md shadow-sky-500/20">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                  {l('Cours phare', 'Featured course', 'Curso destacado')}
                </p>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {featuredModule.title}
                </h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {featuredModule.description}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveCourse(featuredModule)}
              className="self-start rounded-2xl bg-slate-900 px-3.5 py-2 text-[11px] font-black text-white transition-colors hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            >
              {l('Ouvrir le parcours', 'Open the course', 'Abrir el curso')}
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t(
            'learn.search_placeholder',
            l(
              'Rechercher une formation (ex: Phishing, Mots de passe, Mobile Money)...',
              'Search a course (e.g. Phishing, Passwords, Mobile Money)...',
              'Buscar un curso (p. ej. Phishing, Contraseñas, Mobile Money)...',
            ),
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
          {
            key: 'Tous',
            label: l('Tous les Domaines', 'All domains', 'Todos los dominios'),
            icon: LayoutGrid,
          },
          {
            key: 'fondations',
            label: l('Fondations & CID', 'Foundations & CIA', 'Fundamentos y CID'),
            icon: Shield,
          },
          {
            key: 'reseaux',
            label: l('Réseaux & Web', 'Networks & Web', 'Redes y Web'),
            icon: Globe,
          },
          {
            key: 'mobile',
            label: l('Mobile & IoT', 'Mobile & IoT', 'Móvil e IoT'),
            icon: Smartphone,
          },
          {
            key: 'gouvernance',
            label: l('Gouvernance & PSSI', 'Governance & policy', 'Gobernanza y PSSI'),
            icon: ClipboardList,
          },
          { key: 'ia', label: l('IA & Sécurité', 'AI & Security', 'IA y seguridad'), icon: Bot },
          {
            key: 'offensif',
            label: l('Pentest & Offensif', 'Pentest & Offensive', 'Pentest y ofensiva'),
            icon: Swords,
          },
          {
            key: 'dfir',
            label: l('DFIR & Forensic', 'DFIR & Forensics', 'DFIR y forense'),
            icon: ScanSearch,
          },
          {
            key: 'cloud',
            label: l('Cloud & DevOps', 'Cloud & DevOps', 'Cloud y DevOps'),
            icon: Cloud,
          },
        ].map((track) => (
          <button
            key={track.key}
            onClick={() => setSelectedTrack(track.key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedTrack === track.key
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shadow-sm'
            }`}
          >
            <track.icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {track.label}
          </button>
        ))}
      </div>

      {/* Courses List matching Screen 3 with cards */}
      <div className="space-y-3.5">
        {filteredModules.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <BookOpen className="w-10 h-10 text-slate-500 dark:text-slate-400 mx-auto mb-3 opacity-60" />
            <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">
              {t('learn.no_results', 'Aucune formation trouvée')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('learn.try_another_search', 'Essayez un autre mot-clé ou niveau.')}
            </p>
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
                className="group flex items-center justify-between rounded-3xl border border-slate-200/90 bg-gradient-to-r from-white via-slate-50 to-sky-50/70 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500 hover:shadow-lg dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/20"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${module.color} shadow-lg shadow-sky-500/10 transition-transform group-hover:scale-105`}
                    >
                      {getModuleIcon(module.icon)}
                    </div>
                    {hasCertificate && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[9px] font-black text-white shadow-sm">
                        <Award className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white transition-colors group-hover:text-sky-600 dark:group-hover:text-sky-300 truncate">
                        {module.title}
                      </h3>
                      {hasCertificate && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                          <Award className="w-3 h-3" /> Premium
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        {module.lessonsCount} {t('learn.lessons', 'leçons')}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{module.duration}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="font-semibold text-sky-700 dark:text-sky-400">
                        {module.level === 'Débutant'
                          ? t('learn.beginner', 'Débutant')
                          : module.level === 'Intermédiaire'
                            ? t('learn.intermediate', 'Intermédiaire')
                            : t('learn.advanced', 'Avancé')}
                      </span>
                    </div>

                    <p className="mt-1 max-w-2xl text-xs text-slate-500 dark:text-slate-400 sm:block">
                      {module.description}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(module.moduleObjectives || []).slice(0, 2).map((objective) => (
                        <span
                          key={objective}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {objective.length > 26 ? `${objective.slice(0, 26)}…` : objective}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <span className="block text-[11px] font-black text-slate-600 dark:text-slate-300">
                      {progress}%
                    </span>
                    <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${hasCertificate ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-sky-500 to-blue-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-900 dark:group-hover:text-white" />
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
