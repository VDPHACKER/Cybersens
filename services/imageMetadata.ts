// Lecture et suppression des métadonnées d'images (JPEG, PNG, WebP), entièrement en local.
// Les fichiers sont des données non fiables : toutes les lectures sont bornées et un fichier
// corrompu produit un rapport partiel, jamais une exception.

export type MetadataRisk = 'high' | 'medium' | 'low';
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'unknown';

export interface MetadataEntry {
  group: string;
  key: string;
  value: string;
  risk: MetadataRisk;
}

export type ObservationCode =
  | 'gps'
  | 'owner_serial'
  | 'device'
  | 'editor'
  | 'ai_marker'
  | 'c2pa'
  | 'dates_differ'
  | 'no_metadata';

export interface Observation {
  code: ObservationCode;
  detail?: string;
}

export interface MetadataReport {
  format: ImageFormat;
  entries: MetadataEntry[];
  gps?: { lat: number; lon: number };
  /** Valeur EXIF 1 à 8 ; 1 ou absente = image à l'endroit */
  orientation?: number;
  hasC2pa: boolean;
  observations: Observation[];
}

const MAX_ENTRIES = 300;
const MAX_VALUE_LEN = 300;
const MAX_XMP_BYTES = 256 * 1024;

const clip = (s: string) => {
  // eslint-disable-next-line no-control-regex
  const clean = s.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return clean.length > MAX_VALUE_LEN ? clean.slice(0, MAX_VALUE_LEN) + '…' : clean;
};

