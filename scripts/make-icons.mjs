// Draws the toolbar icons (a butter-yellow tile with three gliding lines) into public/icons/*.png.
// Pure Node: shapes are signed-distance fields, sampled 4x4 per pixel for smooth edges. Run: npm run icons
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const debug = false;
const SIZES = [16, 32, 48, 128];
const TILE = [246, 207, 87];   // --butter
const INK = [59, 45, 5];       // --butter-ink

// rounded box distance, all in 0..1 icon space
function box(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r, qy = Math.abs(py - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
// bars: [left, centre y, width, alpha]
const BARS = [
  [0.24, 0.32, 0.46, 0.45],
  [0.24, 0.5, 0.52, 1],
  [0.24, 0.68, 0.34, 1],
];

function shade(x, y, size) {
  const bh = size <= 16 ? 0.065 : 0.055; // thicker bars at 16 px so they survive
  const tile = box(x, y, 0.5, 0.5, 0.47, 0.47, 0.22);
  if (tile > 0) return [0, 0, 0, 0];
  let c = TILE.slice();
  for (const [l, cy, w, a] of BARS) {
    if (box(x, y, l + w / 2, cy, w / 2, bh, bh) <= 0) c = c.map((v, i) => v + (INK[i] - v) * a);
  }
  return [...c, 255];
}

function render(size) {
  const SS = 4;
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [cr, cg, cb, ca] = shade((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size, size);
          r += cr * ca; g += cg * ca; b += cb * ca; a += ca;
        }
      }
      const o = (y * size + x) * 4;
      if (a) { px[o] = r / a; px[o + 1] = g / a; px[o + 2] = b / a; }
      px[o + 3] = a / (SS * SS);
    }
  }
  return png(size, px);
}

// ---- minimal PNG encoder (RGBA, filter 0)
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = new URL('../public/icons/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const s of SIZES) {
  writeFileSync(new URL(`${s}.png`, out), render(s));
  if (debug) console.log('wrote', s);
}
console.log(`icons: ${SIZES.join(', ')} px`);
