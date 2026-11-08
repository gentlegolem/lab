<!-- cut 2026-11-03T19:00:00.000Z, ledger sha256 c1f5b5b64977, 1062 agent runs, 1054 tasks, 2026-10-10 to 2026-11-03 -->

### Finding 1

#### 1a. Era comparison by task class (all models in the era)

| Task class | Era | n tasks | Median tokens | Median agent-min | Median calls | Restarted | Rework sub-score (100 = none seen) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| feature in existing system | A: all Opus (before 2026-10-26) | 412 | 208k | 11.5 | 60 | 5 (1%) | median 71, 85% below 100 (n 121) |
| feature in existing system | B: model per task (from 2026-10-26) | 185 | 267k | 23.1 | 78 | 1 (1%) | median 98, 63% below 100 (n 158) |
| asset generation / art | A: all Opus (before 2026-10-26) | 51 | 243k | 15.5 | 62 | 0 (0%) | median 92, 60% below 100 (n 5) |
| asset generation / art | B: model per task (from 2026-10-26) | 6 | 272k | 23.3 | 68 | 0 (0%) | median 100, 33% below 100 (n 6) |
| tooling / editors | A: all Opus (before 2026-10-26) | 52 | 347k | 22.4 | 75 | 0 (0%) | median 83, 68% below 100 (n 34) |
| tooling / editors | B: model per task (from 2026-10-26) | 29 | 207k | 15.5 | 61 | 0 (0%) | median 99, 56% below 100 (n 27) |
| polish / UI | A: all Opus (before 2026-10-26) | 30 | 254k | 15.9 | 78 | 0 (0%) | median 60, 100% below 100 (n 7) |
| polish / UI | B: model per task (from 2026-10-26) | 26 | 146k | 13.1 | 51 | 0 (0%) | median 99, 60% below 100 (n 25) |
| fix pass | A: all Opus (before 2026-10-26) | 53 | 138k | 11.4 | 61 | 0 (0%) | median 72, 81% below 100 (n 21) |
| fix pass | B: model per task (from 2026-10-26) | 22 | 112k | 9.2 | 37 | 0 (0%) | median 96, 60% below 100 (n 20) |
| research | A: all Opus (before 2026-10-26) | 67 | 158k | 9.6 | 50 | 0 (0%) | median 93, 56% below 100 (n 9) |
| research | B: model per task (from 2026-10-26) | 28 | 129k | 10.8 | 38 | 0 (0%) | median 99, 64% below 100 (n 14) |
| engine verify | A: all Opus (before 2026-10-26) | 45 | 175k | 21.6 | 96 | 1 (2%) | median 9, 94% below 100 (n 16) |
| engine verify | B: model per task (from 2026-10-26) | 10 | 180k | 15.7 | 80 | 0 (0%) | median 64, 75% below 100 (n 4) |
| docs | A: all Opus (before 2026-10-26) | 5 | 99k | 4.7 | 22 | 0 (0%) | median 82, 50% below 100 (n 4) |
| docs | B: model per task (from 2026-10-26) | 9 | 217k | 26.6 | 36 | 0 (0%) | median 100, 25% below 100 (n 4) |
| ALL | A: all Opus (before 2026-10-26) | 715 | 208k | 12.8 | 61 | 6 (1%) | median 71, 81% below 100 (n 217) |
| ALL | B: model per task (from 2026-10-26) | 316 | 217k | 18.1 | 61 | 1 (0%) | median 98, 61% below 100 (n 259) |

#### 1b. Inside era B: Sonnet vs Opus by task class

| Task class | Model | n tasks | Median tokens | Median agent-min | Restarted | Rework sub-score (100 = none seen) |
| --- | --- | --- | --- | --- | --- | --- |
| feature in existing system | Sonnet | 98 | 157k | 14.4 | 1 (1%) | median 97, 62% below 100 (n 86) |
| feature in existing system | Opus | 87 | 556k | 41.8 | 0 (0%) | median 99, 64% below 100 (n 72) |
| asset generation / art | Sonnet | 4 | 197k | 14.1 | 0 (0%) | median 98, 50% below 100 (n 4) |
| tooling / editors | Sonnet | 20 | 161k | 12.4 | 0 (0%) | median 99, 55% below 100 (n 20) |
| tooling / editors | Opus | 9 | 567k | 39.3 | 0 (0%) | median 99, 57% below 100 (n 7) |
| polish / UI | Sonnet | 22 | 140k | 13.1 | 0 (0%) | median 99, 59% below 100 (n 22) |
| polish / UI | Opus | 4 | 371k | 20.2 | 0 (0%) | median 99, 67% below 100 (n 3) |
| fix pass | Sonnet | 21 | 110k | 8.5 | 0 (0%) | median 96, 58% below 100 (n 19) |
| research | Sonnet | 10 | 60k | 2.7 | 0 (0%) | median 98, 67% below 100 (n 3) |
| research | Opus | 18 | 218k | 18.2 | 0 (0%) | median 99, 64% below 100 (n 11) |
| engine verify | Sonnet | 10 | 180k | 15.7 | 0 (0%) | median 64, 75% below 100 (n 4) |
| docs | Opus | 9 | 217k | 26.6 | 0 (0%) | median 100, 25% below 100 (n 4) |
| ALL | Sonnet | 185 | 148k | 13.1 | 1 (1%) | median 97, 60% below 100 (n 158) |
| ALL | Opus | 131 | 467k | 35.0 | 0 (0%) | median 99, 61% below 100 (n 101) |

Model mix: era A Opus 676 of 715, Sonnet 39 of 715; era B Opus 131 of 316, Sonnet 185 of 316.

Idle pauses: 33 of 1061 runs paused over 15 minutes between two messages (9 over an hour). Median minutes per run from the transcript timestamps: 14.0 first to last message, 14.0 with every pause capped at 10 minutes (agent-minutes as used in the tables: 13.9).

Session-clustered 95% intervals (whole sessions drawn 2000 times): era B minus era A, median tokens per task, 9k (95% CI -236k to 121k; 1031 items, 14 sessions). Feature tasks in era B, Opus ÷ Sonnet median tokens, 3.55x (95% CI 0.84x to 4.78x; 185 items, 7 sessions).

