# Foxel

A cute pixel-art fox cub that lives in your editor. It wanders around, naps when you take a break, hunts butterflies, plays fetch with you and reacts to what you do in VS Code.

## Getting started

After installing, open the **Foxel** tab in the bottom panel. The panel gives it the most room to run. If you prefer the side bar, set `foxel.position` to `explorer`.

## Play with it

| Action | What happens |
| --- | --- |
| Move the mouse around | It follows the cursor with its eyes, and turns around if you stay behind it |
| Hold the button down and stroke the fox back and forth | You pet it: it closes its eyes with little hearts, then curls up for a cuddle |
| Click its nose | Boop and sneeze, a little blep, or it licks your finger |
| Click its head | Leans into a head pat, nuzzles your hand, or tilts its head curiously |
| Click its back | Thumps a back paw, play-bows then gets the zoomies, or flops over happily |
| Click a paw | Gives you its paw, a high five, or a little twirl in the air |
| Click its tail | Spins after it, jumps in surprise with a puffed-up tail, or proudly fluffs it |
| Keep clicking while it reacts | It gets so excited it runs zoomies, then flops down panting |
| Click the treat button in the view title | A bone falls; the fox lies down and eats it bite by bite |
| Drag the bone | The fox sits and begs; hold the bone to its mouth and it takes it from your hand |
| Click the ball button in the view title, or double-click an empty spot | A ball appears and the fox runs after it |
| Drag the ball, then let go while moving the mouse | You throw it; the fox fetches it (catching it in mid-air when it can), brings it back to you and waits for the next throw |
| Once it brings the ball back | Sometimes it shows off: balances it on its nose like a seal, tosses it up and catches it, or rolls it between its paws |

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
- **Foxel: Give a Treat**
- **Foxel: Say Hello**

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `foxel.enabled` | `true` | Show the companion |
| `foxel.position` | `panel` | `panel` or `explorer` |
| `foxel.scale` | `4` | Size of one sprite pixel, in screen pixels |
| `foxel.speed` | `1` | Animation speed multiplier |
| `foxel.coat` | `red` | Fur colour: `red`, `arctic`, `silver` or `fennec` |
| `foxel.reactToTyping` | `true` | Tap along when you type |
| `foxel.reactToErrors` | `true` | React to errors appearing and being fixed |
| `foxel.sleepAfterSeconds` | `30` | Inactivity before it falls asleep |

## Roadmap

Foxel is a pet you watch and play with while you code. Each release adds one theme.

### 1.1 — Play with me

- Touch: different reactions for the nose, head, back, paws and tail; petting needs the button held down
- Eyes that follow the cursor
- Treats: **Give a Treat** command and view title button; the fox eats the bone bite by bite, or takes it from your hand while begging
- Coat: `foxel.coat` setting with red, arctic, silver or fennec

### 1.2 — Living with you

- Day and night rhythm from the local clock: stretches in the morning, yawns in the evening, sleeps more easily at night
- Break reminder (`foxel.breakReminderMinutes`, 0 = off): after a long stretch of coding it brings the ball and asks to play
- Name (`foxel.name`) shown in a bubble on hover
- Position remembered across sessions

### 1.3 — Following your work

- Git: celebrates commits, waves on push, worries about merge conflicts
- Terminal: reacts to command exit codes
- Long builds: waits, then naps
- Stays worried while errors remain instead of a single panic

### 1.4 — Bond

- Mood saved across sessions: petting, play and treats raise it; long neglect makes it sulk, then come and ask for attention
- Stats command: balls fetched, butterflies caught, treats eaten
- Unlockable toys: yarn, stick, frisbee

### 2.0 — The pack

- More species (`foxel.species`): cat, red panda, owl
- Two pets at once that play together
- Seasonal decor: snow in December, pumpkins in October
- Mini pet in the status bar when the view is closed

## Privacy

Foxel collects no telemetry and makes no network requests. It only counts the number of errors and listens to editor events to pick its reactions. It never reads or stores your code.
