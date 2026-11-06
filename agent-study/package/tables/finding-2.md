<!-- cut 2026-11-03T19:00:00.000Z, ledger sha256 7bcbc93575d6, 1062 agent runs, 1045 tasks, 2026-10-10 to 2026-11-03 -->

### Finding 2

| Cohort (by planning pass) | n tasks | Median tokens | Over 150k | Restarted (>1 agent) | Ended on a usage limit | Median actual / estimate (n) | Rework sub-score (n) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0. Before pass 1 (2026-10-10 to 10-19), all Opus, no per-task budget | 338 | 215k | 250 (74%) | 0 | 0 | n/a (0) | 67 (56) |
| 1. Pass 1 tasks: night of 10-19/21, brief or plan states <= 150k | 63 | 101k | 9 (14%) | 6 | 2 | 0.74 (43) | 48 (47) |
| 1x. Same days, no 150k statement | 54 | 90k | 4 (7%) | 0 | 0 | 0.81 (36) | 5 (21) |
| 2a. Between the passes (10-21 to 10-31), briefs that state ~150k | 14 | 140k | 6 (43%) | 0 | 0 | 0.95 (11) | 100 (11) |
| 2b. Between the passes, briefs with no 150k statement | 470 | 292k | 350 (74%) | 4 | 2 | 0.90 (135) | 97 (252) |
| 3. Pass 2 tasks (one architect plan, 15 tasks of ~150k, Sonnet builders) | 14 | 127k | 3 (21%) | 0 | 0 | 0.85 (14) | 97 (14) |
| 4. After pass 2 (from 10-31 21:07 UTC), other tasks | 69 | 167k | 36 (52%) | 1 | 0 | 1.03 (69) | 99 (52) |

| Wording of the budget in agent briefs | First seen (number of briefs) |
| --- | --- |
| "Budget: aim for <= 150k reported tokens" | 2026-10-20 (51 briefs) |
| "Budget <= 150k reported tokens, <= N calls" | 2026-10-20 (10 briefs) |
| "ESTIMATE: ... 150k tokens" (estimate line) | 2026-10-27 (28 briefs) |
| "(hard cap 150k / 180k / 200k)" next to an estimate | 2026-11-01 (48 briefs) |
| "build tasks of about 150k reported tokens each" (architect pass 2) | 2026-10-31 (1 briefs) |
| "aim close to 150k" (or near / up to) | not found in any brief |

| Window | n tasks | with an estimate | Median estimate | Median actual tokens | Tasks over 150k actual | Restarted tasks (>1 agent) | Tasks ended by a usage limit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W0: before the config rule (before 2026-10-29 05:18 local) | 846 | 132 | 150k | 220k | 568 (67%) | 10 (1%) | 4 |
| W1: hard 150k cap (66 minutes) | 2 | 2 | 85k | 115k | 1 (50%) | 0 (0%) | 0 |
| W2: 150k is a warning only (from 2026-10-29 06:24 local) | 174 | 174 | 160k | 155k | 89 (51%) | 1 (1%) | 0 |

| Window (tasks with an estimate) | n | Estimate <= 150k | Actual <= 150k | Median actual / estimate |
| --- | --- | --- | --- | --- |
| W0: before the config rule (before 2026-10-29 05:18 local) | 132 | 64% | 61% | 0.84 |
| W1: hard 150k cap (66 minutes) | 2 | 100% | 50% | 1.33 |
| W2: 150k is a warning only (from 2026-10-29 06:24 local) | 174 | 45% | 49% | 0.87 |

