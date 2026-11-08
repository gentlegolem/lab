<!-- cut 2026-11-03T19:00:00.000Z, ledger sha256 c1f5b5b64977, 1062 agent runs, 1054 tasks, 2026-10-10 to 2026-11-03 -->

### Finding 13

Every tool reply in which a guardrail hook refused a call, in subagent and main-session transcripts, with the next 3 tool calls the agent made after reading the refusal. "Auto" = a pattern on those calls; the model labels below judge the same cases.

| hook | refusals (main sessions) | auto: what the next calls did |
| --- | --- | --- |
| sed-i | 70 (11) | used the editing tool 42; other 18; rewrote the file from the shell 9; tried sed -i again 1 |
| estimate-line | 1 (0) | other 1 |
| output-cap | 27 (0) | narrowed the read 18; other 6; read it whole another way 3 |

Cases for labelling written: 98.

Long line-range refusals followed by a Read with offset and limit: 8 of 12; that Read asked for at most half the refused range in 2, and for at least 97% of it in 5.

Model labels (two blind labellers, A on Opus and B on Sonnet; codebook in ../findings/finding-13.md): Cohen's kappa 0.85 on 98 cases, 90 agree. "Both say" counts a case only when A and B agree.

| group | cases | both say complied | both say routed-around | both say retried | both say misfired | labellers disagree | "complied": 95% CI (sessions drawn 2000 times) | held-out check: "complied" in half 1 / half 2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sed-i | 70 | 31 (44%) | 1 (1%) | 0 (0%) | 36 (51%) | 2 | 24% to 63% (9 sessions) | 54% / 32% |
| estimate-line | 1 | 1 (100%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 | none (one session) | n/a / 100% |
| output-cap | 27 | 19 (70%) | 1 (4%) | 0 (0%) | 1 (4%) | 6 | 53% to 92% (4 sessions, rough) | 73% / 69% |

