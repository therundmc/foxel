# Foxel

**The agent got your job. You got a fox.**

[![Install from the Marketplace](https://img.shields.io/badge/Install-VS%20Code%20Marketplace-e8873a?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)
[![Version](https://vsmarketplacebadges.dev/version-short/anca.foxel.svg?label=version&color=6b4a3a)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)
[![Downloads](https://vsmarketplacebadges.dev/downloads-short/anca.foxel.svg?label=downloads&color=6b4a3a)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)
![Productivity: 0%](https://img.shields.io/badge/productivity-0%25-ff7f8f)

<img src="media/readme/foxel.gif" width="840" alt="The fox asleep, waking, begging by its bowl and eating, under a little rain cloud, supervising with its glasses on, chasing soap bubbles, sitting down to watch a great snowy peak while a signpost drops from the sky, then dozing off again">

You used to write code. Now you write a prompt and watch a spinner. Foxel won't give you your career back, but it does give your day a purpose again: a small fox that gets bored, hungry and sleepy, roughly in that order, and has made it your problem.

No score, no streak, no notifications. Nobody is measuring anything, which makes it the only thing in your editor that isn't.

## It has a life

- **Needs.** Food, play, and naps on the job. It skips every meeting and has never once picked up the phone. Very Gen Z.
- **Moods.** They depend on how you treat it. No pressure.
- **Opinions about your work.** Commit and it plants a flag. Fail three builds and it hides in a box. Let an AI write the code and it puts its glasses on to supervise. Someone has to, and it's no longer you.
- **A home of its choosing.** The bottom panel, the side bar, or a strip of its own under your editor, out of the terminal's way.
- **Secrets.** Some things it does once in a blue moon. You'll probably miss them. Most people do.

## Simple, for about a day

Then it starts doing things you haven't seen, and doesn't stop. And this is only chapter one: it will grow up, meet others, have good days and bad ones, and one day it may well leave. Like everything else. Plan accordingly.

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
