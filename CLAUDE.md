# Foxel

VS Code extension: a pixel-art fox living in a webview. Two esbuild bundles that only talk through `shared/protocol.ts`:
the host (`src/` → `dist/extension.js`, Node) decides **when** something happens, the view (`webview/` → `dist/webview.js`, browser) decides **how** it looks.

## What Foxel is

Every feature is judged against these, before any technical consideration:

- **A pet.** Foxel is a little animal you care for and grow fond of, not a tool. A feature earns its place by making the fox feel more alive or the bond stronger.
- **No UI.** No text, numbers, gauges, menus or notifications in its view. Whatever the fox feels, needs or wants, it shows through what it does: an animation, a reaction, a pose, a prop, a picture bubble (never words). If something would need a label to be understood, find the behaviour that makes it obvious instead. The fox is the star: its view stays bare, only the fox walking about it, and now and then a sky that unfolds behind it. What you can do for it is a few buttons in the title bar of its view (a ball, bubbles, a treat, a hello), or right on it with the mouse: a click touches it where it lands, a double click makes it twirl, a triple click sets off the zoomies, a stroke with the button down pets it; a click elsewhere calls it, a double click drops its ball there.
- **Simple.** It is a pet that lives its little life in the window, with animations. No stages, nothing to unlock or collect, nothing to manage. A feature that needs explaining, or a place of its own in the view, is one too many.
- **It grows on you, quietly.** Its mood (the day) and its attachment (the weeks) are never shown: they only change, a little, how it is with you (`sim/affection.ts`). Fond of you, it shows hearts and is beside itself when you come back after days away; devoted, it comes to your pointer readily and lies down by it.
- **Kawaii.** It stays cute, soft and playful in every state, including when it is sad, hungry or ignored: it asks sweetly, it never nags or scolds.

## Commands

- `npm run typecheck`: four passes (everything; host without DOM; webview without Node; `sim` + `sprites` with neither)
- `npm test`: vitest
- `npm run build`: both bundles
- F5 "Run Foxel (debug commands)": turns on `foxel.debug`, which adds **Foxel: Play a Scene...**

## Map

