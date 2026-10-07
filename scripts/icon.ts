import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';
import { ANIMATIONS } from '../webview/sprites/fox/animations';
import { SPRITE_SIZE } from '../webview/sprites/frames';
import { PALETTE, TRANSPARENT } from '../webview/sprites/palette';

const SIZE = 128;
const SCALE = SIZE / SPRITE_SIZE;
const OUTPUT = 'media/icon.png';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const pixels = ANIMATIONS.sit.frames[0].pixels;
const filled = (x: number, y: number): boolean => pixels[y][x] !== TRANSPARENT;
let [minX, minY, maxX, maxY] = [SPRITE_SIZE, SPRITE_SIZE, 0, 0];
for (let y = 0; y < SPRITE_SIZE; y++) {
  for (let x = 0; x < SPRITE_SIZE; x++) {
    if (filled(x, y)) {
      [minX, minY, maxX, maxY] = [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x), Math.max(maxY, y)];
    }
  }
}
const offsetX = Math.floor((SPRITE_SIZE - (maxX - minX + 1)) / 2) - minX;
const offsetY = Math.floor((SPRITE_SIZE - (maxY - minY + 1)) / 2) - minY;

const stride = SIZE * 4 + 1;
const raw = Buffer.alloc(stride * SIZE);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const sx = Math.floor(x / SCALE) - offsetX;
    const sy = Math.floor(y / SCALE) - offsetY;
    const c = pixels[sy]?.[sx];
    if (c === undefined || c === TRANSPARENT) {
      continue;
    }
    const hex = PALETTE[c];
    const i = y * stride + 1 + x * 4;
    raw[i] = parseInt(hex.slice(1, 3), 16);
    raw[i + 1] = parseInt(hex.slice(3, 5), 16);
    raw[i + 2] = parseInt(hex.slice(5, 7), 16);
    raw[i + 3] = 255;
  }
}

const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header.set([8, 6, 0, 0, 0], 8);

writeFileSync(
  OUTPUT,
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]),
);
console.log(`Wrote ${OUTPUT}`);
