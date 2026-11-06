<!-- cut 2026-11-03T19:00:00.000Z, ledger sha256 7bcbc93575d6, 1062 agent runs, 1045 tasks, 2026-10-10 to 2026-11-03 -->

### Finding 1

#### 1a. Era comparison by task class (all models in the era)

| Task class | Era | n tasks | Median tokens | Median agent-min | Median calls | Restarted | Rework sub-score (100 = none seen) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| feature in existing system | A: all Opus (before 2026-10-26) | 412 | 208k | 11.5 | 60 | 5 (1%) | median 71, 85% below 100 (n 121) |
| feature in existing system | B: model per task (from 2026-10-26) | 182 | 261k | 22.2 | 78 | 1 (1%) | median 98, 62% below 100 (n 150) |
| asset generation / art | A: all Opus (before 2026-10-26) | 51 | 243k | 15.5 | 62 | 0 (0%) | median 94, 67% below 100 (n 6) |
| asset generation / art | B: model per task (from 2026-10-26) | 6 | 272k | 23.3 | 68 | 0 (0%) | median 100, 33% below 100 (n 6) |
| tooling / editors | A: all Opus (before 2026-10-26) | 47 | 334k | 22.6 | 76 | 3 (6%) | median 95, 57% below 100 (n 28) |
| tooling / editors | B: model per task (from 2026-10-26) | 29 | 207k | 15.5 | 61 | 0 (0%) | median 99, 54% below 100 (n 24) |
| polish / UI | A: all Opus (before 2026-10-26) | 29 | 246k | 15.4 | 77 | 0 (0%) | median 23, 100% below 100 (n 6) |
| polish / UI | B: model per task (from 2026-10-26) | 26 | 146k | 13.1 | 51 | 0 (0%) | median 98, 64% below 100 (n 22) |
| fix pass | A: all Opus (before 2026-10-26) | 53 | 138k | 11.4 | 61 | 0 (0%) | median 67, 74% below 100 (n 19) |
| fix pass | B: model per task (from 2026-10-26) | 22 | 112k | 9.2 | 37 | 1 (5%) | median 96, 53% below 100 (n 19) |
| research | A: all Opus (before 2026-10-26) | 67 | 158k | 9.6 | 50 | 0 (0%) | median 93, 67% below 100 (n 9) |
| research | B: model per task (from 2026-10-26) | 28 | 129k | 10.8 | 38 | 0 (0%) | median 99, 57% below 100 (n 14) |
| engine verify | A: all Opus (before 2026-10-26) | 45 | 175k | 21.6 | 96 | 1 (2%) | median 9, 94% below 100 (n 16) |
| engine verify | B: model per task (from 2026-10-26) | 10 | 180k | 15.7 | 80 | 0 (0%) | median 64, 75% below 100 (n 4) |
| docs | A: all Opus (before 2026-10-26) | 5 | 99k | 4.7 | 22 | 0 (0%) | median 82, 50% below 100 (n 4) |
| docs | B: model per task (from 2026-10-26) | 9 | 217k | 26.6 | 36 | 0 (0%) | median 100, 25% below 100 (n 4) |
| ALL | A: all Opus (before 2026-10-26) | 709 | 206k | 12.5 | 61 | 9 (1%) | median 71, 79% below 100 (n 209) |
| ALL | B: model per task (from 2026-10-26) | 313 | 216k | 17.7 | 61 | 2 (1%) | median 99, 59% below 100 (n 244) |

#### 1b. Inside era B: Sonnet vs Opus by task class

| Task class | Model | n tasks | Median tokens | Median agent-min | Restarted | Rework sub-score (100 = none seen) |
| --- | --- | --- | --- | --- | --- | --- |
| feature in existing system | Sonnet | 98 | 157k | 14.4 | 1 (1%) | median 96, 63% below 100 (n 83) |
| feature in existing system | Opus | 84 | 549k | 41.3 | 0 (0%) | median 99, 61% below 100 (n 67) |
| asset generation / art | Sonnet | 4 | 197k | 14.1 | 0 (0%) | median 98, 50% below 100 (n 4) |
| tooling / editors | Sonnet | 20 | 161k | 12.4 | 0 (0%) | median 99, 53% below 100 (n 17) |
| tooling / editors | Opus | 9 | 567k | 39.3 | 0 (0%) | median 99, 57% below 100 (n 7) |
| polish / UI | Sonnet | 22 | 140k | 13.1 | 0 (0%) | median 98, 60% below 100 (n 20) |
| polish / UI | Opus | 4 | 371k | 20.2 | 0 (0%) | median 98, 100% below 100 (n 2) |
| fix pass | Sonnet | 21 | 110k | 8.5 | 0 (0%) | median 96, 56% below 100 (n 18) |
| research | Sonnet | 10 | 60k | 2.7 | 0 (0%) | median 98, 67% below 100 (n 3) |
| research | Opus | 18 | 218k | 18.2 | 0 (0%) | median 99, 55% below 100 (n 11) |
| engine verify | Sonnet | 10 | 180k | 15.7 | 0 (0%) | median 64, 75% below 100 (n 4) |
| docs | Opus | 9 | 217k | 26.6 | 0 (0%) | median 100, 25% below 100 (n 4) |
| ALL | Sonnet | 185 | 148k | 13.1 | 1 (1%) | median 97, 60% below 100 (n 149) |
| ALL | Opus | 128 | 467k | 35.2 | 1 (1%) | median 99, 58% below 100 (n 95) |

Model mix: era A Opus 670 of 709, Sonnet 39 of 709; era B Opus 128 of 313, Sonnet 185 of 313.

