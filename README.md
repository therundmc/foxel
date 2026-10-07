# Foxel

A cute pixel-art fox cub that lives in your editor. It wanders around, naps when you take a break, hunts butterflies, plays fetch with you and reacts to what you do in VS Code.

## Getting started

After installing, open the **Foxel** tab in the bottom panel. The panel gives it the most room to run. If you prefer the side bar, set `foxel.position` to `explorer`.

## Play with it

| Action | What happens |
| --- | --- |
| Move the mouse into its view | It follows the cursor with its eyes, turns to it, and after a second strolls over and wags its tail |
| Click an empty spot | You call it: it comes running |
| Rest the pointer on the fox | Without moving from its spot, it looks up and gently presses its head into your hand: it would like to be petted |
| Hold the button down and stroke the fox back and forth | You pet it: it closes its eyes with little hearts, then curls up for a cuddle |
| Click its nose | Boop and sneeze, a little blep, or it licks your finger |
| Click its head | Leans into a head pat, nuzzles your hand, or tilts its head curiously |
| Click its back | Thumps a back paw, play-bows then gets the zoomies, flops over happily, or rolls onto its back |
| Click a paw | Gives you its paw, a high five, or a little twirl in the air |
| Click its tail | Spins after it, jumps in surprise with a puffed-up tail, or proudly fluffs it |
| Keep clicking while it reacts | It gets so excited it runs zoomies, then flops down panting |
| Click the treat button in the view title | A bone falls; the fox lies down and eats it bite by bite |
| Drag the bone | The fox sits and begs; hold the bone to its mouth and it takes it from your hand |
| Click the ball button in the view title, or double-click an empty spot | A ball appears and the fox runs after it |
| Drag the ball, then let go while moving the mouse | You throw it; the fox fetches it (catching it in mid-air when it can), brings it back to you and waits for the next throw |
| Once it brings the ball back | Sometimes it shows off: balances it on its nose like a seal, tosses it up and catches it, or rolls it between its paws |
| Click its bowl when it is hungry | You fill it; the fox eats kibble by kibble and licks its lips |

## On its own

It walks, sits, lies down, grooms, stretches, yawns, sniffs the ground and looks around. From time to time it stalks a butterfly, wiggles and pounces. Sometimes a tuft of tall grass comes up: it slips in, lies in wait like a cat and pounces on a passing mouse, which either gets away or ends up sitting on its head. It also digs, and rolls onto its back to wriggle with its feet in the air. Sometimes it comes right up to the glass of its view, facing you: it rubs it with both front paws, gives it a few licks and is proud of the shine. Now and then it leaves the screen and comes back with a ball to play with. When you stop working for a while, it curls up and falls asleep.

## Contemplation

A few times a day at most, the fox stops for the sky. It sits, pricks its ears, closes its eyes and breathes in; then it turns its back to you and, for a long minute, watches a whole landscape come out behind it, its tail slowly sweeping the ground. When the sky has its great moment it sits up, follows it, bows its head over a wish and wags its tail. Then it turns back to you, sighs, lies down and lets its eyes close while the view fades away.

| When | What it watches |
| --- | --- |
| Early morning | The sunrise: the night pales, the sun comes up big and slow over the misty hills |
| Daytime | Mountains and enormous summer clouds piling up behind them |
| Some days | A storm far away: heavy clouds, soft lightning, rain on the big leaf it holds over its head, then the sky clearing |
| Evening | The sunset over the water, and the colours that come once the sun is gone |
| Night | The stars lighting up one by one, the moon climbing, the Milky Way drawing itself, a shooting star |

Hours go by between two of these moments, and they need `foxel.dayNight` (on by default).

## Its day

Foxel lives by your local clock, like a little tamagotchi without gauges: you read how it feels from its face, its pose and small picture bubbles.

| When | What it does |
| --- | --- |
| Morning | Says good morning with a little sun bubble, stretches and yawns |
| Meal times (7:00, 11:30, 16:00, 18:30) | Gets hungry, pushes out its empty bowl and begs with a rumbling tummy; sad if nobody feeds it |
| Every hour | Has a drink from its water bowl, a reminder for you to drink too |
| After 50 minutes of work | Brings its ball and asks for a break; sighs if you keep going |
| Afternoon | Dozes off now and then |
| Evening | Bursts of zoomies, a soft golden light on its fur |
| Night | Drowsy, types along half asleep, then sleeps in its basket with a nightcap; a shooting star may cross the view |
| Friday afternoon | Wears a party hat and greets you with confetti |
| Install anniversary | Party hat, confetti and a cake |

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
- **Foxel: Fill the Bowl**
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
| `foxel.name` | `""` | Your fox's name, shown as the title of its view |
| `foxel.dayNight` | `true` | Live by the local clock: greetings, light, bedtime, party days |
| `foxel.meals` | `true` | Get hungry at meal times |
| `foxel.breakReminderMinutes` | `50` | Minutes of work before it asks for a break, `0` = off |
| `foxel.hydrationReminderMinutes` | `60` | Minutes between drinks, `0` = off |

## Roadmap

Foxel is a pet you watch and play with while you code. Each release adds one theme.

### 1.1 — Play with me

- Touch: different reactions for the nose, head, back, paws and tail; petting needs the button held down
- Eyes that follow the cursor
- Treats: **Give a Treat** command and view title button; the fox eats the bone bite by bite, or takes it from your hand while begging
- Coat: `foxel.coat` setting with red, arctic, silver or fennec

### 1.2 — Living with you

- Day and night rhythm from the local clock: greetings, morning stretches, afternoon naps, evening zoomies, a basket and nightcap at night
- Meals with a bowl to fill, water breaks, and a break reminder when you work too long
- Party hat and confetti on Fridays and on the install anniversary
- Name (`foxel.name`) shown as the view title
- New things it does on its own: mouse hunts in the tall grass, digging, rolling on its back, rubbing and licking the glass of its view
- Contemplation: a few times a day it sits with its back to you and watches the sunrise, the clouds, a far storm, the sunset or the stars
- It comes to your pointer, runs when you click, and asks for a stroke when you rest your hand on it
- Everything told through emotions and picture bubbles, no text or gauges

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
