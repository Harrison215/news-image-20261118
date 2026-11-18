import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// A deterministic, offline editorial illustration for the 18 November 2026 news day.
// The whole picture is drawn here so both clean-container runs produce identical PNG bytes.
const W = 1024, H = 1024;
const pixels = Buffer.alloc(W * H * 4);
const C = {
  paper: '#F3EBDD', ink: '#142A3A', muted: '#526677', red: '#D9513D',
  blue: '#3177A5', paleBlue: '#D9E8EA', gold: '#E2AE4E', green: '#4F8975',
  white: '#FFFDF7', dark: '#203F52', cloud: '#C8D9DB', sea: '#9CC8CB'
};
function rgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function rect(x, y, w, h, color) {
  const [r, g, b] = rgb(color);
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w)), y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
    const i = (yy * W + xx) * 4; pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = 255;
  }
}
function circle(cx, cy, radius, color) {
  const [r, g, b] = rgb(color), rr = radius * radius;
  for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(H - 1, Math.ceil(cy + radius)); y++)
    for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(W - 1, Math.ceil(cx + radius)); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= rr) { const i = (y * W + x) * 4; pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = 255; }
}
function line(x0, y0, x1, y1, color, thickness = 3) {
  const dx = x1 - x0, dy = y1 - y0, steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let n = 0; n <= steps; n++) circle(x0 + dx * n / steps, y0 + dy * n / steps, thickness / 2, color);
}
function poly(points, color) {
  const [r, g, b] = rgb(color), minY = Math.max(0, Math.floor(Math.min(...points.map(p => p[1]))));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(...points.map(p => p[1]))));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
    }
    xs.sort((a, b) => a - b);
    for (let j = 0; j + 1 < xs.length; j += 2) rect(xs[j], y, xs[j + 1] - xs[j] + 1, 1, color);
  }
}

const FONT = {
  A:['01110','10001','10001','11111','10001','10001','10001'], B:['11110','10001','10001','11110','10001','10001','11110'],
  C:['01111','10000','10000','10000','10000','10000','01111'], D:['11110','10001','10001','10001','10001','10001','11110'],
  E:['11111','10000','10000','11110','10000','10000','11111'], F:['11111','10000','10000','11110','10000','10000','10000'],
  G:['01111','10000','10000','10111','10001','10001','01111'], H:['10001','10001','10001','11111','10001','10001','10001'],
  I:['11111','00100','00100','00100','00100','00100','11111'], J:['00111','00010','00010','00010','10010','10010','01100'],
  K:['10001','10010','10100','11000','10100','10010','10001'], L:['10000','10000','10000','10000','10000','10000','11111'],
  M:['10001','11011','10101','10101','10001','10001','10001'], N:['10001','11001','10101','10011','10001','10001','10001'],
  O:['01110','10001','10001','10001','10001','10001','01110'], P:['11110','10001','10001','11110','10000','10000','10000'],
  Q:['01110','10001','10001','10001','10101','10010','01101'], R:['11110','10001','10001','11110','10100','10010','10001'],
  S:['01111','10000','10000','01110','00001','00001','11110'], T:['11111','00100','00100','00100','00100','00100','00100'],
  U:['10001','10001','10001','10001','10001','10001','01110'], V:['10001','10001','10001','10001','10001','01010','00100'],
  W:['10001','10001','10001','10101','10101','10101','01010'], X:['10001','10001','01010','00100','01010','10001','10001'],
  Y:['10001','10001','01010','00100','00100','00100','00100'], Z:['11111','00001','00010','00100','01000','10000','11111'],
  '0':['01110','10001','10011','10101','11001','10001','01110'], '1':['00100','01100','00100','00100','00100','00100','01110'],
  '2':['01110','10001','00001','00010','00100','01000','11111'], '3':['11110','00001','00001','01110','00001','00001','11110'],
  '4':['00010','00110','01010','10010','11111','00010','00010'], '5':['11111','10000','10000','11110','00001','00001','11110'],
  '6':['01110','10000','10000','11110','10001','10001','01110'], '7':['11111','00001','00010','00100','01000','01000','01000'],
  '8':['01110','10001','10001','01110','10001','10001','01110'], '9':['01110','10001','10001','01111','00001','00001','01110'],
  ':':['00000','00100','00100','00000','00100','00100','00000'], '.':['00000','00000','00000','00000','00000','00110','00110'],
  ',':['00000','00000','00000','00000','00110','00110','00100'], '-':['00000','00000','00000','11111','00000','00000','00000'],
  '+':['00000','00100','00100','11111','00100','00100','00000'], '/':['00001','00010','00010','00100','01000','01000','10000'],
  '&':['01100','10010','10100','01000','10101','10010','01101'], '$':['00100','01111','10100','01110','00101','11110','00100'],
  '!':['00100','00100','00100','00100','00100','00000','00100'], '?':['01110','10001','00001','00010','00100','00000','00100'],
  "'":['00100','00100','00000','00000','00000','00000','00000']
};
function text(s, x, y, scale, color, spacing = 2) {
  let at = x;
  for (const raw of s.toUpperCase()) {
    if (raw === ' ') { at += (5 + spacing) * scale; continue; }
    const glyph = FONT[raw];
    if (glyph) for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 5; gx++)
      if (glyph[gy][gx] === '1') rect(at + gx * scale, y + gy * scale, scale, scale, color);
    at += (5 + spacing) * scale;
  }
}
function label(s, x, y, color, bg) {
  const scale = 2, width = s.length * 14 + 16;
  rect(x, y, width, 26, bg); text(s, x + 8, y + 6, scale, color, 1);
}

