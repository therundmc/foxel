# Roadmap

Foxel is a pet you watch and play with while you code. Each release adds one theme.

## 1.1 — Play with me

| Feature | What it does |
| --- | --- |
| Laser pointer | Move the mouse quickly in the view: the fox runs after the cursor and pounces on it, then gives up once it stops |
| Boop | Click its head: it squints and sneezes. Clicking the body still gives hearts |
| Treats | **Give a Treat** command and view title button: a treat falls, the fox runs to eat it, then hearts |
| Coat | `foxel.coat` setting: red, arctic, silver or fennec |

## 1.2 — Living with you

- Day and night rhythm from the local clock: stretches in the morning, yawns in the evening, sleeps more easily at night
- Break reminder (`foxel.breakReminderMinutes`, 0 = off): after a long stretch of coding it brings the ball and asks to play
- Name (`foxel.name`) shown in a bubble on hover
- Position remembered across sessions

## 1.3 — Following your work

- Git: celebrates commits, waves on push, worries about merge conflicts
- Terminal: reacts to command exit codes (needs `engines.vscode` ^1.93)
- Long builds: waits, then naps
- Stays worried while errors remain instead of a single panic

## 1.4 — Bond

- Mood saved across sessions: petting, play and treats raise it; long neglect makes it sulk, then come and ask for attention
- Stats command: balls fetched, butterflies caught, treats eaten
- Unlockable toys: yarn, stick, frisbee

## 2.0 — The pack

- More species (`foxel.species`): cat, red panda, owl
- Two pets at once that play together
- Seasonal decor: snow in December, pumpkins in October
- Mini pet in the status bar when the view is closed
