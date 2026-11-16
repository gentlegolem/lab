# Finding 16b, pre-registered re-analysis of finding 16's question 1: "done" as time to the first fix

**Status.** Observational and post hoc, like finding 16. Written on 2026-11-16, after finding 16's result and before
this analysis computed any time to a fix. The questions, measures and rules below are fixed by this commit (tag
`f16b-prereg`); the result is reported in this file whatever it says, and any change after this commit is listed under
"Deviations". Finding 16's numbers and verdicts don't change. Owner's OK: LB30, 2026-11-16.

## Why
Finding 16's question 1 counted a task only if its whole 3-day window closed before the submitted build. In a 4-day jam
that left 50 of 214 tasks, all finished in the first 24 hours, mostly prototype and setup work. Survival analysis uses
every task: each one is followed from the moment it finished until its first fix, or until the build was submitted,
whichever comes first. A task still untouched at submission is counted as untouched for as long as it was watched, not
dropped. This gives the whole curve (how soon fixes arrive), uses the jam's later work, and lets early and late work be
compared.

## What this analysis had seen before this commit
- Finding 16's question 1 in full: with a closed 3-day window, 50 tasks, 12 left alone (24%), 20 small fixes, 18 material;
  with a closed 1-day window, 145 tasks, 35 left alone (24%), 92 small, 18 material; the role splits; 164 and 68 windows
  open; one task with no code files. So the share still untouched at 24 and 72 hours, among tasks watched that long, is
  already known to be about 24%. Rule 1 below is close to known in advance and is a consistency check; the new
  information is the curve's shape, the time to material rework, and the phase comparison.
- The commit count per hour, and the last-commit times of the 50 closed-window tasks (Nov 11 20:38 to Nov 12 17:04 ET).
- Two code checks that print no result: the event scan below reproduces finding 9's `reworkSignal` classification (left
  alone, small, material, and the fix count) for all 213 tasks with code at both 1 and 3 days; and the survival and
  log-rank code gives the textbook answers on made-up samples.
- Not seen: any task's time to its first fix, any survival estimate, the phase split, any role curve.

## Data and tasks
Finding 16's snapshot, unchanged (`data/megajam2026/`). Tasks: ledger rows `landed` with at least one commit found,
merges expanded, as in finding 16; the 213 with at least one code file (bookkeeping files left out, as finding 16's
deviation 1). Script: `analyze_survival.js`, committed with this file.

## Measures
- **Start:** the task's last own commit. **Event:** the first later fix-like commit touching the task's code files, by
  finding 9's rules (the fix-like test, fold and own-task commits skipped). **Second event, material rework:** the first
  moment the fix lines, capped per file at the task's own lines, reach 25% of the task's lines.
- **Cut-off (censoring):** a task with no event by the submitted build (Sun 15 Nov, 17:35 ET) counts as untouched up to
  then. Time is in hours.
- **Kaplan–Meier** share of tasks still untouched at 6, 12, 24, 48 and 72 hours, with 95% Greenwood intervals and the
  number still being watched; the median time to the first fix. The same for material rework.

## Questions and rules
**Rule 1 (consistency with section 8 and finding 16).** Agrees if the Kaplan–Meier share untouched at 72 hours is 50% or
less; disagrees otherwise.

**Rule 2 (early versus late work).** Tasks split at the jam's midpoint, halfway between the first commit and the
submitted build (about Fri 13 Nov, 17:38 ET), by when they finished. Their times to a first fix are compared with a
log-rank test: "differs" if p < 0.05 (the direction read from the 24-hour shares), "no difference found" otherwise.

**Described, no rule.** The material-rework curve; the share untouched at 6 and 24 hours for each role with at least
20 tasks.

## Limits (known now)
- Kaplan–Meier assumes that when a task stops being watched has nothing to do with its chance of a fix. Late tasks are
  watched only through the crunch, when fixes may come faster or slower; rule 2 is there to show whether that matters.
- Tasks finished in the last hours add little: they are watched for a short time.
- The event is the same proxy as finding 9's: a commit whose message reads like a fix and touches the task's files. It
  can be a fix aimed at another task that shares files, or planned iteration rather than a bug.
- One jam, observational; a direction, not a rate or a cause.

## Result (2026-11-16)
The code check passed again (the event scan matches `reworkSignal` on all 213 tasks at 1 and 3 days), and both rules ran
as written. Numbers from `data/megajam2026/results-survival.json` (`node analyze_survival.js`).

**The tasks.** 213 tasks with code: 152 had a first fix before the submitted build, 61 were still untouched when it was
submitted (counted as untouched up to then).

**Rule 1. Agrees: 16% were still untouched after 3 days.**

| Hours after the task finished | 6 | 12 | 24 | 48 | 72 |
|---|---|---|---|---|---|
| Share with no fix yet (95% interval) | 50.8% (43.9–57.7) | 34.4% (27.7–41.1) | 30.2% (23.6–36.7) | 17.5% (10.3–24.6) | 16.1% (9.0–23.2) |
| Tasks still watched | 96 | 60 | 35 | 13 | 12 |
| Share with no material rework yet | 97.1% | 92.2% | 90.3% | 86.0% | 86.0% |

- The median time to a first fix was **6.1 hours**: half of all finished tasks got one within about 6 hours.
- At 72 hours, 16.1% were still untouched, well under the 50% line, and lower than finding 16's 24% for the first day's
  tasks alone. Only 12 tasks were still being watched at 72 hours, so the interval is wide (9–23%).
- Material rework is rarer over the whole jam than finding 16's 36% suggested: an estimated 86% of tasks had not reached
  it after 72 hours. Of the 50 first-day tasks finding 16 scored, 18 reached it within 72 hours; of the other 163 tasks,
  4 did.

**Rule 2. Early and late work: no difference found in how fast the first fix came.** Log-rank chi-square 1.31, p = 0.25.
Untouched at 24 hours: 26.5% of the 83 tasks finished in the first half, 33.0% of the 130 in the second half (medians 5.5
and 6.7 hours).

**By role (described).** Untouched at 6 and 24 hours: gameplay (89 tasks) 39.5% and 11.5%, median 5.3 hours; prototype
(20) 40% and 35%, median 4.1 hours, and every one got a fix in the end; art (26) 80.8% and 63.5%, median 41.8 hours; QA
(23) 82.6% and 82.6%.

**Added after the pre-registration (exploratory, deviation 1).** The material-rework gap above is a phase effect: 21 of
the 83 first-half tasks reached material rework, against 1 of the 130 second-half tasks. With the same survival method,
79.5% of first-half tasks were free of material rework at 24 hours, against 99.1% of second-half tasks (log-rank
chi-square 21.3, p < 0.001). Second-half work got its first fix just as fast, but the fixes were small. This was not a
pre-registered test; it is a lead for the next run, not a result.

**Reading.** Following every task to the deadline confirms finding 16 and section 8: most "done" work gets a fix, and
fast: half of it within about 6 hours, five in six within 3 days. What finding 16's 3-day rule couldn't see is that
material rework belonged to the first half of the jam, and that later work got small touch-ups instead (exploratory). A share of material rework measured on early work alone overstates it for a whole run.

## Deviations
1. **Material rework by phase** (above) was added after the result, to explain why the jam-wide material share is much
   lower than finding 16's. It is labelled exploratory and has no rule.
