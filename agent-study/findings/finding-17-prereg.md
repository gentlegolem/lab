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