const latin1 = (b: Uint8Array, start: number, end: number) => {
  let s = '';
  for (let i = start; i < end && i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
};

const startsWithAscii = (b: Uint8Array, offset: number, text: string) => {
  if (offset + text.length > b.length) return false;
  for (let i = 0; i < text.length; i++) if (b[offset + i] !== text.charCodeAt(i)) return false;
  return true;
};

class Collector {
  entries: MetadataEntry[] = [];
  gps?: { lat: number; lon: number };
  orientation?: number;
  hasC2pa = false;
  aiHints: string[] = [];
  editors: string[] = [];
  private seen = new Set<string>();

  add(group: string, key: string, value: string, risk: MetadataRisk) {
    const v = clip(value);
    if (!v || this.entries.length >= MAX_ENTRIES) return;
    const id = `${group}|${key}|${v}`;
    if (this.seen.has(id)) return;
    this.seen.add(id);
    this.entries.push({ group, key, value: v, risk });
  }
}

// ---------------------------------------------------------------------------
// EXIF / TIFF
// ---------------------------------------------------------------------------

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

const IFD0_TAGS: Record<number, [string, MetadataRisk]> = {
  0x010e: ['Description', 'medium'],
  0x010f: ['Fabricant', 'medium'],
  0x0110: ['Modèle', 'medium'],
  0x0131: ['Logiciel', 'medium'],
  0x0132: ['Date de modification', 'medium'],
  0x013b: ['Auteur', 'high'],
  0x8298: ['Copyright', 'medium'],
};
const EXIF_TAGS: Record<number, [string, MetadataRisk]> = {
  0x9003: ['Date de prise de vue', 'medium'],
  0x9004: ['Date de numérisation', 'medium'],
  0xa420: ['Identifiant unique de l’image', 'high'],
  0xa430: ['Propriétaire de l’appareil', 'high'],
  0xa431: ['Numéro de série du boîtier', 'high'],
  0xa433: ['Fabricant de l’objectif', 'low'],
  0xa434: ['Objectif', 'low'],
  0xa435: ['Numéro de série de l’objectif', 'high'],
  0x829a: ['Temps de pose', 'low'],
  0x829d: ['Ouverture', 'low'],
  0x8827: ['Sensibilité ISO', 'low'],
  0x920a: ['Focale', 'low'],
};

const parseTiff = (b: Uint8Array, start: number, end: number, out: Collector, group = 'EXIF') => {
  if (end - start < 8 || end > b.length) return;
  const le = b[start] === 0x49 && b[start + 1] === 0x49;
  const be = b[start] === 0x4d && b[start + 1] === 0x4d;
  if (!le && !be) return;
  const dv = new DataView(b.buffer, b.byteOffset + start, end - start);
  if (dv.getUint16(2, le) !== 42) return;

  const visited = new Set<number>();

  const readValues = (entry: number, type: number, count: number): number[] | string | null => {
    const unit = TYPE_SIZE[type];
    if (!unit || count < 1 || count > 4096) return null;
    const size = unit * count;
    const at = size <= 4 ? entry + 8 : dv.getUint32(entry + 8, le);
    if (at + size > dv.byteLength) return null;
    if (type === 2) {
      let s = '';
      for (let i = 0; i < count; i++) {
        const c = dv.getUint8(at + i);
        if (c === 0) break;
        s += String.fromCharCode(c);
      }
      return s;
    }
    const vals: number[] = [];
    for (let i = 0; i < Math.min(count, 8); i++) {
      const o = at + i * unit;
      if (type === 1 || type === 7) vals.push(dv.getUint8(o));
      else if (type === 3) vals.push(dv.getUint16(o, le));
      else if (type === 4) vals.push(dv.getUint32(o, le));
      else if (type === 9) vals.push(dv.getInt32(o, le));
      else if (type === 5) {
        const den = dv.getUint32(o + 4, le);
        vals.push(den ? dv.getUint32(o, le) / den : 0);
      } else if (type === 10) {
        const den = dv.getInt32(o + 4, le);
        vals.push(den ? dv.getInt32(o, le) / den : 0);
      }
    }
    return vals;
  };

  const readIfd = (offset: number, kind: 'ifd0' | 'exif' | 'gps', depth: number) => {
    if (depth > 3 || visited.has(offset) || offset + 2 > dv.byteLength) return;
    visited.add(offset);
    const n = Math.min(dv.getUint16(offset, le), 200);
    const gpsTags: Record<number, number[] | string> = {};
    for (let i = 0; i < n; i++) {
      const e = offset + 2 + i * 12;
      if (e + 12 > dv.byteLength) break;
      const tag = dv.getUint16(e, le);
      const type = dv.getUint16(e + 2, le);
      const count = dv.getUint32(e + 4, le);

      if (kind === 'ifd0' && tag === 0x8769) {
        readIfd(dv.getUint32(e + 8, le), 'exif', depth + 1);
        continue;
      }
      if (kind === 'ifd0' && tag === 0x8825) {
        readIfd(dv.getUint32(e + 8, le), 'gps', depth + 1);
        continue;
      }
      const v = readValues(e, type, count);
      if (v === null) continue;

      if (kind === 'gps') {
        gpsTags[tag] = v;
        continue;
      }
      if (kind === 'ifd0' && tag === 0x0112 && Array.isArray(v)) {
        out.orientation = v[0];
        out.add(group, 'Orientation', String(v[0]), 'low');
        continue;
      }
      const def = (kind === 'ifd0' ? IFD0_TAGS : EXIF_TAGS)[tag];
      if (!def) continue;
      const text = typeof v === 'string' ? v : v.map((x) => +x.toFixed(4)).join(', ');
      out.add(group, def[0], text, def[1]);
      if (tag === 0x0131 && typeof v === 'string') out.editors.push(v);
    }

    if (kind === 'gps') {
      const dms = (v: number[] | string | undefined) =>
        Array.isArray(v) && v.length >= 3 ? v[0] + v[1] / 60 + v[2] / 3600 : null;
      const lat = dms(gpsTags[2]);
      const lon = dms(gpsTags[4]);
      if (lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        const latSign = gpsTags[1] === 'S' ? -1 : 1;
        const lonSign = gpsTags[3] === 'W' ? -1 : 1;
        out.gps = { lat: +(lat * latSign).toFixed(5), lon: +(lon * lonSign).toFixed(5) };
        out.add('GPS', 'Position', `${out.gps.lat}, ${out.gps.lon}`, 'high');
      }
      const alt = gpsTags[6];
      if (Array.isArray(alt)) out.add('GPS', 'Altitude', `${alt[0].toFixed(1)} m`, 'high');
      if (typeof gpsTags[0x1d] === 'string') out.add('GPS', 'Date GPS', gpsTags[0x1d], 'medium');
    }
  };

  try {
    readIfd(dv.getUint32(4, le), 'ifd0', 0);
  } catch {
    // Structure EXIF tronquée : on garde ce qui a été lu
  }
};

// ---------------------------------------------------------------------------
// XMP
// ---------------------------------------------------------------------------

const AI_PATTERN =
  /stable[ -]?diffusion|midjourney|dall[-· ]?e|firefly|comfyui|automatic1111|novelai|leonardo\.ai|ideogram|imagen|trainedAlgorithmicMedia/i;
const EDITOR_PATTERN = /photoshop|lightroom|gimp|snapseed|canva|affinity|paint\.net|pixelmator/i;

const xmpField = (xml: string, name: string): string | null => {
  const esc = name.replace(':', '\\:');
  const attr = new RegExp(`${esc}="([^"]{1,300})"`).exec(xml);
  if (attr) return attr[1];
  const el = new RegExp(`<${esc}>([^<]{1,300})</${esc}>`).exec(xml);
  return el ? el[1] : null;
};

const parseXmp = (xml: string, out: Collector) => {
  out.add('XMP', 'Bloc XMP', `${xml.length} caractères`, 'low');
  const fields: [string, string, MetadataRisk][] = [
    ['xmp:CreatorTool', 'Outil de création', 'medium'],
    ['xmp:ModifyDate', 'Date de modification', 'medium'],
    ['xmp:CreateDate', 'Date de création', 'medium'],
    ['photoshop:City', 'Ville', 'high'],
    ['photoshop:Country', 'Pays', 'high'],
    ['exif:GPSLatitude', 'Latitude (XMP)', 'high'],
    ['exif:GPSLongitude', 'Longitude (XMP)', 'high'],
    ['Iptc4xmpExt:DigitalSourceType', 'Type de source numérique', 'medium'],
  ];
  for (const [tag, label, risk] of fields) {
    const v = xmpField(xml, tag);
    if (v) out.add('XMP', label, v, risk);
  }
  const creator = /<dc:creator>[\s\S]{0,400}?<rdf:li[^>]*>([^<]{1,200})<\/rdf:li>/.exec(xml);
  if (creator) out.add('XMP', 'Auteur', creator[1], 'high');
  const tool = xmpField(xml, 'xmp:CreatorTool');
  if (tool) out.editors.push(tool);
  const source = xmpField(xml, 'Iptc4xmpExt:DigitalSourceType');
  if (source && AI_PATTERN.test(source)) out.aiHints.push(source);
};

const decodeXmp = (b: Uint8Array, start: number, end: number) =>
  new TextDecoder('utf-8', { fatal: false }).decode(
    b.subarray(start, Math.min(end, start + MAX_XMP_BYTES)),
  );

// ---------------------------------------------------------------------------
// JPEG
// ---------------------------------------------------------------------------

interface JpegSegment {
  marker: number;
  start: number;
  end: number;
}

const walkJpeg = (b: Uint8Array): JpegSegment[] | null => {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  const segs: JpegSegment[] = [{ marker: 0xd8, start: 0, end: 2 }];
  let i = 2;
  while (i + 1 < b.length) {
    if (b[i] !== 0xff) break;
    while (i + 1 < b.length && b[i + 1] === 0xff) i++;
    const marker = b[i + 1];
    if (marker === 0xd9) {
      segs.push({ marker, start: i, end: i + 2 });
      break; // les données après EOI (images cachées, charges) ne sont pas conservées
    }
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      segs.push({ marker, start: i, end: i + 2 });
      i += 2;
      continue;
    }
    if (i + 4 > b.length) break;
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) break;
    if (marker === 0xda) {
      let j = i + 2 + len;
      while (j + 1 < b.length) {
        if (b[j] === 0xff) {
          const n = b[j + 1];
          if (n === 0x00 || (n >= 0xd0 && n <= 0xd7)) {
            j += 2;
            continue;
          }
          if (n === 0xff) {
            j++;
            continue;
          }
          break;
        }
        j++;
      }
      segs.push({ marker, start: i, end: j });
      i = j;
      continue;
    }
    segs.push({ marker, start: i, end: i + 2 + len });
    i += 2 + len;
  }
  return segs;
};

