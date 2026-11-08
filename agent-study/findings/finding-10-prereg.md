# Finding 10, pre-registered test: does the minutes fix hold on new data?

**Status.** Written on 2026-11-07, before any task that started after 2026-11-06 00:26 UTC was analysed. The code is
frozen as the local git tag `f10-prereg`. The test runs once, at the cut below, and its result is reported whatever it
says. Any change after the freeze is listed under "Deviations" with its reason.

## What was already seen

- **Before the fix** (estimate line required, 2026-10-29 09:18 UTC to 2026-11-04 01:00 UTC): 181 tasks. Their quotes,
  with the published x0.34 applied afterwards, are off by a median 45%.
- **After the fix, first 2 days** (2026-11-04 01:00 to 2026-11-06 00:26 UTC): 26 tasks from 2 sessions. The ledger's
  recorded figure (the quote x0.34, applied by the ledger) is off by a median 38%.

Those 26 tasks shaped this test, so the primary test leaves them out.

## Question

Once the ledger applies x0.34 itself, are the recorded minutes estimates closer to the measured minutes than the
earlier quotes were with the same factor applied afterwards? The factor was fitted on the earlier quotes. If agents
change how they quote once the factor is applied (in the first 2 days the median Opus quote went from 45 to 120
minutes), the fitted factor stops fitting.

## Test

| Part | Fixed choice |
|---|---|
| Tasks | Subagent tasks of 5 or more tool calls with a minutes estimate and measured minutes, as in finding 10. |
| Before set | The 181 tasks above, quote x0.34 applied afterwards. Fixed: the cut doesn't change it. |
| After set (primary) | Tasks with a recorded figure that started from 2026-11-06T00:26:16Z up to the cut. |
| Error per task | abs(measured minutes / estimate - 1). |
| Statistic | Median error after minus median error before, in percentage points. Below 0 means better after. |
| Interval | Session-clustered bootstrap: whole sessions drawn with replacement 2,000 times (seed 20261107), 95% percentile interval. |
| Decision | Interval entirely below 0: "better after the fix". Entirely above 0: "worse after the fix". Otherwise: "no difference found", not a lean either way. |
| Minimum | 30 after-set tasks from at least 3 sessions. Below that the result is "too few tasks", and no interval is read. |
| Cut | `RESIDENCY_UNTIL=2026-11-10T00:00:00Z`. One run. |

If the minimum isn't met at the cut, a later cut is a new test: it is labelled exploratory, unless a new
pre-registration is written before its data come in.

**Secondary, descriptive only** (the interval is printed with no verdict, and no claim is made from it): the same
comparison on every after-fix task (2026-11-04 01:00 UTC on, including the 26 already seen), with the same minimum,
and per model (Opus, Sonnet) with a minimum of 15 after-fix tasks from 3 sessions each.

**Also reported:** the ledger's SHA-256 (first line of the table), the after set's task mix next to the before set's
(finding 10's mix table), and the check that the ledger applied 0.34.

## How to run the frozen version

From an empty folder, with the inputs set as in the package README:
```bash
git -C <this repo> archive f10-prereg agent-study/package | tar -x
cd agent-study/package
RESIDENCY_UNTIL=2026-11-10T00:00:00Z node src/residency-findings.js 10
```
The lines starting "Pre-registered test", "Primary" and "Secondary" are the result.

## Limits

- One studio, one operator. A task-mix shift between the periods can move the error without the fix doing anything;
  the mix table shows it but doesn't adjust for it.
- With 3 or 4 sessions in the after set, the interval is wide. "No difference found" is the likely outcome at this
  size, and it doesn't mean the fix failed.
- Sessions, not tasks, are the unit drawn, since tasks in one session share a coordinator, a backlog and a day.

## Deviations

1. **2026-11-07, re-frozen once, before any run on new data.** About an hour after the first freeze, a check run of the
   frozen code crashed: the transcript reader loaded each file whole, and a subagent transcript written that day had
   passed Node's 512 MB string limit. The reader now goes line by line. On all 1,223 transcript files the old reader
   can open, the new one returns identical results. The test itself (sets, statistic, minimums, decision rule) did
   not change. The tag `f10-prereg` was moved to the commit with the fix; the first frozen commit stays in the history.

## Result

Pending the cut.
