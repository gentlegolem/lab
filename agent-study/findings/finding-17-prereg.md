# Finding 17, pre-registered replay on unseen work: ten July 2026 issues from one repo, with and without an architect

**Status.** Written on 2026-11-16, before any build, any estimate, and before anyone read the tasks' issue texts,
fixes or tests. Docker was not running yet, so the parts of the harness that need it are untested at this commit. The
questions, measures and rules below are fixed by this commit (tag `f17-prereg`); the result is reported in this file
whatever it says, and any change after this commit is listed under "Deviations". Owner's decisions: LB21 (an unseen
test), LB22 (install Docker, a bundle of SWE-bench-Live issues from one repo), LB31 (try the July 2026 tasks first).

## Why
Finding 14 replayed a known build, Make a Lisp, once by one agent and once split by an architect. The models very
likely knew it by heart: build A never opened the guide. This replay keeps finding 14's design, units and rules, but
uses real issues filed after the models' training data, so neither condition can lean on memory.

## What this analysis had seen before this commit
- SWE-bench-Live's file lists, sizes and column statistics; the dates, repos and image names of about 50 sampled rows
  of the multi-language set (the rows also held other fields; they were not read and are deleted).
- For all 1,077 tasks of the multi-language set: only `repo`, `instance_id`, `created_at` and `docker_image`, through
  `select_tasks.py`.
- Docker Hub's tag data for the 10 chosen images (size, date, platform).
- Two probes of the run settings on a throwaway folder with a small model (what loads in safe mode; which reads,
  writes and shell commands the permission rules allow).
- Not seen: any issue text, fix, test, test command, the repo's code, or any result.