const readJpeg = (b: Uint8Array, out: Collector): boolean => {
  const segs = walkJpeg(b);
  if (!segs) return false;
  for (const s of segs) {
    if (s.marker < 0xe0 || s.marker > 0xfe) continue;
    const ds = s.start + 4;
    const de = s.end;
    if (s.marker === 0xe1) {
      if (startsWithAscii(b, ds, 'Exif\0\0')) parseTiff(b, ds + 6, de, out);
      else if (startsWithAscii(b, ds, 'http://ns.adobe.com/xap/1.0/\0'))
        parseXmp(decodeXmp(b, ds + 29, de), out);
      else if (startsWithAscii(b, ds, 'http://ns.adobe.com/xmp/extension/'))
        out.add('XMP', 'XMP étendu', `${de - ds} octets`, 'low');
      else out.add('JPEG', 'Segment APP1 inconnu', `${de - ds} octets`, 'low');
    } else if (s.marker === 0xeb) {
      const head = latin1(b, ds, ds + 16);
      if (/jumb|c2pa/i.test(head) || latin1(b, ds, Math.min(de, ds + 4096)).includes('c2pa'))
        out.hasC2pa = true;
      else out.add('JPEG', 'Segment APP11', `${de - ds} octets`, 'low');
    } else if (s.marker === 0xed) {
      out.add('IPTC/Photoshop', 'Ressources Photoshop (IPTC)', `${de - ds} octets`, 'medium');
    } else if (s.marker === 0xfe) {
      out.add('JPEG', 'Commentaire', latin1(b, ds, de), 'medium');
    } else if (s.marker === 0xe2) {
      if (startsWithAscii(b, ds, 'MPF\0'))
        out.add('JPEG', 'Multi-Picture (images embarquées)', `${de - ds} octets`, 'medium');
      // Un profil ICC est un réglage de couleur, pas une donnée personnelle : ignoré
    } else if (s.marker === 0xe0) {
      if (!startsWithAscii(b, ds, 'JFIF\0'))
        out.add('JPEG', 'Extension JFIF', `${de - ds} octets`, 'low');
    } else if (s.marker === 0xee) {
      // Adobe : transformation de couleur, conservée
    } else {
      out.add('JPEG', `Segment APP${s.marker - 0xe0}`, `${de - ds} octets`, 'low');
    }
  }
  return true;
};

