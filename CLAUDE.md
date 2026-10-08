# Foxel

VS Code extension: a pixel-art fox living in a webview. Two esbuild bundles that only talk through `shared/protocol.ts`:
the host (`src/` → `dist/extension.js`, Node) decides **when** something happens, the view (`webview/` → `dist/webview.js`, browser) decides **how** it looks.

## What Foxel is

Every feature is judged against these three, before any technical consideration:

- **A tamagotchi.** Foxel is a pet you care for and grow fond of, not a tool. A feature earns its place by making the fox feel more alive or the bond stronger.
- **No UI.** No text, numbers, gauges, menus or notifications in its view. Whatever the fox feels, needs or wants, it shows through what it does: an animation, a reaction, a pose, a prop, a picture bubble (never words). If something would need a label to be understood, find the behaviour that makes it obvious instead.
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
| `src/extension.ts` | Composition root: commands, providers, config changes; keeps the fox's memory between views |
| `src/events.ts` | Editor events → `Reaction`s, with cooldowns; idle and work tracking |
| `src/work.ts` | Work beyond typing → `Reaction`s: Git, terminal commands and tasks, what takes long |
| `src/routine.ts` | Timed needs: meals, break and drink reminders |
| `src/config.ts` | Reading settings; `SENT` lists those forwarded to the view |
| `webview/main.ts` | Wiring: loop, clock, host messages |
| `webview/input.ts`, `gestures.ts` | Mouse → commands; throw and stroke detection (pure) |
| `webview/stage.ts` | Canvas size and world ↔ screen coordinates (`rect` places any prop's `box`) |
| `webview/render/` | Drawing: `renderer.ts` (scene), `eyes.ts`, `bitmaps.ts` (coat, light), `sky.ts` (confetti), `bubbles.ts` |
| `webview/render/scenery/` | The skies it contemplates: one painter per `Vista`, `paint.ts` (what a painter is given, helpers), `index.ts` (layers) |
| `webview/sim/world.ts` | Ground, toys, bowls, pointer, time of day; updates the buddies |
| `webview/sim/buddy.ts` | One pet: position, current state, the state machine engine, movement helpers |
| `webview/sim/state.ts` | `BuddyState`, `StateDef`, `Feature` types |
| `webview/sim/registry.ts` | `FEATURES` and `STATES`, gathered from the features |
| `webview/sim/features/*.ts` | One file per group of states: their definitions, logic, memory and commands |
| `webview/sim/props/` | Ball, bubbles, butterfly, bird, treat, bowl, basket, grass, mouse, scenery: physics only |
| `webview/sim/memory.ts` | The needs it keeps when its view is closed and reopened |
| `webview/sim/showcase.ts` | Debug scenes |
| `webview/sprites/fox/` | The fox: `animations.ts` (table), `anims/` (the animations about your work, one file per group, each with its accessories), `pose.ts` and `head.ts` (drawn from poses), `anchors.ts` (geometry, touch zones) |
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
- **New setting**: `package.json` + `BuddyConfig`/`readConfig`. If the view needs it, add it to `BuddySettings`; the compiler asks for it in `SENT`. Add it to the settings table of the README.
- **New sky to contemplate**: add it to `Vista` (`shared/day.ts`), and to the hours it may come at in `vistasAt`; the compiler asks for its painter in `render/scenery/index.ts`. A painter keeps nothing between frames: it paints from its `VistaView` (size, time since it appeared, time since its great moment), in sprite pixels. What the fox does in front of it is `features/contemplate.ts`, the same for every sky; once out, a sky runs to its end by itself (`props/scenery.ts`), even if the fox is drawn away to play.
- **New toy**: a class in `sim/props/` exposing its `box`, a field and its update in `World`, its glyph in `sprites/props.ts` and a draw method in `render/renderer.ts`. If it can be dragged, one entry in `draggables` (`webview/input.ts`). What the fox does with it is a feature like any other.

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
