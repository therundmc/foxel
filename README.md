# Foxel

A cute pixel-art fox cub that lives in your editor. It wanders around, naps when you take a break, hunts butterflies, plays fetch with you and reacts to what you do in VS Code.

## Getting started

After installing, open the **Foxel** tab in the bottom panel. The panel gives it the most room to run. If you prefer the side bar, set `foxel.position` to `explorer`.

## Play with it

| Action | What happens |
| --- | --- |
| Move the mouse back and forth over the fox | You pet it: it closes its eyes with little hearts, then curls up for a cuddle |
| Click the fox | Hearts |
| Click the ball button in the view title, or double-click an empty spot | A ball appears and the fox runs after it |
| Drag the ball, then let go while moving the mouse | You throw it; the fox fetches it, brings it back to you and waits for the next throw |

## On its own

It walks, sits, lies down, grooms, stretches, yawns, sniffs the ground and looks around. From time to time it stalks a butterfly, wiggles and pounces. Now and then it leaves the screen and comes back with a ball to play with. When you stop working for a while, it curls up and falls asleep.

## Reactions to your work

| Event | Reaction |
| --- | --- |
| Manual save | Happy hops |
| New errors in the Problems view | Panics, then gets dizzy |
| All errors fixed | Celebrates |
| Typing (while it rests) | Taps along |
| Switching files | Perks up |
| Debug session started | Alert |
| Task succeeded / failed | Celebrates / looks sad |
| Back after a long break | Says hello |

## Commands

- **Foxel: Show Companion** / **Hide Companion** / **Toggle Companion**
- **Foxel: Throw a Ball**
- **Foxel: Say Hello**

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `foxel.enabled` | `true` | Show the companion |
| `foxel.position` | `panel` | `panel` or `explorer` |
| `foxel.scale` | `4` | Size of one sprite pixel, in screen pixels |
| `foxel.speed` | `1` | Animation speed multiplier |
| `foxel.reactToTyping` | `true` | Tap along when you type |
| `foxel.reactToErrors` | `true` | React to errors appearing and being fixed |
| `foxel.sleepAfterSeconds` | `30` | Inactivity before it falls asleep |

## Privacy

Foxel collects no telemetry and makes no network requests. It only counts the number of errors and listens to editor events to pick its reactions. It never reads or stores your code.
