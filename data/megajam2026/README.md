# Game jam snapshot (finding 16)

Data for [finding 16](../../agent-study/findings/finding-16-prereg.md): "Back to One", built in Unreal Engine 5.9 for
Epic's MegaJam (Nov 12–15, 2026). Pinned to the jam repo's submitted build, `484badbe` (see `MANIFEST.json`).

| File | What it holds |
|---|---|
| `commits.tsv` | every commit reachable from the submitted build: sha, parents, time (UTC), subject, shas a revert names |
| `files.tsv` | files and line counts per commit (`git --numstat`) |
| `ledger.jsonl` | the jam's task ledger at that commit: one row per task, with times, tokens, commits and status |
| `estimates.tsv` | the operator's estimate-vs-actual table, one row per table row, as written |
| `playtests.tsv` | one row per bot playtest report: scenario, pass, seconds, commit, build, mock, steps, console errors |
| `UE5_LEARNINGS.md` | the jam's own end-of-jam lessons (from `4afa21d7`, which adds only this file) |
| `MANIFEST.json` | source commits, SHA-256 of every file, row counts, what the scrub replaced |
| `results.json` | the analysis output |
| `playtests-archive.tsv` | finding 16a: one row per bot report from the jam's worktrees, same columns plus the tree and `dup_of_main` |
| `MANIFEST-archive.json` | finding 16a: hash of the archive's file list and of the table, counts, the check that main's reports match |
| `results-addendum.json` | finding 16a's analysis output |

No game code, assets, sourced content, author names or emails, commit bodies or receipts. Email addresses and absolute
local paths are replaced by `<email>`, `<repo>` or `<local path>`. The playtest runs are git-ignored in the jam repo, so
they are pinned by their hash and count, not by a commit.

Rebuild and re-run (Node 18 or newer, git on the PATH, no dependencies):

```
node build_snapshot.js --repo <jam repo> --estimates <ESTIMATES.md>
node analyze.js
```

`analyze.js` uses finding 9's own rework code from `agent-study/package/`. Set `F16_NO_NOISE=1` to count the
bookkeeping files too (the sensitivity check in the finding).

Finding 16a adds the worktree runs from an archive of the jam's `playtest-runs` (one folder per worktree, plus `main`
and a `MANIFEST.csv`). Only the report fields are read; screenshots and logs are not copied:

```
node build_archive.js --archive <playtest-runs>
node analyze_addendum.js
```

`analyze_addendum.js` stops unless it first reproduces finding 16's bot numbers on main alone.
