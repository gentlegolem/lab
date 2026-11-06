<!-- cut 2026-11-03T19:00:00.000Z, ledger sha256 7bcbc93575d6, 1062 agent runs, 1045 tasks, 2026-10-10 to 2026-11-03 -->

### Finding 9

Runs with a final report: 1010 of 1061 transcript runs (2026-10-10 to 2026-11-03). Claim = a non-negated sentence in the final report matching the pattern; a sentence with a negation or a to-do word ("not", "until", "owner to verify") counts as hedged, not as a claim.

**A. What the reports claimed**

| role | reports | claims "done" | claims "landed" | claims "checks" | claims "tests" | claims "engine" | partial / handed back |
| --- | --- | --- | --- | --- | --- | --- | --- |
| game agent | 474 | 346 (73%) | 263 (55%) | 281 (59%) | 63 (13%) | 59 (12%) | 86 |
| general agent | 394 | 313 (79%) | 34 (9%) | 170 (43%) | 87 (22%) | 42 (11%) | 44 |
| shared-tools agent | 142 | 108 (76%) | 82 (58%) | 51 (36%) | 27 (19%) | 5 (4%) | 29 |
| all | 1010 | 767 (76%) | 379 (38%) | 502 (50%) | 177 (18%) | 106 (10%) | 159 |

**B. Claim vs ground truth** (held = the check below agrees; "checkable" excludes runs before the land log starts, 2026-10-24)

| claim | ground truth used | claims | checkable | held | rate | game agent: held/checkable | general agent: held/checkable | shared-tools agent: held/checkable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| landed | land log has a landed entry for the branch | 379 | 331 | 319 | 96% | 242/247 | 0/4 | 77/80 |
| checks | land log landed entry (gate = check.js on each game touched) | 502 | 193 | 193 | 100% | 162/162 | 0/0 | 31/31 |
| tests | a check/test/soak command in the run (weak) | 177 | 177 | 161 | 91% | 62/63 | 78/87 | 21/27 |
| engine | an engine tool call in the run (weak) | 106 | 106 | 101 | 95% | 58/59 | 40/42 | 3/5 |

Reports that say they did not verify in the engine (hedged): 323 of 1010; reports claiming engine verification with no engine tool call in the run: 5 of 106.
Reports that claim landing but whose branch has no landed entry (checkable runs only): 12. Reports that never mention landing although the branch landed: 8 of 327 landed.
Of 319 reports that claim landing and did land, 268 (84%) landed without a check-failed or conflict entry first (the claim was true, but the gate refused 51 of them at least once on the way).

**C. Did the work stay done? (3 days after the task's last commit, on the files the task touched)**

Strict = any later fix-like commit touched a file of the task; material = those fix lines were >= 25% of the task's lines on the same files; reverted = a later Revert commit. Only runs whose task has attributable commits and a closed window (the newest tasks are excluded). "outside" = the fix commit sits outside every subagent run window (made by the owner or a main session, est.: all commits share one author, so authorship cannot tell).

| group | runs with commits | closed window | no later fix (strict) | material rework | reverted | with a fix made outside an agent window |
| --- | --- | --- | --- | --- | --- | --- |
| game agent, all reports | 303 | 247 | 52 (21%) | 95 (38%) | 0 (0%) | 0 (0%) |
| general agent, all reports | 49 | 47 | 8 (17%) | 31 (66%) | 0 (0%) | 0 (0%) |
| shared-tools agent, all reports | 81 | 66 | 40 (61%) | 5 (8%) | 0 (0%) | 6 (9%) |
| all reports | 433 | 360 | 100 (28%) | 131 (36%) | 0 (0%) | 6 (2%) |
| reports claiming "landed" | 308 | 239 | 83 (35%) | 60 (25%) | 0 (0%) | 6 (3%) |
| reports claiming "checks pass" | 230 | 182 | 45 (25%) | 67 (37%) | 0 (0%) | 6 (3%) |
| reports claiming engine verification | 42 | 38 | 9 (24%) | 16 (42%) | 0 (0%) | 0 (0%) |
| reports hedging the engine ("not seen") | 154 | 129 | 44 (34%) | 33 (26%) | 0 (0%) | 1 (1%) |
| reports with no landed or checks claim | 79 | 77 | 11 (14%) | 46 (60%) | 0 (0%) | 0 (0%) |

By task class (strict, 3 days; classes with fewer than 8 closed runs are pooled in "other"):

| task class | runs with commits | closed window | no later fix (strict) | material rework | reverted | with a fix made outside an agent window |
| --- | --- | --- | --- | --- | --- | --- |
| asset generation / art | 14 | 12 | 4 (33%) | 2 (17%) | 0 (0%) | 0 (0%) |
| engine verify | 15 | 12 | 3 (25%) | 6 (50%) | 0 (0%) | 0 (0%) |
| feature in existing system | 258 | 223 | 54 (24%) | 83 (37%) | 0 (0%) | 4 (2%) |
| fix pass | 33 | 30 | 11 (37%) | 11 (37%) | 0 (0%) | 1 (3%) |
| polish / UI | 29 | 8 | 0 (0%) | 6 (75%) | 0 (0%) | 0 (0%) |
| research | 22 | 19 | 8 (42%) | 2 (11%) | 0 (0%) | 0 (0%) |
| tooling / editors | 55 | 49 | 17 (35%) | 19 (39%) | 0 (0%) | 1 (2%) |
| other (pooled) | 7 | 7 | 3 (43%) | 2 (29%) | 0 (0%) | 0 (0%) |

**C2. Did the work stay done? (7 days after the task's last commit, on the files the task touched)**

Strict = any later fix-like commit touched a file of the task; material = those fix lines were >= 25% of the task's lines on the same files; reverted = a later Revert commit. Only runs whose task has attributable commits and a closed window (the newest tasks are excluded). "outside" = the fix commit sits outside every subagent run window (made by the owner or a main session, est.: all commits share one author, so authorship cannot tell).

| group | runs with commits | closed window | no later fix (strict) | material rework | reverted | with a fix made outside an agent window |
| --- | --- | --- | --- | --- | --- | --- |
| game agent, all reports | 303 | 125 | 18 (14%) | 59 (47%) | 0 (0%) | 0 (0%) |
| general agent, all reports | 49 | 46 | 8 (17%) | 34 (74%) | 0 (0%) | 0 (0%) |
| shared-tools agent, all reports | 81 | 28 | 17 (61%) | 2 (7%) | 0 (0%) | 0 (0%) |
| all reports | 433 | 199 | 43 (22%) | 95 (48%) | 0 (0%) | 0 (0%) |
| reports claiming "landed" | 308 | 84 | 29 (35%) | 23 (27%) | 0 (0%) | 0 (0%) |
| reports claiming "checks pass" | 230 | 91 | 18 (20%) | 38 (42%) | 0 (0%) | 0 (0%) |
| reports claiming engine verification | 42 | 32 | 4 (13%) | 19 (59%) | 0 (0%) | 0 (0%) |
| reports hedging the engine ("not seen") | 154 | 58 | 17 (29%) | 20 (34%) | 0 (0%) | 0 (0%) |
| reports with no landed or checks claim | 79 | 72 | 10 (14%) | 46 (64%) | 0 (0%) | 0 (0%) |
