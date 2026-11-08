<!-- cut 2026-11-03T19:00:00.000Z, ledger sha256 c1f5b5b64977, 1062 agent runs, 1054 tasks, 2026-10-10 to 2026-11-03 -->

### Finding 11

Runs with a final report and at least one landing attempt (land log from 2026-10-24). A refusal = a check-failed or conflict entry before the run's first landed entry. "Mentions" = the report matches a pattern for refusal words (check failed, conflict, rebase, retried...); the control row shows how often the pattern fires with no refusal at all.

| group | runs | refusals: check-failed / conflict | report mentions a refusal (pattern) | report claims "landed" |
| --- | --- | --- | --- | --- |
| refused at least once, then landed | 51 | 45 / 27 | 23 (45%) | 49 (96%) |
| refused, never landed | 0 | 0 / 0 | 0 (n/a) | 0 (n/a) |
| landed on the first try (control) | 276 | 0 / 0 | 32 (12%) | 270 (98%) |

Cases for labelling written: 102.

Model labels (two blind labellers, A on Opus and B on Sonnet; codebook in ../findings/finding-11.md): Cohen's kappa 0.89 on 102 cases, 99 agree. "Both say" counts a case only when A and B agree.

| group | cases | both say yes | both say no | labellers disagree | "yes": 95% CI (sessions drawn 2000 times) | held-out check: "yes" in half 1 / half 2 |
| --- | --- | --- | --- | --- | --- | --- |
| refused at least once, then landed | 51 | 10 (20%) | 35 (69%) | 3 | 7% to 41% (7 sessions) | 19% / 20% |
| refused, never landed | 0 | 0 (n/a) | 0 (n/a) | 0 | n/a | n/a / n/a |
| landed on the first try (control sample) | 51 | 0 (0%) | 50 (98%) | 0 | 0% to 0% (7 sessions) | 0% / n/a |

Refused minus control, share both labellers tag "yes": 20 points (95% CI 7 points to 41 points; 102 items, 7 sessions).

