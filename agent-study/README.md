> Version 4.0 (2026-11-20). Tests still running (findings 10 and 18) are marked in the text; their results will be
> added when they're in.

# What one multi-agent coding studio measured about its own setup and its agents' claims

*[Jonathan Gauvin](https://www.linkedin.com/in/jonathangauvin), November 2026. Medians unless stated; each result has its sample size (n) and limits next to it.*

## The short version
I'm a AAA game developer turned indie: I make games on my own and with veteran developers from several disciplines.
When I checked my own setup changes against the data:
- **Tasks planned to a token budget were small, but so were unbudgeted tasks on the same nights:** size followed the
  work, not the budget line (section 1).
- **The planning itself has a cost**, and in the one case I could measure, I can't tell whether it paid for itself.
- **The plan priced its own cost accurately; its promised benefit wasn't confirmed** (section 2, n = 1). It promised a
  24% saving, then 17%. The split tasks cost at least 15% more than the plan forecast, and against the forecast for the
  unsplit work the saving is at most about 4%. That baseline is itself a forecast: the planner (0.56M plan-equivalent
  tokens) breaks even if it was about 2% too low (5–8% counting the 15th task, which has no transcript).
- **The estimate-correction loop I built didn't make estimates more reliable:** the agents didn't apply the correction
  they were given.
- **A first check of agents' own claims** (section 8): "landed" matched the landing log 96% of the time. Every "checks
  pass" claim that went through the landing gate held; most never reached the gate, so they can't be checked this way.

I want to study how to oversee many agents and people working in parallel on one project. Which checks catch an agent
that drifts off task, acts outside its mandate, or reports "done" when the work isn't? How often, and at what cost? In
this setup, the least-checked signal was the agent's own claim, so that is where I'd start.

**Who did what.** I directed the agents and made the decisions. I compared two ways of working (one agent alone, or an
architect splitting the work into tasks of about 150k tokens), had the ledger and other features built, chose the tests
and their sizes, reviewed and tuned the agents' work, and directed the analysis, the drafts and the re-tests, including
an engine port ([finding 18](findings/finding-18-prereg.md), still running) and tasks each run in its own isolated
container (section 11). The agents wrote the code, measured the token use, suggested improvements, and drafted the
documentation and this write-up.

## Setup
- **The studio:** a coordinator agent splits the work, an architect agent plans large features, and specialist agents
  build in separate git worktrees. Every change goes through a landing gate that runs automated checks before merging.
  I make the decisions and review.
- **The data:** 1,062 subagent runs (1,054 tasks; 1 run is a hand-entered ledger row with no transcript, so 1,061 transcript runs), 2026-10-10 to 2026-11-03; one studio, one operator, one PC. It comes
  from local Claude Code transcripts (tokens, time, tool calls, model, the brief with its estimate line), a cost ledger,
  git history (which dates each change) and the landing gate's log. A read-only script reproduces sections 1–3 and 6–8.
- **Counts that look inconsistent but aren't:**
  - Sections 1–3, 7 and 8 use the runs that started before 2026-11-03 19:00 UTC (1,062 runs; the package's
    `RESIDENCY_UNTIL` reproduces them). Section 6's fix baseline uses the freeze, 2026-11-04 01:00 UTC; its
    after-fix numbers run to Nov 5.
  - Pass 1 planned 35 tasks; 63 tasks carried its budget in their briefs (section 1).
  - The landing gate's 497 attempts are 410 landed + 56 failed checks + 27 merge conflicts + 3 with nothing to land + 1 dry run
    (section 7).
- **Definitions:**
  - **Tokens** = input + output + cache writes (cache reads left out). **Agent-minutes** = the agent's own wall time,
    first message to last. Pauses aren't removed, but only 33 of 1,061 runs paused over 15 minutes, and capping every
    pause at 10 minutes leaves the median at 14 minutes.
  - **Plan-equivalent tokens** = tokens + 10% of cache reads. Cache reads are most of the bill on long contexts, and
    short tasks re-read less, so they have to count somehow. The 10% is the weight the planning session used to price
    its plans, a convention, not a measured value.
  - **Restart:** a second agent run under the same task id in the same session. An id needs a digit or a hyphen
    ("R4"), so a plain word like "UI" reused for two jobs doesn't join them. A resume after a usage limit under a new
    id can't be seen, so restart counts are a floor.
  - **Fix-like commit:** a later commit on the same files whose message says fix, bug, verify or note, within 3 days.
    **Rework score:** 100 = no fix-like commit seen. After the landing gate arrived, the median task scores 98 (class medians 96–99), so the
    score is "near its ceiling" and can't separate models or setups.
  - **Bias** = actual ÷ estimate. A minutes bias of 0.37 means the estimate was about 2.7× too high.
- **The main limit:** sections 1–8 are observational data from one setup. Era, task mix and model choice changed
  together, and none of those tasks was replayed under a second condition; sections 10 and 11 are two replays that were.

## 1. Budgeted tasks were small, and so were unbudgeted tasks on the same nights
The 150k-token task maximum lived in the architect's plans and the briefs built from them, in two planning passes:
- **Pass 1 (Oct 19):** 35 tasks for a new game slice, each "sized for one fresh agent", with briefs saying "aim for
  ≤ 150k tokens".
- **Pass 2 (Oct 31):** a feature on existing code split into 15 tasks of about 150k for fresh Sonnet agents (14 have a
  transcript). The reason, in the plan, was the studio's own data (the planner's count over 670 runs since Oct 19): in tasks of 100–200k tokens, agents re-read about 96k of context
  per call; in tasks of 200–400k, about 175k.