const keepJpegSegment = (b: Uint8Array, s: JpegSegment) => {
  if (s.marker < 0xe0 || s.marker > 0xfe) return true;
  const ds = s.start + 4;
  if (s.marker === 0xe0) return startsWithAscii(b, ds, 'JFIF\0');
  if (s.marker === 0xe2) return startsWithAscii(b, ds, 'ICC_PROFILE\0');
  if (s.marker === 0xee) return startsWithAscii(b, ds, 'Adobe');
  return false;
};

/** Segment EXIF minimal ne contenant que l'orientation (évite de faire pivoter l'image). */
const orientationSegment = (o: number) =>
  new Uint8Array([
    0xff,
    0xe1,
    0x00,
    0x22,
    0x45,
    0x78,
    0x69,
    0x66,
    0x00,
    0x00,
    0x4d,
    0x4d,
    0x00,
    0x2a,
    0x00,
    0x00,
    0x00,
    0x08,
    0x00,
    0x01,
    0x01,
    0x12,
    0x00,
    0x03,
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    o,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
  ]);

const stripJpeg = (b: Uint8Array, orientation: number | undefined): Uint8Array | null => {
  const segs = walkJpeg(b);
  if (!segs) return null;
  const parts: Uint8Array[] = [];
  let orientationAdded = orientation === undefined || orientation === 1;
  segs.forEach((s, idx) => {
    if (!keepJpegSegment(b, s)) return;
    parts.push(b.subarray(s.start, s.end));
    // Après SOI (et APP0 éventuel), on réinsère l'orientation seule
    if (
      !orientationAdded &&
      (s.marker === 0xe0 || (s.marker === 0xd8 && segs[idx + 1]?.marker !== 0xe0))
    ) {
      parts.push(orientationSegment(orientation as number));
      orientationAdded = true;
    }
  });
  // Aucun point d'insertion trouvé (APP0 non JFIF supprimé) : juste après SOI
  if (!orientationAdded) parts.splice(1, 0, orientationSegment(orientation as number));
  return concat(parts);
};

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const isPng = (b: Uint8Array) => b.length >= 8 && PNG_SIG.every((v, i) => b[i] === v);

