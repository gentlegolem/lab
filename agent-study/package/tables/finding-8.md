<!-- 1072 agent runs, 1055 tasks, 2026-10-10 to 2026-11-04 -->

### Finding 8

| Architect run | Runs | Reported tokens | Incl. cache reads | Plan-equivalent | Agent-min | Tool calls |
| --- | --- | --- | --- | --- | --- | --- |
| Pass 1 (first architect run; also wrote the pure rule modules and tests, so an upper bound for planning alone) | 1 | 677k | 11.7M | 1.77M | 132.5 | 59 |
| Pass 2 (plan only, no build) | 1 | 180k | 4.0M | 0.56M | 16.4 | 41 |

| Task cohort | Tasks | Reported tokens (sum) | Plan-equivalent (sum) | Plan-eq per task | Tasks with an attributed commit | Commits | Plan-eq per commit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Before pass 1, no plan | 338 | 150.15M | 1337.21M | 3956k | 56 | 597 | 1414k |
| Pass 1 tasks | 63 | 6.86M | 26.37M | 419k | 47 | 90 | 202k |
| Between the passes, unplanned | 470 | 256.46M | 1205.10M | 2564k | 258 | 708 | 1159k |
| Pass 2 tasks | 14 | 1.97M | 8.89M | 635k | 14 | 25 | 356k |
| After pass 2, other tasks | 75 | 14.51M | 75.63M | 1008k | 56 | 215 | 301k |

| Break-even (est. saving, measured cost) | Architect cost (plan-eq, measured) | Saving, method A: per-commit rate vs baseline (est.) | Net (est.) | Saving / cost (est.) |
| --- | --- | --- | --- | --- |
| Pass 1 vs tasks before the plan | 1.77M | 109.03M | 107.26M | 61.43 |
| Pass 2 vs unplanned tasks between the passes | 0.56M | 20.07M | 19.51M | 35.58 |

Method B (pass 2, est.): the planning session wrote down the unsplit plan's cost before the architect ran: about 9.3M plan-equivalent. The pass-2 tasks that have a transcript cost 8.89M (measured, 14 of 15 tasks). Saving = 0.41M, net of the architect -0.16M, ratio 0.73.

Skipped planning pass (owner-reported): searched 15 coordinator-session logs, 61 assistant messages mentioning an architect or planning pass since 2026-10-27; messages that cost it with a number and then skip it (excluding messages about this analysis): 0.

