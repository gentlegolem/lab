# Finding 16a, pre-registered addendum to finding 16: the bot question with the worktree runs added

**Status.** Observational and post hoc, like finding 16. Written on 2026-11-16, after finding 16's result
(`19caff3`) and before this addendum read any result from the added reports. The questions, measures and rules below
are fixed by this commit (tag `f16a-prereg`); the result is reported whatever it says, in this file, and any change after
this commit is listed under "Deviations". Finding 16's own numbers and verdicts don't change.

## Why
Finding 16's question 3 asked whether the jam's playtest bot is a usable ground truth, and found it "noisy" as a single
run. Its snapshot read only the main repo's run folder, whose last report is from Sat 14 Nov, 03:47 ET: the first 58 of
the jam's 96 hours. The jam's agents also ran the bot inside their own worktrees, and those run folders were left out.
The operator's HQ session has since archived them, read only (owner's OK, 2026-11-16; question LB29). This addendum asks
whether question 3's answer holds when they are added, and how much of the coverage gap they fill.

## What this addendum had seen before this commit
- Finding 16's data and result, in full (main's 572 reports).
- The archive's file list (`MANIFEST.csv`: tree, run folder, file, size, hash, file time, whether main has a run of the
  same name), not any report's content. From it: 273 worktree runs in 12 trees, 272 with a report (art1 23, draftlap 7,
  holdbanner 10, p5chase 41, p5crew 5, p5menu 30, p5portraits 35, p5sound 65, physics 47, smallchase 1, textfix 1,
  wyctune 8 runs); none shares a run name with main; by run-folder date, 47 reports on Nov 12, 117 on Nov 13, 81 on
  Nov 14 and 27 on Nov 15; 70 dated after main's last report, the last at Sun 15 Nov, 13:56 ET.
- Two code tests on main's reports only, already part of finding 16: the archive reader, pointed at the archive's main
  folder, reproduces `playtests.tsv` byte for byte, and the archive's main reports hash to the snapshot's recorded
  value; the addendum analysis, with no added rows, reproduces finding 16's question 3 numbers exactly.
- Not seen: any pass, fail, scenario, commit, time or count read from inside a worktree report.

