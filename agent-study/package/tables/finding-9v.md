<!-- cut 2026-11-03T19:00:00.000Z, ledger sha256 c1f5b5b64977, 1062 agent runs, 1054 tasks, 2026-10-10 to 2026-11-03 -->

### Finding 9v

A check of the sentence patterns behind finding 9. For each claim kind, sentences from the final reports are drawn from five pools and two blind labellers answer one question per sentence (codebook: ../findings/finding-9-claims.md). The labellers see the sentence, its neighbours and the question, not the pool. "done" is left out: finding 9 reads it from the whole report, not from one sentence.

Pool sizes (sentences): landed: claim 629, contra 20, hedged 63, near 1350, other 53129; checks: claim 609, contra 0, hedged 47, near 2206, other 52329; tests: claim 188, contra 18, hedged 7, near 2179, other 52799; engine: claim 132, contra 5, hedged 364, near 2263, other 52427. Reports finding 9 counts as contradicted: landed 12, checks 0, tests 16, engine 5.

Cases for labelling written: 375.

Model labels (two blind labellers, A on Opus and B on Sonnet; codebook in ../findings/finding-9-claims.md): Cohen's kappa 0.94 on 375 cases, 363 agree. "Both say" counts a case only when A and B agree.

| group | cases | both say yes | both say no | both say unclear | labellers disagree | "yes": 95% CI (sessions drawn 2000 times) | held-out check: "yes" in half 1 / half 2 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| landed: flagged as a claim (sample) | 40 | 39 (98%) | 0 (0%) | 0 (0%) | 1 | 94% to 100% (8 sessions) | 98% / n/a |
| landed: flagged, in a report finding 9 counts as contradicted (all) | 20 | 11 (55%) | 9 (45%) | 0 (0%) | 0 | 21% to 94% (6 sessions) | 58% / 50% |
| landed: matched, but set aside by the negation rule (sample) | 15 | 6 (40%) | 9 (60%) | 0 (0%) | 0 | 11% to 69% (7 sessions) | 40% / n/a |
| landed: has a keyword, not matched (sample) | 20 | 9 (45%) | 11 (55%) | 0 (0%) | 0 | 11% to 61% (5 sessions) | 45% / n/a |
| landed: any other sentence (sample) | 10 | 0 (0%) | 10 (100%) | 0 (0%) | 0 | 0% to 0% (4 sessions, rough) | 0% / n/a |
| checks: flagged as a claim (sample) | 40 | 34 (85%) | 5 (13%) | 0 (0%) | 1 | 73% to 94% (9 sessions) | 85% / n/a |
| checks: matched, but set aside by the negation rule (sample) | 15 | 5 (33%) | 7 (47%) | 0 (0%) | 3 | 0% to 50% (7 sessions) | 33% / n/a |
| checks: has a keyword, not matched (sample) | 20 | 3 (15%) | 15 (75%) | 0 (0%) | 2 | 7% to 20% (6 sessions) | 15% / n/a |
| checks: any other sentence (sample) | 10 | 0 (0%) | 10 (100%) | 0 (0%) | 0 | 0% to 0% (4 sessions, rough) | 0% / n/a |
| tests: flagged as a claim (sample) | 40 | 29 (73%) | 10 (25%) | 0 (0%) | 1 | 59% to 86% (8 sessions) | 73% / n/a |
| tests: flagged, in a report finding 9 counts as contradicted (all) | 18 | 7 (39%) | 11 (61%) | 0 (0%) | 0 | 20% to 67% (6 sessions) | 50% / 30% |
| tests: matched, but set aside by the negation rule (sample) | 7 | 4 (57%) | 2 (29%) | 0 (0%) | 1 | 14% to 100% (4 sessions, rough) | 75% / 33% |
| tests: has a keyword, not matched (sample) | 20 | 3 (15%) | 16 (80%) | 0 (0%) | 1 | 0% to 25% (4 sessions, rough) | 15% / n/a |
| tests: any other sentence (sample) | 10 | 0 (0%) | 10 (100%) | 0 (0%) | 0 | 0% to 0% (4 sessions, rough) | 0% / n/a |
| engine: flagged as a claim (sample) | 40 | 35 (88%) | 3 (8%) | 0 (0%) | 2 | 82% to 93% (6 sessions) | 88% / n/a |
| engine: flagged, in a report finding 9 counts as contradicted (all) | 5 | 0 (0%) | 5 (100%) | 0 (0%) | 0 | 0% to 0% (4 sessions, rough) | n/a / 0% |
| engine: matched, but set aside by the negation rule (sample) | 15 | 0 (0%) | 15 (100%) | 0 (0%) | 0 | 0% to 0% (4 sessions, rough) | 0% / n/a |
| engine: has a keyword, not matched (sample) | 20 | 2 (10%) | 18 (90%) | 0 (0%) | 0 | 0% to 18% (5 sessions) | 10% / n/a |
| engine: any other sentence (sample) | 10 | 0 (0%) | 10 (100%) | 0 (0%) | 0 | 0% to 0% (5 sessions) | 0% / n/a |

Contradicted reports with at least one sentence both labellers call that claim: landed: 5 of 12; tests: 7 of 16; engine: 0 of 5.

