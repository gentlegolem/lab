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