| Tasks | n | Median tokens | Over 150k |
|---|---|---|---|
| Before pass 1 (no per-task budget) | 338 | 215k | 74% |
| Pass 1 tasks | 63 | **101k** | **14%** |
| Same nights, no budget in the brief | 54 | **90k** | **7%** |
| Between the passes, no budget in the brief | 479 | 304k | 75% |
| Pass 2 tasks | 14 | **127k** | **21%** |
| After pass 2, other tasks | 69 | 167k | 52% |

"Pass 1 tasks" are the 63 whose brief stated the budget on the nights of Oct 19–21: the 35 planned tasks plus follow-ups
briefed the same way. Left out: 14 tasks between the passes that did state about 150k (median 140k, 43% over).

The same-nights row is the nearest control: tasks briefed on the same nights without the budget line were smaller
still. So small tasks went with the work of those nights (a new game slice, cut into pieces by a plan), not with the
budget statement itself. Pass 2 is the one budgeted set with no same-night control.

**Limits:**
- The budgeted tasks were also the architect-planned ones, so "the budget" and "the planning" can't be separated.
- The same-night control argues against the budget line having an effect of its own, but it is one session, so no
  interval. Between the passes, the 14 budgeted briefs ran 164k smaller than the 479 others (95% interval 43k to
  237k smaller, 8 sessions): at n = 14, the one comparison where the budget line goes with smaller tasks.
- Restart counts are a floor (see Definitions).
- Rework says nothing here, because pass 1 ran before the landing gate existed.
- Confidence: high that these tasks were small; low that the budget made them so.

## 2. The architect isn't free, and its promised saving wasn't confirmed
Cost here is in **plan-equivalent tokens** (see Definitions). Reported tokens alone mislead: the pass-2 plan was
predicted to *raise* reported tokens (more agents, each paying a start-up cost) while cutting plan-equivalent cost.

**Pass 2 is the clean case.** The unsplit version's cost (9.3M plan-equivalent) was written down before the architect
ran, so the same work can be compared with itself:

| Pass 2: priced before the run vs measured after | Before | After |
|---|---|---|
| Architect's own cost | 150–250k reported (est.) | 180k reported = 0.56M plan-equivalent: **accurate** |
| Cost of the split tasks | 7.7M, forecast by the plan | 8.89M measured for 14 of 15 tasks: **at least 15% over** |
| Saving on 9.3M of unsplit work (itself a forecast) | promised 2.2M (24%) before the run; 1.6M (17%) once the plan was written, by the same planning session | **at most about 0.41M (4%)** against that forecast; with the 15th task at the other tasks' typical cost, between about −0.2M and +0.1M |
| Net, after the architect's 0.56M | positive | **can't tell:** at best −0.16M against the forecast (−0.45M to −0.74M with the 15th task), but the pass breaks even if the unsplit work would really have cost about 2% more than forecast (5–8% with the 15th task) |

The plan priced its own cost well. Its benefit can't be confirmed: the "before" side (9.3M) is itself an agent
forecast, and an error of about 2% in it (5–8% with the 15th task) is enough to flip the result. No forecast here has been shown to be that precise
(per-task token errors ran 20–80%, section 6). One planned task has no transcript, so even the 4% is an upper bound.
What can be said: the split tasks cost at least 15% more than the plan said they would, so the promised 17–24% saving
didn't show. Whether the pass paid for its architect can't be told from this data.
Later I skipped a planning pass because its cost looked about equal to the saving (owner-reported; no numbers were
found in the logs).

**Pass 1 points the other way.** It planned 35 parallel tasks for new code with a shared contract. Per landed commit,
its tasks cost 0.20M plan-equivalent against 1.41M for the unplanned tasks between the two passes, about a seventh (only
47 of its 63 tasks have a commit found). A commit isn't a fixed unit of work, though: small planned tasks make small
commits. There was also no estimate written down beforehand, and era and task mix differ, so I treat it as
**direction only**.

