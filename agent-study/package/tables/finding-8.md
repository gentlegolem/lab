<!-- cut 2026-11-03T19:00:00.000Z, ledger sha256 7bcbc93575d6, 1062 agent runs, 1045 tasks, 2026-10-10 to 2026-11-03 -->

### Finding 8

| Architect run | Runs | Reported tokens | Incl. cache reads | Plan-equivalent | Agent-min | Tool calls |
| --- | --- | --- | --- | --- | --- | --- |
| Pass 1 (first architect run; also wrote the pure rule modules and tests, so an upper bound for planning alone) | 1 | 677k | 11.7M | 1.77M | 132.5 | 59 |
| Pass 2 (plan only, no build) | 1 | 180k | 4.0M | 0.56M | 16.4 | 41 |

| Task cohort | Tasks | Reported tokens (sum) | Plan-equivalent (sum) | Plan-eq per task | Tasks with an attributed commit | Commits | Plan-eq per commit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Before pass 1, no plan | 338 | 150.15M | 1337.21M | 3956k | 56 | 597 | 1414k |
| Pass 1 tasks | 63 | 6.86M | 26.37M | 419k | 47 | 90 | 202k |
| Between the passes, unplanned | 470 | 256.46M | 1205.10M | 2564k | 258 | 706 | 1162k |
| Pass 2 tasks | 14 | 1.97M | 8.89M | 635k | 14 | 25 | 356k |
| After pass 2, other tasks | 69 | 13.75M | 72.81M | 1055k | 52 | 207 | 294k |

Pass 2 against its forecasts (est.): the planning session forecast the unsplit work at 9.30M plan-equivalent and the split work at 7.70M. The 14 of 15 tasks that have a transcript cost 8.89M (measured; 15% over the split forecast before the 15th task). Saving against the unsplit forecast = 0.41M, net of the architect -0.16M; with the 15th task at the other tasks' quartiles (297k, 492k, 588k): saving -0.18M to 0.11M, net -0.74M to -0.45M. Break-even: the pass pays for its architect only if the unsplit work would really have cost 1.7% more than forecast (4.9% to 8.0% with the 15th task).

No per-commit saving: commits per task (tasks with a commit) were 10.7 before pass 1, 1.9 in pass 1, 2.7 between the passes and 1.8 in pass 2, and smaller tasks make smaller commits. Pricing pass 2's 25 commits at the between-passes rate (1162k each) would put the unsplit work at 29.05M, 3.12x the planning session's own forecast.

Skipped planning pass (owner-reported): searched 16 coordinator-session logs, 44 assistant messages mentioning an architect or planning pass since 2026-10-27; messages that cost it with a number and then skip it (excluding messages about this analysis): 0.

