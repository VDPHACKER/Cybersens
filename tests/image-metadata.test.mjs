// Lecture et suppression des métadonnées d'images (fichiers synthétiques). npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readImageMetadata, stripImageMetadata } from '../services/imageMetadata.ts';

const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
const u16 = (n) => [(n >> 8) & 255, n & 255];
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

// EXIF big-endian : fabricant, modèle, logiciel, orientation + GPS (48°51'30" N, 2°17'40" E)
const buildExif = (orientation = 1) => {
  const strings = { make: 'ACME\0', model: 'Cam One\0', soft: 'Adobe Photoshop 25\0' };
  // Disposition : header(8) | IFD0 | GPS IFD | données
  const ifd0Entries = 5; // make, model, orientation, software, gpsPointer
  const ifd0Size = 2 + ifd0Entries * 12 + 4;
  const gpsOffset = 8 + ifd0Size;
  const gpsEntries = 4;
  const gpsSize = 2 + gpsEntries * 12 + 4;
  let data = 8 + ifd0Size + gpsSize;
  const place = (len) => {
    const at = data;
    data += len;
    return at;
  };
  const makeAt = place(strings.make.length);
  const modelAt = place(strings.model.length);
  const softAt = place(strings.soft.length);
  const latAt = place(24);
  const lonAt = place(24);
  const entry = (tag, type, count, value) => [...u16(tag), ...u16(type), ...u32(count), ...value];
  const ifd0 = [
    ...u16(ifd0Entries),
    ...entry(0x010f, 2, strings.make.length, u32(makeAt)),
    ...entry(0x0110, 2, strings.model.length, u32(modelAt)),
    ...entry(0x0112, 3, 1, [...u16(orientation), 0, 0]),
    ...entry(0x0131, 2, strings.soft.length, u32(softAt)),
    ...entry(0x8825, 4, 1, u32(gpsOffset)),
    ...u32(0),
  ];
  const gps = [
    ...u16(gpsEntries),
    ...entry(1, 2, 2, [...ascii('N\0'), 0, 0]),
    ...entry(2, 5, 3, u32(latAt)),
    ...entry(3, 2, 2, [...ascii('E\0'), 0, 0]),
    ...entry(4, 5, 3, u32(lonAt)),
    ...u32(0),
  ];
  const rat = (n, d) => [...u32(n), ...u32(d)];
  return Uint8Array.from([
    ...ascii('MM'),
    0,
    42,
    ...u32(8),
    ...ifd0,
    ...gps,
    ...ascii(strings.make),
    ...ascii(strings.model),
    ...ascii(strings.soft),
    ...rat(48, 1),
    ...rat(51, 1),
    ...rat(30, 1),
    ...rat(2, 1),
    ...rat(17, 1),
    ...rat(40, 1),
  ]);
};

const SCAN = [0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 63, 0, 0x12, 0x34, 0xff, 0x00, 0x56];
const seg = (marker, payload) => [0xff, marker, ...u16(payload.length + 2), ...payload];