const PNG_KEEP = new Set([
  'IHDR',
  'PLTE',
  'IDAT',
  'IEND',
  'tRNS',
  'gAMA',
  'cHRM',
  'sRGB',
  'iCCP',
  'sBIT',
  'cICP',
  'mDCV',
  'cLLI',
  'pHYs',
  'bKGD',
  'hIST',
  'acTL',
  'fcTL',
  'fdAT',
]);

interface PngChunk {
  type: string;
  dataStart: number;
  dataEnd: number;
  end: number;
}

const walkPng = (b: Uint8Array): PngChunk[] | null => {
  if (!isPng(b)) return null;
  const chunks: PngChunk[] = [];
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let i = 8;
  while (i + 12 <= b.length) {
    const len = dv.getUint32(i);
    const end = i + 12 + len;
    if (end > b.length) break;
    chunks.push({ type: latin1(b, i + 4, i + 8), dataStart: i + 8, dataEnd: i + 8 + len, end });
    i = end;
    if (chunks[chunks.length - 1].type === 'IEND') break;
  }
  return chunks;
};

const readPng = (b: Uint8Array, out: Collector): boolean => {
  const chunks = walkPng(b);
  if (!chunks) return false;
  for (const c of chunks) {
    if (PNG_KEEP.has(c.type)) continue;
    if (c.type === 'tEXt') {
      const raw = latin1(b, c.dataStart, c.dataEnd);
      const nul = raw.indexOf('\0');
      if (nul < 1) continue;
      const key = raw.slice(0, nul);
      const value = raw.slice(nul + 1);
      out.add(
        'PNG texte',
        key,
        value,
        /author|artist|copyright|location|gps/i.test(key) ? 'high' : 'medium',
      );
      if (/^(parameters|prompt|workflow|sd-metadata)$/i.test(key) || AI_PATTERN.test(value))
        out.aiHints.push(`${key}${AI_PATTERN.test(value) ? ` : ${value.slice(0, 60)}` : ''}`);
      if (/^software$/i.test(key)) out.editors.push(value);
    } else if (c.type === 'iTXt') {
      const raw = latin1(b, c.dataStart, c.dataEnd);
      const nul = raw.indexOf('\0');
      if (nul < 1) continue;
      const key = raw.slice(0, nul);
      if (key === 'XML:com.adobe.xmp') {
        const compressed = b[c.dataStart + nul + 1] === 1;
        if (compressed)
          out.add('XMP', 'Bloc XMP (compressé)', `${c.dataEnd - c.dataStart} octets`, 'low');
        else {
          const rest = raw.indexOf('\0', nul + 3);
          const rest2 = rest < 0 ? -1 : raw.indexOf('\0', rest + 1);
          if (rest2 >= 0) parseXmp(decodeXmp(b, c.dataStart + rest2 + 1, c.dataEnd), out);
        }
      } else out.add('PNG texte (iTXt)', key, `${c.dataEnd - c.dataStart} octets`, 'medium');
    } else if (c.type === 'zTXt') {
      const raw = latin1(b, c.dataStart, c.dataEnd);
      out.add(
        'PNG texte (compressé)',
        raw.slice(0, Math.max(raw.indexOf('\0'), 0)) || 'zTXt',
        `${c.dataEnd - c.dataStart} octets`,
        'medium',
      );
    } else if (c.type === 'eXIf') {
      parseTiff(b, c.dataStart, c.dataEnd, out);
    } else if (c.type === 'tIME') {
      if (c.dataEnd - c.dataStart === 7) {
        const dv = new DataView(b.buffer, b.byteOffset + c.dataStart, 7);
        out.add(
          'PNG',
          'Dernière modification',
          `${dv.getUint16(0)}-${dv.getUint8(2)}-${dv.getUint8(3)}`,
          'medium',
        );
      }
    } else if (c.type === 'caBX') {
      out.hasC2pa = true;
    } else {
      out.add('PNG', `Bloc ${c.type}`, `${c.dataEnd - c.dataStart} octets`, 'low');
    }
  }
  return true;
};

