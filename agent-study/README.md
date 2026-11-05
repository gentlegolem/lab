> **DRAFT, not yet published.** Draft v3.5 (2026-11-03). Numbers may still change before release.

# What one multi-agent coding studio measured about its own setup and its agents' claims

*Jonathan Gauvin, November 2026. Medians unless stated; each result has its sample size (n) and limits next to it.*

## The short version
I run a small game studio where most of the code is written by Claude agents. When I checked my own setup changes
against the data:
- **Planning tasks to a token budget kept them small.**
- **The planning itself has a cost**, and in the one case I could measure cleanly, it came out about even, not ahead.
- **The plan priced its own cost accurately, but overestimated its benefit 4–6×** (section 2, n = 1): it promised a 24%
  saving, then 17%, and about 4% happened (a measured cost against an estimate written before the run). The planner
  cost 0.56M plan-equivalent tokens; the saving was 0.41M (ratio 0.73).
- **The estimate-correction loop I built didn't make estimates more reliable:** the agents didn't apply the correction
  they were given.
- **A first check of agents' own claims** (section 8): "landed" matched the landing log 96% of the time, "checks pass"
  82%.

The agents' own forecasts were the least reliable number in the system. That is the question I'd like to study: how
well agents' claims ("this will save X", "done") match what is measured.

## Setup
- **The studio:** a coordinator agent splits the work, an architect agent plans large features, and specialist agents
  build in separate git worktrees. Every change goes through a landing gate that runs automated checks before merging.
  I make the decisions and review.
- **The data:** 1,062 subagent runs (1,045 tasks), 2026-10-10 to 2026-11-03; one studio, one operator, one PC. It comes
  from local Claude Code transcripts (tokens, time, tool calls, model, the brief with its estimate line), a cost ledger,
  git history (which dates each change) and the landing gate's log. A read-only script reproduces sections 1–3 and 6–8.
- **Counts that look inconsistent but aren't:**
  - Section 8 reads a later export (1,071 runs to Nov 4, of which 1,020 have a readable final report); the rest uses
    the 1,062 runs to Nov 3. Re-running the scripts later gives slightly larger counts (1,077 runs on Nov 4) with the
    same headline percentages.
  - Pass 1 planned 35 tasks; 63 tasks carried its budget in their briefs (section 1).
  - The landing gate's 497 attempts are 410 landed + 56 failed checks + 27 merge conflicts + 4 with nothing to land
    (section 7).
- **Definitions:**
  - **Tokens** = input + output + cache writes (cache reads left out). **Agent-minutes** = the agent's own wall time.
  - **Plan-equivalent tokens** = tokens + 10% of cache reads. Cache reads are most of the bill on long contexts, and
    short tasks re-read less, so they have to count somehow. The 10% is the weight the planning session used to price
    its plans, a convention, not a measured value.
  - **Restart:** a second agent run under the same task id. A resume after a usage limit under a new id can't be seen,
    so restart counts are a floor.
  - **Fix-like commit:** a later commit on the same files whose message says fix, bug, verify or note, within 3 days.
    **Rework score:** 100 = no fix-like commit seen. After the landing gate arrived, most tasks score 97–100, so the
    score is "near its ceiling" and can't separate models or setups.
  - **Bias** = actual ÷ estimate. A minutes bias of 0.37 means the estimate was about 2.7× too high.
- **The main limit:** this is observational data from one setup. Era, task mix and model choice changed together, and
  no task was replayed under a second condition.

## 1. Tasks planned to a budget stayed small
The 150k-token task maximum lived in the architect's plans and the briefs built from them, in two planning passes:
- **Pass 1 (Oct 19):** 35 tasks for a new game slice, each "sized for one fresh agent", with briefs saying "aim for
  ≤ 150k tokens".
- **Pass 2 (Oct 31):** a feature on existing code split into 15 tasks of about 150k for fresh Sonnet agents (14 have a
  transcript). The reason was the studio's own data: in tasks of 100–200k tokens, agents re-read about 96k of context
  per call; in tasks of 200–400k, about 175k.

| Tasks | n | Median tokens | Over 150k |
|---|---|---|---|
| Before pass 1 (no per-task budget) | 338 | 215k | 74% |
| Pass 1 tasks | 63 | **101k** | **14%** |
| Between the passes, no budget in the brief | 470 | 292k | 74% |
| Pass 2 tasks | 14 | **127k** | **21%** |
| After pass 2, other tasks | 69 | 167k | 52% |

