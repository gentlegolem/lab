# SWE-bench-Live replay (finding 17)

Harness for [finding 17](../../agent-study/findings/finding-17-prereg.md): ten July 2026 issues from one repo, fixed
once by one agent (A) and once by an architect and specialists (B), scored by the official SWE-bench-Live evaluator.

| File | What it does |
|---|---|
| `select_tasks.py` | picks the repo and tasks from SWE-bench-Live/MultiLang by the pre-registered rule |
| `selection.tsv` | the 10 chosen tasks: id, repo, split, `created_at`, Docker image |
| `dataset.sha256`, `download.sh` | the dataset's 8 files at the pinned revision, hash-checked |
| `prepare.py` | `tasks`: the agents' `TASKS.md` (issue texts only); `evalset`: every field, for scoring only |
| `copy.sh` | runs in each task's image: the repo at its base commit, as a fresh git repository with one commit |
| `harness.js` | containers, agent runs, the token cap, patches, measures, audit, the seal check |
| `briefs/` | the prompts: A, B's architect, B's groups, A's estimator (general instructions only) |

Data, workspaces and logs live outside the repo, on D: (`D:/LabData/`). Nothing here holds issue texts, fixes or
tests.

## Runbook
Steps 1 and 3 are the owner's or need his OK; each other step is a command.

1. **Docker on D:.** In Docker Desktop, Settings > Resources > Advanced > Disk image location: a folder on D:, before
   anything is pulled. Then `docker run --rm hello-world`.
2. **Images.** `tail -n +2 selection.tsv | cut -f5 | xargs -n1 docker pull` (10 images, about 7.9 GB compressed).
3. **Evaluator.** Clone `github.com/microsoft/SWE-bench-Live` into `D:/LabData/swe-bench-eval/`, note its commit, make
   a virtual environment there and `pip install -e . ./launch/`.
4. **Workspaces.** `python -I prepare.py tasks <parquet folder> D:/LabData/swelive-runs`, then
   `node harness.js copy` (check every line says `same tree true` and `dirty 0`) and `node harness.js up`.
5. **Gold check.** `python -I prepare.py evalset <parquet folder> D:/LabData/swelive-runs/kit/eval.jsonl`; run the
   evaluator three times with `--patch_dir gold` and once on `kit/predictions-empty.json` (from
   `node harness.js collect`, before any build): `python -m evaluation.evaluation --dataset <eval.jsonl> --platform
   linux --patch_dir <gold or predictions file> --output_dir <kit>/logs/<name> --workers 4 --overwrite 1`. A task counts
   only if its fix resolves it all three times and the empty patch doesn't (rule 6 replaces the others).
6. **Seal.** Delete `D:/LabData/swe-bench-live/` and `kit/eval.jsonl`; `node harness.js seal-check` must list them
   as absent, and no SWE-bench-Live copy in the Hugging Face cache.
7. **Estimates.** `node harness.js estimate`, then `node harness.js architect` (`node harness.js plan` must list no
   problems). Copy `kit/estimate-A.txt` and `B/PLAN.md` here under `estimates/`, commit, tag `f17-estimates`.
8. **Build.** `node harness.js build --cap-a <tokens> --cap-b <tokens>`, both caps 3 times the larger quote in
   reported tokens. Stop both by hand if the weekly plan usage reaches 90%.
9. **After.** `node harness.js seal-check`, `collect`, `measure`, `audit`, then `sh download.sh`, `prepare.py evalset`
   again, and the evaluator on `kit/predictions-A.json` and `kit/predictions-B.json`.

`SWL_RUNS` moves the runs folder; `SWL_TEST_MODEL` swaps every model for a small one, for testing the harness only.
The audit's flags include refused attempts; the run's refused count says how many were refused.

## Rules the harness keeps (the benchmark's protocol)
- An agent sees only the issue text and its tasks' environments: the repo at the base commit with no history, in a
  container with no network. Web tools are denied; it reads and edits only inside its condition's folder and runs shell
  commands only as `docker exec <its container> bash -lc "..."`.
- Claude Code runs headless in `--safe-mode`: no CLAUDE.md, hooks, skills, plugins or MCP servers.
- The dataset is not on the disk while an agent works.