## Data
- Main: `data/megajam2026/playtests.tsv`, finding 16's snapshot, unchanged.
- Added: `data/megajam2026/playtests-archive.tsv`, one row per worktree `report.json`, with the same columns plus the
  tree and a `dup_of_main` flag (the report is byte-identical to one of main's). Built by `build_archive.js` with the
  same fields and the same scrub as `build_snapshot.js`. `MANIFEST-archive.json` records the archive manifest's hash,
  the output's hash and the main-folder check. No screenshots, logs or other run files are copied; nothing outside the
  archive's `playtest-runs` is read.
- Rows kept: real-game reports (`mock` false), readable, not a duplicate of a main report. Dropped rows are counted.

## Questions, measures and rules
Measures are finding 16's, with its code copied: a pair is (scenario, commit); runs sort by run-folder name, a timestamp.

**Q3a. With the worktree reports added, is the bot a usable ground truth?**
- Measure: flake rate = of pairs run at least twice, the share with both a pass and a fail; on main plus worktrees.
- Rule (finding 16's): "usable" if under 10%; "noisy" otherwise.
- Also reported, no rule, for main plus worktrees, worktrees alone, and the reports after main's last one: pass share;
  failures, how many were rerun on the same commit and how many of those passed; the all-pairs floor (flaky pairs over
  all pairs); red after green over consecutive runs of a scenario on different commits, in time order across trees
  (finding 16's method) and within each tree.

**Coverage (described, no rule).** First and last report, and the jam hours (of 97, from 17:00 ET on Nov 11 to the
submitted build) with at least one real report: main alone, then main plus worktrees. The end point is already known
(Sun 13:56, about 3.6 hours before the 17:35 submission), so no rule is set on it: LB29's gap can be narrowed, not closed.

**Checks, run first.** The archive's main reports must hash to finding 16's snapshot value, and the analysis must
reproduce finding 16's question 3 on main alone; if either fails, the addendum stops and reports that.

## Limits (known now)
- The same as finding 16's, plus: worktree runs test branch code before it was merged, so a fail there may be work in
  progress rather than a flaky bot. The flake measure compares runs on the same commit, so it is not affected; red after
  green across trees mixes branches, which is why the within-tree version is also reported.
- Worktrees deleted before the archive was made, or runs cleaned out of one, are missing.
- The last ~3.6 hours before submission have no bot report in either source.

## Result (2026-11-16)
Both checks passed: the archive's 572 main reports hash to the snapshot's value, and the analysis reproduces finding
16's question 3 on main alone. The rule ran as written. Numbers from `data/megajam2026/results-addendum.json`
(`node build_archive.js --archive <playtest-runs>`, then `node analyze_addendum.js`).

**The added data.** 272 worktree reports from 12 trees; 5 ran against a mock and were dropped, none was unreadable and
none duplicated a main report, leaving 267. None of their (scenario, commit) pairs is also in main: the worktrees tested
commits main's bot never ran. The worktrees ran 74 scenarios, 22 of them never run in main (169 in all).

**Q3a. Still noisy as a single run: same verdict as finding 16.**

| Data | Reports | Passed | Pairs run twice | Flaky (the rule) | Flaky, floor over all pairs | Rerun failures that passed | Pass then fail, in time order | Pass then fail, within a tree |
|---|---|---|---|---|---|---|---|---|
| Main (finding 16) | 571 | 89.5% | 37 | 24 (64.9%) | 24 of 521 (4.6%) | 24 of 30 (80%) | 17 of 374 (4.5%) | 17 of 374 (4.5%) |
| Main + worktrees | 838 | 86.5% | 74 | 43 (58.1%) | 43 of 728 (5.9%) | 43 of 61 (70.5%) | 37 of 561 (6.6%) | 22 of 472 (4.7%) |
| Worktrees alone | 267 | 80.1% | 37 | 19 (51.4%) | 19 of 207 (9.2%) | 19 of 31 (61.3%) | 14 of 134 (10.4%) | 5 of 98 (5.1%) |
| After main's last report | 66 | 77.3% | 6 | 6 (100%) | 6 of 55 (10.9%) | 6 of 9 (66.7%) | 1 of 23 (4.3%) | 0 of 18 |

- The flake rate on main plus worktrees is 58.1%, far over the 10% bar, so the verdict stays "noisy". As in finding 16,
  the rerun habit inflates it: a pair is mostly run twice because it failed first.
- Worktree code failed more often (80.1% passed, against 89.5% on main), as code still in progress would, and its
  failures passed on a rerun less often (61% against 80%). Combined, 7 in 10 rerun failures passed.
- "A green run held" survives within each tree (4.7% pass-then-fail, as on main). In time order across trees it rises to
  6.6%, since that sequence jumps between branches, as the pre-registration warned.

**Coverage.** Main's reports fall in 32 of the jam's 97 hours, the last on Sat 14 Nov, 03:47 ET. With the worktrees,
40 of 97, the last on Sun 15 Nov, 13:56 ET. After main's last report there are 66 real reports, in 6 hours. (The
pre-registration counted 70 by run-folder date; 4 of those ran against a mock.) LB29's gap is
narrowed, not closed: the last day and a half of the jam has a thin bot record, and the last 3.6 hours have none.

**Reading.** Adding 267 reports to main's 571, run on the agents' branches, doesn't change finding 16's answer. One
bot run is weak evidence of a failure and fair evidence of a pass, and the rerun rule is what made it usable. The worktree
numbers are a little noisier, which fits code in progress, not a different bot.

## Deviations
None. One clarification: the pre-registration's "70 reports after main's last" was a count of run folders by name; the
measure keeps real-game reports only, which drops 4 mock runs and gives 66.