"Pass 1 tasks" are the 63 whose brief stated the budget on the nights of Oct 19–21: the 35 planned tasks plus follow-ups
briefed the same way. Left out: 14 tasks between the passes that did state about 150k (median 140k, 43% over).

**Limits:**
- The budgeted tasks were also the architect-planned ones, so "the budget" and "the planning" can't be separated.
- Restart counts are a floor (see Definitions).
- Rework says nothing here, because pass 1 ran before the landing gate existed.
- Confidence: medium-high on size.

## 2. The architect isn't free, and the plan overpromised
Cost here is in **plan-equivalent tokens** (see Definitions). Reported tokens alone mislead: the pass-2 plan was
predicted to *raise* reported tokens (more agents, each paying a start-up cost) while cutting plan-equivalent cost.

**Pass 2 is the clean case.** The unsplit version's cost (9.3M plan-equivalent) was written down before the architect
ran, so the same work can be compared with itself:

| Pass 2: priced before the run vs measured after | Before | After |
|---|---|---|
| Architect's own cost | 150–250k reported (est.) | 180k reported = 0.56M plan-equivalent: **accurate** |
| Saving on 9.3M of unsplit work | promised 2.2M (24%) before the run; 1.6M (17%) once the plan was written, by the same planning session | **about 0.41M (4%)**: the 9.3M estimate minus the measured 8.89M of the built tasks |
| Net, after the architect's 0.56M | positive | **about −0.16M** |

The plan priced its own cost well but overestimated its benefit about 4–6× (24% ÷ 4% = 6; 17% ÷ 4% ≈ 4.3). The
realised saving was a little smaller than the architect's cost (ratio 0.73), so the pass came out about even. The 4% is
a measured cost subtracted from an estimate made beforehand, not two measurements, so treat it as approximate.
Later I skipped a planning pass because its cost looked about equal to the saving (owner-reported; no numbers were
found in the logs).

**Pass 1 points the other way.** It planned 35 parallel tasks for new code with a shared contract. Per landed commit,
its tasks cost 0.20M plan-equivalent against 1.16M for the unplanned tasks between the two passes, about a sixth (only
47 of its 63 tasks have a commit found). But there was no estimate written down beforehand, and era and task mix
differ, so I treat it as **direction only**.

**A rule to test (hypothesis, n = 2):** run an architect pass only if the unsplit cost × the saving you can honestly
expect (4–17%, from pass 2) is more than the architect's own cost. For a pass like pass 2, that means work costing
roughly 6–25 times the architect run. Below that, brief the tasks directly. A second hypothesis, from pass 1 alone:
many parallel tasks on new code with a shared contract favour planning; few tasks on existing code with an obvious
order favour skipping it.

**Limits:**
- The planning conversation's own tokens and my review time aren't counted.
- One planned task has no transcript, so the pass-2 result is a range, not a point.
- Confidence: medium for pass 2, low for pass 1.

## 3. Choosing a model per task cut cost on most task classes, but not all
On Oct 26 the default moved from Opus (94% of the 709 tasks before) to Sonnet, with Opus by explicit override for
design-heavy work (41% of the 313 tasks after).

| Task class | n before / after | Median tokens before → after | Agent-minutes before → after |
|---|---|---|---|
| Tooling / editors | 47 / 29 | 334k → 207k (−38%) | 22.6 → 15.5 (−31%) |
| Polish / UI | 28 / 26 | 236k → 146k (−38%) | 14.3 → 13.1 |
| Fix pass | 53 / 22 | 138k → 112k (−19%) | 11.4 → 9.2 (−19%) |
| Research | 67 / 28 | 158k → 129k (−18%) | 9.6 → 10.8 |
| **Feature in an existing system** | **403 / 182** | **206k → 261k (+27%)** | **11.2 → 22.2** |

Features got more expensive. The biggest builds were routed to Opus after the change, but Sonnet being slower on this
work can't be ruled out.

**Limits:** equal quality is **not shown**, because the rework score is near its ceiling (see Definitions). Opus got
the harder tasks, so the per-model comparison isn't like for like. Confidence: medium on cost, low on quality.

