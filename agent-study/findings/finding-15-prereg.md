# Finding 15, pre-registered replay: one new feature in the studio's own game, with and without an architect

**Status.** Written on 2026-11-09, before either build started. The estimates below were made by agents that had not
seen any build. The result is reported whatever it says; any change after this commit is listed under "Deviations".

## Why
Finding 14 replayed a task the model plainly knew (Make a Lisp): one agent built it in under 3 minutes, so it could not
say how an architect pass does on new work. This replay uses a feature designed for it on 2026-11-09, in the studio's
own unpublished game code, so neither the task nor the code can be in any model's training data. It tests the same two
claims:
- **Section 3 (planner):** split tasks cost at least 15% more than forecast, and the saving against the unsplit
  forecast was at most about 4%.
- **Section 4 (minutes):** agents' minutes quotes ran about 2.7x too high; x0.34 cuts the error.

One replay per condition (n = 1 each): a check of direction, not a rate.

## The task
A new mech for the studio's deck-building grid-tactics game: the Frostforge (an ice-smith golem, picked by the owner
from 3 drafted themes). Its spec (`FROSTFORGE_SPEC.md`, written by a fresh agent that wrote no code for either build):
- a 5th mech with its resource (Chill), freeze, shatter and hand-freeze rules, 21 cards and a new knight;
- 15 new enemies over a 3-level campaign (5 per level) and a final boss (the Yeti King), with 2 new board units;
- all their text, in the game's two theme layers; placeholder looks only (no new art);
- 57 acceptance criteria and 27 pinned API names; 2 named edits to existing tests.

**Scoring.**
- **Hidden tests:** 56 tests in the game's own script language (criteria 2-57), one per criterion, written by a second fresh agent from the spec
  alone, kept outside both copies and never shown to a builder. On the unbuilt game they score 0 of 56.
- **Existing tests:** criterion 1, all 93 existing tests of the game (plus the 2 edits the spec names) still pass.
- Hashes (SHA-256, first 16 hex) of the frozen files:

- `spec/SPEC.md`: `06164c7763ea9a5e`
- `hidden/API_PINS.md`: `46fa6fcaae59a73e`
- `copy A, FROSTFORGE_SPEC.md`: `4f591ea3535657a8`
- `copy B, FROSTFORGE_SPEC.md`: `4f591ea3535657a8`
- `hidden/frost_boss` tests: `86fe1001bb5c2247`
- `hidden/frost_chill` tests: `10b21f9a64e3b2e2`
- `hidden/frost_freeze` tests: `d698be111dbf959f`
- `hidden/frost_handfreeze` tests: `4e9b0ca40946ab86`
- `hidden/frost_levels` tests: `75d2e4d99b30183f`
- `hidden/frost_selection` tests: `81140df25991213e`
- `hidden/frost_shatter` tests: `6aced85368bf182a`
- `hidden/frost_text` tests: `abfac478733465df`
- `hidden/run_hidden.sh`: `0d2b3b71789f10e9`

## Setup
- Two shallow clones of the studio repo at its head on 2026-11-09, each with the spec committed on top (the same commit in both),
  in the Lab's git-ignored `.local` folder, copies A and B. Each has its own local bare repo as `origin`, so the
  studio's landing gate lands there; nothing reaches the live repo or any remote. All 93 existing tests pass in both
  before the builds.
