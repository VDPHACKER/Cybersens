import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eraser,
  FileSearch,
  Info,
  MapPin,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useI18n } from '../services/i18n';
import {
  readImageMetadata,
  stripImageMetadata,
  type MetadataReport,
  type MetadataRisk,
  type Observation,
} from '../services/imageMetadata';

const MAX_BYTES = 25 * 1024 * 1024;

interface CleanedImage {
  url: string;
  name: string;
  size: number;
  remaining: number;
  method: 'lossless' | 'canvas';
  keptOrientation: boolean;
}

const RISK_STYLE: Record<MetadataRisk, string> = {
  high: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const formatSize = (n: number) =>
  n > 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} Mo`
    : `${Math.max(1, Math.round(n / 1024))} Ko`;

/** Réencode l'image par canvas : supprime tout, mais recompresse (JPEG) ou convertit (autres formats en PNG). */
const redrawWithoutMetadata = async (file: File, jpeg: boolean): Promise<Blob> => {
  const bitmap = await createImageBitmap(file); // applique l'orientation EXIF à l'affichage
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('encode'))),
        jpeg ? 'image/jpeg' : 'image/png',
        0.95,
      ),
    );
  } finally {
    bitmap.close();
  }
};

export const ImageMetadataTool: React.FC = () => {
  const { language } = useI18n();
  const tr = (fr: string, en: string, es: string) =>
    language === 'en' ? en : language === 'es' ? es : fr;

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [report, setReport] = useState<MetadataReport | null>(null);
  const [cleaned, setCleaned] = useState<CleanedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [keepOrientation, setKeepOrientation] = useState(true);

  // Libère les URL d'objet quand elles ne servent plus
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);
  useEffect(() => () => cleaned && URL.revokeObjectURL(cleaned.url), [cleaned]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    setCleaned(null);
    setError(null);
    setReport(null);
    setFile(null);
    setPreviewUrl(null);
    if (!picked.type.startsWith('image/')) {
      setError(
        tr(
          'Ce fichier n’est pas une image.',
          'This file is not an image.',
          'Este archivo no es una imagen.',
        ),
      );
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError(
        tr(
          'Fichier trop volumineux (25 Mo maximum).',
          'File too large (25 MB maximum).',
          'Archivo demasiado grande (máximo 25 MB).',
        ),
      );
      return;
    }
    try {
      const bytes = new Uint8Array(await picked.arrayBuffer());
      setReport(readImageMetadata(bytes));
      setFile(picked);
      setPreviewUrl(URL.createObjectURL(picked));
    } catch {
      setError(
        tr(
          'Lecture du fichier impossible.',
          'Could not read the file.',
          'No se pudo leer el archivo.',
        ),
      );
    }
  };

  const handleClean = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setCleaned(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const lossless = stripImageMetadata(bytes, { keepOrientation });
      let blob: Blob;
      let outBytes: Uint8Array;
      let method: CleanedImage['method'];
      let ext: string;
      if (lossless) {
        outBytes = lossless.bytes;
        blob = new Blob([outBytes as BlobPart], { type: file.type });
        method = 'lossless';
        ext = file.name.includes('.') ? (file.name.split('.').pop() as string) : 'img';
      } else {
        const jpeg = file.type === 'image/jpeg';
        blob = await redrawWithoutMetadata(file, jpeg);
        outBytes = new Uint8Array(await blob.arrayBuffer());
        method = 'canvas';
        ext = jpeg ? 'jpg' : 'png';
      }
      const base = file.name.replace(/\.[^.]+$/, '') || 'image';
      setCleaned({
        url: URL.createObjectURL(blob),
        name: `${base}-sans-metadonnees.${ext}`,
        size: blob.size,
        // Vérification : on relit le fichier produit
        remaining: readImageMetadata(outBytes).entries.length,
        method,
        keptOrientation: lossless?.keptOrientation ?? false,
      });
    } catch {
      setError(
        tr(
          'Nettoyage impossible pour ce format. Essayez un JPEG, PNG ou WebP.',
          'Cleaning is not possible for this format. Try a JPEG, PNG or WebP.',
          'No se puede limpiar este formato. Pruebe con JPEG, PNG o WebP.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, MetadataReport['entries']>();
    for (const entry of report?.entries ?? []) {
      map.set(entry.group, [...(map.get(entry.group) ?? []), entry]);
    }
    return [...map.entries()];
  }, [report]);

  const riskLabel = (r: MetadataRisk) =>
    r === 'high'
      ? tr('Sensible', 'Sensitive', 'Sensible')
      : r === 'medium'
        ? tr('À surveiller', 'Notable', 'A vigilar')
        : tr('Technique', 'Technical', 'Técnico');

  const observationText = (o: Observation) => {
    const d = o.detail ?? '';
    switch (o.code) {
      case 'gps':
        return tr(
          'Position GPS intégrée : l’endroit exact de la prise de vue est lisible par quiconque reçoit le fichier.',
          'Embedded GPS position: the exact place the picture was taken is readable by anyone who receives the file.',
          'Posición GPS incrustada: el lugar exacto de la toma es legible para quien reciba el archivo.',
        );
      case 'owner_serial':
        return tr(
          `Identifiants personnels ou d’appareil (${d}) : ils permettent de relier l’image à vous ou à votre matériel.`,
          `Personal or device identifiers (${d}): they can link the image to you or your equipment.`,
          `Identificadores personales o del dispositivo (${d}): permiten vincular la imagen con usted o su equipo.`,
        );
      case 'device':
        return tr(
          `Appareil identifiable : ${d}.`,
          `Identifiable device: ${d}.`,
          `Dispositivo identificable: ${d}.`,
        );
      case 'editor':
        return tr(
          `Enregistrée par un logiciel d’édition (${d}). Une retouche est courante et ne prouve aucune falsification.`,
          `Saved by an editing tool (${d}). Editing is common and does not prove tampering.`,
          `Guardada con un editor (${d}). Retocar es habitual y no prueba una falsificación.`,
        );
      case 'ai_marker':
        return tr(
          `Marqueur d’un outil de génération par IA (${d}). C’est un indice de provenance, pas une preuve : ces marqueurs peuvent être ajoutés ou retirés.`,
          `Marker of an AI generation tool (${d}). It is a provenance hint, not proof: such markers can be added or removed.`,
          `Marcador de una herramienta de IA (${d}). Es un indicio de procedencia, no una prueba: estos marcadores pueden añadirse o quitarse.`,
        );
      case 'c2pa':
        return tr(
          'Content Credentials (C2PA) : signature de provenance. Le nettoyage la supprime, et l’image perd alors cette preuve d’origine.',
          'Content Credentials (C2PA): provenance signature. Cleaning removes it, and the image loses that proof of origin.',
          'Content Credentials (C2PA): firma de procedencia. La limpieza la elimina y la imagen pierde esa prueba de origen.',
        );
      case 'dates_differ':
        return tr(
          `Dates de prise de vue et de modification différentes (${d}) : le fichier a été réenregistré, ce qui arrive souvent (export, retouche légère).`,
          `Capture and modification dates differ (${d}): the file was re-saved, which is common (export, light edit).`,
          `Fechas de toma y modificación distintas (${d}): el archivo se volvió a guardar, algo habitual (exportación, retoque leve).`,
        );
      case 'no_metadata':
        return tr(
          'Aucune métadonnée trouvée. C’est fréquent après une capture d’écran, un envoi par messagerie ou un nettoyage, et ce n’est pas un indice de falsification.',
          'No metadata found. This is common after a screenshot, a messaging app or a cleanup, and is not a sign of tampering.',
          'No se encontraron metadatos. Es habitual tras una captura, una app de mensajería o una limpieza, y no indica falsificación.',
        );
    }
  };

  const sensitiveCount = report?.entries.filter((e) => e.risk === 'high').length ?? 0;

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white border border-sky-800/40 shadow-xl space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-bold uppercase tracking-wider">
          <FileSearch className="w-3.5 h-3.5" />
          <span>{tr('Forensics d’image', 'Image forensics', 'Forense de imagen')}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black">
          {tr('Métadonnées d’une image', 'Image metadata', 'Metadatos de una imagen')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
          {tr(
            'Découvrez ce qu’une photo révèle sur vous (lieu, appareil, date, logiciel) puis supprimez-le avant de la partager.',
            'See what a photo reveals about you (place, device, date, software) and remove it before sharing.',
            'Descubra lo que una foto revela sobre usted (lugar, dispositivo, fecha, software) y elimínelo antes de compartirla.',
          )}
        </p>
        <p className="text-[11px] text-emerald-300 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {tr(
            'Tout se passe dans votre navigateur : le fichier n’est jamais envoyé à un serveur.',
            'Everything happens in your browser: the file is never uploaded to a server.',
            'Todo ocurre en su navegador: el archivo nunca se envía a un servidor.',
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-sky-300 dark:border-sky-800 hover:border-sky-500 bg-sky-50/40 dark:bg-sky-950/20 cursor-pointer transition-all text-center">
              <Upload className="w-6 h-6 text-sky-700 dark:text-sky-300 mb-2" aria-hidden="true" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 break-all">
                {file
                  ? file.name
                  : tr(
                      'Cliquer pour choisir une image',
                      'Click to choose an image',
                      'Haga clic para elegir una imagen',
                    )}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {tr(
                  'JPEG, PNG, WebP (25 Mo max)',
                  'JPEG, PNG, WebP (25 MB max)',
                  'JPEG, PNG, WebP (25 MB máx.)',
                )}
              </span>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
            </label>

            {previewUrl && (
              <img
                src={previewUrl}
                alt={tr('Aperçu', 'Preview', 'Vista previa')}
                className="max-h-56 mx-auto rounded-2xl border border-slate-200 dark:border-slate-700 object-contain"
              />
            )}

            {file && (
              <>
                <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={keepOrientation}
                    onChange={(e) => setKeepOrientation(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    {tr(
                      'Conserver le sens de la photo (orientation). Aucune donnée personnelle n’est gardée.',
                      'Keep the photo orientation. No personal data is kept.',
                      'Conservar la orientación de la foto. No se guarda ningún dato personal.',
                    )}
                  </span>
                </label>
                <button
                  onClick={handleClean}
                  disabled={busy}
                  className="w-full py-3.5 rounded-2xl bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Eraser className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {busy
                      ? tr('Nettoyage…', 'Cleaning…', 'Limpiando…')
                      : tr('Supprimer les métadonnées', 'Remove metadata', 'Eliminar metadatos')}
                  </span>
                </button>
              </>
            )}

            {error && (
              <div
                role="alert"
                className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300"
              >
                {error}
              </div>
            )}

            {cleaned && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {cleaned.remaining === 0
                      ? tr(
                          'Image nettoyée : 0 métadonnée restante (vérifié)',
                          'Image cleaned: 0 metadata left (verified)',
                          'Imagen limpia: 0 metadatos restantes (verificado)',
                        )
                      : tr(
                          `Il reste ${cleaned.remaining} métadonnée(s)`,
                          `${cleaned.remaining} metadata item(s) left`,
                          `Quedan ${cleaned.remaining} metadato(s)`,
                        )}
                  </span>
                </div>
                <p>
                  {cleaned.method === 'lossless'
                    ? tr(
                        'Suppression sans perte : les pixels sont identiques à l’original.',
                        'Lossless removal: pixels are identical to the original.',
                        'Eliminación sin pérdida: los píxeles son idénticos al original.',
                      )
                    : tr(
                        'Image redessinée : les pixels sont conservés mais le fichier est recompressé (JPEG) ou converti en PNG.',
                        'Image redrawn: pixels are kept but the file is recompressed (JPEG) or converted to PNG.',
                        'Imagen redibujada: se conservan los píxeles pero el archivo se recomprime (JPEG) o se convierte a PNG.',
                      )}
                  {cleaned.keptOrientation &&
                    ' ' +
                      tr('Orientation conservée.', 'Orientation kept.', 'Orientación conservada.')}
                </p>
                <a
                  href={cleaned.url}
                  download={cleaned.name}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {tr('Télécharger', 'Download', 'Descargar')} ({formatSize(cleaned.size)})
                  </span>
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          {report ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {tr('Résultat', 'Result', 'Resultado')} · {report.format.toUpperCase()}
                </h3>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {tr(
                    `${report.entries.length} métadonnée(s)`,
                    `${report.entries.length} item(s)`,
                    `${report.entries.length} metadato(s)`,
                  )}
                  {sensitiveCount > 0 &&
                    ` · ${tr(`${sensitiveCount} sensible(s)`, `${sensitiveCount} sensitive`, `${sensitiveCount} sensible(s)`)}`}
                </span>
              </div>

              {report.format === 'unknown' && (
                <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-sky-600" aria-hidden="true" />
                  {tr(
                    'Format non analysé en détail. Le nettoyage redessinera l’image, ce qui supprime ses métadonnées.',
                    'Format not analysed in detail. Cleaning will redraw the image, which removes its metadata.',
                    'Formato no analizado en detalle. La limpieza redibujará la imagen, lo que elimina sus metadatos.',
                  )}
                </p>
              )}

              {report.gps && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong>
                      {tr('Lieu de la prise de vue', 'Where it was taken', 'Lugar de la toma')} :
                    </strong>{' '}
                    {report.gps.lat}, {report.gps.lon}
                  </span>
                </div>
              )}

              {grouped.map(([group, items]) => (
                <div key={group} className="space-y-1.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {group}
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {items.map((entry, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2 text-xs"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-200 sm:w-48 shrink-0">
                          {entry.key}
                        </span>
                        <span className="flex-1 min-w-0 break-words text-slate-600 dark:text-slate-300">
                          {entry.value}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_STYLE[entry.risk]}`}
                        >
                          {riskLabel(entry.risk)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {report.observations.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                    <span>{tr('Observations', 'Observations', 'Observaciones')}</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                    {report.observations.map((o, i) => (
                      <li key={i}>{observationText(o)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3 flex flex-col items-center justify-center min-h-[300px]">
              <FileSearch className="w-8 h-8 text-sky-700 dark:text-sky-400" aria-hidden="true" />
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                {tr(
                  'Choisissez une image pour afficher ses métadonnées cachées. Une photo prise avec un téléphone contient souvent la position GPS exacte.',
                  'Choose an image to see its hidden metadata. A phone photo often contains the exact GPS position.',
                  'Elija una imagen para ver sus metadatos ocultos. Una foto de móvil suele contener la posición GPS exacta.',
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