## 4. A UI loop with a blind judge, a per-device check, and a human who can overrule both
**The pipeline:**
1. **Rules from comparable games.** I studied 5 comparable games. One was a sealed prediction written before any
   footage; the other 4 gave 139 layout-only wireframes (66 pairs of the same screen on different devices). They
   produced 16 rules and 16 warnings. A rule needs 3 of 4 kinds of evidence (wireframes, developer statements, outcomes
   such as store reviews, my own play). Grades: A = the change is seen in 2 or more official ports and an outcome
   confirms it; B = 1 port plus an outcome; C = observed only, with no outcome saying whether it worked. Only 1 rule
   reached A (B 6, C 9). Cost: 2.1M tokens, 120
   agent-minutes over 10 runs, about 15k tokens per wireframe (est.).
2. **A check per device.** Every round gets a layout score on PC, tablet and phone from a mockup scoring tool (it sums
   problems, steps and controls; lower is better). Only 1–2 of 19 rounds traded one device against another: 1 by the
   tool's scores, 2 by the judge's written reasons. 5 rounds were phone-only by design.
3. **Iterate in HTML mockups** instead of the game engine (section 5).
4. **A fresh blind judge** (Opus, all 19 rounds) gives a verdict: 13 clear wins, 3 small wins, 2 rejections, 1 mixed.
5. **A report for my decision.** 15 of 19 changes were kept (79%): the 13 clear wins plus 2 small wins I kept by
   override. The 4 not kept are the 2 rejections, the mixed round and 1 small win.

**What the judge caught:**
- touch targets and text below the minimum size;
- a pop-up covering what it pointed at;
- information hidden behind a tap with no cue;
- duplicated controls.

It cost about half the builder per round (55k vs 105k tokens, n = 13 rounds that logged both). Both rejections stood:
those changes didn't ship.

**The override: repair before reject.** In one party-game round the judge called a change "better, small", which the
loop counts as a miss. The per-device layout scores showed why: PC's score improved about 7% and tablet's about 3%,
but phone's got about 24% worse and failed the minimum-size gate. (These are tool scores of the mockup, not player
outcomes.)

I kept it. The PC and tablet gains said the idea had potential, and phone failures are usually fixable layout problems:
overlapping buttons, text too small. That's exactly the check phone failed. I fixed the phone layout in the same
session, and phone ended better than before the change.

The judge was right about the version it saw. But a single overall verdict hid a trade-off that someone with context
resolved better. The design change it suggests (not built yet) is to break the verdict down per device. When one
device gains a lot and another loses a little, attempt a fix for the weak device before rejecting.

That's the oversight question in miniature: break the verdict into parts, and ask whether a failure is fixable before
discarding the work. It is one override (n = 1), and the fix wasn't re-judged.

Two other overrides:
- a phone-only small win that I kept and ported, where the live result matched the mockup;
- overriding the stop rule: of the next 3 rounds, 1 was mixed and 2 were clear wins.

**Limits:**
- There is no un-judged baseline, so the failures the judge prevented are **not measured**.
- The first score files leaked which side was new. I re-judged those 4 rounds with clean blinding: a seeded coin
  for which side is A, the same mask on both sides, a neutral prompt, and a fresh judge that couldn't see the key.
  The direction held in 4 of 4, so the 15 of 19 result stands. But the margin fell from clear to small in 2 of the 3
  kept rounds, and one round split by device (PC preferred the current version). The leaky judges may have
  overstated how big the wins were: a hypothesis at n = 4, not a result. The re-judge reused the archived
  screenshots, its prompt gave less context than the originals, and the first round's leak was assumed, not proven.
- The phone fix after the override was scored by the tool, not re-judged, and my reason was written down afterwards.
- No decision changed after the step-5 report, so its effect is not measured.
- Confidence: medium.

## 5. Iterating in HTML mockups was about 24× cheaper per edit cycle (est.)
| One edit cycle (median; cycles are stand-ins, est.) | Tokens | Minutes | Tool calls |
|---|---|---|---|
| In the game engine (n = 61 runs) | ~436k | ~21 | ~59 |
| HTML mockup (n = 85 runs) | ~18k | ~1.3 | ~4.3 |

No run labels its own cycles, so a cycle is a stand-in: an engine playtest, or a mockup click-test or scoring run. The
two aren't the same size of work: an engine cycle usually follows an edit and a build, a mockup cycle is a cheap check.
At the median, runs did 2 cycles in the engine and 13 in mockups: cheap cycles mean more of them. The ported results
held live in 3 of 3 checked changes (one game).

