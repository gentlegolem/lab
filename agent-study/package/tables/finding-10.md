<!-- cut 2026-11-06T00:26:16.000Z, ledger sha256 c1f5b5b64977, 1098 agent runs, 1090 tasks, 2026-10-10 to 2026-11-05 -->

### Finding 10

Fix applied from 2026-11-04T01:00Z. Tasks of 5+ tool calls with a minutes estimate and measured minutes.

| Set | n | Bias as written (median actual / quote, IQR) | Error as written (median abs) | Error if x0.34 applied | n with a recorded figure | Error as recorded by the ledger |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline: estimate line required, before the fix | 181 | 0.37 (0.22-0.53) | 63% | 45% | 181 | 63% |
| After the fix | 26 | 0.27 (0.20-0.43) | 74% | 38% | 26 | 38% |
| All tasks before the fix (any estimate) | 313 | 0.38 (0.23-0.58) | 63% | 46% | 279 | 63% |

Check that the ledger applied the factor (after the fix): median recorded / written = 0.34 (n 26; 0.34 expected).

Pre-registered test (fixed before the data came in: findings/finding-10-prereg.md). After minus before, median error with x0.34 (before: applied afterwards; after: as the ledger recorded), session-clustered 95% interval (whole sessions drawn 2000 times).
- Primary, tasks started from 2026-11-06T00:26Z (not seen when the test was written): too few after-fix tasks for the test: 0 in 0 sessions (the minimum is 30 in 3).
- Secondary, every task after the fix: too few after-fix tasks for the test: 26 in 2 sessions (the minimum is 30 in 3).
- Secondary, Opus only, every task after the fix: too few after-fix tasks for the test: 10 in 2 sessions (the minimum is 15 in 3).
- Secondary, Sonnet only, every task after the fix: too few after-fix tasks for the test: 16 in 2 sessions (the minimum is 15 in 3).

Where the after-fix tasks come from: 2 sessions, first to last task 1.6 days apart.

| Median quote / actual by model (min) | Opus n | Opus quote | Opus actual | Sonnet n | Sonnet quote | Sonnet actual |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline: estimate line required, before the fix | 43 | 45.0 | 15.7 | 138 | 35.0 | 13.4 |
| After the fix | 10 | 120.0 | 32.6 | 16 | 37.5 | 8.9 |

| Mix (could a change in task mix explain a movement?) | tasks | Sonnet share | Opus share | Feature-in-existing-system share | Median quote (min) | Median actual (min) |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline: estimate line required, before the fix | 181 | 76% | 24% | 50% | 40.0 | 13.8 |
| After the fix | 26 | 62% | 38% | 50% | 55.0 | 17.2 |

