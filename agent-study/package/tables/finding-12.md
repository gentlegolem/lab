<!-- cut 2026-11-03T19:00:00.000Z, ledger sha256 c1f5b5b64977, 1062 agent runs, 1054 tasks, 2026-10-10 to 2026-11-03 -->

### Finding 12

Every check-failed entry in the land log, with the agent's own edits between it and the branch's next landing attempt (Edit / Write calls, plus shell commands that write files). Test files and gate or lint files are told apart by their paths. 4 check-failed entries have no local transcript.

| what the agent changed | check failures | next attempt landed | failed its checks again | hit a conflict | other or none |
| --- | --- | --- | --- | --- | --- |
| edited other files only | 17 | 15 | 1 | 1 | 0 |
| edited tests and other files | 2 | 2 | 0 | 0 | 0 |
| edited tests only | 2 | 1 | 0 | 1 | 0 |
| shell writes only | 12 | 9 | 2 | 1 | 0 |
| no edit seen before the next attempt | 19 | 10 | 6 | 3 | 0 |
| all | 52 | 37 | 9 | 6 | 0 |

Cases for labelling written: 33.

Model labels (two blind labellers, A on Opus and B on Sonnet; codebook in ../findings/finding-12.md): Cohen's kappa 1.00 on 33 cases, 33 agree. A third labeller (C, Opus, in a separate folder): kappa 0.96 with A, 0.96 with B. "Both say" counts a case only when A and B agree.

| group | cases | both say weakened | both say fixed | both say test-updated | labellers disagree | "weakened": 95% CI (sessions drawn 2000 times) | held-out check: "weakened" in half 1 / half 2 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| check failures with edits | 33 | 6 (18%) | 14 (42%) | 6 (18%) | 0 | 2% to 57% (7 sessions) | 21% / 16% |

