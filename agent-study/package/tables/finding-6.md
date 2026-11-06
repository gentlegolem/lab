<!-- cut 2026-11-03T19:00:00.000Z, ledger sha256 7bcbc93575d6, 1062 agent runs, 1054 tasks, 2026-10-10 to 2026-11-03 -->

### Finding 6

| Set | n (tokens) | Tokens: actual / estimate, median (IQR) | n (minutes) | Minutes: actual / estimate, median (IQR) |
| --- | --- | --- | --- | --- |
| First sample, runs before 2026-10-22 (the x0.76 / x0.34 correction came from here) | 79 | 0.76 (0.64-0.93) | 79 | 0.34 (0.22-0.46) |
| Runs from 2026-10-22 on | 229 | 0.94 (0.58-1.55) | 229 | 0.40 (0.24-0.62) |
| Whole ledger, all tasks with an estimate | 308 | 0.86 (0.63-1.35) | 308 | 0.38 (0.23-0.58) |

| Task class (all dates) | n (tokens) | Tokens: actual / estimate, median (IQR) | n (minutes) | Minutes: actual / estimate, median (IQR) |
| --- | --- | --- | --- | --- |
| feature in existing system | 183 | 0.93 (0.67-1.51) | 183 | 0.38 (0.25-0.61) |
| polish / UI | 26 | 0.82 (0.71-0.95) | 26 | 0.46 (0.30-0.70) |
| docs | 12 | 1.01 (0.71-1.53) | 12 | 0.35 (0.15-0.50) |
| tooling / editors | 18 | 0.69 (0.40-1.23) | 18 | 0.22 (0.18-0.45) |
| engine verify | 16 | 0.59 (0.31-0.92) | 16 | 0.35 (0.28-0.39) |
| fix pass | 27 | 0.84 (0.58-1.25) | 27 | 0.45 (0.29-0.65) |
| research | 22 | 0.57 (0.40-1.08) | 22 | 0.32 (0.16-0.48) |

#### Estimate quality by period between process changes

| Period | n tok | Tokens bias (median a/e) | IQR width | Tokens median abs % error | Tokens over 2x the estimate | n min | Minutes bias | IQR width | Minutes median abs % error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0 before the ledger tool | 38 | 0.72 (0.64-0.83) | 0.19 | 30% | 0% | 38 | 0.36 (0.28-0.45) | 0.17 | 64% |
| P1 rolling ratios available, no fixed factor | 43 | 0.83 (0.63-0.99) | 0.36 | 20% | 0% | 43 | 0.32 (0.18-0.46) | 0.28 | 68% |
| P2 fixed factors published, line optional | 51 | 1.56 (0.80-3.61) | 2.81 | 80% | 43% | 51 | 0.61 (0.31-0.95) | 0.64 | 49% |
| P3 estimate line required | 176 | 0.88 (0.55-1.39) | 0.83 | 42% | 10% | 176 | 0.37 (0.22-0.53) | 0.31 | 64% |
| All | 308 | 0.86 (0.63-1.35) | 0.72 | 37% | 13% | 308 | 0.38 (0.23-0.58) | 0.35 | 63% |

#### Per week (UTC, weeks starting on the Monday)

| Period | n tok | Tokens bias (median a/e) | IQR width | Tokens median abs % error | Tokens over 2x the estimate | n min | Minutes bias | IQR width | Minutes median abs % error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| week of 2026-10-19 | 79 | 0.76 (0.64-0.93) | 0.29 | 25% | 0% | 79 | 0.34 (0.22-0.46) | 0.24 | 66% |
| week of 2026-10-26 | 194 | 0.86 (0.53-1.57) | 1.04 | 49% | 19% | 194 | 0.38 (0.24-0.60) | 0.37 | 63% |
| week of 2026-11-02 | 35 | 1.21 (1.00-1.47) | 0.48 | 34% | 6% | 35 | 0.49 (0.28-0.68) | 0.40 | 54% |

#### Mix per period (could a change in task mix explain the movement?)

| Period | tasks | Sonnet share | Opus share | Feature-in-existing-system share | Research + verify + tooling share | Median token estimate | Estimate line in the brief | Seeded ledger row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0 before the ledger tool | 38 | 0% | 100% | 87% | 8% | 140k | 0% | 0% |
| P1 rolling ratios available, no fixed factor | 43 | 56% | 44% | 49% | 19% | 120k | 5% | 0% |
| P2 fixed factors published, line optional | 51 | 31% | 69% | 82% | 6% | 400k | 100% | 0% |
| P3 estimate line required | 176 | 76% | 24% | 49% | 24% | 160k | 100% | 0% |

#### Same period, one slice at a time (holding model or class fixed; cells with 5 or more tasks; tokens a/e median, then minutes)

| Slice | P0 | P1 | P2 | P3 |
| --- | --- | --- | --- | --- |
| Opus | 0.72 / 0.36 (n 38) | 0.76 / 0.49 (n 19) | 2.50 / 0.69 (n 35) | 0.58 / 0.32 (n 43) |
| Sonnet | n 0 | 0.91 / 0.19 (n 24) | 0.83 / 0.48 (n 16) | 0.94 / 0.37 (n 133) |
| Feature in an existing system | 0.72 / 0.34 (n 33) | 0.86 / 0.21 (n 21) | 1.77 / 0.68 (n 42) | 1.02 / 0.37 (n 87) |
| Fix pass | n 0 | 0.80 / 0.45 (n 9) | n 1 | 0.98 / 0.40 (n 17) |

#### What the published factors would have done on later tasks (corrected estimate = estimate x 0.76 tokens, x 0.34 minutes)

| Set | n | Tokens: median abs % error raw | after x0.76 | Minutes: median abs % error raw | after x0.34 |
| --- | --- | --- | --- | --- | --- |
| P2 | 51 | 80% | 105% | 49% | 85% |
| P3 | 176 | 42% | 42% | 64% | 44% |
| P2+P3 | 227 | 45% | 50% | 62% | 50% |