const buildJpeg = ({ orientation = 1, extra = [] } = {}) =>
  Uint8Array.from([
    0xff,
    0xd8,
    ...seg(0xe0, [...ascii('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0]),
    ...seg(0xe1, [...ascii('Exif\0\0'), ...buildExif(orientation)]),
    ...seg(0xfe, ascii('secret comment')),
    ...extra,
    ...seg(0xdb, [0, 1, 2, 3]),
    ...SCAN,
    0xff,
    0xd9,
    ...ascii('TRAILING-HIDDEN-DATA'),
  ]);

test('JPEG : lecture EXIF, GPS, appareil, logiciel, commentaire', () => {
  const r = readImageMetadata(buildJpeg());
  assert.equal(r.format, 'jpeg');
  const keys = r.entries.map((e) => e.key);
  for (const k of ['Fabricant', 'Modèle', 'Logiciel', 'Commentaire', 'Position'])
    assert.ok(keys.includes(k), `clé manquante : ${k}`);
  assert.deepEqual(r.gps, { lat: 48.85833, lon: 2.29444 });
  assert.equal(r.entries.find((e) => e.key === 'Position').risk, 'high');
  const codes = r.observations.map((o) => o.code);
  assert.ok(codes.includes('gps') && codes.includes('device') && codes.includes('editor'));
});

test('JPEG : suppression sans perte, données cachées après EOI retirées', () => {
  const src = buildJpeg();
  const res = stripImageMetadata(src);
  assert.ok(res);
  const out = res.bytes;
  assert.deepEqual([out[0], out[1]], [0xff, 0xd8]);
  assert.deepEqual([out[out.length - 2], out[out.length - 1]], [0xff, 0xd9]);
  const text = Buffer.from(out).toString('latin1');
  assert.ok(!text.includes('Exif') && !text.includes('secret') && !text.includes('TRAILING'));
  assert.ok(text.includes('JFIF'), 'JFIF conservé');
  assert.ok(Buffer.from(out).includes(Buffer.from(SCAN)), 'données image identiques');
  const after = readImageMetadata(out);
  assert.equal(after.entries.length, 0);
  assert.ok(after.observations.some((o) => o.code === 'no_metadata'));
});

test('JPEG : l’orientation est conservée seule, sans le reste de l’EXIF', () => {
  const res = stripImageMetadata(buildJpeg({ orientation: 6 }));
  assert.equal(res.keptOrientation, true);
  const after = readImageMetadata(res.bytes);
  assert.equal(after.orientation, 6);
  assert.deepEqual(
    after.entries.map((e) => e.key),
    ['Orientation'],
  );
  assert.equal(after.gps, undefined);
  const dropped = stripImageMetadata(buildJpeg({ orientation: 6 }), { keepOrientation: false });
  assert.equal(readImageMetadata(dropped.bytes).entries.length, 0);
});

test('JPEG : profil ICC conservé, C2PA signalé puis supprimé', () => {
  const icc = seg(0xe2, [...ascii('ICC_PROFILE\0'), 1, 1, 9, 9]);
  const c2pa = seg(0xeb, [...ascii('JP'), 0, 0, ...ascii('jumb'), ...ascii('c2pa')]);
  const src = buildJpeg({ extra: [...icc, ...c2pa] });
  const r = readImageMetadata(src);
  assert.equal(r.hasC2pa, true);
  assert.ok(r.observations.some((o) => o.code === 'c2pa'));
  const out = stripImageMetadata(src).bytes;
  assert.ok(Buffer.from(out).includes(Buffer.from(ascii('ICC_PROFILE'))));
  assert.equal(readImageMetadata(out).hasC2pa, false);
});

const pngChunk = (type, data) => [...u32(data.length), ...ascii(type), ...data, 0, 0, 0, 0];
const buildPng = () =>
  Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...pngChunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
    ...pngChunk('tEXt', [
      ...ascii('parameters\0'),
      ...ascii('a cat, Steps: 20, Model: stable-diffusion'),
    ]),
    ...pngChunk('tEXt', [...ascii('Author\0'), ...ascii('Jane Doe')]),
    ...pngChunk('eXIf', [...buildExif()]),
    ...pngChunk('tIME', [0x07, 0xe8, 5, 12, 14, 3, 11]),
    ...pngChunk('IDAT', [1, 2, 3, 4]),
    ...pngChunk('IEND', []),
  ]);

test('PNG : texte, EXIF, date, marqueur de générateur IA', () => {
  const r = readImageMetadata(buildPng());
  assert.equal(r.format, 'png');
  const keys = r.entries.map((e) => e.key);
  assert.ok(
    keys.includes('Author') && keys.includes('Position') && keys.includes('Dernière modification'),
  );
  assert.equal(r.entries.find((e) => e.key === 'Author').risk, 'high');
  assert.ok(r.observations.some((o) => o.code === 'ai_marker'));
});

test('PNG : suppression des blocs auxiliaires, image intacte', () => {
  const out = stripImageMetadata(buildPng()).bytes;
  const text = Buffer.from(out).toString('latin1');
  for (const t of ['tEXt', 'eXIf', 'tIME', 'Jane']) assert.ok(!text.includes(t), t);
  for (const t of ['IHDR', 'IDAT', 'IEND']) assert.ok(text.includes(t), t);
  assert.equal(readImageMetadata(out).entries.length, 0);
});

const riff = (chunks) => {
  const body = [...ascii('WEBP'), ...chunks];
  return Uint8Array.from([...ascii('RIFF'), ...u32(0).reverse(), ...body]);
};
const webpChunk = (fourcc, data) => {
  const size = data.length;
  const le = [size & 255, (size >> 8) & 255, (size >> 16) & 255, (size >>> 24) & 255];
  return [...ascii(fourcc), ...le, ...data, ...(size & 1 ? [0] : [])];
};
const buildWebp = (orientation = 1) => {
  const exif = [...buildExif(orientation)];
  const body = [
    ...webpChunk('VP8X', [0x08 | 0x04, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    ...webpChunk('EXIF', exif),
    ...webpChunk('XMP ', ascii('<x xmp:CreatorTool="Midjourney v6"/>')),
    ...webpChunk('VP8 ', [9, 8, 7, 6, 5]),
  ];
  const buf = riff(body);
  new DataView(buf.buffer).setUint32(4, buf.length - 8, true);
  return buf;
};

test('WebP : lecture EXIF et XMP, suppression et taille RIFF cohérente', () => {
  const src = buildWebp();
  const r = readImageMetadata(src);
  assert.equal(r.format, 'webp');
  assert.ok(r.gps);
  assert.ok(r.observations.some((o) => o.code === 'ai_marker'));
  const out = stripImageMetadata(src).bytes;
  assert.equal(new DataView(out.buffer, out.byteOffset).getUint32(4, true), out.length - 8);
  assert.equal(out[20] & (0x08 | 0x04), 0, 'indicateurs EXIF/XMP effacés');
  assert.ok(Buffer.from(out).includes(Buffer.from([9, 8, 7, 6, 5])));
  assert.equal(readImageMetadata(out).entries.length, 0);
});

test('WebP pivoté : repli demandé (null) pour redessiner l’image', () => {
  assert.equal(stripImageMetadata(buildWebp(6)), null);
});

test('fichiers invalides ou tronqués : aucune exception', () => {
  assert.equal(readImageMetadata(new Uint8Array(0)).format, 'unknown');
  assert.equal(readImageMetadata(Uint8Array.from(ascii('pas une image'))).entries.length, 0);
  assert.equal(stripImageMetadata(Uint8Array.from(ascii('pas une image'))), null);
  const jpeg = buildJpeg();
  for (const cut of [3, 10, 30, 60, jpeg.length - 30]) {
    assert.doesNotThrow(() => readImageMetadata(jpeg.subarray(0, cut)));
    assert.doesNotThrow(() => stripImageMetadata(jpeg.subarray(0, cut)));
  }
  const png = buildPng();
  for (const cut of [9, 20, 50, png.length - 5])
    assert.doesNotThrow(() => readImageMetadata(png.subarray(0, cut)));
});
