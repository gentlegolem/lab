# Port timing (finding 18)

The timing tool for [finding 18](../../agent-study/findings/finding-18-prereg.md), the agent-led port of Back to One
from UE 5.9 to Godot 4. It was written and tested before the port's first start marker, and its rules below are
fixed from then on: a change is a deviation.

| File | What it does |
|---|---|
| `timing.js` | reads the port's Claude Code transcripts, `study/PHASES.log` and `study/OWNER_STEPS.log`; prints the measures per phase |
| `test.js` | tests on made-up transcripts whose answers are worked out by hand |
| `test/jam-phases.log` | test markers over the jam's four days, for the run on the jam's own transcripts |
| `test/crosscheck.py` | a second, separate count (Python) for checking a real run's totals |

```
node timing.js --phases <port repo>/study/PHASES.log --owner-steps <port repo>/study/OWNER_STEPS.log --repo <port repo> --json <out.json>
```
With no `--projects`, it reads `~/.claude/projects/D--Git` and every `~/.claude/projects/D--Git-BackToOne-Godot*`
folder, where the port's sessions write their transcripts. `--until` sets the end of a phase that's still open
(default: now). `--all`, `--session` and `--exclude-session` change which sessions count; using them for the result
is a deviation.

## Rules
- **Sessions counted.** A session counts if any of its entries has a working folder, or any of its tool calls has an
  input, that names `BackToOne-Godot` (`--match`). Its subagents come with it. Every run lists the sessions it
  counted and why.
- **Phases.** From `PHASES.log`, one marker per line: UTC time, phase name, `start` or `stop`, separated by tabs,
  commas or spaces. A phase's wall-clock is the sum of its start-to-stop intervals. A phase still open counts up to
  `--until` and is marked "open". A message falls in every phase open at its time, so overlapping phases each count
  it. The "All phases" row uses the union of the phases, so an overlap counts once there.
- **Active agent time** (the pre-registration's "sum of gaps between consecutive messages of 5 minutes or less"):
  - Each thread is its own timeline: a session's main thread, or one of its subagents.
  - A gap of 5 minutes or less between consecutive user or assistant entries counts, clipped to the phase.
  - **Agents summed** adds the threads, so agents working in parallel add up. These are agent-hours, the unit of
    the estimates.
  - Also printed: **per session**, with the main thread and its subagents on one timeline, and **any agent
    active**, with every thread on one timeline. That one is never more than the wall-clock.
- **First-to-last.** Finding 17's unit: each thread's first to last message, clipped to the phase, summed.
- **Tokens.**
  - One count per API response, keyed by message id and request id. Claude Code writes a response once per content
    block, and the repeats count once.
  - A response falls in the phases open at its time.
  - Reported = input + output + cache writes. Plan-equivalent = reported + 10% of cache reads.
  - Entries with the model `<synthetic>` (made by Claude Code, not the API) are skipped.
  - The model of every response is counted.
- **Owner messages.**
  - What counts: main-thread user entries marked `origin.kind` "human". On older entries with no origin, typed text
    with no tool result that doesn't start with a system tag.
  - What doesn't: messages from other sessions, task notifications, tool results, compact summaries, slash-command
    output and subagent prompts.
  - Interrupts ("[Request interrupted by user...]") get their own column.
- **Owner steps.** `OWNER_STEPS.log`, one step per line: UTC time, minutes, what. A step falls in the phases open at
  its time.
- **Tag check** (`--repo`). Each phase's first start and last stop must have a tag `phase/<name>/<start|stop>` (name
  in lower case, spaces as dashes) within 5 minutes of the log's time. Anything else is listed under "Problems",
  with bad log lines and phases left open.

## Tests (2026-11-16, before the first start marker)
**Made-up transcripts.** `node test.js`: all passed (Node 24.18). Its cases:
- overlapping phases, a phase still open, a phase name with spaces, a bad line, a stop with no start;
- a response written twice, a `<synthetic>` entry, a subagent thread;
- a session matched by its working folder, one matched only by a tool call, and one that doesn't match;
- peer, task-notification, meta and subagent entries that aren't owner messages, and an interrupt;
- owner steps inside and outside the phases;
- the tag check: one tag right, one 20 minutes off, the rest missing.

**The jam's own transcripts.** Command:
```
node timing.js --phases test/jam-phases.log --projects ~/.claude/projects/d--Git-MegaJam2026 --match MegaJam2026 --until 2026-11-16T00:00:00Z
```
It read 223 files (2 lead sessions and 221 subagents, 181,873 lines) in 7 seconds at below-normal priority:

| Phase | Wall-clock h | Active h (agents summed) | Active h (per session) | Any agent active h | Reported M | Plan-eq M | Cache reads M | Responses | Owner messages | Interrupts |
|---|---|---|---|---|---|---|---|---|---|---|
| Jam (all four days) | 89.58 | 194.97 | 67.93 | 65.77 | 125.80 | 736.98 | 6,111.77 | 32,783 | 32 | 1 |
| Thursday | 24.00 | 42.56 | 18.10 | 18.10 | 30.11 | 171.39 | 1,412.78 | 7,413 | 7 | 0 |
| Friday | 24.00 | 37.99 | 14.49 | 13.13 | 21.99 | 135.60 | 1,136.13 | 5,754 | 10 | 0 |
| Saturday | 24.00 | 63.44 | 20.11 | 19.30 | 43.93 | 250.04 | 2,061.13 | 11,549 | 13 | 1 |
| Sunday (to the 17:35 submission) | 17.58 | 50.99 | 15.23 | 15.23 | 29.78 | 179.95 | 1,501.74 | 8,067 | 2 | 0 |

- **Sums:** the four days add up to the Jam row, which overlaps them (agents summed 194.98, rounding;
  responses, tokens and owner messages exactly). No problems were listed.
- **Second count:** `python -I test/crosscheck.py <folder> 2026-11-12T05:00:00Z 2026-11-15T22:35:00Z` gave the same
  figures for the Jam row: 32,783 responses, 125,801,074 reported tokens, 6,111,773,413 cache reads, 32 owner
  messages, 1 interrupt and 194.9729 active agent-hours.
- **Fix made during the test:** the first run counted 33 owner messages. The extra one was an interrupt, which
  carries no origin field, so interrupts now have their own column.
- **Models** (responses in the Jam row): `claude-opus-5-5` 30,302, `claude-sonnet-5-5` 1,253, `claude-fable-5-2`
  1,224, `claude-haiku-5-5` 4.
- **Against the jam's task ledger** (the pre-registration's "Jam cost"), the transcripts count more:

  | | Transcripts | Ledger |
  |---|---|---|
  | Agent time | 195.0 active agent-hours | 174.7 summed task-hours |
  | Wall-clock | 65.8 h with any agent active | 63.5 h |
  | Output tokens | 22.6M | 15.6M |
  | Cache writes | 103.1M | 57.8M |
  | Cache reads | 6,112M | 3,741M |

  More was expected: 67 ledger rows record no tokens, the ledger counts tasks rather than threads, and its window is
  the tasks' start dates, not these markers.

**The port's folder, before any marker** (a dry run with one open test phase): it found one session in `D--Git`,
matched by both its working folder and its tool calls.
