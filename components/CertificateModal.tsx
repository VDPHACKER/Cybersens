import React, { useRef } from 'react';
import { Certificate } from '../types';
import {
  X,
  Award,
  Download,
  Share2,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  Printer,
} from 'lucide-react';

interface CertificateModalProps {
  certificate: Certificate;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, onClose }) => {
  const certRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Certificat CyberSens - ${certificate.courseTitle}`,
          text: `J'ai obtenu mon certificat officiel "${certificate.courseTitle}" sur l'académie CyberSens !`,
          url: `${window.location.origin}/api/certificates/verify?number=${encodeURIComponent(certificate.certificateNumber)}`,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `J'ai obtenu mon certificat de cybersécurité "${certificate.courseTitle}" sur l'académie CyberSens ! Vérification : ${window.location.origin}/api/certificates/verify?number=${encodeURIComponent(certificate.certificateNumber)}`,
      );
      window.dispatchEvent(
        new CustomEvent('cyber-notify', {
          detail: { message: 'Lien du certificat copié dans le presse-papiers !', type: 'success' },
        }),
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden text-slate-900 border border-slate-200 flex flex-col my-auto max-h-[95vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-extrabold text-slate-900">
              Certificat Officiel d'Accomplissement
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Printable Body */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
          <div
            ref={certRef}
            className="relative bg-white border-8 border-double border-sky-900/40 rounded-2xl p-6 sm:p-10 shadow-lg text-center space-y-6 overflow-hidden"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, rgba(2, 132, 199, 0.03) 0%, transparent 70%)',
            }}
          >
            {/* Watermark Emblem in Background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <img src="/favicon.svg" alt="Seal" className="w-96 h-96 object-contain" />
            </div>

            {/* Top Logo & Issuer */}
            <div className="space-y-1 relative z-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-sky-600 p-1.5 shadow-md flex items-center justify-center">
                  <img
                    src="/favicon.svg"
                    alt="CyberSens"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  Cyber<span className="text-sky-600">Sens</span> Academy
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-sky-700">
                Plateforme Panafricaine de Sensibilisation & de Formation Numérique
              </p>
            </div>

            {/* Certificate Header */}
            <div className="space-y-2 relative z-10 pt-2">
              <span className="inline-block px-4 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black uppercase tracking-wider">
                Certificat d'Aptitude en Cybersécurité
              </span>
              <h2 className="text-sm sm:text-base font-serif italic text-slate-500">
                Ce document officiel certifie avec honneur que
              </h2>
            </div>

            {/* Recipient Name */}
            <div className="relative z-10 py-1">
              <div className="text-2xl sm:text-3xl font-black text-sky-950 font-serif border-b-2 border-slate-300 inline-block px-8 pb-1">
                {certificate.recipientName}
              </div>
            </div>

            {/* Course Title & Verification */}
            <div className="space-y-2 relative z-10 max-w-lg mx-auto">
              <p className="text-xs sm:text-sm text-slate-600">
                a validé avec succès l'ensemble des leçons, cas pratiques et évaluations d'aptitude
                de la formation :
              </p>
              <h3 className="text-base sm:text-lg font-black text-slate-900 bg-sky-50 py-2 px-4 rounded-xl border border-sky-100">
                « {certificate.courseTitle} »
              </h3>
              <p className="text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1.5 pt-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Score d'aptitude validé : {certificate.score}% • Niveau Maîtrisé</span>
              </p>
            </div>

            {/* Signatures & Seal */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100 items-end relative z-10 text-left sm:text-center">
              {/* Verification & ID */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                  <QrCode className="w-4 h-4 text-sky-600" />
                  <span>Vérification d'authenticité</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 break-all">
                  {certificate.certificateNumber}
                </div>
                <div className="text-[9px] text-slate-400">Émis le : {certificate.issuedDate}</div>
                <div className="text-[9px] text-slate-400 break-all">
                  Vérifiable sur : {window.location.host}/api/certificates/verify?number=
                  {certificate.certificateNumber}
                </div>
              </div>

              {/* Gold Seal Graphic */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber-400 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-500 shadow-md flex items-center justify-center text-amber-950 p-2 text-center">
                  <div className="w-full h-full rounded-full border border-amber-600 flex flex-col items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-amber-900" />
                    <span className="text-[7px] font-black uppercase tracking-tighter">
                      VERIFIED
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-1 text-right sm:text-center">
                <div className="font-serif italic text-base text-sky-950 font-black border-b border-slate-300 pb-0.5 tracking-wider">
                  VDPHACKER
                </div>
                <div className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                  Directeur Académique & Sécurité
                </div>
                <div className="text-[9px] text-slate-500 font-medium">
                  CyberSens Academy • Certifié
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Certificat enregistré dans votre profil apprenant.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>Partager</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
