import type { Chest } from '../sim/props/chest';
import { CHEST_ITEMS } from '../sim/props/chest';
import type { Shelf } from '../sim/props/shelf';
import type { World } from '../sim/world';
import type { Glyph } from '../sprites/frames';
import { CHEST, CHEST_BALL, CHEST_BALL_X, CHEST_RIM, CHEST_TILE_EMPTY, CHEST_TILES, CHEST_W, DOODLE, FINDS, MOUND, PLUSH, SHELF, SHELF_H, SHELF_ITEMS, type ShelfItem } from '../sprites/props';
import type { Stage } from '../stage';
import type { Bitmaps } from './bitmaps';

// Its things: the toy chest and what rises out of it, the shelf and what stands on it, its soft toys.

/** Paints a shadow on the ground under something: where its middle is on the canvas, and how wide in sprite pixels. */
type Shadow = (centerX: number, widthPx: number) => void;

/** Its soft toys that are out: those in its mouth (`carried`), or the others. */
export function drawPlushes(stage: Stage, bitmaps: Bitmaps, world: World, shadow: Shadow, carried: boolean): void {
  for (const toy of Object.values(world.plushes)) {
    if (toy.state === 'none' || (toy.state === 'carried') !== carried) {
      continue;
    }
    const { ctx, scale } = stage;
    const r = stage.rect(toy.box);
    if (!carried) {
      shadow(r.x + r.w / 2, toy.w - 2 - Math.min(toy.y / 6, 4));
    }
    // It turns by quarters as it tumbles, which keeps its pixels square; a hard landing flattens it by one of them.
    const flat = toy.squashed ? 1 : 0;
    ctx.save();
    ctx.translate(Math.round(r.x + r.w / 2), r.y + r.h);
    ctx.scale((toy.w + flat) / toy.w, (toy.h - flat) / toy.h);
    ctx.translate(0, -Math.round(r.h / 2));
    ctx.rotate((toy.quarter * Math.PI) / 2);
    ctx.drawImage(bitmaps.get(PLUSH[toy.kind]), -Math.round(r.w / 2), -Math.round(r.h / 2), toy.w * scale, toy.h * scale);
    ctx.restore();
  }
}

/** What is on the ground behind it: the mound where it dug, the heart it scratched, and what it brought you, kept in its corner. */
export function drawGround(stage: Stage, bitmaps: Bitmaps, world: World): void {
  const draw = (glyph: Glyph, box: { x: number; y: number; w: number; h: number } | undefined): void => {
    if (box) {
      const r = stage.rect(box);
      stage.ctx.drawImage(bitmaps.get(glyph), r.x, r.y, r.w, r.h);
    }
  };
  for (const [mark, glyphs] of [[world.mound, MOUND], [world.doodle, DOODLE]] as const) {
    if (mark.stage !== undefined) {
      draw(glyphs[mark.stage], mark.box);
    }
  }
  world.finds.kept.forEach((kind, i) => draw(FINDS[kind], world.finds.keptBox(i)));
}

/** What it is bringing you, in its mouth or set down in front of you, or hopping off to its corner. */
export function drawFind(stage: Stage, bitmaps: Bitmaps, world: World): void {
  const { offered, box } = world.finds;
  if (offered && box) {
    const r = stage.rect(box);
    stage.ctx.drawImage(bitmaps.get(FINDS[offered.kind]), r.x, r.y, r.w, r.h);
  }
}

/** Its toy chest: a bit of it at the edge of the view, slid out into its corner while the pointer is close. */
export function drawChest(stage: Stage, bitmaps: Bitmaps, chest: Chest, shadow: Shadow): void {
  const glyph = CHEST[chest.lid];
  const r = stage.rect({ x: chest.x - chest.nudge, y: 0, w: glyph[0].length, h: glyph.length });
  shadow(r.x + r.w / 2, CHEST_W - 3);
  stage.ctx.drawImage(bitmaps.get(glyph), r.x, r.y, r.w, r.h);
  if (chest.lid === 2 && chest.holds.ball) {
    // Its ball is in there.
    const ball = stage.rect({ x: chest.x + CHEST_BALL_X, y: CHEST_RIM, w: CHEST_BALL[0].length, h: CHEST_BALL.length });
    stage.ctx.drawImage(bitmaps.get(CHEST_BALL), ball.x, ball.y, ball.w, ball.h);
  }
}

/** What comes out of the chest, over everything else: its things rise from behind its rim, each on its tile. */
export function drawChestTiles(stage: Stage, bitmaps: Bitmaps, chest: Chest): void {
  const { ctx } = stage;
  if (chest.lid !== 2) {
    return;
  }
  const tile = (glyph: Glyph, box: { x: number; y: number; w: number; h: number }): void => {
    const r = stage.rect(box);
    ctx.drawImage(bitmaps.get(glyph), r.x, r.y, r.w, r.h);
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, stage.width, stage.screenY(CHEST_RIM));
  ctx.clip();
  // The top row first: the one under it rises in front of it.
  [...CHEST_ITEMS].reverse().forEach((item) => tile(chest.holds[item] ? CHEST_TILES[item] : CHEST_TILE_EMPTY, chest.slot(item)));
  ctx.restore();
}

/** The shelf on the wall, top right: its end at the edge of the view, slid out while the pointer is close. */
export function drawShelf(stage: Stage, bitmaps: Bitmaps, shelf: Shelf): void {
  const { ctx, scale } = stage;
  const plank = stage.rect({ x: shelf.x, y: shelf.y - SHELF_H + 1, w: SHELF[0].length, h: SHELF_H });
  ctx.drawImage(bitmaps.get(SHELF), plank.x, plank.y, plank.w, plank.h);
  for (const item of Object.keys(SHELF_ITEMS) as ShelfItem[]) {
    const glyph = SHELF_ITEMS[item].glyph;
    const bitmap = bitmaps.get(glyph);
    const r = stage.rect(shelf.slot(item));
    // A thing that sways keeps its foot on the plank: only its top half leans, by a pixel.
    const top = Math.ceil(glyph.length / 2);
    const rows = [
      { from: 0, count: top, lean: shelf.sway(item) },
      { from: top, count: glyph.length - top, lean: 0 },
    ];
    for (const { from, count, lean } of rows) {
      const share = bitmap.height / glyph.length;
      ctx.drawImage(bitmap, 0, from * share, bitmap.width, count * share, r.x + lean * scale, r.y + from * scale, r.w, count * scale);
    }
  }
}
