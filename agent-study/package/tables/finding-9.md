<!-- 1072 agent runs, 1055 tasks, 2026-10-10 to 2026-11-04 -->

### Finding 9

Runs with a final report: 1020 of 1071 transcript runs (2026-10-10 to 2026-11-04). Claim = a non-negated sentence in the final report matching the pattern; a sentence with a negation or a to-do word ("not", "until", "owner to verify") counts as hedged, not as a claim.

**A. What the reports claimed**

| role | reports | claims "done" | claims "landed" | claims "checks" | claims "tests" | claims "engine" | partial / handed back |
| --- | --- | --- | --- | --- | --- | --- | --- |
| game agent | 474 | 347 (73%) | 268 (57%) | 281 (59%) | 56 (12%) | 59 (12%) | 86 |
| general agent | 398 | 313 (79%) | 34 (9%) | 169 (42%) | 81 (20%) | 41 (10%) | 44 |
| shared-tools agent | 148 | 113 (76%) | 86 (58%) | 50 (34%) | 28 (19%) | 5 (3%) | 29 |
| all | 1020 | 773 (76%) | 388 (38%) | 500 (49%) | 165 (16%) | 105 (10%) | 159 |

**B. Claim vs ground truth** (held = the check below agrees; "checkable" excludes runs before the land log starts, 2026-10-24)

| claim | ground truth used | claims | checkable | held | rate | game agent: held/checkable | general agent: held/checkable | shared-tools agent: held/checkable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| landed | land log has a landed entry for the branch | 388 | 339 | 325 | 96% | 244/251 | 0/4 | 81/84 |
| checks | land log landed entry (gate = check.js on each game touched) | 500 | 234 | 193 | 82% | 162/192 | 0/6 | 31/36 |
| tests | a check/test/soak command in the run (weak) | 165 | 165 | 150 | 91% | 55/56 | 73/81 | 22/28 |
| engine | an engine tool call in the run (weak) | 105 | 105 | 100 | 95% | 58/59 | 39/41 | 3/5 |

Reports that say they did not verify in the engine (hedged): 324 of 1020; reports claiming engine verification with no engine tool call in the run: 5 of 105.
Reports that claim landing but whose branch has no landed entry (checkable runs only): 14. Reports that never mention landing although the branch landed: 7 of 332 landed.
Of 325 reports that claim landing and did land, 274 (84%) landed without a check-failed or conflict entry first (the claim was true, but the gate refused 51 of them at least once on the way).

**C. Did the work stay done? (3 days after the task's last commit, on the files the task touched)**

Strict = any later fix-like commit touched a file of the task; material = those fix lines were >= 25% of the task's lines on the same files; reverted = a later Revert commit. Only runs whose task has attributable commits and a closed window (the newest tasks are excluded). "outside" = the fix commit sits outside every subagent run window (made by the owner or a main session, est.: all commits share one author, so authorship cannot tell).

| group | runs with commits | closed window | no later fix (strict) | material rework | reverted | with a fix made outside an agent window |
| --- | --- | --- | --- | --- | --- | --- |
| game agent, all reports | 303 | 262 | 55 (21%) | 96 (37%) | 0 (0%) | 0 (0%) |
| general agent, all reports | 49 | 47 | 8 (17%) | 31 (66%) | 0 (0%) | 0 (0%) |
| shared-tools agent, all reports | 85 | 67 | 40 (60%) | 5 (7%) | 0 (0%) | 6 (9%) |
| all reports | 437 | 376 | 103 (27%) | 132 (35%) | 0 (0%) | 6 (2%) |
| reports claiming "landed" | 314 | 257 | 86 (33%) | 62 (24%) | 0 (0%) | 6 (2%) |
| reports claiming "checks pass" | 229 | 191 | 48 (25%) | 66 (35%) | 0 (0%) | 6 (3%) |
| reports claiming engine verification | 42 | 39 | 9 (23%) | 16 (41%) | 0 (0%) | 0 (0%) |
| reports hedging the engine ("not seen") | 155 | 135 | 45 (33%) | 33 (24%) | 0 (0%) | 1 (1%) |
| reports with no landed or checks claim | 78 | 76 | 11 (14%) | 46 (61%) | 0 (0%) | 0 (0%) |

By task class (strict, 3 days; classes with fewer than 8 closed runs are pooled in "other"):

| task class | runs with commits | closed window | no later fix (strict) | material rework | reverted | with a fix made outside an agent window |
| --- | --- | --- | --- | --- | --- | --- |
| engine verify | 15 | 12 | 3 (25%) | 6 (50%) | 0 (0%) | 0 (0%) |
| asset generation / art | 14 | 12 | 4 (33%) | 2 (17%) | 0 (0%) | 0 (0%) |
| feature in existing system | 261 | 228 | 54 (24%) | 83 (36%) | 0 (0%) | 4 (2%) |
| fix pass | 33 | 30 | 11 (37%) | 11 (37%) | 0 (0%) | 1 (3%) |
| polish / UI | 30 | 19 | 3 (16%) | 7 (37%) | 0 (0%) | 0 (0%) |
| research | 22 | 19 | 8 (42%) | 2 (11%) | 0 (0%) | 0 (0%) |
| tooling / editors | 55 | 49 | 17 (35%) | 19 (39%) | 0 (0%) | 1 (2%) |
| other (pooled) | 7 | 7 | 3 (43%) | 2 (29%) | 0 (0%) | 0 (0%) |

**C2. Did the work stay done? (7 days after the task's last commit, on the files the task touched)**

Strict = any later fix-like commit touched a file of the task; material = those fix lines were >= 25% of the task's lines on the same files; reverted = a later Revert commit. Only runs whose task has attributable commits and a closed window (the newest tasks are excluded). "outside" = the fix commit sits outside every subagent run window (made by the owner or a main session, est.: all commits share one author, so authorship cannot tell).

| group | runs with commits | closed window | no later fix (strict) | material rework | reverted | with a fix made outside an agent window |
| --- | --- | --- | --- | --- | --- | --- |
| game agent, all reports | 303 | 125 | 18 (14%) | 59 (47%) | 0 (0%) | 0 (0%) |
| general agent, all reports | 49 | 46 | 8 (17%) | 34 (74%) | 0 (0%) | 0 (0%) |
| shared-tools agent, all reports | 85 | 36 | 19 (53%) | 4 (11%) | 0 (0%) | 0 (0%) |
| all reports | 437 | 207 | 45 (22%) | 97 (47%) | 0 (0%) | 0 (0%) |
| reports claiming "landed" | 314 | 93 | 31 (33%) | 26 (28%) | 0 (0%) | 0 (0%) |
| reports claiming "checks pass" | 229 | 96 | 19 (20%) | 38 (40%) | 0 (0%) | 0 (0%) |
| reports claiming engine verification | 42 | 33 | 4 (12%) | 19 (58%) | 0 (0%) | 0 (0%) |
| reports hedging the engine ("not seen") | 155 | 62 | 19 (31%) | 20 (32%) | 0 (0%) | 0 (0%) |
| reports with no landed or checks claim | 78 | 72 | 10 (14%) | 46 (64%) | 0 (0%) | 0 (0%) |
