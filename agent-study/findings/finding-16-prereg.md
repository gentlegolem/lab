# Finding 16, pre-registered analysis of a real run: a 4-day game jam built by the operator and his agents

**Status.** Observational and post hoc. Written on 2026-11-16, after the jam ended and before this analysis looked at
any of its values. The jam was not run as an experiment, so nothing here was assigned or controlled. The questions,
measures and decision rules below are fixed by this commit (tag `f16-prereg`); the result is reported whatever it says,
and any change after this commit is listed under "Deviations".

## Why
The earlier findings come from the studio's own nights of work. A game jam is a different run with outside ground
truth: a hard deadline, a bot that plays the game on each build, cold playtests, and a submitted build. "Back to One"
was built in Unreal Engine 5.9 for Epic's MegaJam (Nov 11-15, 2026) by the operator and his agents, with the same kind
of task ledger. This finding checks two results against it:
- **Section 8 (done):** of the agents' "done" work, only about a quarter was left alone for the next 3 days (27%);
  36% had material rework.
- **Section 4 and finding 14 (minutes):** quotes ran about 2.7x too high; x0.34 cut the error in both finding 14
  conditions but still left one quote 4.4x too high.
- It also asks a question section 8 couldn't: is the bot's playtest record usable as ground truth for "done"?

## What this analysis had seen before this commit
- The jam's headline counts as relayed by the operator's HQ session: 1,783 commits, 333 merges, 44 builds, 224
  scenarios, 253 ledger rows.
- The structure of each source, not its values: the ledger's field names and status labels (`landed`, `cut`,
  `in-progress`); the estimates file's headings and column names (56 duration pairs, 26 ETA pairs, 7 usage pairs); the
  bot reports' field names (572 reports in 581 run folders).
- Not seen: any ledger time, token or commit value, any estimate or actual, any bot result, the jam's numbers file or
  its published dev log. The operator and his HQ session had seen and published some of these numbers before this
  commit; this analysis did not read them.

## Data (snapshot, rebuilt by a script)
`data/megajam2026/`, pinned to the jam repo's `main` at the submitted build (484badbe):
- the git history (commit, parents, time, subject, files and line counts; no author names or emails);
- the task ledger at that commit;
- the estimate-vs-actual pairs, parsed from the operator's estimates file (outside the repo; its hash is recorded);
- one row per bot playtest report (scenario, pass, seconds, commit, build, mock or not, start time, step and console-error
  counts); the run folders are git-ignored in the jam repo, so this part is pinned by its hash and the run count, not by
  a commit;
- the jam's engine-neutral learnings file (from the commit just after 484badbe, which adds only that file).

No game code, no asset files, no sourced or store content, no receipts. `build_snapshot.js` rebuilds it from the repo
and the estimates file, with their paths as arguments.

## Questions, measures and decision rules
**Q1. Did "done" hold up?** Tasks: ledger rows with status `landed` and at least one commit found in the history. A
merge in a task's list stands for the commits it brought in (`merge^1..merge`). The signal is finding 9's, with its own
code (`reworkSignal`, `isFixLike`): later fix-like commits on the task's files within the window; **left alone** (none),
**small fix** (fix lines under 25% of the task's lines) or **material rework** (25% or more); and reverts.
- Window: **3 days** (as finding 9), counted only where it closed before the submitted build. Also reported: 1 day.
- Rule: agrees with section 8 if 50% or fewer of the tasks with a closed 3-day window were left alone; disagrees if more
  than 50%. If fewer than 30 windows closed, the rule is applied to the 1-day window instead and the result is marked
  low confidence.
- Also reported: the share of rows `cut`, and the same split by the ledger's role.

**Q2. How good were the time quotes?** Pairs: the estimates file's duration section, where both sides convert to
minutes. Ratio = actual / estimate; raw error = |ratio - 1|; x0.34 error = |actual / (0.34 x estimate) - 1|.
- Rule 1 (direction): agrees with section 4 if the median ratio is under 0.67 (quotes at least 1.5x too high);
  disagrees if it is over 1.0 (quotes too low); in between, "mixed".
- Rule 2 (correction): x0.34 is "closer" if its median error is smaller than the raw median error.
- Split by who quoted (an agent, or the operator or his HQ session) where the file says; the rules apply to all pairs.
- Also reported, with no rule: the ETA section (median lateness in minutes, share late) and the usage section.

**Q3. Is the bot a usable ground truth?** Reports with `mock` false.
- Measures: pass share; flake rate = of (scenario, commit) pairs run at least twice, the share with both a pass and a
  fail; red after green = of consecutive runs of one scenario on different commits, the share where a pass is followed
  by a fail.
- Rule: "usable" if the flake rate is under 10%; "noisy" otherwise.

## Limits (known now)
- One jam, one operator, observational: the direction can be read, not a rate or a cause.
- The estimate pairs were collected by the HQ session from the chat and dev log after the fact; this analysis didn't
  choose them, and their selection may favour memorable quotes.
- The jam's last day was a crunch before a hard deadline, and the windows of the last tasks never close.
- The bot runs are not under version control; a run deleted before the snapshot is missing.
- Judging runs until Jan 29, 2027; the judges' result is not part of this finding.

## Result
Pending the analysis.

## Deviations
None yet.
