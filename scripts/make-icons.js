// Генератор иконок Praxis. Запуск: node ./scripts/make-icons.js
//
// Зачем скрипт, а не картинки из редактора: в проекте нет ни sharp, ни другого
// растеризатора, а иконки шаблона Expo (логотипы Expo и React) выдавали чужое
// приложение — вкладка браузера показывала не тот значок. PNG собирается
// вручную поверх встроенного zlib, поэтому зависимостей не прибавилось.
//
// Знак: три узла и две связи — мотив графа знаний, на котором стоит продукт.

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const OUT = path.resolve(__dirname, '..', 'assets', 'images');

const INK = [12, 18, 28];
const ACCENT = [32, 138, 239]; // colors.accent из shared/config/design.ts
const LIGHT = [255, 255, 255];

function canvas(size, bg) {
  const px = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    px[i * 4] = bg[0];
    px[i * 4 + 1] = bg[1];
    px[i * 4 + 2] = bg[2];
    px[i * 4 + 3] = bg === null ? 0 : 255;
  }
  return px;
}

function blend(px, size, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= size || y >= size || alpha <= 0) return;
  const i = (y * size + x) * 4;
  const a = Math.min(1, alpha);
  for (let c = 0; c < 3; c++) px[i + c] = Math.round(px[i + c] * (1 - a) + color[c] * a);
  px[i + 3] = Math.max(px[i + 3], Math.round(255 * a));
}

/** Круг со сглаженным краем: без антиалиасинга знак выглядит рваным. */
function disc(px, size, cx, cy, r, color) {
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      blend(px, size, x, y, color, Math.min(1, r - d + 0.5));
    }
  }
}

function segment(px, size, x1, y1, x2, y2, w, color) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const steps = Math.ceil(len * 2);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    disc(px, size, x1 + dx * t, y1 + dy * t, w / 2, color);
  }
}

/** Знак: узел-основа снизу и две ветви сверху. */
function mark(size, { bg, node, edge }) {
  const px = canvas(size, bg ?? [0, 0, 0]);
  if (!bg) px.fill(0);
  const u = size / 100;
  // Координаты в процентах поля; знак центрирован по габаритам, иначе
  // в маске Android и в favicon он уезжает вниз и выглядит мелким.
  const root = { x: 50 * u, y: 71 * u };
  const left = { x: 24 * u, y: 25 * u };
  const right = { x: 76 * u, y: 29 * u };
  segment(px, size, root.x, root.y, left.x, left.y, 7 * u, edge);
  segment(px, size, root.x, root.y, right.x, right.y, 7 * u, edge);
  disc(px, size, root.x, root.y, 15 * u, node);
  disc(px, size, left.x, left.y, 11 * u, node);
  disc(px, size, right.x, right.y, 11 * u, node);
  return px;
}

function png(px, size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // фильтр None
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // бит на канал
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

/**
 * ICO поверх PNG: современные браузеры принимают PNG внутри .ico. Нужен именно
 * файл public/favicon.ico — dev-сервер Expo отдаёт по этому адресу свою иконку,
 * а web.favicon из app.json применяется только при экспорте. Без этого вкладка
 * в браузере продолжала показывать значок Expo.
 */
function ico(pngBuf, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // тип: иконка
  header.writeUInt16LE(1, 4); // одно изображение
  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size; // ширина (0 = 256)
  entry[1] = size >= 256 ? 0 : size; // высота
  entry.writeUInt16LE(1, 4); // цветовых плоскостей
  entry.writeUInt16LE(32, 6); // бит на пиксель
  entry.writeUInt32BE(pngBuf.length, 8);
  entry.writeUInt32LE(pngBuf.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);
  return Buffer.concat([header, entry, pngBuf]);
}

function write(name, size, opts) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, png(mark(size, opts), size));
  console.log(`  ${name} — ${size}×${size}`);
}

console.log('Знак Praxis:');
write('icon.png', 1024, { bg: LIGHT, node: ACCENT, edge: INK });
write('favicon.png', 196, { bg: LIGHT, node: ACCENT, edge: INK });
write('splash-icon.png', 512, { bg: null, node: ACCENT, edge: INK });
write('android-icon-foreground.png', 1024, { bg: null, node: ACCENT, edge: INK });
write('android-icon-background.png', 1024, { bg: LIGHT, node: LIGHT, edge: LIGHT });
write('android-icon-monochrome.png', 1024, { bg: null, node: INK, edge: INK });

const PUBLIC = path.resolve(__dirname, '..', 'public');
fs.mkdirSync(PUBLIC, { recursive: true });
const faviconPng = png(mark(64, { bg: LIGHT, node: ACCENT, edge: INK }), 64);
fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), ico(faviconPng, 64));
console.log('  public/favicon.ico — 64×64');