**Limits:**
- Per whole round, the gap is much smaller: a mockup round with its judge (about 160k tokens, n = 13) costs about the
  same as one engine verification run (about 188k, n = 9).
- Per kept change, the mockup path costs about 164k, plus about 78k to port it to the engine (est.; the port side is
  understated).
- Building the same change from scratch in the engine, and checks on real devices, were not measured.
- Confidence: low.

## 6. A negative result: the self-correcting estimate loop didn't self-correct
I built a feedback loop to make agent estimates improve over time. On Oct 26 the studio's estimating guide published a
measured correction (tokens ×0.76, minutes ×0.34). Agents were told to apply it to every new estimate.

Measured, it didn't work:
- **Tokens:** the median absolute error didn't fall, and the spread widened. Token overruns did fall, but because of
  the work itself: the budget (section 1), smaller tasks and the switch to Sonnet (section 3). The multiplier played no
  part.

  | Period | n | Token error (median, absolute) |
  |---|---|---|
  | Oct 19–20 (before the ledger tool) | 38 | 30% |
  | Oct 20–26 (rolling ratios, no fixed factor) | 43 | 20% |
  | Oct 26–29 (factors published, estimate line optional) | 51 | 80% |
  | Oct 29 on (estimate line required) | 178 | 42% |

- **Minutes:** the bias stayed about 0.37: estimates are still about 2.7× too high, because the agents don't apply the
  minutes factor they were given. On the frozen baseline below, applying it would cut the median error from 63% to 45%.
- **The loop itself:** the correction was never revised after Oct 26, so the "feedback" part ran only once.

This is another gap between an agent's stated behaviour and its measured behaviour. The briefs say the correction is
applied; the numbers say it isn't.

**Limits:**
- Confounded with the Sonnet switch and the budget, which changed in the same weeks.
- Confidence: high that the minutes factor isn't applied; medium on the token trend.

**The fix (Nov 3; package: finding 10).** The minutes factor is now applied by the ledger when it records a run, not
by the agent writing the brief. The quote as written is kept next to the corrected figure, so writers keep giving
their honest judgment and nothing is corrected twice. The tokens factor is not applied, since it didn't reduce the
error. Baseline before the change (frozen Nov 3 at 8 pm Montreal time, 2026-11-04 01:00 UTC; tasks with a required
estimate line, n = 181): minutes bias 0.37, median error 63% as written; applying ×0.34 to those tasks gives 45%. (All
tasks before the change: n = 313, bias 0.38, error 63%; 46% with ×0.34.) The test is whether the quotes as written
change. The ledger file itself stops at Oct 26 (the transcripts continue), so after-change numbers depend on it
recording again.


## 7. What the guardrails caught
| Guardrail (refusals in transcripts; attempts, not distinct mistakes) | Count |
|---|---|
| In-place `sed -i` on synced source folders | 70 |
| Whole-file reads over 400 lines, long dumps | 27 |
| Landing gate: refused because a check failed (of 497 attempts) | 56 (11%) |

The other gate attempts: 410 landed, 27 hit a merge conflict, 4 had nothing to land. There is no hook for "done with
failing tests". The 56 gate refusals are the nearest measure: work an agent tried to land that didn't pass. Edits
outside an agent's task are prevented, but nothing logs them, so they are **not measured**.

## 8. A first measurement: how often "done" held up (package: finding 9)
This is a first, small measurement of the study I propose below, not the study. I read the final report of 1,020
agent runs (of 1,071, Oct 10 to Nov 4; counts as of Nov 4) and checked each claim against the record: the landing log,
the run's own tool calls, and git history. Claims were found by sentence patterns, not hand-labelled, so their
precision isn't measured.

| Claim in the report | Checked against | Checkable | Matched |
|---|---|---|---|
| Landed | a "landed" entry in the landing log | 339 | 325 (96%) |
| Checks pass | the same entry (the gate runs the checks) | 234 | 193 (82%, a lower bound) |
| Tests / soak pass | a test command appears in the run | 165 | call made in 150 |
| Verified in the engine | an engine tool call appears in the run | 105 | call made in 100 |

The last two rows only show that a call was made, not that it passed: the record has no test or playtest output.

- **"Landed" was nearly always true, but often not on the first try:** 274 of 325 (84%) landed with no refused or
  conflicting attempt first. The gate turned 51 back at least once, and the reports rarely say so.
- **"Checks pass" is the weakest checkable claim:** 82% matched the gate.
- **Engine verification is rarely claimed:** 105 of 1,020 reports (10%) claim it; 324 (32%) say outright that
  nothing was checked in the engine (the brief template asks for that).