rect(0, 0, W, H, C.paper);
rect(0, 0, W, 15, C.red);
text('THE WORLD, IN ONE DAY', 54, 42, 5, C.ink, 2);
text('WEDNESDAY / 18 NOVEMBER 2026', 57, 92, 2, C.red, 2);
line(54, 123, 970, 123, C.ink, 2);

// A central globe anchors three same-day stories in diplomacy, climate and markets.
circle(512, 389, 226, C.dark);
circle(512, 389, 211, C.sea);
poly([[337,330],[367,279],[415,263],[440,289],[428,316],[453,335],[439,367],[411,376],[393,408],[356,396],[340,369]], C.green);
poly([[481,256],[519,245],[545,270],[536,296],[558,310],[550,339],[527,350],[518,379],[493,367],[488,337],[466,324],[469,295]], C.green);
poly([[537,381],[580,365],[619,382],[628,413],[605,435],[594,475],[564,495],[544,466],[553,435],[530,415]], C.green);
poly([[631,291],[669,301],[686,330],[674,352],[646,343],[629,322]], C.green);
// Shenzhen/APEC marker and three trade routes.
circle(570, 326, 10, C.gold);
line(570, 326, 430, 342, C.white, 2); line(570, 326, 597, 415, C.white, 2);
circle(430, 342, 5, C.white); circle(597, 415, 5, C.white);
// Sun and tide around the globe reference the climate talks and vulnerable islands.
circle(759, 234, 32, C.gold); circle(759, 234, 19, C.paper);
for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(759 + Math.cos(a)*39,234 + Math.sin(a)*39,759 + Math.cos(a)*51,234 + Math.sin(a)*51,C.gold,3); }

// Three clear story bands, each with a visual cue and concise factual caption.
const cards = [
  { y: 586, color: C.blue, tag: 'APEC / SHENZHEN, CHINA', headline: 'XI URGES OPEN TRADE; TRUMP + PUTIN DUE THU' },
  { y: 671, color: C.green, tag: 'UN CLIMATE / ANTALYA', headline: 'ISLAND NATIONS DEMAND MORE ACTION' },
  { y: 756, color: C.red, tag: 'US POLITICS / ALASKA', headline: 'PELTOLA WINS; DEMS SET FOR 56-44 SENATE' },
  { y: 841, color: C.gold, tag: 'TECH / ASIA MARKETS', headline: 'ASIAN SHARES FALL AS AI STOCKS SWING' }
];
for (const card of cards) {
  rect(54, card.y, 916, 78, C.white);
  rect(54, card.y, 12, 78, card.color);
  rect(82, card.y + 10, 12, 58, card.color);
  label(card.tag, 112, card.y + 5, C.white, card.color);
  text(card.headline, 112, card.y + 40, 3, C.ink, 0);
}
line(54, 963, 970, 963, C.ink, 2);
text('TRADE  /  CLIMATE  /  AI MARKETS', 56, 979, 2, C.ink, 2);
text('REPORTING: ASSOCIATED PRESS  /  18 NOV', 604, 979, 1, C.muted, 1);

// Encode a complete RGBA PNG with stable compression and no time-bearing metadata.
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(kind, data) {
  const name = Buffer.from(kind), body = Buffer.concat([name, data]), out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc32(body), data.length + 8); return out;
}
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) pixels.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR', Buffer.from([0,0,4,0,0,0,4,0,8,6,0,0,0])),
  chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), png);
