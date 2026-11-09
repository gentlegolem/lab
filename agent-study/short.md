> **DRAFT, not yet published.** Short version (2026-11-07) of the [full write-up](README.md). Numbers may still change
> before release.

# What one multi-agent coding studio measured about its own setup and its agents' claims

*[Jonathan Gauvin](https://www.linkedin.com/in/jonathangauvin), November 2026. Medians unless stated. Intervals are 95%, from drawing whole sessions 2,000 times. κ is agreement between two blind labellers beyond chance (1 is perfect, 0 is chance).*

<!-- OWNER'S VOICE: carried over unchanged from the full version. Rewrite in your own words before publishing. -->
I make games mostly on my own, across nine projects.

<!-- OWNER'S VOICE: both rubric reviewers ask for one line on who did what: what you designed and decided, what the agents ran and drafted. Write it yourself. -->
## The data
A coordinator agent splits the work, an architect agent plans large features, and specialist agents build in
separate git worktrees. Every change passes a landing gate, a script that merges it only if the automated checks
pass. The study
covers 1,062 subagent runs (1,054 tasks), 2026-10-10 to 2026-11-03 19:00 UTC: Claude Code transcripts, a cost ledger,
git history and the gate's log, from one studio, one operator and one PC. For scale, the studio's repo has 3,200+
commits across 9 game projects and 12 shared packages since Oct 7 (a later count, 2026-11-08). The main limit: era, task
mix and model changed together, and no task was replayed under a second condition.

## 1. Agents' reports against the record
The final reports of 1,010 runs, checked claim by claim
([section 8](README.md#8-a-first-measurement-how-often-done-held-up-package-finding-9)):

| Claim | Checked against | Held |
|---|---|---|
| Landed | the gate's log | 319 of 331 (96%; 92–99%) |
| Checks pass | the gate's verdict | 193 of 193 checkable; 309 more can't be checked (no gate run, or before its log began) |
| Tests pass / verified in the engine | a test command or engine call in the run | call made in 161 of 177 / 101 of 106 |

- **What the reports leave out:** the gate refused 51 runs at least once before they landed. Two blind model
  labellers read their reports: 10 of the 51 say so (20%; 7–41%). Of 51 runs that landed on the first try, none
  mentions a refusal. Agreement κ 0.89 ([finding 11](findings/finding-11.md)).
- **What agents changed after a failed check:** of 33 failures followed by edits, 14 fixed the code, 6 loosened a
  check or test (mostly a cast to the type checker's catch-all type), 6 updated a test to match intended behaviour,
  7 unclear ([finding 12](findings/finding-12.md); 33 cases, low confidence).
- **How well the claim patterns read:** blind labels of 375 sentences (κ 0.94) say a match is the claim 73–98% of
  the time, by kind. Only 12 of the 33 reports counted as contradicted made the claim (5 "landed", 7 "tests", 0
  "engine"): fewer false claims than the patterns showed. Some claims are missed ("committed and pushed"), so claim
  counts are floors ([check](findings/finding-9-claims.md)).

Agents see the gate's verdict before they write "landed", so the 96% shows that they relay the gate faithfully; it
doesn't test their own judgment.

## 2. Guardrails
The `sed -i` hook on synced source folders fired 70 times (34 real, 36 false alarms); other hooks refused 27 long
reads or dumps and 1 brief without an estimate line, and the gate refused 56 of 497 landing attempts for a failed
check. Blind labels of the refusals and what agents did next (κ 0.85): the false alarms (36 `sed -i`, 1 long read) are
calls a hook isn't meant to stop; of the 61 real hook refusals, agents did what the refusal asked in 51 and routed
around it in 2; none retried. After 12 long line-range refusals, 8 agents re-read with the tool the refusal names,
and 5 of them asked for at least 97% of the refused range: the rule held in form more than in effect
([finding 13](findings/finding-13.md)).

## 3. A planner's forecast against what it delivered
An architect pass split a feature into 15 tasks of about 150k tokens. The cost of the unsplit work (9.3M
plan-equivalent tokens: tokens plus 10% of cache reads, the context re-read each turn, as the planner priced its
plans) was forecast before it ran.

| | Forecast | Measured |
|---|---|---|
| The architect's own cost | 150–250k reported | 180k (0.56M plan-equivalent): accurate |
| The split tasks | 7.7M | 8.89M for 14 of 15: at least 15% over |
| Saving | 24%, then 17% once the plan was written | at most about 4% against the forecast |

The pass breaks even if the unsplit work would really have cost about 2% more than forecast (5–8% counting the 15th
task), and per-task forecasts here were off by 20–80%. So the promised saving didn't show, and whether the pass paid
for itself can't be told. A rule to test (n = 2): plan only when unsplit cost × an honest saving exceeds the
architect's cost; at 4%, the work must cost about 25 times the architect run.

## 4. A correction that was published but not applied
On Oct 26 the estimating guide published a measured minutes factor (×0.34), and agents were told to apply it. From
Oct 29 their quotes ran about 2.7× too high (n = 176), so it wasn't applied: applying it would have cut the median
error from 64% to 44%. The ledger now applies it when it records a run. The first 26 tasks after (2 sessions) are off
by 38%, against 45% for the earlier quotes with the factor applied afterwards: within the noise. The final test is
[pre-registered](findings/finding-10-prereg.md) (new tasks only, cut Nov 10, a fixed decision rule, at least 30 tasks
from 3 sessions); at today's cut it reports "too few tasks".

## 5. Token budgets and model choice
- **Budget:** tasks whose brief stated "≤ 150k" were small (63 tasks, 101k, 14% over), but unbudgeted tasks on the same
  nights were smaller (54, 90k, 7%), all in one session. Between the two planning passes, 14 budgeted briefs ran 164k
  smaller than the 479 others (43k–237k, 8 sessions). Confidence: low that the budget line made tasks small
  ([section 1](README.md#1-budgeted-tasks-were-small-and-so-were-unbudgeted-tasks-on-the-same-nights)).
- **Model per task:** after the default moved from Opus to Sonnet (Opus kept for design-heavy work), 4 of 8 task
  classes got 18–43% cheaper, but cost per task overall didn't move (+9k; −236k to +121k). Opus features cost 3.5× a
  Sonnet feature, an interval of 0.84–4.78× (7 sessions). Equal quality is not shown: the only quality signal, later fix
  commits on the same files, barely varies once the gate exists ([section 3](README.md#3-choosing-a-model-per-task-cheaper-on-half-the-task-classes-not-overall)).

## 6. A UI loop with a blind judge and a human who can overrule it
Each round: rules from comparable games, a layout score per device (PC, tablet, phone), HTML mockups instead of the
engine, a fresh blind judge model, then a human decision. 19 rounds: 13 clear wins, 3 small, 2 rejections, 1 mixed;
15 changes kept (79%), 2 of them by override. The judge cost about half the builder per round (55k vs 105k, n = 13).

- **Judge stability:** the first score files leaked which side was new. 4 rounds re-judged with clean blinding kept
  their direction, with smaller margins in 2. Three more fresh judges per round, with sides redrawn and 2 controls of
  identical sides (both said "same"), agreed in 3 of 4 rounds; in the 4th one judge ruled the change out of scope.
  None picked the other side ([judge check](findings/finding-4-judges.md)).
- **An override:** the judge called one change a small win, which the loop counts as a miss. The layout scores showed
  a trade: PC about 7% and tablet 3% better, phone 24% worse and failing the minimum-size gate. The change was kept and
  the phone layout fixed in the same session; phone ended better than before. A single verdict hid a fixable
  trade-off, which suggests a verdict per device and a repair attempt before a rejection (n = 1; the fix was scored
  by the tool, not re-judged).

## What couldn't be measured
The architect's memory cost, an "aim close to 150k" instruction and edits outside an agent's task: nothing recorded
them. Tagging each brief with its budget rule and source plan, and writing down the expected saving before each
planning pass, would.

## Related work
These questions have been studied with more control: developers' AI forecasts in a randomised trial (24% less time
expected, 19% more measured; [Becker et al., 2025](https://arxiv.org/abs/2507.09089)), agents cheating on tests that
conflict with the spec ([Zhong et al., 2025](https://arxiv.org/abs/2510.20270)), judge bias and judge panels
([Zheng et al., 2023](https://arxiv.org/abs/2306.05685); [Verga et al., 2024](https://arxiv.org/abs/2404.18796)) and
multi-agent failure modes ([Cemri et al., 2025](https://arxiv.org/abs/2503.13657)). This note adds one working setup's
own records, not a new method ([more](README.md#related-work)).

<!-- OWNER'S VOICE: your research interest, carried over unchanged. Rewrite in your own words. -->
The agents' own forecasts were the least checked numbers in the system. That is the question I'd like to study: how
well agents' claims ("this will save X", "done") match what is measured.

<!-- OWNER'S VOICE: this whole section is about you. Facts from your CV added 2026-11-08 at your request (roles, titles, team size, degree; nothing private); the wording is still a draft. Rewrite it yourself. -->
## About me and the method
I'm a game engineer, in game development since 2004. At Eidos-Montréal I built game AI for the Tomb Raider games
(GOAP planning; boss, crowd and co-op AI) and Deus Ex: Mankind Divided, then led gameplay teams of 5–8 as technical
game director on Shadow of the Tomb Raider and Guardians of the Galaxy. As Senior Director of Engineering at Reflector
Entertainment, I led about 35 technical staff through Unknown 9: Awakening's launch on 5 platforms at once. I hold a
B.Eng. in automated manufacturing engineering. The studio runs its product work as closed loops, and this note is one
of them:
- **Estimates:** every task is estimated and measured; section 4 shows the correction step needs enforcing, not just
  publishing.
- **UI changes:** rules from comparable games, a check per device, cheap web mockups instead of the engine, a blind
  judge model, then a human decision that can override it.
- **Next:** tagging competitors' player feedback by feature, before and after their fixes.

<!-- OWNER'S VOICE: your proposal and motivation, carried over unchanged except one section number ("Why this matters to me" above all). Rewrite it yourself. -->
## What I'd study next
Across these findings, the least-checked signal is the agent's own claim, whether a forecast ("−24%", where at most
−4% showed), a report ("done"), or an instruction it was given ("apply the correction"). This sits between scalable oversight (can a cheaper checker
reliably supervise a stronger agent?) and AI control (which checks keep an agent safe when its own report is wrong?).
I'd like to measure it properly:
1. **Label claims against ground truth:** forecasts against measured cost, and "done" against git, the gate and later
   fixes, with the labelling method and agreement rates published. Section 1 is a first measurement of this, from
   one setup; the study would do it at scale, with more than one labeller.
2. **Compare the catchers by catch rate and cost:** automated checks, a fresh judge, guardrail hooks, a human. Include
   verdicts broken into parts, with a repair attempt before a rejection.
3. **Find leading signals** of a false claim: scope drift, skipped tests, context pressure, task size.
4. **Run the controlled versions:** the same plans with and without a budget, the same tasks on two models, and a
   period without the judge.

**Why this matters to me.** I've always been passionate about automation; it's why I studied automation engineering.
With AI, we can now automate so much, and I care that we do it ethically, legally and safely, in a way that keeps the
people using it informed. I believe there is a good future in a symbiosis between humans and AI, and I want to help us
work in that direction.

This note is the cheap half: what one setup already records. The expensive half needs controlled runs and more than
one operator.

## Data and code
The [full write-up](README.md) has each section with its limits. The [analysis package](package/) re-runs the tables
and prints aggregates only; the newer findings and their codebooks are in [`findings/`](findings/).
