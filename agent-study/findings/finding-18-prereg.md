# Finding 18 pre-registration: how long an agent-led engine port takes, Back to One from UE 5.9 to Godot 4

**Status.** Written on 2026-11-16, before any port work, and committed and tagged `f18-prereg` the same day, before
the first port task. Any change after this commit is listed under "Deviations". The result is reported whatever it
says, parity reached or not. Owner's decisions: LB34 (agents lead), LB35 (GDScript), LB36 (the source tag), LB37
(replace the third-party assets), LB38 (approved with two changes to the draft: Claude Code 2.1.326 instead of
2.1.322, and the lead model stated as Opus 5.5).

## Why
The jam built Back to One in UE 5.9 in about four days with agents (238 ledger tasks started in the jam window,
2026-11-12 to 11-15). Porting the shipped build to Godot 4 asks a question the jam could not: with a working reference
in hand, how long does an agent-led port take, where does the time go, and how close does it get. Timing it phase by
phase against estimates written now is the study; the port is its object.

## What this analysis has seen
The jam repo at the submitted commit `484badbe` (read only): its file lists and counts, the menu code's scene lists,
the scene-spec keys, the playtest driver's design and scenario counts, the task ledger's totals. Nothing has been
ported, built or played for this study.

## The source (as of `484badbe`, the submitted build m35h)
- **Reachable scenes: 15** from the menu (16 maps; one, the intro draft, opens only from a dev menu). Tutorial 4
  (Rooftop, Demolition, Blast, Crew1), Puzzles 6 (Oner, OpeningShot, ClearLane, Crew2, Crew3, DemolitionLedge),
  Action 3 playable (SmallChase, Arcade Crash, ClockTower), "Didn't make the cut" 5 entries (Skybox, WhatYouCut,
  Unshippable over 4 maps, DraftLap, The Chase).
