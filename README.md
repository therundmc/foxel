# Foxel

**A little fox moves into your VS Code. It gets hungry, it gets sleepy, and it needs someone. That would be you.**

[![Install from the Marketplace](https://img.shields.io/badge/Install-VS%20Code%20Marketplace-e8873a?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)
[![Version](https://img.shields.io/visual-studio-marketplace/v/anca.foxel?label=version&color=6b4a3a)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/anca.foxel?color=6b4a3a)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)

![The fox asleep, waking, begging by its bowl and eating, under a little rain cloud, supervising with its glasses on, bursting soap bubbles, then turning its back to us to look at a great snowy peak](media/readme/foxel.gif)

## You have time for a pet now

Be honest: half your day is spent watching an agent think. The prompt is sent, the code is writing itself, and you are staring at a spinner.

Foxel is what you do with that time. It is a small animal that lives in a corner of your editor and has to be looked after: fed when it is hungry, played with when it is bored, left alone when it sleeps. It does not fix your bugs, write your tests or close your tickets. It needs you, and that is the whole feature.

It wakes up when you do. It begs at meal times, with the eyes. It drops its ball at your feet when you have not moved for an hour, which is its way of saying *go outside*. At night it drags its basket in, puts its nightcap on and is asleep before you are.

There is no text in its view. No score, no streak, no notification. If you want to know how it feels, you have to look at it, the way you would with a real one.

## It has opinions about your work

- **You commit.** It plants a little flag, as if you had conquered something.
- **You push.** A bird flies the letter away. No taking it back now.
- **Your build takes forever.** It turns an hourglass over. When that gets old, it starts stacking pebbles. It has all day. So do you, apparently.
- **Three failures in a row.** It hides under a cardboard box. Honestly, same.
- **Errors pile up.** A small rain cloud moves in over its head and stays there until you have fixed them. No pressure.
- **You debug.** Out comes the magnifying glass. It finds nothing either, but it looks the part.
- **An AI writes your code** (Claude Code, Copilot, take your pick). It puts its glasses on and supervises. Somebody has to.

And once or twice a day, for no reason you gave it, it stops everything, turns its back to you and watches a whole landscape for a long minute. You may want to do the same.

## It looks simple. It is not.

The first day, it is a cute fox that follows your pointer. Give it a week. It has habits you have not seen yet, moods that depend on how you treat it, and moments so rare that most people will miss them. No two days with it are the same, and no two foxes will have lived the same life.

This is also only the beginning of its story. Foxel is going to grow up. Things will happen to it, good and less good. It will meet others. And one day, if you have looked after it well, or not at all, it might do what animals do and go its own way.

So look after it. Every day, a little.

## Install

Search for **Foxel** in the Extensions view of VS Code, or [get it from the Marketplace](https://marketplace.visualstudio.com/items?itemName=anca.foxel).

Then open the **Foxel** tab in the bottom panel: that is where it has the most room to run. If the terminal keeps taking its place, the `foxel.position` setting gives it two other homes:

- `explorer`: in the side bar, under your files.
- `editor`: a strip of its own across the bottom of the editor area, which stays in sight whatever the panel is showing.

## A few things to try

- Move your pointer into its view, and leave it resting on the fox for a moment.
- Hold the mouse button down and stroke it.
- Click it, here and there. It does not react the same way everywhere.
- Double-click an empty spot, then pick up what appears and throw it.
- Blow it some bubbles, with the button in the title of its view.
- Keep it company through a whole day of work, from early morning to late at night.

That is all this page will tell you. It has more habits, games and surprises than fit in a list, some of them only come once in a long while, and finding them is the point.

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
