<!-- 1072 agent runs, 1055 tasks, 2026-10-10 to 2026-11-04 -->

### Finding 1

#### 1a. Era comparison by task class (all models in the era)

| Task class | Era | n tasks | Median tokens | Median agent-min | Median calls | Restarted | Rework sub-score (100 = none seen) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| feature in existing system | A: all Opus (before 2026-10-26) | 412 | 208k | 11.5 | 60 | 5 (1%) | median 71, 86% below 100 (n 121) |
| feature in existing system | B: model per task (from 2026-10-26) | 188 | 249k | 21.9 | 76 | 1 (1%) | median 98, 62% below 100 (n 153) |
| asset generation / art | A: all Opus (before 2026-10-26) | 51 | 243k | 15.5 | 62 | 0 (0%) | median 94, 67% below 100 (n 6) |
| asset generation / art | B: model per task (from 2026-10-26) | 6 | 272k | 23.3 | 68 | 0 (0%) | median 100, 33% below 100 (n 6) |
| tooling / editors | A: all Opus (before 2026-10-26) | 47 | 334k | 22.6 | 76 | 3 (6%) | median 95, 57% below 100 (n 28) |
| tooling / editors | B: model per task (from 2026-10-26) | 28 | 191k | 15.2 | 54 | 0 (0%) | median 99, 58% below 100 (n 24) |
| polish / UI | A: all Opus (before 2026-10-26) | 29 | 246k | 15.4 | 77 | 0 (0%) | median 23, 100% below 100 (n 6) |
| polish / UI | B: model per task (from 2026-10-26) | 27 | 150k | 13.2 | 45 | 0 (0%) | median 97, 65% below 100 (n 23) |
| fix pass | A: all Opus (before 2026-10-26) | 53 | 138k | 11.4 | 61 | 0 (0%) | median 67, 74% below 100 (n 19) |
| fix pass | B: model per task (from 2026-10-26) | 22 | 112k | 9.2 | 37 | 1 (5%) | median 96, 53% below 100 (n 19) |
| research | A: all Opus (before 2026-10-26) | 67 | 158k | 9.6 | 50 | 0 (0%) | median 93, 67% below 100 (n 9) |
| research | B: model per task (from 2026-10-26) | 28 | 129k | 10.8 | 38 | 0 (0%) | median 99, 57% below 100 (n 14) |
| engine verify | A: all Opus (before 2026-10-26) | 45 | 175k | 21.6 | 96 | 1 (2%) | median 9, 94% below 100 (n 16) |
| engine verify | B: model per task (from 2026-10-26) | 10 | 180k | 15.7 | 80 | 0 (0%) | median 64, 75% below 100 (n 4) |
| docs | A: all Opus (before 2026-10-26) | 5 | 99k | 4.7 | 22 | 0 (0%) | median 82, 50% below 100 (n 4) |
| docs | B: model per task (from 2026-10-26) | 9 | 217k | 26.6 | 36 | 0 (0%) | median 100, 25% below 100 (n 4) |
| ALL | A: all Opus (before 2026-10-26) | 709 | 206k | 12.5 | 61 | 9 (1%) | median 71, 80% below 100 (n 209) |
| ALL | B: model per task (from 2026-10-26) | 319 | 213k | 17.7 | 59 | 2 (1%) | median 98, 60% below 100 (n 248) |

#### 1b. Inside era B: Sonnet vs Opus by task class

| Task class | Model | n tasks | Median tokens | Median agent-min | Restarted | Rework sub-score (100 = none seen) |
| --- | --- | --- | --- | --- | --- | --- |
| feature in existing system | Sonnet | 103 | 154k | 13.6 | 1 (1%) | median 96, 64% below 100 (n 85) |
| feature in existing system | Opus | 85 | 556k | 41.8 | 0 (0%) | median 99, 60% below 100 (n 68) |
| asset generation / art | Sonnet | 4 | 197k | 14.1 | 0 (0%) | median 98, 50% below 100 (n 4) |
| tooling / editors | Sonnet | 20 | 161k | 12.4 | 0 (0%) | median 99, 56% below 100 (n 18) |
| tooling / editors | Opus | 8 | 542k | 38.3 | 0 (0%) | median 96, 67% below 100 (n 6) |
| polish / UI | Sonnet | 23 | 143k | 13.2 | 0 (0%) | median 97, 62% below 100 (n 21) |
| polish / UI | Opus | 4 | 371k | 20.2 | 0 (0%) | median 98, 100% below 100 (n 2) |
| fix pass | Sonnet | 21 | 110k | 8.5 | 0 (0%) | median 96, 56% below 100 (n 18) |
| research | Sonnet | 10 | 60k | 2.7 | 0 (0%) | median 98, 67% below 100 (n 3) |
| research | Opus | 18 | 218k | 18.2 | 0 (0%) | median 99, 55% below 100 (n 11) |
| engine verify | Sonnet | 10 | 180k | 15.7 | 0 (0%) | median 64, 75% below 100 (n 4) |
| docs | Opus | 9 | 217k | 26.6 | 0 (0%) | median 100, 25% below 100 (n 4) |
| ALL | Sonnet | 191 | 148k | 12.7 | 1 (1%) | median 96, 61% below 100 (n 153) |
| ALL | Opus | 128 | 467k | 35.2 | 1 (1%) | median 99, 58% below 100 (n 95) |

Model mix: era A Opus 670 of 709, Sonnet 39 of 709; era B Opus 128 of 319, Sonnet 191 of 319.

