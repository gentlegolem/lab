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

## Result (2026-11-16)
All three rules ran as written. Two results agree with the earlier findings; the bot is "noisy" by the rule, for a
reason the rule didn't foresee. Numbers from `data/megajam2026/results.json` (`node analyze.js`).

**The run.** 1,820 commits reach the submitted build; 1,783 of them fall in the jam (from Nov 12, 00:00 ET), 333 merges.
The ledger has 253 rows: 247 landed, 4 cut (1.6%), 2 still in progress. The 251 rows with a time record 11,014
task-minutes, a median of 33 per row.

**Q1. "Done" held up about as often as in the studio: agrees with section 8.**

| Window | Tasks with a closed window | Left alone | Small fix | Material rework | Reverted |
|---|---|---|---|---|---|
| 3 days (the rule) | 50 | 12 (24%) | 20 (40%) | 18 (36%) | 0 |
| 1 day | 145 | 35 (24%) | 92 (63%) | 18 (12%) | 0 |
| Section 8, 3 days | 369 | 27% | 37% | 36% | 0 |

- 214 of the 247 landed rows list commits; 164 of their 3-day windows were still open at the submitted build, so the
  rule rests on the first day and a half of the jam.
- By role (3 days, small n): prototype work was left alone 2 times in 20 and reworked materially 10 times; QA work was
  left alone 7 times in 9; gameplay 0 in 9.
- Without the bookkeeping filter (deviation 1), the 3-day share left alone falls to 10%: the ledger and dev-log files
  are touched by almost every later commit. The verdict is the same either way.

**Q2. Quotes ran about 3x too high, and x0.34 was closer: agrees with section 4.**

| Quotes | Pairs | Median actual / quote | Quoted too high by | Median error, raw | Median error, x0.34 |
|---|---|---|---|---|---|
| All | 55 | 0.34 | 3.0x | 66% | 52% |
| Without the 5 the file marks as doubtful | 50 | 0.31 | 3.2x | 69% | 47% |
| HQ session (and its reviewers) | 14 | 0.18 | 5.5x | 82% | 63% |
| The jam's lead session | 39 | 0.37 | 2.7x | 63% | 44% |

- 51 of the 55 tasks took less than quoted. The median ratio, 0.34, is the studio's own correction factor; on these
  new tasks x0.34 left a median error of 52%, not the 4.4x miss of finding 14's well-known task.
- Every quote in the file came from an agent session; none from the operator.
- "Ready by" times (described only): 28 time pairs in 26 rows. The median item was ready 73.5 minutes before its ETA, and
  1 of 28 was late.
- Usage and cost (7 rows, described only): mixed units, from a rate-limit share to a few cents of an outside service;
  no pattern to read.

**Q3. As a single run, the bot is noisy: verdict "noisy" by the rule.**
- 571 of 572 reports ran against the real game (1 against a mock); 89.5% passed, across 147 scenarios.
- Of the 37 (scenario, commit) pairs run more than once, 24 (65%) had both a pass and a fail: far over the 10% bar.
- That share is inflated by the jam's own rule: each failure got one solo rerun. Of 60 failed reports, 30 were rerun on
  the same commit, and 24 of those (80%) then passed. Counted over all 521 pairs, at least 24 (4.6%) were flaky.
- Across commits, a pass was followed by a fail in 17 of 374 steps (4.5%).
- Reading: a single red run was weak evidence, and the rerun rule was what made the bot usable. A green run held: red
  after green was rare.

**Reading.** On a run outside the studio's own nights, with a hard deadline and different work, the two earlier
results held: about a quarter of "done" work was left alone for 3 days, and the agents' time quotes ran about 3x too
high. The studio's x0.34 fitted this jam's new work better than it fitted finding 14's familiar task. This is one jam,
read after the fact: it shows the earlier numbers weren't an artefact of one studio's nights, not why they hold.

**Limits found in the analysis.**
- The 3-day windows that closed are the jam's first day and a half, mostly prototype and setup work.
- The rerun rule makes "pairs run twice" a biased sample of failures, so the pre-registered flake rate overstates
  flakiness; the 4.6% floor and the 80% rerun figure bracket it.
- The estimate pairs were picked by the HQ session after the fact; quotes that stood out may be over-represented.

## Deviations
1. **Bookkeeping files.** Finding 9's code takes a list of bookkeeping files to leave out of the rework signal; the
   studio's list doesn't fit the jam repo. The jam's own were used: the ledger, the dev log, the morning reports, the
   questions and answers files, and the credits, declarations and sources lists. The list was set before Q1 was first
   run; the result without it is reported above.
2. **Who quoted.** The pre-registration split quotes into an agent's and the operator's; all were agents'. They are
   split by session instead: the HQ session (with its reviewers and subagents), the jam's lead session, and both.
3. **Converting quotes.** A range counts as its midpoint, "+" parts add up, a bound ("at most 56 min") counts as its
   value, and notes in brackets are ignored. One pair was left out: its actual is a clock time. The conversion matches
   the file's own ratio column within 0.05 on all 44 rows where that column is a plain number.
4. **Bot reruns.** The failure-rerun counts and the all-pairs floor in Q3 were added after the pre-registration, to
   explain why its flake rate is high.
5. **Role names** were merged regardless of case ("Tooling" and "tooling").
6. **Snapshot scrub.** Email addresses and absolute local paths in the snapshot are replaced by placeholders (1 address,
   583 paths); the manifest hashes the scrubbed files.
7. **Section numbers.** The pre-registration's "section 8" is the long note's (README); its "section 4" is the short
   version's. In the long note the minutes result is section 6, and this finding is section 9.
