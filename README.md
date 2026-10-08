# Foxel

**A pixel-art fox cub that lives in your VS Code. It gets hungry, sleepy and needs you.**

[![Install from the Marketplace](https://img.shields.io/badge/Install-VS%20Code%20Marketplace-e8873a?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)
[![Version](https://img.shields.io/visual-studio-marketplace/v/anca.foxel?label=version&color=6b4a3a)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/anca.foxel?color=6b4a3a)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)

![The fox asleep, waking, begging by its bowl and eating, under a little rain cloud, supervising with its glasses on, then bursting soap bubbles](media/readme/foxel.gif)

## A pet, not a tool

Foxel is a tamagotchi for people who code. It lives by your clock, has its moods and its needs, and there is not a word, a number or a gauge in its view: you read how it feels from what it does.

It wakes up with you, begs when it is meal time, brings you its ball when you have worked too long, and curls up in its basket at night. Leave it hungry and it gets sad. Stroke it and it melts.

## It watches your work

It follows what you do, and has something to say about most of it.

- You **commit**: it plants a little flag. You **push**: a bird carries the letter away.
- A **long build**: it waits with you by an hourglass, then starts stacking pebbles.
- **Things keep failing**: it hides under a cardboard box until they get better.
- **Errors remain**: a small rain cloud of its own hangs over its head until you have fixed them.
- You **debug**: out comes the magnifying glass.
- **An AI assistant writes the code for you** (Claude Code, Copilot, or any other): it puts its glasses on and supervises.

## Install

Search for **Foxel** in the Extensions view of VS Code, or [install it from the Marketplace](https://marketplace.visualstudio.com/items?itemName=anca.foxel).

Then open the **Foxel** tab in the bottom panel: that is where it has the most room to run. Two other places to keep it, with the `foxel.position` setting:

- `explorer`: in the side bar, under your files.
- `editor`: in a strip of its own across the bottom of the editor area, which stays in sight whatever the panel is showing.

## A few things to try

- Move your pointer into its view, and leave it resting on the fox for a moment.
- Hold the mouse button down and stroke it.
- Click it, here and there. It does not react the same way everywhere.
- Double-click an empty spot, then pick up what appears and throw it.
- Blow it some bubbles, with the button in the title of its view.
- Keep it company through a whole day of work, from early morning to late at night.

That is all this page will tell you. The rest is yours to find: it has more habits, games and surprises than fit in a list, and some of them only come once in a long while.

![The fox sitting with its back to us, looking at a great peak and an enormous cloud](media/readme/contemplation.png)

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