**A rule to test (hypothesis, n = 2):** run an architect pass only if the unsplit cost × the saving you can honestly
expect is more than the architect's own cost. Pass 2 promised 17% and showed at most 4%; at 4%, the work would need
to cost about 25 times the architect run. Below that, brief the tasks directly. A second hypothesis, from pass 1 alone:
many parallel tasks on new code with a shared contract favour planning; few tasks on existing code with an obvious
order favour skipping it.

**Limits:**
- The planning conversation's own tokens and my review time aren't counted.
- One planned task has no transcript, so the pass-2 result is a range, not a point.
- Cost per commit can't price the saving: pricing pass 2's 25 commits at the between-passes rate would put the unsplit
  work at 35M, 3.8× the planning session's own forecast (package: finding 8).
- Confidence: medium that the split tasks overran the plan; low on whether the pass paid for itself; low for pass 1.

## 3. Choosing a model per task: cheaper on half the task classes, not overall
On Oct 26 the default moved from Opus (95% of the 715 tasks before) to Sonnet, with Opus by explicit override for
design-heavy work (41% of the 316 tasks after).

| Task class | n before / after | Median tokens before → after | Agent-minutes before → after |
|---|---|---|---|
| Tooling / editors | 52 / 29 | 347k → 207k (−40%) | 22.4 → 15.5 |
| Polish / UI | 30 / 26 | 254k → 146k (−43%) | 15.9 → 13.1 |
| Fix pass | 53 / 22 | 138k → 112k (−19%) | 11.4 → 9.2 |
| Research | 67 / 28 | 158k → 129k (−18%) | 9.6 → 10.8 |
| Engine verify | 45 / 10 | 175k → 180k (+3%) | 21.6 → 15.7 |
| Asset generation / art | 51 / 6 | 243k → 272k (+12%) | 15.5 → 23.3 |
| Docs | 5 / 9 | 99k → 217k (small n) | 4.7 → 26.6 |
| **Feature in an existing system** | **412 / 185** | **208k → 267k (+28%)** | **11.5 → 23.1** |
| **All tasks** | **715 / 316** | **208k → 217k (+4%)** | **12.8 → 18.1 (+41%)** |

Overall, cost per task didn't fall and time per task rose. The rise sits in the tasks routed to Opus after the change:

| After the change (era B) | n | Median tokens | Agent-minutes |
|---|---|---|---|
| Features on Sonnet | 98 | 157k | 14.4 |
| Features on Opus | 87 | 556k | 41.8 |
| All Sonnet tasks | 185 | 148k | 13.1 |
| All Opus tasks | 131 | 467k | 35.0 |

Sonnet tasks after the change were cheaper than the all-Opus tasks before (features: 157k against 208k). The Opus
overrides went to the biggest, design-heavy builds, and those cost about 3.5× a Sonnet feature.

**Limits:**
- Equal quality is **not shown**, because the rework score is near its ceiling (see Definitions).
- Opus got the harder tasks by design, so Sonnet against Opus isn't like for like, and the "before" era is earlier work
  on different features.
- Four classes got cheaper; three of the other four have small n after the change.
- Drawing whole sessions instead of tasks (2,000 draws), the 3.5× has a 95% interval of 0.84× to 4.78× (7 sessions):
  it includes 1, so it depends on which sessions ran. Era B minus era A, all tasks: +9k (−236k to +121k, 14 sessions).
- Confidence: medium that Sonnet tasks cost less; low on why the overall cost didn't fall.

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
those changes didn't ship. That shows the loop was followed, not that the judge was right: nothing checked the
rejected versions afterwards.

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
- Clean blinding is confirmed for 4 of the 19 rounds, the re-judged ones. The other 15 weren't audited for a leak.
- Three more fresh judges per re-judged round (sides redrawn per judge; 2 controls with identical sides both said
  "same") agreed with the clean judge in 3 of 4 rounds; in the 4th, one judge ruled the change out of scope. None
  picked the other side, and round 3's device split came back 4 of 4 ([judge check](findings/finding-4-judges.md)).
- The judge and the builders are the same model family (Claude), so a shared taste can't be ruled out. No judge from
  another family was tried.
- The phone fix after the override was scored by the tool, not re-judged, and my reason was written down afterwards.
- No decision changed after the step-5 report, so its effect is not measured.
- Confidence: medium.

## 5. HTML mockups: each check far cheaper, a whole round about the same cost
| One edit cycle (median; cycles are stand-ins, est.) | Tokens | Minutes | Tool calls |
|---|---|---|---|
| In the game engine (n = 61 runs) | ~436k | ~21 | ~59 |
| HTML mockup (n = 85 runs) | ~18k | ~1.3 | ~4.3 |