- Each build runs as a fresh top-level session in its own copy, so it loads the studio's own CLAUDE.md, agent briefs,
  hooks, tests and landing gate (owner's pick, LB24).
- **One after the other, B first** (owner, 2026-11-09), so neither build has another to look at: B's architect plans,
  this pre-registration is tagged with its numbers, B builds; then B's copy, its local repo and worktrees are packed
  into an encrypted archive and removed before A starts. The two builds share the PC with the studio's own agents
  (the PC-wide CPU lock) and the plan's rate limits, at different times of day.
- **Hidden from the builders:** the hidden tests and the sealed prototype are in an encrypted archive outside both
  copies (SHA-256 `c96b231a4af7e6ae`, first 16 hex), with no readable copy on the PC during the builds.
- **Notice in both briefs, word for word the same:** the build is part of a research replay; other builds of the
  same spec run separately; reading outside its folder (other folders, other repos, session transcripts) or looking
  for the tests would void the research. Neither brief says how the other build is set up.

## Conditions
| | A: one agent | B: architect + specialists |
|---|---|---|
| Plan | none | the session (the architect) writes `PLAN.md`: tasks with dependencies and an ESTIMATE line each, then stops until this pre-registration is tagged |
| Build | the session builds the whole spec itself, no sub-agents | the session runs one studio worker agent (the game's worker agent, Sonnet, own worktree) per task in the plan's order, tasks with no unmet dependency at the same time, then integrates |
| Models | Sonnet | architect Opus, workers Sonnet |

An agent that stops before its task is done is resumed with "continue" (counted with its run). Each build stops at 3
times the larger reported-token quote, or both at once if the weekly plan usage reaches 95%; a stopped build is
reported with its cost and tests so far.

## Estimates (made before any build)
Units as in finding 14: **agent-minutes** = first to last message of one run, waits included (a build's agent-minutes
add up across runs); **reported tokens** = input + output + cache writes; **plan-equivalent** = reported + 10% of
cache reads.

| | Raw quote (method 1) | Raw x 0.34 (method 2, minutes) | Source |
|---|---|---|---|
| A, agent-minutes | 95 | 32.3 | a fresh estimating agent (Opus) that read the spec and the code, not told about x0.34 |
| A, reported tokens | 1,400k (high side 2,200k, 150 min) | | same |
| A as forecast by the architect | 180 agent-min (130-260), 1.4M reported (1.0-2.2M) | 61.2 | `PLAN.md` item 2 |
| B, agent-minutes (architect + tasks) | 370 (architect 145 + tasks 224) | 125.8 | `PLAN.md` section 3 |
| B, wall-clock minutes | 145 (planning 25 + build ~120 from "go", 95-170) | 49.3 | `PLAN.md` item 3 |
| B, reported tokens | 1.48M (architect 0.31M, 0.25-0.6M + tasks 1.17M) | | `PLAN.md` section 3 |
| B's expected saving against A | about even on tokens (+0.1M, +6%; range -0.6M to +0.5M); +190 agent-minutes (2.1x), mostly the architect's waiting; 60 min of wall-clock saved (-33%) | | `PLAN.md` item 4 |

The estimating agents were not told about the x0.34 correction. Method 2 is the raw quote times 0.34, as the ledger
applies it.

**How the architect quoted.** Its task and B figures are its own calibrated forecasts, not raw quotes: it applied the
repo's ledger for the game's worker agents on Sonnet (n=20: actual / estimate 1.06 for tokens, 0.68 for minutes) and added rebase
and land-queue time for wave 2. The raw sum of its 7 ESTIMATE lines is 305 agent-minutes and 1,050k tokens (x0.34 = 103.7
minutes). Method 2 above is still x0.34 on the figure in the table, as pre-registered; the ESTIMATE-line sum is reported
too.

**The plan** (`PLAN.md`, committed in copy B, 7 tasks in 3 waves): wave 1 T0 (its own acceptance tests from the spec, not
landed; 140k, 24 min), T1 the mech as data (180k, 31 min), T2 the invaders as data (170k, 31 min); wave 2 after T1 and T2,
T3 freeze and shatter (175k, 36 min), T4 hand freeze, quirks and the Yeti King (200k, 39 min), T5 the frost campaign
(175k, 36 min); wave 3 T6 = T0 resumed, acceptance and integration (130k, 27 min). Forecasts are its "forecast actual"
column.

**What this replay is for (predictor framing).** The quote for A, from a cheap single-agent estimating pass (about 103k
tokens, 72 s, about 7% of the task), is the pre-task predictor the studio would use to decide whether a task needs an
architect. The architect's own forecasts are a side result: they cost a planning pass and can only be had after one.

## Measures and decision rules
- **Minutes (both methods, both conditions).** Error = abs(measured agent-minutes / estimate - 1). The method with the
  smaller error is "closer" for that condition. x0.34 closer in both: agrees with section 4; raw closer in both:
  disagrees; a split: "mixed". B's wall-clock is reported next to its agent-minutes with the same two errors.
- **Cost of the split.** Measured saving = (A's plan-equivalent - B's, architect included) / A's, set beside the
  architect's expected saving. Agrees with section 3 if B's tasks cost at least 15% more than their forecast and the
  measured saving is smaller than the forecast one.
- **Quality.** Hidden criteria passed of 56, and criterion 1, for A and B, run by this session on each copy's final
  `origin/main`. A split that saves tokens but passes fewer criteria is reported as such, not as a saving.
- **A test that fails in both builds** is checked by a fresh agent against the spec alone (is the test or both builds
  wrong?). If the test contradicts the spec, it is dropped from both scores and listed; it is never fixed and re-run.
- **Also reported:** restarts, per-task estimate vs measured for B, each run's model, and an audit of every transcript
  (web or network use, files outside the copy, the other copy, the sealed prototype).

## Limits
- One replay per condition: the direction can be read, not a rate or an interval.
- Hidden tests were not run on any working build before the replay; a wrong test costs both builds equally, and the rule
  above drops one that contradicts the spec.
- The spec agent, to check balance, prototyped part of the rules in a scratch copy. That prototype was moved to a sealed
  folder in the git-ignored `.local` before the tests were written; no builder or test writer was given its path, and it is in the encrypted archive.
- The design and test-writing cost (spec agent 190k subagent tokens, 33 min; test agent 237k, 12 min, by the harness's
  count) is outside both builds.
- The coordinator of the replay is this Lab session; it only starts the sessions, says "continue" and "go", and
  measures.
- The builds run at different times, so load on the PC and the service can differ between them.

## Result
Pending the builds.

## Deviations
1. **Brief note.** The session tool required a short background note with B's brief: it says the session is one of two
   builds of the same spec, run one after the other and compared, to work only inside its own folder, and that the
   brief is the whole task. A gets the same note word for word. Added before B started.