const stripPng = (b: Uint8Array): Uint8Array | null => {
  const chunks = walkPng(b);
  if (!chunks || chunks.length === 0) return null;
  return concat([
    b.subarray(0, 8),
    ...chunks.filter((c) => PNG_KEEP.has(c.type)).map((c) => b.subarray(c.dataStart - 8, c.end)),
  ]);
};

// ---------------------------------------------------------------------------
// WebP
// ---------------------------------------------------------------------------

interface WebpChunk {
  fourcc: string;
  start: number;
  dataStart: number;
  dataEnd: number;
  end: number;
}

const walkWebp = (b: Uint8Array): WebpChunk[] | null => {
  if (b.length < 12 || !startsWithAscii(b, 0, 'RIFF') || !startsWithAscii(b, 8, 'WEBP'))
    return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const chunks: WebpChunk[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const size = dv.getUint32(i + 4, true);
    const dataEnd = i + 8 + size;
    if (dataEnd > b.length) break;
    chunks.push({
      fourcc: latin1(b, i, i + 4),
      start: i,
      dataStart: i + 8,
      dataEnd,
      end: dataEnd + (size & 1),
    });
    i = dataEnd + (size & 1);
  }
  return chunks;
};

const readWebp = (b: Uint8Array, out: Collector): boolean => {
  const chunks = walkWebp(b);
  if (!chunks) return false;
  for (const c of chunks) {
    if (c.fourcc === 'EXIF') {
      const skip = startsWithAscii(b, c.dataStart, 'Exif\0\0') ? 6 : 0;
      parseTiff(b, c.dataStart + skip, c.dataEnd, out);
    } else if (c.fourcc === 'XMP ') parseXmp(decodeXmp(b, c.dataStart, c.dataEnd), out);
    else if (c.fourcc === 'C2PA') out.hasC2pa = true;
  }
  return true;
};

const stripWebp = (b: Uint8Array): Uint8Array | null => {
  const chunks = walkWebp(b);
  if (!chunks) return null;
  const drop = new Set(['EXIF', 'XMP ', 'C2PA']);
  const parts: Uint8Array[] = [b.subarray(0, 12)];
  for (const c of chunks) {
    if (drop.has(c.fourcc)) continue;
    const piece = b.slice(c.start, c.end);
    // VP8X : on efface les indicateurs « EXIF » (0x08) et « XMP » (0x04)
    if (c.fourcc === 'VP8X') piece[8] &= ~(0x08 | 0x04);
    parts.push(piece);
  }
  const out = concat(parts);
  new DataView(out.buffer, out.byteOffset, out.byteLength).setUint32(4, out.length - 8, true);
  return out;
};

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export const detectFormat = (b: Uint8Array): ImageFormat => {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8) return 'jpeg';
  if (isPng(b)) return 'png';
  if (b.length >= 12 && startsWithAscii(b, 0, 'RIFF') && startsWithAscii(b, 8, 'WEBP'))
    return 'webp';
  return 'unknown';
};