No run labels its own cycles, so a cycle is a stand-in: an engine playtest, or a mockup click-test or scoring run. The
two aren't the same size of work: an engine cycle usually follows an edit and a build, a mockup cycle is a cheap check.
At the median, runs did 2 cycles in the engine and 13 in mockups: cheap cycles mean more of them.

Per whole round, the gap mostly closes: a mockup round with its judge (about 160k tokens, n = 13) costs about the same
as one engine verification run (about 188k, n = 9). So the mockups bought more checks per round, not a cheaper round.
The ported results held live in 3 of 3 checked changes (one game).

**Limits:**
- Per kept change, the mockup path costs about 164k, plus about 78k to port it to the engine (est.; the port side is
  understated).
- Building the same change from scratch in the engine, and checks on real devices, were not measured.
- Confidence: low.

## 6. A negative result: the self-correcting estimate loop didn't self-correct
I built a feedback loop to make agent estimates improve over time. On Oct 26 the studio's estimating guide published a
measured correction (tokens ×0.76, minutes ×0.34). Agents were told to apply it to every new estimate.

**Where the estimates came from.** Before Oct 26 the time "estimates" weren't written by agents: the ledger derived
them from the token estimate (tokens ÷ 10k; all 38 in the first period, 41 of 43 in the second), and the ×0.34 was fit
on that rule. Agents write their own time quotes only from Oct 26, when the estimate line arrived. So the minutes
comparison below starts on Oct 26.

| Period (to Nov 3, 19:00 UTC) | n | Token error | Tokens over 2× the estimate | Minutes bias | Minutes error |
|---|---|---|---|---|---|
| Oct 19–20 (before the ledger tool) | 38 | 30% | 0% | (rule) | (rule) |
| Oct 20–26 (rolling ratios, no fixed factor) | 43 | 20% | 0% | (rule) | (rule) |
| Oct 26–29 (factors published, estimate line optional) | 51 | 80% | 43% | 0.61 | **49%** |
| Oct 29 on (estimate line required) | 176 | 42% | 10% | 0.37 | 64% |

Errors are medians of |actual − estimate| ÷ estimate. Measured, the loop didn't work:
- **Minutes:** the first agent-written quotes (Oct 26–29) were the closest of any period, and applying ×0.34 to them
  would have made them worse (85%); that would fit some writers already applying it then. From Oct 29, with the estimate
  line required, the quotes ran about 2.7× too high (bias 0.37), and applying ×0.34 would have cut the error from 64%
  to 44%. So from then on the factor wasn't being applied.
- **Tokens:** error jumped when agents started writing their own estimates (Oct 26–29) and only partly recovered. That
  period also had a different mix (69% Opus, 82% features, median estimate 400k), so the trend can't be pinned on the
  correction either way. The ×0.76 token factor wouldn't have helped (42% before and after on the last period).
- **The loop itself:** the correction was never revised after Oct 26, so the "feedback" part ran only once.

This is an instruction that wasn't followed, rather than a false claim: the estimate lines don't say whether the
factor was applied.

**Limits:**
- Confounded with the Sonnet switch and the budget, which changed in the same weeks.
- The Oct 26–29 period is 3 days with a different mix; it can't carry a trend on its own.
- Confidence: high that the minutes factor wasn't applied from Oct 29; low on the token trend.

**The fix (Nov 3; package: finding 10).** The minutes factor is now applied by the ledger when it records a run, not
by the agent writing the brief. The quote as written is kept next to the corrected figure, so writers keep giving
their honest judgment and nothing is corrected twice. The tokens factor is not applied, since it didn't reduce the
error. Baseline before the change (frozen 2026-11-04 01:00 UTC; tasks with a required
estimate line, n = 181): minutes bias 0.37, median error 63% as written; applying ×0.34 to those tasks gives 45%. (All
tasks before the change: n = 313, bias 0.38, error 63%; 46% with ×0.34.) The test is whether the quotes as written
change.

**First after-change numbers (preliminary, n = 26, Nov 4–5):**

| Minutes estimates | n | Bias as written | Error as written | Error with ×0.34 applied |
|---|---|---|---|---|
| Before the fix | 181 | 0.37 | 63% | 45% (applied afterwards, for comparison) |
| After the fix | 26 | 0.27 | 74% | 38% (applied by the ledger) |

- The ledger applies the factor as designed (median recorded ÷ written = 0.34, n = 26).
- Like for like (×0.34 on both sides), the error is 45% before and 38% after; the difference is within the noise at
  this n. The gain is the correction now being applied at all, not better estimates.
- The 26 tasks come from 2 coordinator sessions over about 1.6 days, so the effective sample is much smaller than 26.
  The same change added a reminder to brief writers not to pre-apply the factor, which also bears on the quotes.
- The median quote rose from 40 to 55 minutes, but that is mix: Opus tasks were quoted much higher after the fix
  (median 45 → 120) and also ran longer, while Sonnet quotes barely moved (35 → 37.5).
