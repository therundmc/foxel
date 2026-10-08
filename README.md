# Foxel

**A fox moves into your editor. You will be expected to feed it.**

[![Install from the Marketplace](https://img.shields.io/badge/Install-VS%20Code%20Marketplace-e8873a?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)
[![Version](https://img.shields.io/visual-studio-marketplace/v/anca.foxel?label=version&color=6b4a3a)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/anca.foxel?color=6b4a3a)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)

![The fox asleep, waking, begging by its bowl and eating, under a little rain cloud, supervising with its glasses on, chasing soap bubbles, sitting down to watch a great snowy peak, then dozing off again](media/readme/foxel.gif)

Your agent writes the code now, and you watch a spinner. Foxel is a better use of those three minutes: a small fox that gets hungry, sleepy and bored, and has decided that's your problem.

No score, no streak, no notifications. It's a pet, not a productivity tool. Nobody is measuring anything.

## It follows your work

- **You commit**: it plants a flag. Everest, `fix typo`, same ceremony.
- **Your build drags on**: it turns an hourglass over, then starts stacking pebbles.
- **Three failures in a row**: it hides in a cardboard box. Reasonable.
- **An AI writes your code**: glasses on, it supervises. Someone has to.

That's the short list. The long one you'll have to find yourself.

## Simple, for about a day

Then it starts doing things you haven't seen: new habits, moods that depend on how you treat it, and a few moments so rare you'll doubt you saw them. Every day turns up something.

And this is only chapter one. It will grow up, meet others, have good days and bad ones, and one day it may well leave. Plan accordingly.

## Install

Search for **Foxel** in the Extensions view of VS Code, or [get it from the Marketplace](https://marketplace.visualstudio.com/items?itemName=anca.foxel).

Then open the **Foxel** tab in the bottom panel: that is where it has the most room to run. If the terminal keeps taking its place, the `foxel.position` setting gives it two other homes:

- `explorer`: in the side bar, under your files.
- `editor`: a strip of its own across the bottom of the editor area, which stays in sight whatever the panel is showing.

## A few things to try

- Leave your pointer resting on it.
- Hold the button down and stroke it.
- Double-click an empty spot, then throw whatever turns up.
- Blow it some bubbles, from the button in its title bar.
- Keep it company for a whole working day, early start to late finish.

The rest is up to you. Some of it only shows up once in a blue moon.

![The fox sitting, waving, pawing at the glass, flicking its tail, in love, asleep and gazing away](media/readme/fox.png)

## Commands

- **Foxel: Show Companion** / **Hide Companion** / **Toggle Companion**
- **Foxel: Throw a Ball**
- **Foxel: Blow Bubbles**
- **Foxel: Give a Treat**
- **Foxel: Fill the Bowl**
- **Foxel: Say Hello**

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `foxel.enabled` | `true` | Show the companion |
| `foxel.position` | `panel` | `panel`, `explorer`, or `editor` for a strip of its own under your files |
| `foxel.scale` | `3` | Size of one sprite pixel, in screen pixels |
| `foxel.speed` | `1` | Animation speed multiplier |
| `foxel.coat` | `red` | Fur colour: `red`, `arctic`, `silver` or `fennec` |
| `foxel.name` | `""` | Your fox's name, shown as the title of its view |
| `foxel.reactToTyping` | `true` | Tap along when you type |
| `foxel.reactToErrors` | `true` | Fret while errors remain in your files |
| `foxel.reactToWork` | `true` | React to commits, pushes, merge conflicts, to commands that fail or take long, and to an assistant at work |
| `foxel.sleepAfterSeconds` | `300` | Inactivity before it falls asleep |
| `foxel.dayNight` | `true` | Live by the local clock: greetings, light, bedtime, party days |
| `foxel.meals` | `true` | Get hungry at meal times |
| `foxel.breakReminderMinutes` | `50` | Minutes of work before it asks for a break, `0` = off |
| `foxel.hydrationReminderMinutes` | `60` | Minutes between drinks, `0` = off |

## Privacy

Foxel collects no telemetry and makes no network requests: nothing leaves your machine.

To react to your work it listens to events of the editor: errors being counted, files changing, commands starting and ending, Git moving. It looks at the name of a command only to recognise a few of them (an AI assistant, `git stash`) and at which files change, never at what is in them. It never reads, stores or sends your code.

---

Made with ❤️ by anca.