const buildObservations = (out: Collector, format: ImageFormat): Observation[] => {
  const obs: Observation[] = [];
  const find = (key: string) => out.entries.find((e) => e.key === key)?.value;
  if (out.gps || out.entries.some((e) => e.key.startsWith('Latitude'))) obs.push({ code: 'gps' });
  const sensitive = out.entries
    .filter((e) => e.risk === 'high' && e.group !== 'GPS')
    .map((e) => e.key);
  if (sensitive.length)
    obs.push({ code: 'owner_serial', detail: [...new Set(sensitive)].join(', ') });
  const make = find('Fabricant');
  const model = find('Modèle');
  if (make || model) obs.push({ code: 'device', detail: [make, model].filter(Boolean).join(' ') });
  const editor = out.editors.find((e) => EDITOR_PATTERN.test(e));
  if (editor) obs.push({ code: 'editor', detail: editor });
  const ai = out.aiHints[0] ?? out.editors.find((e) => AI_PATTERN.test(e));
  if (ai) obs.push({ code: 'ai_marker', detail: ai });
  if (out.hasC2pa) obs.push({ code: 'c2pa' });
  const modified = find('Date de modification');
  const original = find('Date de prise de vue');
  if (modified && original && modified !== original)
    obs.push({ code: 'dates_differ', detail: `${original} → ${modified}` });
  if (out.entries.length === 0 && !out.hasC2pa && format !== 'unknown')
    obs.push({ code: 'no_metadata' });
  return obs;
};

/** Lit les métadonnées d'une image. Ne lève jamais d'exception. */
export const readImageMetadata = (bytes: Uint8Array): MetadataReport => {
  const format = detectFormat(bytes);
  const out = new Collector();
  try {
    if (format === 'jpeg') readJpeg(bytes, out);
    else if (format === 'png') readPng(bytes, out);
    else if (format === 'webp') readWebp(bytes, out);
  } catch {
    // Fichier corrompu : rapport partiel
  }
  if (out.hasC2pa)
    out.add(
      'Provenance',
      'Content Credentials (C2PA)',
      'Signature de provenance présente',
      'medium',
    );
  return {
    format,
    entries: out.entries,
    gps: out.gps,
    orientation: out.orientation,
    hasC2pa: out.hasC2pa,
    observations: buildObservations(out, format),
  };
};

export interface StripResult {
  bytes: Uint8Array;
  /** true si l'orientation a été conservée dans un EXIF minimal */
  keptOrientation: boolean;
}

/**
 * Supprime les métadonnées sans recompresser l'image (JPEG, PNG, WebP).
 * Retourne null si le format n'est pas pris en charge ou si l'image doit être redessinée
 * (par exemple WebP pivoté par EXIF) : l'appelant bascule alors sur un réencodage par canvas.
 */
export const stripImageMetadata = (
  bytes: Uint8Array,
  { keepOrientation = true }: { keepOrientation?: boolean } = {},
): StripResult | null => {
  try {
    const format = detectFormat(bytes);
    const orientation = readImageMetadata(bytes).orientation;
    const rotated = orientation !== undefined && orientation > 1 && orientation <= 8;
    if (format === 'jpeg') {
      const keep = keepOrientation && rotated;
      const result = stripJpeg(bytes, keep ? orientation : undefined);
      return result ? { bytes: result, keptOrientation: keep } : null;
    }
    if (format === 'png') {
      const result = stripPng(bytes);
      return result ? { bytes: result, keptOrientation: false } : null;
    }
    if (format === 'webp') {
      if (keepOrientation && rotated) return null;
      const result = stripWebp(bytes);
      return result ? { bytes: result, keptOrientation: false } : null;
    }
  } catch {
    // Fichier corrompu : repli par canvas
  }
  return null;
};