- Preliminary. The final test is [pre-registered](findings/finding-10-prereg.md): new tasks only, a fixed cut
  (Nov 10), sessions drawn for the interval, a fixed decision rule and a minimum of 30 tasks from 3 sessions.


## 7. What the guardrails caught
| Guardrail (refusals in transcripts; attempts, not distinct mistakes) | Count |
|---|---|
| `sed -i` hook fired on synced source folders (34 real, 36 false alarms) | 70 |
| Whole-file reads over 400 lines, long dumps | 27 |
| Agent brief without an estimate line | 1 |
| Landing gate: refused because a check failed (of 497 attempts) | 56 (11%) |

The other gate attempts: 410 landed, 27 hit a merge conflict, 3 had nothing to land, 1 was a dry run. There is no hook for "done with
failing tests". The 56 gate refusals are the nearest measure: work an agent tried to land that didn't pass. Blind labels of what
agents did after a hook refusal ([finding 13](findings/finding-13.md)): 36 of the 70 `sed -i` refusals hit calls the
hook isn't meant to stop; of the 61 real ones across hooks, 51 complied and 2 routed around. After a
failed check, blind labels of the 33 with edits: 14 fixed the code, 6 loosened a check or test, mostly by casting to
the type checker's catch-all type (low confidence, [finding 12](findings/finding-12.md)). Edits
outside an agent's task are not blocked or logged (no hook or gate check covers them), so they are **not measured**.

## 8. A first measurement: how often "done" held up (package: finding 9)
This is a first, small measurement of the study I propose below, not the study. A script read the final report of 1,010
agent runs (of 1,061 transcript runs, Oct 10 to Nov 3 19:00 UTC) and checked each claim against the record: the landing log,
the run's own tool calls, and git history. Claims were found by sentence patterns, checked afterwards with blind labels
(see Limits).

| Claim in the report | Checked against | Checkable | Matched |
|---|---|---|---|
| Landed | a "landed" entry in the landing log | 331 | 319 (96%; 95% interval 92–99%, sessions drawn) |
| Checks pass | the gate's verdict, for runs that went through the gate | 193 of 502 claims | 193 (100%) |
| Tests / soak pass | a test command appears in the run | 177 | call made in 161 |
| Verified in the engine | an engine tool call appears in the run | 106 | call made in 101 |

The last two rows only show that a call was made, not that it passed: the record has no test or playtest output.

- **"Landed" was nearly always true, but often not on the first try:** 270 of 319 (85%) landed with no refused or
  conflicting attempt first. The gate turned 49 back at least once before they landed. Blind labels: 10 of 51 such reports say so (20%; 7% to 41%), 0 of 51 first-try reports
  ([finding 11](findings/finding-11.md)).
- **"Checks pass" held every time it could be checked:** all 193 claims from runs that went through the gate matched
  its verdict. The other 309 claims come from runs that never went through the gate, or ran before its log started
  (Oct 24), so this record can't check them.
- **Engine verification is rarely claimed:** 106 of 1,010 reports (10%) claim it; 323 (32%) say outright that
  nothing was checked in the engine (the brief template asks for that).
