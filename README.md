# Foxel

**A small fox has moved into your VS Code. Nobody asked it to. It would like its dinner now.**

[![Install from the Marketplace](https://img.shields.io/badge/Install-VS%20Code%20Marketplace-e8873a?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)
[![Version](https://img.shields.io/visual-studio-marketplace/v/anca.foxel?label=version&color=6b4a3a)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/anca.foxel?color=6b4a3a)](https://marketplace.visualstudio.com/items?itemName=anca.foxel)

![The fox asleep, waking, begging by its bowl and eating, under a little rain cloud, supervising with its glasses on, bursting soap bubbles, then turning its back to us to look at a great snowy peak](media/readme/foxel.gif)

*It looks like a GIF. It isn't. GIFs don't get hungry.*

## Your agent is coding. You are not.

Let's be honest about how software gets made these days. You write a prompt, you press Enter, and then you sit and watch a small spinner do your job. One minute. Three. Long enough to put the kettle on, never quite long enough to drink the tea.

Foxel is for that bit.

It's a fox, and it lives in a corner of your editor. It needs looking after: feeding when it's hungry, playing with when it's bored, leaving well alone when it's asleep (it sleeps a lot, and it's very good at it). It will not fix your bugs, write your tests or close your tickets. It has no views on your tickets whatsoever. It's interested in you, which is more than your tickets have ever been.

## A pet, not a screensaver

It wakes up when you do, more or less. At meal times it sits by its bowl and looks at you. Just looks. It's devastating. If you haven't moved in an hour, it drops its ball at your feet, which is fox for *go outside, you look dreadful*. At night it drags its basket in, puts on its nightcap and is fast asleep well before you, which makes one of you.

There's no text in its view. No score, no streak, no little red badge making you feel guilty. If you want to know how it's feeling, you'll have to look at it, like you would a real one.

## It has opinions about your work

- **You commit.** It plants a little flag. Hillary and Tenzing had Everest; you have `fix typo`. Same flag.
- **You push.** A bird flies off with the letter. No taking it back now.
- **Your build takes forever.** It turns an hourglass over. Then again. Then it starts stacking pebbles. It's in no hurry. Neither, evidently, is your build.
- **Three failures in a row.** It hides in a cardboard box. Relatable.
- **Errors pile up.** A small personal rain cloud settles over its head and stays until you've fixed them. No pressure.
- **You debug.** Out comes the magnifying glass. It finds nothing either, but it looks terribly professional.
- **An AI writes your code** (Claude Code, Copilot, whoever's on shift). It puts its glasses on and supervises. Someone has to.

## Something new every day

On day one, it's a cute fox that follows your mouse about. Lovely. That's the trailer.

Give it a week. It has habits you haven't seen yet, moods that depend rather a lot on how you treat it, and moments so rare that most people will miss them altogether. Once or twice a day, for reasons it keeps to itself, it stops what it's doing, turns its back on you and watches a whole sky for a long minute. We'd suggest you join it. The agent can wait. It's an agent.

No two days with it are alike, and no two foxes end up living the same life.

## This is only chapter one

Foxel is going to grow up. Things will happen to it, some lovely, some less so. It will have moods, and good days, and the other kind. It will meet others along the way. And one day, if you've looked after it very well (or not at all), it may do what wild things do in the end, and go its own way.

It looks like a little pixel fox. It's actually a story, and you're in it.

So look after it. A little, every day. It notices.

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

That's all this page is going to tell you. It has more habits, games and surprises than would fit on it, some turn up once in a blue moon, and finding them is rather the point.

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