| Path | What lives there |
| --- | --- |
| `shared/protocol.ts` | Messages and settings exchanged by host and view |
| `shared/day.ts` | Pure time-of-day logic (phases, meals, light, party days) |
| `shared/life.ts` | Its life as it is saved: the facts of each day, and the attachment and mood worked out from them (pure) |
| `src/extension.ts` | Composition root: commands, providers, config changes; keeps the fox's memory between views |
| `src/events.ts` | Editor events → `Reaction`s, with cooldowns; idle and work tracking |
| `src/work.ts` | Work beyond typing → `Reaction`s: Git, terminal commands and tasks, what takes long |
| `src/routine.ts` | Timed needs: meals, break and drink reminders |
| `src/lifeStore.ts` | Keeps its life for good: synced between machines, merged between windows |
| `src/config.ts` | Reading settings; `SENT` lists those forwarded to the view |
| `webview/main.ts` | Wiring: loop, clock, host messages |
| `webview/input.ts`, `gestures.ts` | Mouse → commands; throw and stroke detection (pure) |
| `webview/stage.ts` | Canvas size and world ↔ screen coordinates (`rect` places any prop's `box`) |
| `webview/render/` | Drawing: `renderer.ts` (scene), `eyes.ts`, `bitmaps.ts` (coat, light), `sky.ts` (confetti), `bubbles.ts` |
| `webview/render/scenery/` | The skies it contemplates: one painter per `Vista`, `paint.ts` (what a painter is given, helpers), `index.ts` (layers) |
| `webview/sim/world.ts` | Ground, toys, bowls, pointer, time of day; updates the buddies |
| `webview/sim/buddy.ts` | One pet: position, current state, the state machine engine, movement helpers |
| `webview/sim/state.ts` | `BuddyState`, `StateDef`, `Feature` types |
| `webview/sim/affection.ts` | What its attachment changes in how it is with you, never shown |
| `webview/sim/registry.ts` | `FEATURES` and `STATES`, gathered from the features |
| `webview/sim/features/*.ts` | One file per group of states: their definitions, logic, memory and commands |
| `webview/sim/props/` | Ball, bubbles, butterfly, bird, treat, bowl, basket, grass, mouse, scenery: physics only |
| `webview/sim/memory.ts` | The needs it keeps when its view is closed and reopened |
| `webview/sim/showcase.ts` | Debug scenes |
| `webview/sprites/fox/` | The fox: `animations.ts` (table), `antics.ts` (the little things it does on its own: turning round before lying down, the loaf, belly up...), `anims/` (the animations about your work, one file per group, each with its accessories), `pose.ts`, `bodies.ts` and `head.ts` (drawn from poses), `anchors.ts` (geometry, touch zones) |
| `webview/sprites/` | `palette.ts`, `frames.ts` (types, `frameAt`), `props.ts` (glyphs), `grid.ts` (pixel drawing) |
| `test/sim/<feature>.test.ts` | Simulation tests; `helpers.ts` has `spawn`, `fixed`, `simulate` |
| `test/host/` | Host tests, with fake timers and a fake `vscode` |

## Where to change what

- **New state**: add its name to `BuddyState` (`sim/state.ts`), then its `StateDef` to the `states` of a feature file. The compiler asks for the definition, and for `anim` when the name is not an animation. Make it reachable: a `next` weight, a reaction handler, an urge or a command.
- **New feature file**: export `xFeature` (and `XMemory` if it remembers things), add it to `FEATURES` and `STATES` in `registry.ts`, and the memory as a field of `Buddy`.
- **New reaction to the editor**: add it to `Reaction` (`shared/protocol.ts`); the compiler asks for its handler in `features/reactions.ts`. Emit it from `src/events.ts` or `src/routine.ts`.
- **New animation**: one entry in `ANIMATIONS` (`sprites/fox/animations.ts`); its key becomes an `AnimName`. `test/sprites.test.ts` checks every entry. An accessory is a `props` entry of a pose: a glyph placed from the corner of the sprite, which may turn round with the fox (`mirrors`) or go behind it (`behind`). It has to arrive and leave, never pop.
- **New message**: add it to `HostMessage` or `WebviewMessage`; the compiler flags the `switch` that must handle it (`webview/main.ts`, `src/buddyViewProvider.ts`).
- **Something to keep when the view closes**: a webview loses everything when hidden. Add the field to `BuddyMemory` (`shared/protocol.ts`), then to `remember`, `sameMemory` and `recall` in `sim/memory.ts`. The host needs no change.
- **Something to keep for good**: its life is saved as facts, never as feelings. A new fact about a day goes in `DayRecord` (`shared/life.ts`), with its reading in `readLife`, its merge in `mergeLives` and its recording in `LifeStore`; what it feels is worked out from the facts. Changing the saved shape means raising `LIFE_VERSION` and bringing older saves up to date in `readLife`. An update never takes its attachment away: what 1.4.0 kept, its life and its `BuddyMemory`, is frozen as written in `test/host/lifeStore.test.ts` and `test/sim/memory.test.ts`, and has to go on being read.
- **A new button**: a command in `package.json` with a codicon, in the `view/title` and `editor/title` menus beside the others; it posts a `HostMessage` that `webview/main.ts` turns into what the fox does. Keep them few.
- **Something new to do with the mouse on it**: `onClick` in `webview/input.ts` (`detail` counts the clicks in a row), and what it does in `features/touch.ts`.
- **Something that depends on how it feels**: its mood today (-1 to 1) and its attachment (0 to 1) are worked out by the host from its life (`shared/life.ts`) and sent as `feelings`; the simulation reads `world.mood` and `world.attachment`. What its attachment changes is `sim/affection.ts`, and only there; the welcomes after an absence are `features/bond.ts`. What a good or a bad day adds to what it feels like doing is `MOOD_NEXT` (`features/ambient.ts`). Its mood shows on its face only, and subtly: `moodLevel` (`sim/tuning.ts`) gives its degree; `withFace` (`sprites/fox/pose.ts`) redraws any frame with the mouth and ears of that mood, so every animation has it; `render/eyes.ts` does its lid, its frown and its smiling eyes. It is never cross: a bad day makes it quieter, it never sulks or turns away from you.
- **New setting**: `package.json` + `BuddyConfig`/`readConfig`. If the view needs it, add it to `BuddySettings`; the compiler asks for it in `SENT`. Add it to the settings table of the README.
- **New sky to contemplate**: add it to `Vista` (`shared/day.ts`), and to the hours it may come at in `vistasAt`; the compiler asks for its painter in `render/scenery/index.ts`. A painter keeps nothing between frames: it paints from its `VistaView` (size, time since it appeared, time since its great moment), in sprite pixels. What the fox does in front of it is `features/contemplate.ts`, the same for every sky; once out, a sky runs to its end by itself (`props/scenery.ts`), even if the fox is drawn away to play.
- **New toy**: a class in `sim/props/` exposing its `box`, a field and its update in `World`, its glyph in `sprites/props.ts` and a draw method in `render/renderer.ts`. If it can be dragged, one entry in `draggables` (`webview/toys.ts`). What the fox does with it is a feature like any other. Its ball lives out of the view: it trots out to get it and back (`features/play.ts`).

## Rules

Checked by `test/architecture.test.ts` and the typecheck passes:

- Imports go one way: `shared` ← `sprites` ← `sim` ← the rest of `webview`; `src` only imports `shared`.
- No source file over 400 lines, data tables aside. Split by feature instead.
- `buddy.ts` and `world.ts` never test for a particular state. What a state does goes in its `StateDef`; what a feature needs from the engine goes in a `Feature` hook (`tick`, `urges`, `entered`, `interrupted`).

Not checked, just as important:

- The simulation is deterministic: randomness only through `world.random`, time only through `dt` and `world.now`. Tests depend on it.
- A feature may call another feature's functions, but only from inside a function, never while the module loads (they import each other). Constants shared by features go in `sim/tuning.ts`.
- Units: positions in sprite pixels, `y` is the height above the ground, durations in ms (`...Ms`), `dt` in seconds.
- A state machine change needs a test in `test/sim/`.
- commits message, please do not add more than one line per commit message, keep it trimmed !
- The README is not kept in step with the code, and neither is the changelog: do not touch them for every change. The README says what Foxel is, how to start, a few things to try, and lists the commands and settings; it shows a little and leaves the rest for people to discover by themselves. Only a new command or setting belongs there without being asked. Its pictures are in `media/readme/`.
