# Analysis package: how Claude agents behaved in a small studio's pipeline

These are read-only analysis scripts for the [write-up](../README.md). They re-run sections 1, 2, 3, 6 (with the minutes fix), 7 and 8 from
a studio's own Claude Code transcripts, cost ledger, git history and landing log. They print aggregate tables only:
no transcript text, ids or task titles. Nothing is sent anywhere, and nothing is written outside `tables/`.

[`tables/`](tables/) holds the output behind the write-up: runs cut at 2026-11-03T19:00Z with `RESIDENCY_UNTIL` (1,062 runs; the first line of each
file states the cut, the ledger version and the count). `finding-10.md` is cut later, at 2026-11-06T00:26Z (1,098 runs),
since its after-fix period starts on Nov 4. Re-running the scripts overwrites these files with tables from your own data.

## What it measures

| Write-up section | Package finding | Question | Inputs |
|---|---|---|---|
| 3 | 1 | Cost and time per task type and model | transcripts, ledger |
| 1 | 2 | Tasks planned to a token budget (about 150k): how often they stayed under it | transcripts, ledger |
| (none) | 3 | Tasks cut from one architect plan compared with other tasks: tokens, restarts, rework | transcripts, git history |
| 6 | 6 | Estimates vs actuals, and whether feeding results back into estimates helped | transcripts, ledger |
| 7 | 7 | Guardrail (hook) refusals in the transcripts; landing-gate outcomes | transcripts, landing log |
| 2 | 8 | Architect break-even: what a planning pass cost against its plan's forecasts, and how far the forecast can be off before the result flips | transcripts, git history |
| 8 | 9 | Did "done", "landed", "checks pass" and "verified" claims hold up? | transcripts, landing log, git history |
| 6 (the fix) | 10 | The minutes fix (the ledger applies the published factor itself): estimate error before and after | transcripts, ledger |

Findings 4 (a fresh judge on UI rounds) and 5 (game engine vs web mockups) read the studio's own UI round logs, so
they aren't in this package. `rejudge/` holds the method of the blinded re-judge used for finding 4, without data.

## Inputs it expects

1. **Transcripts** (`RESIDENCY_TRANSCRIPTS`): Claude Code subagent logs,
   `<folder>/<session>/subagents/agent-<id>.jsonl` (one JSON object per line: `type`, `timestamp`,
   `message.{id,model,usage,content}`), plus an optional `agent-<id>.meta.json` (`description`, `agentType`, `model`)
   and `subagents/workflows/<run>/`. The first user line is the agent's brief. A line in it like
   `ESTIMATE: <min> agent-min, <N>k tokens, type <class>` is read as the task's estimate.
2. **Ledger CSV** (`RESIDENCY_LEDGER`, required): columns `agent_id, date, session, task_id, project, class, model,
   requested_model, calls, minutes, reported, incl_cache, est_tokens, est_minutes, task_type, note, agent_type,
   brief_chars, skills, instr`, and for finding 10 `est_minutes_raw` (the quote as written; `est_minutes` is then
   the corrected figure). Rows whose `agent_id` starts with `seed:` were entered by hand and have no transcript.
3. **Git checkout** (`RESIDENCY_REPO`): commit subjects start with a tag in brackets (`[Tag] message`), and an
   agent's branch is `worktree-agent-<id>`. Used for the rework and revert signals.
4. **Landing log** (`RESIDENCY_LAND_LOG`, optional): tab-separated lines `<ISO time>\t<branch>\t<result>\t<extra>`,
   where result is one of `landed`, `check-failed`, `conflict`, `push-failed`, `nothing`.
5. **Settings** (`RESIDENCY_CONFIG`, optional): a JSON file with the studio-specific values listed in
   [`src/config.js`](src/config.js); see [`config.example.json`](config.example.json). These are the tool-name
   prefix of the game-engine tools, the word agents use for the engine, how to recognise the architect runs and the
   tasks of the second plan, and which bookkeeping files to leave out of rework. If a value is left empty, that
   measurement comes out empty.

The dates of the studio's rule changes are constants (the `T` table and the pass dates in
`src/residency-findings.js`). Edit them for another studio.

## Re-run

Windows (cmd):
```
set RESIDENCY_TRANSCRIPTS=<folder with the session folders>
set RESIDENCY_REPO=<git checkout>
set RESIDENCY_LEDGER=<ledger.csv>
set RESIDENCY_LAND_LOG=<landing log>
set RESIDENCY_CONFIG=<settings.json>
set RESIDENCY_UNTIL=<end date, optional, e.g. 2026-11-10T00:00:00Z>
node run-all.js
```
Elsewhere, use `export` instead of `set`. `node run-all.js` writes `tables/finding-N.md` and overwrites them. It
streams every transcript once per finding: about 1.5 minutes per finding here, so about 12 minutes in all. `node src/residency-findings.js 9` prints one
finding to stdout.

`RESIDENCY_UNTIL` sets one end date for every input: runs that started before it, and commits, landing-log lines and
hook refusals before it. Set it to a write-up's end date to reproduce its tables. The ledger itself isn't cut
by date, because it can be rewritten later (a backfill, say): each table's first line gives the ledger's SHA-256, so a
re-run can tell whether it read the same version. `RESIDENCY_FIX_AT` (optional,
default 2026-11-04T01:00:00Z) is when the minutes fix of finding 10 took effect.

It needs Node 18 or newer (tested on 24) and git on the PATH. There's no npm install and there are no dependencies.
`RESIDENCY_REPO` must be a real checkout. It's a heavy job: run it alone, at low priority.

## Finding 9, in short

Each run's final report is split into sentences. A sentence that matches a claim pattern (landed, checks pass, tests
pass, verified in the engine, done) and has no negation counts as a claim. The ground truth comes from three places:
- the landing log: a landed entry for the run's branch;
- the same transcript: a check or test command, or an engine tool call;
- git history: later fix-like commits on the same files within 3 and 7 days.

A fix counts as "outside an agent" when it falls in no run window. All commits share one author, so authorship can't
say who made the fix.

## Re-judge method (`rejudge/`)

`build-packets.py` needs Python 3 with Pillow: `python build-packets.py <rounds-dir> <out-dir> <rounds.json>`. It
builds blinded A/B packets for a fresh judge model. For each round it:
- seeds a coin for which side is A;
- masks the page chrome with the same box on both sides;
- writes `A_` and `B_` screenshots per device, the automatic scores and the judge prompt
  (`judge-prompt.template.md`).

The key (which side is which) is kept apart from the packets. The judge answers per device, with hard gates.

## Limits

- One operator, one PC, one studio. Era, task mix and model are confounded in findings 1 and 2, and no run was
  replayed on a second model.
- Claims are detected by sentence patterns, not hand labels, so their precision isn't measured. "Verified" and
  "tests pass" can only be checked as "a call was made", not that it went well.
- Rework means fix-like commits (words such as fix, verify, note, bug) on the same files. In a studio that fixes
  forward and iterates daily on the same files, it measures churn as much as error.
- Windows still open for the newest tasks are left out of the rates.
- Re-running on newer transcripts gives larger counts than the write-up, unless `RESIDENCY_UNTIL` is set to its end
  date.
- Finding 10 compares two periods; task mix and model share can differ between them (its mix table shows by how much).

## License

MIT (see [LICENSE](../../LICENSE)).
