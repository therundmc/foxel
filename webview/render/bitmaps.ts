import type { LightTint } from '../../shared/day';
import type { Coat } from '../../shared/protocol';
import type { Glyph } from '../sprites/frames';
import { COATS, ON_LIGHT, PALETTE, TRANSPARENT, UNTINTED } from '../sprites/palette';

// Light the fox is bathed in: [colour mixed in, amount].
const TINTS: Record<Exclude<LightTint, 'day'>, readonly [string, number]> = {
  golden: ['#ffb05c', 0.08],
  night: ['#24306e', 0.16],
};

/** Glyphs painted once onto small canvases, in the current coat and light, for the theme the view sits in. */
export class Bitmaps {
  private readonly cache = new Map<Glyph, HTMLCanvasElement>();
  private coat: Coat = 'red';
  private tint: LightTint = 'day';
  private light = false;

  setCoat(coat: Coat): void {
    if (coat !== this.coat) {
      this.coat = coat;
      this.cache.clear();
    }
  }

  setTint(tint: LightTint): void {
    if (tint !== this.tint) {
      this.tint = tint;
      this.cache.clear();
    }
  }

  /** Whether the view sits on a light background. */
  setLight(light: boolean): void {
    if (light !== this.light) {
      this.light = light;
      this.cache.clear();
    }
  }

  colorOf(letter: string): string {
    const base = COATS[this.coat]?.[letter] ?? (this.light ? ON_LIGHT[letter] : undefined) ?? PALETTE[letter];
    if (this.tint === 'day' || UNTINTED.has(letter)) {
      return base;
    }
    const [mix, amount] = TINTS[this.tint];
    const channel = (hex: string, i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    const out = [0, 1, 2].map((i) => Math.round(channel(base, i) * (1 - amount) + channel(mix, i) * amount));
    return `rgb(${out.join(',')})`;
  }

  get(pixels: Glyph): HTMLCanvasElement {
    let bmp = this.cache.get(pixels);
    if (bmp) {
      return bmp;
    }
    bmp = document.createElement('canvas');
    bmp.width = pixels[0].length;
    bmp.height = pixels.length;
    const g = bmp.getContext('2d') as CanvasRenderingContext2D;
    pixels.forEach((line, y) => {
      for (let x = 0; x < line.length; x++) {
        if (line[x] !== TRANSPARENT) {
          g.fillStyle = this.colorOf(line[x]);
          g.fillRect(x, y, 1, 1);
        }
      }
    });
    this.cache.set(pixels, bmp);
    return bmp;
  }
}