- **Did the work stay done?** Of 371 runs with a closed 3-day window, 27% had no later fix-like commit on the same
  files (100), 35% had material rework (129; fix lines at least 25% of the task's lines) and 38% a smaller later fix
  (142; a fix-like commit, fix lines under 25%). The three groups don't overlap and cover all 371 runs. There
  were no reverts: the studio fixes forward, so read this as file churn, not as wrong claims. Shared-tools work stayed
  done far more often (n = 67: 60% left alone, 7% material rework) than game work (n = 261: 21%, 36%); task mix and
  file churn differ, not necessarily care.
- Claiming engine verification didn't predict a quieter next 3 days (21% left alone, against 33% for reports that
  said they hadn't checked), but n is 39 and 133 and the tasks differ.

**Limits:**
- Patterns, not hand labels; precision not measured.
- "Done" has no direct ground truth; the rework signal is the nearest.
- No landing log before Oct 24; the newest tasks have open windows; one operator.

## What I could not measure, and the fix
I couldn't measure the architect's extra memory, an "aim close to 150k" instruction, or edits outside an agent's
task. The reason was the same each time: the change wasn't recorded where the data lives. The fix is cheap:
- tag every brief with its budget rule;
- record which plan produced each task;
- write down the expected saving before every planning pass;
- log cut-offs and restarts as their own fields.

## About me and the method
I'm a game engineer and former engineering director (in game development since 2004: AI, gameplay, telemetry,
technical leadership). The studio runs its product work as closed loops, and this note is one of them:
- **Estimates:** every task is estimated and measured; section 6 shows the correction step needs enforcing, not just
  publishing.
- **UI changes:** rules from comparable games, a check per device, cheap web mockups instead of the engine, a blind
  judge model, then a human decision that can override it.
- **Next:** tagging competitors' player feedback by feature, before and after their fixes.

## What I'd study next
Across these findings, the least-checked signal is the agent's own claim, whether a forecast ("−24%", delivered about
−4%), a report ("done"), or a stated behaviour ("correction applied"). The cost side of the same forecast was accurate,
so the error isn't random: it sits on the benefit. This sits between scalable oversight (can a cheaper checker
reliably supervise a stronger agent?) and AI control (which checks keep an agent safe when its own report is wrong?).
I'd like to measure it properly:
1. **Label claims against ground truth:** forecasts against measured cost, and "done" against git, the gate and later
   fixes, with the labelling method and agreement rates published. Section 8 is a first measurement of this, from
   one setup; the study would do it at scale, with more than one labeller.
2. **Compare the catchers by catch rate and cost:** automated checks, a fresh judge, guardrail hooks, a human. Include
   verdicts broken into parts, with a repair attempt before a rejection.
3. **Find leading signals** of a false claim: scope drift, skipped tests, context pressure, task size.
4. **Run the controlled versions:** the same plans with and without a budget, the same tasks on two models, and a
   period without the judge.

**Why this matters to me.** I've always been passionate about automation; it's why I studied automation engineering.
With AI, we can now automate so much, and I care that we do it ethically, legally and safely, in a way that keeps the
people using it informed. I believe there is a good future in a symbiosis between humans and AI, and I want to help us
work in that direction.

This note is the cheap half: what one setup already records. The expensive half needs controlled runs and more than
one operator.

## Data and code
A read-only analysis package re-runs sections 1, 2, 3, 6, 7 and 8 from a studio's own Claude Code transcripts, cost
ledger, git history and landing log. It prints only aggregate tables: no transcript text, ids or task titles (Node 18
or newer, tested on 24; git on the PATH; no dependencies; about 7 minutes). Re-running it on newer transcripts gives
slightly larger counts than this note. Sections 4 and 5 read the studio's own UI round logs, so they aren't in it; the
blinded re-judge method is (no screenshots or keys). This note uses "section" for its own order and "finding" for the
package's:

| This note | Package |
|---|---|
| Section 1. Budget | finding 2 |
| Section 2. Architect cost | finding 8 |
| Section 3. Model per task | finding 1 |
| Section 6. Estimate loop (the minutes fix) | finding 6 (finding 10) |
| Section 7. Guardrails | finding 7 |
| Section 8. "Done" claims | finding 9 |


The package will be in [`package/`](package/) once it is cleared for release.