- **Code:** 211 C++ files, 70,372 lines (48,593 in the game's own module). Gameplay is C++ plus JSON scene specs
  (114 JSON files under `Spec/`, 76 of them bot routes); no gameplay Blueprints, no UMG widgets (menus and HUD are C++
  canvas drawing), sound effects synthesised in C++, 54 imported sound waves.
- **Content:** 1,173 tracked files, 437.5 MiB; 244 static meshes, 173 textures, 111 animations, 6 skeletal meshes.
  Third-party: Epic's mannequins, GASP, Fab and Mixamo assets (the final cook is said to exclude them).
- **Tests:** `tools/playtest`: a stdlib Python driver that talks to the running game (console commands, log reads,
  input injection, screenshots); 224 JSON scenarios (11,677 steps). 163 of them open UE map paths, 185 use the game's
  `bto.*` console variables and 2,506 of 2,790 assertions match the game's own log lines. A 250 ms bot replays route
  files (e.g. the Chase's clear route); "T 145 s" is the Chase's set-clock print time, not a measured duration.
- **Jam cost, for scale:** 238 tasks, 10,482 summed task-minutes (174.7 h; 63.5 h of wall-clock with tasks in
  parallel); tokens: output 15.6M, cache writes 57.8M, cache reads 3,741M (67 rows record none, and parallel windows
  may count some messages twice).

## Hypothesis
With the UE build as a reference, an agent-led port reaches parity on most of the checklist below in under half the
jam's agent time, and the time goes mostly to systems (the set clock, rewind, freeze, deterministic physics) and
assets, not to scenes, which are data.

## Who does what, and in what
- **Agents lead** (LB34). Claude Code sessions plan, write and test the port. The owner reviews the work and does
  the manual steps, as in the jam: editor clicks, asset exports, playtests. Each step goes in the owner step log.
- **Language: GDScript** (LB35), Godot's own language, with no build step. The UE C++ code is the reference to read
  from. None of it is compiled into the port.
- **Lead model: Opus 5.5** (`claude-opus-5-5`, LB38). The model of every message is recorded from the transcripts.
  Fable as an orchestrator is not part of this finding; that's left for a later one.
- **Third-party assets** (LB37). Some may be licensed for Unreal only: Epic's mannequins, GASP, and the Fab and
  Mixamo assets. All of them are replaced with free or own assets, with no licence-by-licence check. The time
  counts in the Assets phase, and each replacement's source and licence are logged.

## Estimates (written now, by this analysis; all est.)
| Phase | Agent-hours | Wall-clock | Reported tokens | Owner steps |
|---|---|---|---|---|
| Plan (inventory, baseline runs in UE, port plan) | 2-4 | 3-6 h | 1-2M | 2-4 |
| Systems (clock, rewind, freeze, physics, character, ledge, chase, bot, input, save) | 25-40 | 12-24 h | 10-16M | 2-4 |
| Scenes (spec loader, 15 scenes, routes) | 10-20 | 6-12 h | 5-9M | 1-2 |
| Assets (export, convert, replace the third-party ones with free or own assets) | 10-20 | 6-12 h | 3-6M | 5-10 |
| Audio and UI (synth, buses, menus, HUD, settings, credits) | 8-15 | 4-8 h | 3-6M | 1-2 |
| Polish and parity (bot parity, fixes, packaging) | 10-20 | 6-12 h | 4-8M | 3-6 |
| **Total** | **65-119** | **37-74 h** | **26-47M** | **14-28** |
Plan-equivalent (reported + 10% of cache reads) is expected at 4-6 times reported, from the jam's ratio. The port's
own lead agent also writes a quote before starting (method 1, raw; method 2, x0.34 as in findings 10, 14 and 17).

## Parity checklist (each item passes or fails; tolerances fixed now)
| Item | Pass test |
|---|---|
| Each of the 15 reachable scenes loads and can be finished | the same bot route as in UE reaches the end; set-clock events within 0.5 s of UE's |
| Movement, jump, ledge grab | route replays reach the same checkpoints; ledge-grab scenario passes |
| Rewind (Q, hold), stop/start time (E), fast-forward (G) | scripted rewind steps restore the logged positions within 1% of the scene width |
| Freeze (C or click), pick up (X), restart (Backspace) | the scenarios that assert these log lines pass |
| Chases (SmallChase, The Chase) | the clear routes finish; per-beat checkpoints logged in the same order |
| Arcade Crash | the arcade route finishes with the same medal |
| Medals, achievements, print card | the same medal per route; achievements unlock on the same routes |
| Menus: main (with the tutorial lock), Esc settings card, controls rebind, credits | a menu scenario walks each item; a rebind survives a restart |
| Audio: synthesised effects, 54 waves, 4 volume buses | every cue in the sound spec plays (logged); volume changes persist |
| Save: best times, medals, achievements, volumes, rebinds, comic and Unshippable slots | write, quit, relaunch, read back equal |
| Performance | 60 fps or better on this PC in every scene (the UE build's figure is recorded in the plan phase) |
Engine-specific items (UE map paths, `bto.*` console variables) are mapped once in the plan phase; the Godot build
prints the same log lines for the asserted events, so the scenarios can be reused with a Godot adapter in the driver.

## Measures
- **Wall-clock** per phase (start to stop marker) and in total.
- **Active agent time:** per Claude Code session, the sum of gaps between consecutive messages of 5 minutes or less;
  summed per phase. Also the f17 unit (first to last message per run) for comparison.
- **Tokens:** reported (input + output + cache writes) and plan-equivalent (+ 10% of cache reads), per phase, from the
  session transcripts by message time.
- **Owner interventions:** owner messages in the sessions plus entries in the owner step log.
- **Bugs found again:** jam bugs (ledger rows and fix commits) that reappear in the port, counted when a parity test or
  playtest finds one.
- **Final code size:** lines of the port's own code, generated and imported files excluded.
- **Estimate error:** abs(measured / estimate - 1) per phase, for this analysis's estimate and the lead agent's quote
  (raw and x0.34).

## Timed phases and markers
Plan, Systems, Scenes, Assets, Audio and UI, Polish. Phases may overlap; each has its own start and stop. A marker is
one line appended by `phase.ps1 <start|stop> <phase>` to `study/PHASES.log` in the port repo (UTC time, phase, event)
and a git tag `phase/<name>/<start|stop>`. The owner logs each manual step in `study/OWNER_STEPS.log` (UTC time,
minutes spent, what).

## Stop rules
- **Budget cap:** stop at 1.5 times the upper estimate in plan-equivalent tokens, or when the weekly plan usage
  reaches 90% (pause until the reset, the pause recorded).
- **Time cap:** 10 calendar days from the first start marker, or 180 agent-hours.
- **Outcome either way:** if a cap is hit or parity is not reached, the checklist's state, the cost and the time so
  far are reported as the result.

## Environment pins
Godot 4.7.2 stable, win64, already installed on this PC (`Godot_v4.7.2-stable_win64.exe`, 180,858,888 bytes,
SHA-256 `ab1824f85bfd8e0e4128182c000c4003a3e042245b2967848d089b2a04b22424`; console
`c8f0a6bc45a19b33541501e57f6f7cd972ab18453743266339d495cbbe846643`). Lead model Opus 5.5 (`claude-opus-5-5`),
Claude Code 2.1.326 (checked 2026-11-16) with auto-update off for the study. A snapshot of the settings, skills and
instruction files in force (hashes in the repo, the files themselves kept local). The jam source is tagged
`bto-port-source` in the jam repo (by the owner, 2026-11-16; commit `484badbefeefae98636ebcef620c35e069f9904d`)
and stays read-only.
Nothing else heavy runs on the PC during a timed phase (no other agent builds, no Docker jobs); exceptions are logged.

## Docker
Not used. The port needs the Godot editor and the GPU on Windows, and the parity baseline is the UE build on Windows;
running headless Godot tests in a Linux container would add a second OS (and its float and timing differences) to a
comparison that should differ only by engine. Headless Godot runs on Windows with the pinned executable instead.

## Timing tool
A script in the Lab (`data/bto-port/timing.js`, written before the first start marker) that reads the port's Claude
Code session transcripts and `study/PHASES.log`, assigns each message to the phases open at its time, and prints per
phase: wall-clock, active agent time, reported and plan-equivalent tokens, owner messages; plus the owner step log's
minutes. It is tested on the jam's own transcripts before the port starts.

## Proof plan
- The same bot routes and reusable scenarios pass in both engines within the tolerances above; the UE results are
  recorded in the plan phase, before any Godot code.
- The timing is rebuilt by the script from the raw transcripts and logs, which are kept.
- A blind playtest after the port: 5 players, each plays the same two scenes in both builds in shuffled order, forced
  choice "which is the original?"; a player count of 4 or 5 of 5 right counts as "players can tell", fixed now.

## Limits
- One port, one PC, one lead model: a measure of this port, not of ports in general.
- This analysis wrote the estimates after reading the source's size, not its code.
- The jam's own cost has gaps (rows with no tokens, parallel windows).
- The third-party assets are all replaced, so parity on looks is partly a matter of judgement. The blind playtest
  is the measure of it.

## Deviations
### 1. Three process rules, added before the first start marker (2026-11-17, about 02:55 to 03:10 UTC)
This pre-registration was committed at 02:50 UTC and pushed. After that, HQ gave the port's lead session three
process rules. At 03:06 UTC the port repo still had no start marker: `study/PHASES.log` was empty and there was no
`phase/*` tag. They're recorded here before the first start marker.

| Rule | What it adds | Kind |
|---|---|---|
| 1. Task ledger | `study/LEDGER.jsonl` (`tools/ledger.js`), per task: an estimate (agent-minutes, thousands of tokens) written when the task opens, before the work; a done claim and an independent check at the end (pass, fail or not checked); a failed check reopens the task and counts a retry; whether the owner was needed | measures only |
| 2. Transcript copies | the port's transcripts copied (never moved) to a local data folder at the end of each work block, since Claude Code deletes them after 30 days. `timing.js` reads the copies too and drops repeated entries | measures only |
| 3. No unfinished work | every task ends done and checked, or parked with a reason, what's left and the next step. An end-of-block sweep finishes or parks open tasks, branches, worktrees, added TODO or FIXME notes and stubs, and records the counts | **changes how the agents work** |

**Why.** Rules 1 and 2 let this finding re-test earlier findings on the port's own tasks (below) and keep the raw data.
Rule 3 keeps work from being left open at the end of a work block.

**What rule 3 changes in the reading.**
- It's an intervention. Any comparison with the jam is reported as "with an explicit finish rule", not as like for
  like.
- Finding 16's 24% isn't an open-task rate. It's the share of the jam's done tasks whose files saw no later fix-like
  commit within 3 days (12 of 50; with 1 day, 35 of 145). The port reports two things next to the jam:
  - that same measure, if its tasks list their commits;
  - its closing states (done, parked, open), next to the jam ledger's statuses: 247 landed, 4 cut and 2 in
    progress, of 253 rows.
- Confounds for any comparison with the jam:
  - a port with a working reference, not a new build;
  - no jam deadline;
  - different checks: the port's parity scenarios and independent checks, against the jam's bot playtests;
  - a different set of tools and rules.
- The sweeps take time. That time counts in whichever phase is open when they run. If the ledger records when
  each sweep starts and ends, the sweeps' own time is reported too.

**Re-tests on the port's tasks (rules set now, before the first start marker).** The measured agent time of a task
comes from the transcripts: the active agent time of the threads that did it, and finding 17's first-to-last unit.
The ledger's self-reported actuals are shown next to it but not used for any rule.

| Earlier finding | Measure | Agrees if |
|---|---|---|
| 10, 14, 17: time quotes run high | measured / estimate per task, raw and x0.34 | the median of measured / raw estimate is 0.5 or lower. The x0.34 error is reported next to the raw one |
| 17: done claims often go unconfirmed | done claims whose first independent check didn't pass (fail or not checked) | that share is 25% or more |
| none yet (the jam's transcripts as the baseline): how often the owner steps in | owner messages, interrupts and owner-step minutes per active agent-hour | no rule. Reported next to the jam's rate from the same tool: 32 owner messages and 1 interrupt in 194.97 active agent-hours |
| first-try landing | tasks done with no reopened check | no rule. Reported |

### 2. The timing tool reads the task ledger and counts repeated entries once (after the first start marker)
The first start marker (Plan) went in at 03:14:28 UTC. The changes below were asked for before it, along with
deviation 1, but they're committed after it, in the same commit as this note.
- `timing.js` reads `study/LEDGER.jsonl` (`--ledger`) and prints deviation 1's re-tests by the rules set there.
  It links a task to its transcripts in two ways: through each subagent's Agent tool description, which starts with
  the task id, or through the session a task names. No rule of this pre-registration or of deviation 1 changes.
- An entry found in more than one transcript file now counts once, by its uuid. That covers rule 2's copies. It
  also changes one figure on old data: 134 jam entries are each repeated in two subagent files. The jam baseline
  for owner interventions becomes 32 owner messages and 1 interrupt in 194.74 active agent-hours. Deviation 1 says
  194.97.
- One test run on the port's live logs, at 03:15 UTC, a minute into Plan, showed only that the files parse. No rule
  was changed after it.
