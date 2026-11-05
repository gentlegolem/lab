# Compare two versions of one screen

You are judging two versions, A and B, of one screen of a phone / tablet / PC game. Decide which one is better for a player on each device, or whether they are the same. You were not involved in building either; judge what the screens do, not what anyone says about them.

Files in this folder: `A_pc.png`, `A_ipad.png`, `A_phone.png`, `B_pc.png`, `B_ipad.png`, `B_phone.png` (PC 1280x720, tablet 1024x768, phone 844x390 landscape), and `score.json` (an automatic score per version and device). A dark box in the top-left corner of every image hides page chrome; ignore it, it is the same on all six.

## Context
- The screen's job: {JOB}.
- A task a player does here: {TASK}
- Things to watch for: clutter, content covered by other content, interruptions, how clear the goal is, anything a player needs that is missing.

## score.json
Per version and device: `score` (lower = less on screen, a rough sum of elements, words and problems), `elements`, `words`, `problems` (tap targets under 44 px, text under the size floor, overlaps, clipped content), `task_steps` (taps needed for the task). It is evidence only; the screenshots decide. The scorer does not see everything (for example content covered by a pop-up).

## Hard gates
If one version has a problem the other does not (a tap target under 44 px, text under the size floor of 13 px PC / 14 px tablet and phone, an overlap, content clipped by the window edge), that version cannot win on that device. Check this yourself on the screenshots too.

## Method
1. Per device, look at A and B. Walk the task above from the screenshot: the first tap a new player would make, the steps to the goal, what must be read first, what could be mistaken for the goal.
2. Note where one version makes the task shorter, clearer or safer, and where it hides or loses information a player needs.
3. If one version changes how the game is played (removes a choice, adds a resource, hides a rule) rather than how it is presented, say "out of scope for a UX comparison" and give no win.

## Answer (under 400 words, write nothing to the repo)
First line: `OVERALL: A better | B better | same, margin small | clear` (margin only if not "same").
Then for each of PC, tablet, phone: `<device>: A better | B better | same, margin small | clear`, the hard-gate result, and the deciding reasons (3 lines max). Finish with one thing the weaker version did better, if any.