## The test
**Source.** [SWE-bench-Live](https://github.com/microsoft/SWE-bench-Live) (MIT), the multi-language set
`SWE-bench-Live/MultiLang` at revision `eb09c2e5db6e4c5a95e01c903c8fd1d5da33c4f3` (1,077 tasks in 8 languages, each with
its own Docker image). The Python set ends in September 2025 and adds nothing after the cutoff.

**Cutoff.** Claude Opus 5.5 and Claude Sonnet 5.5 both list a training data cutoff of June 2026 (Anthropic's models
overview, read 2026-11-16).

**Selection rule** (written before the dataset was downloaded, `select_tasks.py`):
1. eligible task: `created_at` on or after 2026-07-01T00:00:00Z;
2. eligible repo: 8 or more eligible tasks;
3. the repo with the most eligible tasks (ties: newest eligible task latest, then alphabetical);
4. its 10 newest eligible tasks;
5. only the four fields above are read to choose;
6. a task whose image can't be pulled, or that fails the gold check below, is replaced by the repo's next newest
   eligible task.

**Result of the rule.** 231 tasks on or after 1 July 2026, in 57 repos. The most: `xroche/httrack` (a website copier
in C) with 30, then `duckdb/duckdb` 20 and `langchain4j/langchain4j` 17. The bundle is httrack's 10 newest
(`data/swebench-live/selection.tsv`):

| Task | `created_at` (UTC) |
|---|---|
| xroche__httrack-893 | 2026-07-30 15:24 |
| xroche__httrack-876 | 2026-07-29 15:41 |
| xroche__httrack-856 | 2026-07-27 20:22 |
| xroche__httrack-851 | 2026-07-27 19:30 |
| xroche__httrack-850 | 2026-07-27 19:25 |
| xroche__httrack-849 | 2026-07-27 19:21 |
| xroche__httrack-837 | 2026-07-27 13:10 |
| xroche__httrack-835 | 2026-07-27 13:03 |
| xroche__httrack-830 | 2026-07-27 12:52 |
| xroche__httrack-829 | 2026-07-27 12:41 |

All 10 images exist on Docker Hub (linux/amd64, 0.78 to 0.80 GB compressed each, 7.9 GB in all, built 14 Aug 2026).

**Scoring.** The official SWE-bench-Live evaluator (`python -m evaluation.evaluation`, platform linux), at a commit
pinned when it is installed. A task is resolved when the patch applies, its FAIL_TO_PASS tests pass and its
PASS_TO_PASS tests still pass. An empty or unappliable patch is unresolved.

**Gold check, before any estimate or build.** The evaluator is run three times with the dataset's own fixes (the
authors' advice, since tests can behave differently from machine to machine) and once with empty patches. A task counts
only if its fix resolves it all three times and the empty patch doesn't; otherwise rule 6 replaces it. Replacements
are listed in the estimates commit.

## Conditions
| | A: one agent | B: architect + specialists |
|---|---|---|
| Plan | none | one architect run reads the 10 issues and the code, changes nothing, and writes `PLAN.md`: groups of tasks of about 150k reported tokens each, with dependencies and estimates |
| Build | one Sonnet agent, all 10 tasks | one Sonnet agent per group, in the plan's order; groups with no unmet dependency run at the same time |
| Models | Claude Sonnet 5.5, effort high | architect Claude Opus 5.5, specialists Claude Sonnet 5.5, effort high for all |

**Same harness for both** (`data/swebench-live/`): Claude Code 2.1.322 headless (`claude -p`) in `--safe-mode`, so no
CLAUDE.md, hooks, skills, plugins or MCP servers load; permission mode `dontAsk` with rules that allow reading and
editing only inside the condition's own folder and running shell commands only as
`docker exec <its own container> bash -lc "..."`; web tools denied. Each task has its own container per condition,
started from its image with no network, with the condition's copy of the repo mounted at the repo's path.

**What the agents get.** `TASKS.md`: for each task, its id, its issue text (`problem_statement`, the only dataset field
an agent sees, as the benchmark's rules require), its folder and its container. The repo is copied out of the image at
its base commit, as a fresh git repository with a single commit: no history, so no later commits or fixes. Files that
were untracked in the image are kept but marked ignored. The briefs (`briefs/`) carry only general instructions, the
same for all tasks. During the builds the dataset files are deleted from the disk and the Hugging Face cache holds no
copy; they are downloaded again, hash-checked, for scoring.

**Order and limits.** B's architect runs first; the estimates are then committed (tag `f17-estimates`); A and B's
specialists start at the same time on the same PC. An agent that stops before its tasks are done is resumed once with
"continue" (counted with its run). Each build stops at 3 times the larger quote in reported tokens, or both stop if the
weekly plan usage reaches 90%; a stopped build is reported with its cost and score so far. Each agent ends by writing
a result file with one line per task: `DONE` or `NOT DONE`.

## Estimates (made before any build, committed with tag `f17-estimates`)
Units, as in the studio and finding 14: **agent-minutes** = first to last message of one run (a build's agent-minutes
add up across runs); **wall-clock** = first message of the first run to the last message of the last run; **reported
tokens** = input + output + cache writes; **plan-equivalent** = reported + 10% of cache reads.
- **A:** one estimator run (Opus 5.5, same harness and folder layout as A, told not to change anything) reads
  `TASKS.md` and the code and writes one line: `ESTIMATE: <n> agent-min, <n>k reported`. Not counted in A's cost.
- **B:** the architect's `PLAN.md`: its own `ARCHITECT` line, one `ESTIMATE` line per group, a `WALL` line, a `SOLO`
  line (one agent doing all 10) and the expected saving.
- Method 1 is the raw quote; method 2 is the raw minutes x 0.34 (finding 10). The estimating agents are not told
  about x0.34.

## Measures and decision rules
- **Tasks resolved (the main outcome).** Resolved of 10 for A and B, per task, by the official evaluator on each
  condition's final patches. With one run of 10 tasks per condition: "B ahead" if B resolves at least 2 more than A,
  "A ahead" likewise, otherwise "no difference found".
- **"Done" claims (section 8, finding 16).** Share of tasks an agent marked `DONE` that the evaluator marks unresolved,
  A and B together. "Agrees" that done often isn't if that share is 25% or more; "disagrees" otherwise. Reported per
  condition too.
- **Minutes (both methods, both conditions).** Error = abs(measured agent-minutes / estimate - 1). The method with the
  smaller error is "closer" for that condition. x0.34 closer in both: agrees with section 4; the raw quote closer in
  both: disagrees; a split is "mixed". B's wall-clock is reported next to its agent-minutes with the same two errors.
- **Cost of the split.** Measured saving = (A's plan-equivalent - B's, architect included) / A's, set beside the
  architect's expected saving. The replay agrees with section 3 if B's groups cost at least 15% more than their
  forecast and the measured saving is smaller than the forecast one. A split that saves tokens but resolves fewer
  tasks is reported as such, not as a saving.
- **Also reported:** restarts, refused tool calls, per-group estimate vs measured, each run's model and effort.

## Checks before the numbers are used
- Every run's transcript is audited: tool calls, refused calls, any path outside its folder, any web attempt, any
  shell command other than `docker exec` into its own containers.
- The dataset is absent from the disk during the builds (file listing of its folder and of the Hugging Face cache
  before and after).
- Patches come from inside each container: `git add -A`, then the diff against the base commit, binary files left out.

## Limits
- One run per condition: the direction can be read, not a rate.
- Ten tasks from one C repo, eight of them opened on 27 July 2026: likely one contributor's burst of small, related
  fixes. The rule picked the repo; it isn't typical of the set.
- The tasks are one to five weeks past the training data cutoff, which Anthropic gives as a month. An issue's text may
  be older than its fix.
- Not the official in-container rollout: the agents edit files on Windows that are mounted into Linux containers. The
  scoring is official.
- Not the studio's harness (no landing gate, hooks or worktrees; safe mode drops the owner's CLAUDE.md). The units,
  estimate lines and 150k split rule are the studio's.
- Both builds share the machine and the plan's rate limits at the same time.
- The harness's Docker steps are untested at this commit. A fix needed to make them run is listed as a deviation if it
  changes what an agent sees or what is measured. The order of every step is in `data/swebench-live/README.md`.
- The scoring script that turns the evaluator's report into the table is written after the gold check shows the
  report's format, and before any build.

## Deviations (listed with the estimates commit, before any build)
1. **The "without the fix" run.** The evaluator counts an empty patch as unresolved without running anything, so the
   gold check's fourth run used a no-op patch instead: it only adds one new text file at the repo root
   (`F17_NOOP.txt`); the task's test patch is applied as usual.
2. **The evaluator on a Windows host.** RepoLaunch's `LinuxRuntime.apply_patch` writes the patch file with Windows line
   endings and joins the in-container path with a backslash, and `git apply` rejects such a patch (tested on a toy
   repo). The evaluator runs unchanged through `run_eval.py`, which replaces that one method with a copy that writes
   the file as UTF-8 with LF line endings and joins the path with `/`. Versions: SWE-bench-Live `afac77f2`, RepoLaunch
   `c4b623d9`.
3. **The copy check.** The git tree ids of the image and the copy differ for every task, for three reasons that change
   no file: the copy records no file modes (`core.fileMode false`; 127 scripts are executable in the image), the
   submodule `src/coucal` becomes plain files, and the image's own changes to tracked files (2 files in task 893) are
   part of the copy's base commit. The check now compares every file's content, every symlink's target and every exec
   bit: all 20 copies match their image (1,522 to 1,573 files).
4. **Workers.** 3 evaluator workers, not 4: each task container takes 4 CPUs and 16 GB, and Docker has 64 GB.
5. **Seal.** On gold runs the evaluator also writes `gold_patch_evaluated_instances.jsonl` (full dataset rows) and its
   logs hold test names, so after the gold check the logs were reduced to resolved flags and test counts
   (`kit/gold-check.json`) and deleted with the dataset; the seal check now also looks for any `.jsonl` or evaluator
   log in the runs folder.
6. **Symlinks.** The copies hold symlinks (36 in task 893's), written by Docker on the Windows folder; Windows-side
   tools can't read them (the agents can, through `docker exec`). Same for A and B.
7. **Seen since the pre-registration commit:** the evaluator's code; the dataset rows' field names; one field printed
   by mistake, `log_parser` (a generic parser for `PASS: name` lines, the same for all 10 tasks); the repo's file
   paths and modes for task 893 (no contents) while checking the copy; the gold check's counts below. Still not seen:
   any issue text, fix, test, test command or code.

**Gold check result.** The dataset's fixes resolved all 10 tasks in each of the three runs (5 minutes each); the no-op
patch resolved none and applied everywhere. In 8 tasks the no-op run fails only the fix's own tests (1 to 3) and keeps
178 to 202 others passing; in 837 and 850 every test (186 and 188) is a fail-to-pass test, and without the fix no test
result comes out at all. No task is replaced.

**Estimates** (`data/swebench-live/estimates/`). A: `ESTIMATE: 170 agent-min, 2100k reported`; the estimator read
`TASKS.md` and answered (2 turns, 12 seconds, nothing refused). B's `PLAN.md`: 4 groups of 2 or 3 tasks, none waiting
for another, 35 to 50 agent-min and 130k to 165k reported each; with the architect's own line (10 min, 50k), 175
agent-min and 635k reported; `WALL: 62 min`; `SOLO: 190 agent-min, 690k reported`; `SAVING: 6% of tokens, 67% of
wall-clock`. The architect ran 15 turns; its one refused call was a shell command (it has none). **Caps:** 3 x the
larger quote, 2,100k, so 6,300k reported for each build.

## Deviation after the estimates commit
8. **Restart after a permission bug.** The first start of both builds (2026-11-17, 00:27 UTC) was stopped after about
   2 minutes. Claude Code checks the Write tool against Edit rules, so B's groups could not write their result files
   (A could: its Edit rule covers its whole folder), and `docker exec` was allowed from Bash but not from PowerShell,
   which one group tried. Probed with a small model: a `Write(...)` rule grants nothing; a
   `PowerShell(docker exec <container> bash -lc:*)` rule works; a chained command that writes anything is refused in
   both shells. Fix: an Edit rule for every path an agent may write, and `docker exec` into its own containers allowed
   from both shells. All 20 workspaces and containers were reset from the images, and both builds restarted with the
   same briefs, plan, estimates and caps. The stopped start used 83k reported tokens for A and 258k for B (0.29M and
   0.75M plan-equivalent); its records are kept apart (`kit/attempt1/`) and counted in neither build.

## Check added after the builds, before any score
9. **Build products in the patches.** The pre-registered collection (`git add -A`, then the diff) also picked up files
   the agents' in-tree builds and test runs left behind (test logs, `.dirstamp` files, libtool wrapper scripts), in 6
   of A's patches and 4 of B's. The main result scores the patches as pre-registered. A labelled check, fixed before
   any score (`node harness.js clean`), scores the same patches without new files named `*.log`, `*.trs` or
   `.dirstamp` and without new libtool wrapper scripts.

## Result (scored 2026-11-17 UTC)

**Main result, as pre-registered: no difference found.** A resolved 3 of 10, B 2 of 10; the rule needs a gap of 2.
The check without build products gives 3 and 3, the same three tasks. Both builds finished: no cap was reached (the
larger build used 433k of its 6,300k), no agent needed "continue", and nothing was restarted after deviation 8. Files:
`data/swebench-live/results/` (counts only; the patches, transcripts and evaluator logs are kept locally).

| | A: one agent | B: architect + 4 groups |
|---|---|---|
| Runs | 1 (Sonnet) | 5 (architect on Opus, 4 groups on Sonnet) |
| Resolved, as pre-registered (without build products) | 3 of 10 (3) | 2 of 10 (3) |
| Tasks marked `DONE` | 10 of 10 | 10 of 10 |
| Agent-minutes | 17.9 | 17.8 (architect 1.4, groups 16.4) |
| Wall-clock minutes | 17.9 | 18.4 (architect 1.4, gap 12.3, groups 4.7) |
| Reported tokens | 339k | 433k (architect 36k, groups 398k) |
| Cache reads | 23.9M | 12.3M |
| Plan-equivalent tokens | 2.72M | 1.66M (architect 0.08M, groups 1.59M) |
| Tool calls (refused) | 373 (5) | 417 (15: architect 1, groups 14) |

**Per task.** Both resolved 829 and 856; A resolved 850, and B did only in the check. Neither resolved 893, 876, 851,
849, 837, 835 or 830. No patch broke a passing test: in every evaluator run, every pass-to-pass test that ran passed.
In 5 of the 7, the fix's one fail-to-pass test failed in both builds; in 849, 1 of its 3 passed in both; in 837 no
test result came out at all in either build, as with the no-op patch in the gold check.

**B's task 850 in the main score.** B's patch carried the test results its group's own test run left behind for 4
tests (`.log` and `.trs` files for `00_runnable`, `01_engine-gmtime`, `87_local-proxytrack-nodate` and
`88_local-proxytrack-badmtime`). Those 4 are exactly the tests missing from the evaluator's run: no result line for
them in its output, most likely because the test runner found their results already there and didn't run them again.
The evaluator needs every fail-to-pass test to pass, so 184 of 188 left the task unresolved; without the build
products all 188 passed. The one-task gap in the main score comes from the pre-registered collection (`git add -A`),
not from the code. A's patch for 850 held no build products.

**"Done" claims: agrees.** Every agent marked every one of its tasks `DONE`, and 15 of the 20 claims were unresolved
(75%; A 7 of 10, B 8 of 10), above the 25% line. In the check: 14 of 20 (70%).

**Minutes: x0.34 was closer in both conditions, so the replay agrees with section 4, but both methods were again far
too high.**

| | Measured | Raw quote, error | Raw x 0.34, error |
|---|---|---|---|
| A, agent-minutes | 17.9 | 170, 89% | 57.8, 69% |
| B, agent-minutes | 17.8 | 175, 90% | 59.5, 70% |
| B, wall-clock | 18.4 | 62, 70% | 21.1, 13% |

Both builds took about a tenth of their raw quote (0.11 and 0.10); with x0.34 they were still quoted 3.2 and 3.3
times too high. B's 13% wall-clock error is an accident of timing: 12.3 of its 18.4 minutes are the gap between the
architect's last message and the groups' start, while this session committed the estimates and the first start was
stopped and restarted (deviation 8). Without the gap, B's wall-clock is 6.2 minutes: errors 90% raw and 71% with x0.34.

**Cost of the split: disagrees.** B's groups cost 398k reported against 585k forecast, 32% under rather than at least
15% over, and the measured saving in plan-equivalent, (A - B) / A, is 39% against the 6% forecast. Both halves of the
rule fail. The saving depends on the unit: in reported tokens B cost 28% more than A (433k against 339k). It comes
from cache reads: A's one long session re-read 23.9M cached tokens, B's five shorter ones 12.3M. In the main score B
also resolved one task fewer (the gap the rule calls no difference, explained above); in the check, the same three.

| | Forecast | Measured |
|---|---|---|
| Architect | 50k, 10 min | 36k, 1.4 min |
| G1 (849, 837) | 165k, 50 min | 97k, 3.5 min |
| G2 (851, 830) | 150k, 45 min | 122k, 4.7 min |
| G3 (850, 835, 829) | 130k, 35 min | 84k, 3.5 min |
| G4 (893, 876, 856) | 140k, 35 min | 94k, 4.6 min |

The token quotes were high as well: A used 0.16 of its estimator's 2,100k and B 0.68 of its plan's 635k. The
architect's own `SOLO` line (690k for one agent doing all 10) was 2.0 times what A used.

**Checks before these numbers are used.**
1. **The seal.** The seal check found the dataset absent, and no SWE-bench-Live copy in the Hugging Face cache, before
   and after the builds; the dataset was downloaded again, hash-checked, only for scoring.
2. **The audit.** No run used a web tool. Every flagged shell command was refused except 4 read-only listings that
   Claude Code allows inside the working folder (the estimator's one `Get-Content TASKS.md; Get-ChildItem`, the
   architect's 3 folder listings with `ls`).
   A's 31 reads outside its folder were Claude Code's own output files for A's background shell commands.
3. **The repo's own agent files.** httrack ships an `AGENTS.md` and a `CLAUDE.md`, part of the task image and so
   allowed. Safe mode didn't load them, but A (2 commands) and two of B's groups (G1 2, G4 1) read them through
   `docker exec`.
4. **The evaluator.** No patch was empty, and the evaluator reported no error in any of the 4 runs.

**Reading.** On ten issues filed after the models' training cutoff, one agent and an architect with four groups
resolved about the same share: 3 and 2, or 3 and 3 without build products. Every agent claimed every task done, and
70-75% of those claims didn't hold, so here a `DONE` line carried no information about the issue's own test. The
minute quotes were about ten times too high, and x0.34 left them about three times too high, as in finding 14. The
split's cost depends on the unit: 39% saved in plan-equivalent tokens, 28% more in reported tokens. One run per
condition on ten related tasks from one repo: the direction can be read, not a rate.
