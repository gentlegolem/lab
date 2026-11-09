# Finding 14, pre-registered replay: one known build, with and without an architect

**Status.** Written on 2026-11-08, before either build started. The estimates below were made by agents that had not
seen any build. The result is reported whatever it says; any change after this commit is listed under "Deviations".

## Why
Every finding so far is observational: no task was replayed under a second condition. Two results rest on that:
- **Section 3 (planner):** an architect pass promised a 24%, then 17% saving; the split tasks cost at least 15% more
  than forecast, and the saving against the unsplit forecast was at most about 4%. The unsplit cost was itself a
  forecast, so whether the pass paid for itself couldn't be told.
- **Section 4 (minutes):** agents' minutes quotes ran about 2.7x too high; the published correction (x0.34) would have
  cut the median error from 64% to 44%.

This replay runs one known build twice, once by one agent and once split by an architect, so the unsplit cost is
measured, not forecast. It is one replay per condition (n = 1 each): a check of direction, not a rate.

## The test
[Make a Lisp](https://github.com/kanaka/mal) (mal, MPL 2.0): build a Lisp interpreter in 11 steps (step0 to stepA)
against the project's official test file for each step (947 tests in all, 8 to 199 per step). Language: JavaScript (Node 24), no
packages. Each condition gets the same kit in its own folder: the guide (`process/guide.md` and the step pseudocode),
the 11 step test files and their fixtures, `TASK.md`, and a test runner. No other mal implementation is in either
folder, and the brief says not to fetch one. Self-hosting (mal in mal) is out of scope.

**Runner.** The official `runtest.py` needs a Unix pseudo-terminal, so a Node port (`runner/run.js`) applies the same
rules: the prompt pattern, one form per test, `;=>` return values, `;/` output patterns, soft tests, 10 s / 20 s
timeouts. It adds the terminal's echo itself and scores every test (continue after a failure). Checked on a correct
and a broken step-0 REPL (24 of 24; 21 of 24, the 3 lowercase tests failing). Not checked against a full official
implementation.

## Conditions
| | A: one agent | B: architect + specialists |
|---|---|---|
| Plan | none | one architect run writes `PLAN.md`: tasks of about 150k reported tokens, with dependencies |
| Build | one Sonnet agent, the whole task | one Sonnet agent per task, in the plan's order; tasks with no unmet dependency run at the same time |
| Models | Sonnet | architect Opus, specialists Sonnet (the studio's split since the default moved to Sonnet) |

Both builds run at the same time on the same PC. An agent that stops before its task is done is resumed with
"continue" (a restart, counted with its run). Each build stops at 2.0M reported tokens (3 times the larger quote, B's), or both at once if the
weekly plan usage reaches 95%; a stopped build is reported with its cost and tests so far.

## Estimates (made before any build)
Units, as in the studio: **agent-minutes** = first to last message of one run, waits included (a build's agent-minutes
add up across runs); **reported tokens** = input + output + cache writes; **plan-equivalent** = reported + 10% of
cache reads.

| | Raw quote (method 1) | Raw x 0.34 (method 2, minutes) | Source |
|---|---|---|---|
| A, agent-minutes | 35 | 11.9 | the coordinator's estimate line (Opus) |
| A, reported tokens | 250k | | same |
| A as forecast by the architect | 45 agent-min, 330k reported | | `PLAN.md` item 1 ([copy](finding-14-plan.md)) |
| B, agent-minutes (architect + tasks) | 70 (architect 13 + tasks 57) | 23.8 | `PLAN.md`: ARCHITECT line + the tasks' ESTIMATE lines |
| B, wall-clock minutes | 50 (architect 13 + build 37) | 17.0 | `PLAN.md` item 3 |
| B, reported tokens | 665k (architect 125k + tasks 540k) | | `PLAN.md` |
| B's expected saving against A | none: the split costs 210k more tokens (+64%) and 12 more agent-minutes (+27%), and saves 8 min of wall-clock (18%); with the architect, 335k and 25 agent-minutes more, 5 min of wall-clock saved | | `PLAN.md` item 5 |

The estimating agents were not told about the x0.34 correction. Method 2 is the raw quote times 0.34, as the ledger
applies it.

**The plan** (`PLAN.md`, 5 tasks): T1 shared modules and steps 0-1 (15 min, 125k), then T2 steps 2-6 (11 min, 110k),
T3 steps 7-8 (9 min, 90k) and T4 steps 9-A (13 min, 130k) at the same time, then T5 integration (9 min, 85k). The
architect's own run is B's first run and is already done; its cost counts in B. The plan also names a cheaper
alternative (3 tasks in a row, about 400k); the 5-task plan is the one run.

## Measures and decision rules
- **Minutes (both methods, both conditions).** Error = abs(measured agent-minutes / estimate - 1). The method with the
  smaller error is "closer" for that condition. If x0.34 is closer in both conditions, the replay agrees with section
  4; if the raw quote is closer in both, it disagrees; a split is "mixed". B's wall-clock minutes are reported next to
  its agent-minutes with the same two errors.
- **Cost of the split.** Measured saving = (A's plan-equivalent - B's, architect included) / A's. It is set beside
  the architect's expected saving. The replay agrees with section 3 if B's tasks cost at least 15% more than their
  forecast and the measured saving is smaller than the forecast one.
- **Tests.** Hard tests passed of the total, per step and in all, for A and B, by the runner on the final code.
  Done = every step with 0 failing tests. A split that saves tokens but passes fewer tests is reported as such, not as
  a saving.
- **Also reported:** restarts, per-task estimate vs measured for B, and each run's model.

## Limits
- One replay per condition: the direction can be read, not a rate or an interval.
- The models have very likely seen mal implementations in training; this lowers both builds' cost, not only one's.
- Not the studio's own harness: no landing gate, hooks or worktrees; the coordinator is this session. The units and
  the estimate line are the studio's.
- Both builds share the machine and the rate limits at the same time.

## Result

Pending the builds.