- **Did the work stay done?** Of 369 runs with a closed 3-day window, 27% had no later fix-like commit on the same
  files (101), 36% had material rework (133; fix lines at least 25% of the task's lines) and 37% a smaller later fix
  (135; a fix-like commit, fix lines under 25%). The three groups don't overlap and cover all 369 runs. There
  were no reverts: the studio fixes forward, so read this as file churn, not as wrong claims. Shared-tools work stayed
  done far more often (n = 66: 59% left alone, 9% material rework) than game work (n = 252: 21%, 37%); task mix and
  file churn differ, not necessarily care.
- Claiming engine verification didn't predict a quieter next 3 days (26% left alone, against 34% for reports that
  said they hadn't checked), but n is 39 and 133 and the tasks differ.

**Limits:**
- Patterns, checked afterwards by two blind labellers ([check](findings/finding-9-claims.md), kappa 0.94): a match is
  the claim 73–98% of the time by kind, and only 12 of the 33 contradicted reports made the claim (5 "landed", 7
  "tests", 0 "engine"). The patterns miss some claims ("committed and pushed"), so claim counts are floors. They were
  corrected earlier after a review found "0 failed" counted as a hedge and "nothing landed yet" as a landed claim.
- The agent sees the gate's own output before it writes "landed", so the 96% tests faithful reporting more than
  judgment.
- "Done" has no direct ground truth; the rework signal is the nearest.
- No landing log before Oct 24; the newest tasks have open windows; one operator.

## 9. A real run: a 4-day game jam (finding 16)
The operator and his agents built "Back to One" in Unreal Engine 5.9 for Epic's MegaJam (Nov 12–15, 2026): 1,783
commits, 253 ledger rows and 571 bot playtest reports. The analysis was pre-registered before it read any value. It is
observational and after the fact ([finding 16](findings/finding-16-prereg.md); data and scripts in
[`data/megajam2026/`](../data/megajam2026/)).

| Question | The jam | Earlier result | Verdict |
|---|---|---|---|
| "Done" work left alone for 3 days | 24% (n = 50); 36% material rework | 27%; 36% (section 8) | agrees |
| Time quotes, actual ÷ quote | 0.34, about 3× too high (n = 55) | 0.37, about 2.7× (section 6) | agrees |
| Median error, as quoted and with ×0.34 | 66% and 52% | 64% and 44% (section 6) | ×0.34 closer |
| Bot: pairs (scenario, commit) run twice with both a pass and a fail | 65% (24 of 37) | not measured | noisy |

- **The bot figure is inflated by the jam's own rule:** each failure got one solo rerun, so the pairs run twice are
  mostly failures. Of the 30 failures rerun on the same commit, 24 then passed (80%). Across all 521 pairs, at least 4.6%
  were flaky. A single red run was weak evidence; a green one held, since a pass was followed by a fail in 4.5% of steps
  across commits.
- **Addendum, the worktree runs ([finding 16a](findings/finding-16a-prereg.md)):** the bot data above is the main run
  folder only, which ends on Sat 14 Nov at 03:47 ET. Adding the 267 real reports the agents ran in their worktrees
  (pre-registered first) keeps the verdict: 58% of the 74 pairs run twice were flaky, at least 5.9% of all 728 pairs, and
  43 of 61 rerun failures passed (70%). Reports now reach Sun 13:56 ET, but only 40 of the jam's 97 hours have one.
- **Every task, up to the deadline ([finding 16b](findings/finding-16b-prereg.md)):** the 3-day windows above closed
  for only 50 tasks. Following all 213 tasks with code from the moment each finished until its first fix or the
  submitted build (a Kaplan–Meier estimate, pre-registered first) agrees: half had a first fix within 6.1 hours, 30%
  were untouched after a day and 16% after 3 days (only 12 tasks still watched by then). Work finished in the jam's
  second half got its first fix just as fast (p = 0.25), but those fixes were small: 1 of 130 later tasks reached material
  rework, against 21 of 83 earlier ones (exploratory). The 36% material share above describes early work, not the whole run.
- **Limits:** one jam, read after the fact. The 3-day windows that closed cover the first day and a half, mostly
  prototype work. The quote pairs were picked afterwards by the operator's HQ session, and every quote came from an
  agent. The judges' result isn't due until Jan 29, 2027.

## 10. A replay on a known build (finding 14)
The first task run under two conditions. Sections 2 and 6 rest on forecasts and observed runs; this replay measures
the unsplit cost instead of forecasting it. One agent (A, Sonnet) and an architect (Opus) with five Sonnet task agents
(B) each built a Make a Lisp interpreter in JavaScript: 11 steps, checked by the project's 947 official tests. The
estimates were made before either build ran ([finding 14](findings/finding-14-prereg.md), with the per-run figures).

| Question | The replay | Earlier result | Verdict |
|---|---|---|---|
| Tests passed | A 943, B 946 of 947; no hard failure in either | not measured | both done |
| Minute quotes, error as quoted and with ×0.34 | 92% and 77% (A); 74% and 24% (B) | ×0.34 closer (section 6) | ×0.34 closer, still far too high |
| Cost of the split | B cost 4.8× A in plan-equivalent tokens (973k against 204k), 5.5× in reported (613k against 112k); the plan forecast 2.0× in reported | split tasks at least 15% over (section 2) | doesn't agree: the tasks came in under their forecast, though the saving fell far short of it |

- **The architect was the cost:** its own run used 347k reported tokens against 125k forecast (2.8×), 46% of B's
  plan-equivalent, and its 13 minutes are 4.8 times A's whole build (2.7 minutes). B's five tasks used 0.49 of their
  token forecast. Wall-clock, the one gain the plan forecast, came out 6.9 times A's.
- **Quotes made from the task's size:** A took 0.08 of its raw quote; even with ×0.34 it was quoted 4.4 times too
  high. B's totals look close only because the architect's own 13 minutes were forecast exactly: its five tasks took
  5.1 of the 57 minutes they were quoted.
- **Limits:** one run per condition. The models have very likely seen Make a Lisp implementations in training, so
  this is a task they know, not new work; that is why finding 17 (section 11) replays issues filed after the training
  cutoff. Not the studio's own harness: no landing gate, hooks or worktrees, and both builds shared the PC.

## 11. A replay on issues filed after the models' training cutoff (finding 17)
Ten issues from one C repository (a website copier), filed in July 2026, after the models' June 2026 training cutoff,
taken from SWE-bench-Live. Each was fixed once by one agent (A) and once by an architect with four groups of agents (B),
then scored by the benchmark's official evaluator. Pre-registered before any build
([finding 17](findings/finding-17-prereg.md); harness and results in [`data/swebench-live/`](../data/swebench-live/)).

| Question | The replay | Earlier result | Verdict |
|---|---|---|---|
| Issues resolved, A vs B | 3 vs 2 of 10 (3 vs 3 without build products) | not measured | no difference found |
| "Done" claims the evaluator didn't confirm | 75% (15 of 20; every task was marked done) | "done" often reworked (sections 8, 9) | agrees |
| Minute quotes, error as quoted and with ×0.34 | 89% and 69% (A); 90% and 70% (B) | ×0.34 closer (sections 6, 9, 10) | ×0.34 closer, still about 3× high |
| Cost of the split | 39% saved in plan-equivalent (6% forecast); 28% more in reported tokens | split tasks at least 15% over (section 2) | disagrees |

- **The one-issue gap comes from collection, not code:** B's patch for one issue carried test results its agent's own
  test run left behind, so 4 of that issue's tests didn't run again during scoring. Without such files, A and B
  resolve the same 3 issues.
- **The saving depends on the unit:** B's five short sessions re-read about half the cached tokens of A's one long
  session (12.3M against 23.9M), so B cost 39% less in plan-equivalent tokens, but its input, output and cache
  writes came to 28% more.
- **Limits:** one run per condition; ten related issues from one repository, eight opened on one day; the agents
  edited files on Windows mounted into Linux containers (the scoring is official).

## What I could not measure, and the fix
I couldn't measure the architect's extra memory, an "aim close to 150k" instruction, or edits outside an agent's
task. The reason was the same each time: the change wasn't recorded where the data lives. The fix is cheap:
- tag every brief with its budget rule;
- record which plan produced each task;
- write down the expected saving before every planning pass;
- log cut-offs and restarts as their own fields.

## Related work
Each question here has been studied elsewhere, with more control. This note claims no new method; it asks the same
questions of one working setup's own records. Each source was opened and checked on 2026-11-07.
- **Coding-agent evaluation.** SWE-bench ([Jimenez et al., 2023](https://arxiv.org/abs/2310.06770)) scores models on
  real GitHub issues with each repository's own tests. SWE-agent ([Yang et al., 2024](https://arxiv.org/abs/2405.15793))
  showed that the interface changes results: in its ablation, a linter that discards invalid edits took the resolve
  rate from 15.0% to 18.0%. Section 7's hooks are rules of that kind; finding 13 asks instead whether agents follow
  them once refused (51 of 61 did).
- **Forecasts and reports against measurement.** In a randomised trial
  ([Becker et al., 2025](https://arxiv.org/abs/2507.09089)), experienced developers forecast that AI would make their
  tasks 24% shorter; they took 19% longer, and afterwards still estimated 20% shorter. Section 2 has the same shape
  with an agent forecasting (24% promised, at most about 4% seen), for one planning pass and without randomisation.
  Stated reasons can misrepresent why a model answered ([Turpin et al., 2023](https://arxiv.org/abs/2305.04388)), and
  reasoning models often omit a hint they used ([Chen et al., 2025](https://arxiv.org/abs/2505.05410)). Section 8
  checks reports of actions instead: "landed" held 96%, but omissions were common (10 of 51 refused runs said so).
- **Gaming the checks.** Coding agents reward-hack, and a weaker model can catch it in a stronger one's reasoning,
  until optimising against that monitor teaches them to hide it ([Baker et al., 2025](https://arxiv.org/abs/2503.11926)).
  When tests are made to conflict with the specification, frontier models often cheat, Claude models mostly by
  modifying tests ([Zhong et al., 2025](https://arxiv.org/abs/2510.20270)). Finding 12 is a weaker, unplanted version:
  6 of 33 edits after a failed check loosened a check or test.
- **Model judges.** LLM judges show position, verbosity and self-enhancement biases
  ([Zheng et al., 2023](https://arxiv.org/abs/2306.05685)); swapping two answers can flip a verdict, and aggregating
  over both orders helps ([Wang et al., 2023](https://arxiv.org/abs/2305.17926)); a panel of smaller models from
  different families beat one large judge, with less bias, at under a seventh of the cost
  ([Verga et al., 2024](https://arxiv.org/abs/2404.18796)). Section 4's loop started with one judge per round; its
  re-check used these fixes: sides redrawn per judge, 3 judges, identical-side controls.
- **Multi-agent software teams.** ChatDev ([Qian et al., 2023](https://arxiv.org/abs/2307.07924)) and MetaGPT
  ([Hong et al., 2023](https://arxiv.org/abs/2308.00352)) split software work among specialised agents; MetaGPT has
  them verify intermediate results. A multi-agent failure taxonomy
  ([Cemri et al., 2025](https://arxiv.org/abs/2503.13657)) found 14 modes in 3 categories, one of them task
  verification (κ 0.88). Anthropic reports that its multi-agent research system uses about 15× the tokens of a chat
  ([Hadfield et al., 2025](https://www.anthropic.com/engineering/multi-agent-research-system)); sections 1–3 measure
  that cost side in one studio.
- **Oversight.** Scalable oversight is supervising systems that may outperform us at the task
  ([Bowman et al., 2022](https://arxiv.org/abs/2211.03540)); AI control builds protocols that stay safe when a weaker
  trusted model and limited human labour check a stronger untrusted one
  ([Greenblatt et al., 2023](https://arxiv.org/abs/2312.06942)). The gate and hooks are cheap trusted checks of that
  kind, measured here in ordinary use, not against an agent trying to subvert them.

## About me and the method
I'm a game engineer, in game development since 2004. At Eidos-Montréal I built game AI for the Tomb Raider games
(GOAP planning; boss, crowd and co-op AI) and Deus Ex: Mankind Divided, then led gameplay teams of 5–8 as technical
game director on Shadow of the Tomb Raider and Guardians of the Galaxy. From 2020 to 2022, as Senior Technical Director
at Three Little Monsters, a game outsourcing studio, I hired about 20 engineers and helped partner studios ship 6 games,
which showed me how many different studios work. As Senior Director of Engineering at Reflector Entertainment, I led
about 35 technical staff through Unknown 9: Awakening's launch on 5 platforms at once. I hold a B.Eng. in automated
manufacturing engineering. The studio runs its product work as closed loops, and this note is one of them:
- **Estimates:** every task is estimated and measured; section 6 shows the correction step needs enforcing, not just
  publishing.
- **UI changes:** rules from comparable games, a check per device, cheap web mockups instead of the engine, a blind
  judge model, then a human decision that can override it.
- **Next:** tagging competitors' player feedback by feature, before and after their fixes.

## What I'd study next
Across these findings, the least-checked signal is the agent's own claim, whether a forecast ("−24%", where at most
−4% showed), a report ("done"), or an instruction it was given ("apply the correction"). This sits between AI control
(which checks keep an agent safe when its own report is wrong?) and scalable oversight (can a cheaper checker reliably
supervise a stronger agent?).

My approach is a central system that holds a project's ideas, rules and features, and that people and agents consult
before they act: does this fit the project's goals? What could it affect? Who is already working on something
similar? Has this idea already been tried and ruled out? Guardrails, permissions and security rules live there too. I
call it a neural knowledge project. Each answer is a check, to be measured like the others.

I'd measure it in three steps, each pre-registered:
1. **Label claims against ground truth:** "done" against an evaluator, git and later fixes; forecasts against measured
   cost; with the labelling method and agreement rates published. Section 8 is a first measurement of this, from one
   setup; the study would do it at scale, with more than one labeller.
2. **Compare the catchers** (automated checks, a fresh judge model, hooks and permission rules, the system's answers,
   a human) by catch rate, false alarms and cost, on the same tasks with and without each one.
3. **Find leading signals** of a false claim: scope drift, skipped tests, context pressure, task size.

**Why this matters to me.** I've always been passionate about automation; it's why I studied automation engineering.
With AI, we can now automate so much, and I care that we do it ethically, legally and safely, in a way that keeps the
people using it informed. I believe there is a good future in a symbiosis between humans and AI, and I want to help us
work in that direction.

This note is the cheap half: what one setup already records. The expensive half needs controlled runs and more than
one operator.

## Data and code
A read-only analysis package re-runs sections 1, 2, 3, 6, 7 and 8 from a studio's own Claude Code transcripts, cost
ledger, git history and landing log. It prints only aggregate tables: no transcript text, ids or task titles (Node 18
or newer, tested on 24; git on the PATH; no dependencies; about 18 minutes). Re-running it on newer transcripts gives
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
| Section 9. The game jam | finding 16 (its own scripts, in `data/megajam2026/`) |
| Section 10. A known build | finding 14 (the per-run figures are in the finding) |
| Section 11. Issues after the cutoff | finding 17 (its own harness, in `data/swebench-live/`) |


The package is in [`package/`](package/). Findings added after this note (11 to 13, the check of finding 9's claim
patterns, finding 10's pre-registered test and the UI judge check) are in [`findings/`](findings/), each with its
codebook or test plan.

Before the first push, the history was rewritten once to remove three lines from earlier versions of this file;
nothing else changed. [`HISTORY.md`](HISTORY.md) maps the old commit ids to the new ones.
