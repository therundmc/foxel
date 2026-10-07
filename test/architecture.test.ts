import { readdirSync, readFileSync } from 'fs';
import { dirname, join, posix, relative } from 'path';
import { describe, expect, it } from 'vitest';

// The rules that keep the code base easy to extend. See CLAUDE.md for the reasons.

const ROOT = join(__dirname, '..');
const MAX_LINES = 400;
// Pure data may be as long as the data is.
const DATA_TABLES = ['webview/sprites/fox/animations.ts'];

// What each layer may import, most specific layer first; a bare name is a package.
const LAYERS: readonly (readonly [string, readonly string[]])[] = [
  ['shared/', ['shared/']],
  ['src/', ['src/', 'shared/', 'vscode', 'crypto']],
  ['webview/sprites/', ['webview/sprites/', 'shared/']],
  ['webview/sim/props/', ['webview/sim/props/', 'webview/sim/math', 'webview/sprites/', 'shared/']],
  ['webview/sim/', ['webview/sim/', 'webview/sprites/', 'shared/']],
  ['webview/', ['webview/', 'shared/']],
];

function sources(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = posix.join(dir, entry.name);
    return entry.isDirectory() ? sources(path) : path.endsWith('.ts') ? [path] : [];
  });
}

const FILES = ['shared', 'src', 'webview'].flatMap(sources);
const read = (file: string): string => readFileSync(join(ROOT, file), 'utf8');

function imports(file: string): string[] {
  return [...read(file).matchAll(/from '([^']+)'/g)].map(([, target]) =>
    target.startsWith('.') ? relative(ROOT, join(ROOT, dirname(file), target)).split('\\').join('/') : target,
  );
}

describe('architecture', () => {
  it('keeps every layer to the imports it is allowed', () => {
    const broken = FILES.flatMap((file) => {
      const allowed = LAYERS.find(([layer]) => file.startsWith(layer))?.[1] ?? [];
      return imports(file)
        .filter((target) => !allowed.some((a) => (a.endsWith('/') ? target.startsWith(a) : target === a)))
        .map((target) => `${file} -> ${target}`);
    });
    expect(broken).toEqual([]);
  });

  it('keeps files small enough to read in one go', () => {
    const long = FILES.filter((file) => !DATA_TABLES.includes(file))
      .map((file) => [file, read(file).split('\n').length] as const)
      .filter(([, lines]) => lines > MAX_LINES)
      .map(([file, lines]) => `${file}: ${lines} lines`);
    expect(long).toEqual([]);
  });

  it('keeps the engine free of any particular state', () => {
    for (const file of ['webview/sim/buddy.ts', 'webview/sim/world.ts']) {
      expect(read(file), file).not.toMatch(/\b(this|b|buddy)\.state (===|!==) '/);
    }
  });
});
