> Short version (2026-11-20) of the [full write-up](README.md). Tests still running (findings 10 and 18) are marked in
> the text.

# What one multi-agent coding studio measured about its own setup and its agents' claims

*[Jonathan Gauvin](https://www.linkedin.com/in/jonathangauvin), November 2026. Medians unless stated. Intervals are 95%, from drawing whole sessions 2,000 times. κ is agreement between two blind labellers beyond chance (1 is perfect, 0 is chance).*

I'm a AAA game developer turned indie: I make games on my own and with veteran developers from several disciplines.

**Who did what.** I directed the agents and made the decisions. I compared two ways of working (one agent alone, or an
architect splitting the work into tasks of about 150k tokens), had the ledger and other features built, chose the tests
and their sizes, reviewed and tuned the agents' work, and directed the analysis, the drafts and the re-tests, including
an engine port ([finding 18](findings/finding-18-prereg.md), still running) and tasks each run in its own isolated
container ([finding 17](findings/finding-17-prereg.md)). The agents wrote the code, measured the token use, suggested improvements, and drafted the
documentation and this write-up.

## The data
A coordinator agent splits the work, an architect agent plans large features, and specialist agents build in
separate git worktrees; a landing gate merges only changes that pass the automated checks. Sections 1–6 cover 1,062
subagent runs (1,054 tasks), Oct 10 to Nov 3, 2026, from one studio, one operator and one PC. Era, task mix and model
changed together, no task was replayed, and nothing recorded the architect's memory cost or edits outside an agent's
task. Section 7 adds two pre-registered checks on later work.

## 1. Agents' reports against the record
The final reports of 1,010 runs, checked against the record (counts are floors: the claim patterns miss some, κ 0.94;
[check](findings/finding-9-claims.md), [details](README.md#8-a-first-measurement-how-often-done-held-up-package-finding-9)):

| Claim | Held |
|---|---|
| Landed (the gate's log) | 319 of 331 (96%; 92–99%) |
| Checks pass (the gate's verdict) | 193 of 193 checkable; 309 not checkable (no gate run, or before its log began) |
| Tests pass / verified in the engine | a test or engine call made in 161 of 177 / 101 of 106 |

- The gate refused 51 runs at least once before they landed; 10 of their reports say so (20%; 7–41%; blind labels,
  κ 0.89; [finding 11](findings/finding-11.md)).
- Of 33 failed checks followed by edits, 14 fixed the code, 6 loosened a check or test, 6 updated a test to intended
  behaviour and 7 are unclear ([finding 12](findings/finding-12.md); low confidence).

Agents see the gate's verdict before they write "landed", so the 96% is faithful relaying, not judgment.

## 2. Guardrails
Hooks refused 98 tool calls, 37 of them false alarms; the gate refused 56 of 497 landing attempts. Of the 61 real
refusals (blind labels, κ 0.85), agents did what the refusal asked in 51 and routed around it in 2; none retried. But
after 12 long line-range refusals, 5 of the 8 agents that re-read asked for at least 97% of the refused range:
compliance in form more than in effect ([finding 13](findings/finding-13.md)).

## 3. A planner's forecast against what it delivered
An architect pass split a feature into 15 tasks. In plan-equivalent tokens (tokens plus 10% of cache reads), the
unsplit work was forecast at 9.3M:

| | Forecast | Measured |
|---|---|---|
| The architect's own cost | 150–250k reported | 180k (0.56M plan-equivalent): accurate |
| The split tasks | 7.7M | 8.89M for 14 of 15: at least 15% over |
| Saving | 24%, then 17% once the plan was written | at most about 4% |

It breaks even if the unsplit work really cost about 2% more than forecast, and per-task forecasts were off by 20–80%:
whether it paid can't be told.

## 4. A correction that was published but not applied
On Oct 26 the estimating guide published a measured minutes factor (×0.34) for agents to apply. From Oct 29 their
quotes still ran about 2.7× too high (n = 176); applying it would have cut the median error from 64% to 44%. The
ledger now applies it itself; the [pre-registered](findings/finding-10-prereg.md) test of that fix is pending.

## 5. Token budgets and model choice
Tasks briefed "≤ 150k" were small (63, 101k), but unbudgeted tasks on the same nights, in one session, were smaller
(54, 90k): low confidence. Defaulting to Sonnet over Opus (kept for design-heavy work) made 4 of 8 task classes 18–43% cheaper, not the average
task (+9k; −236k to +121k), and equal quality isn't shown
([details](README.md#3-choosing-a-model-per-task-cheaper-on-half-the-task-classes-not-overall)).

## 6. A UI loop with a blind judge and a human who can overrule it
19 rounds of rules from comparable games, a layout score per device, HTML mockups, a fresh blind judge model and a
human decision kept 15 changes, 2 by override; the judge cost about half the builder (55k vs 105k, n = 13). After a
blinding leak, 4 re-judged rounds kept their direction, and fresh judges passing 2 identical-side controls agreed in 3
of 4 ([judge check](findings/finding-4-judges.md)). One "small win" hid a trade a per-device verdict shows: phone 24%
worse, PC about 7% and tablet 3% better; the phone was fixed and the change kept (n = 1; the fix was scored by the tool, not re-judged).

## 7. Two later checks: a game jam and issues the models hadn't seen
Both pre-registered in a tagged commit before any value was read or build ran: a 4-day game jam in Unreal Engine 5.9
(Nov 12–15; observational; 1,783 commits; [finding 16](findings/finding-16-prereg.md)), and ten SWE-bench-Live issues
from one C repository, filed in July 2026, after the models' training cutoff. Each was fixed by one agent (A) and by an
architect with four agent groups (B), then scored by the official evaluator ([finding 17](findings/finding-17-prereg.md)).

| | Game jam | Unseen issues | Oct–Nov runs |
|---|---|---|---|
| "Done" | 24% left alone for 3 days, 36% materially reworked (n = 50) | 15 of 20 not confirmed by the evaluator (75%) | 27%, 36% |
| Quote error, as quoted / with ×0.34 | 66% / 52% (n = 55) | 89–90% / 69–70% | 64% / 44% |
| Architect, B against A | not tested | 2 against 3 resolved (3 and 3 without build products); 39% cheaper in plan-equivalent tokens (6% forecast), 28% dearer in reported | split tasks at least 15% over |

Churn on the jam's files isn't proof of a wrong claim (the studio fixes forward); the evaluator is. All 213 jam tasks
with code, followed to the deadline, agree: half had a first fix within 6.1 hours, 16% were untouched after 3 days (12 still
watched; [finding 16b](findings/finding-16b-prereg.md)). B saved by re-reading about half the cached tokens of A's one long
session; its one-issue gap is test output left in its patch. **Limits:** one jam, read after the fact, its closed
windows mostly prototype work; one run per condition, on ten related issues from one repository, eight opened on one day.

## Related work
These questions have been studied with more control: AI forecasts in a randomised trial
([Becker et al., 2025](https://arxiv.org/abs/2507.09089)), agents cheating on tests that conflict with the spec
([Zhong et al., 2025](https://arxiv.org/abs/2510.20270)), judge bias and panels
([Zheng et al., 2023](https://arxiv.org/abs/2306.05685); [Verga et al., 2024](https://arxiv.org/abs/2404.18796)) and
multi-agent failures ([Cemri et al., 2025](https://arxiv.org/abs/2503.13657)). This note adds one setup's own
records, not a new method ([more](README.md#related-work)).

I want to study how to oversee many agents and people working in parallel on one project. Which checks catch an agent
that drifts off task, acts outside its mandate, or reports "done" when the work isn't? How often, and at what cost? In
this setup, the least-checked signal was the agent's own claim, so that is where I'd start.

## About me and the method
I'm a game engineer, in game development since 2004. At Eidos-Montréal I built game AI for the Tomb Raider games
(GOAP planning; boss, crowd and co-op AI) and Deus Ex: Mankind Divided, then led gameplay teams of 5–8 as technical
game director on Shadow of the Tomb Raider and Guardians of the Galaxy. From 2020 to 2022, as Senior Technical Director
at Three Little Monsters, a game outsourcing studio, I hired about 20 engineers and helped partner studios ship 6 games,
which showed me how many different studios work. As Senior Director of Engineering at Reflector Entertainment, I led
about 35 technical staff through Unknown 9: Awakening's launch on 5 platforms at once. I hold a B.Eng. in automated
manufacturing engineering. The studio runs its product work as closed loops, and this note is one of them:
- **Estimates:** every task is estimated and measured; section 4 shows the correction step needs enforcing, not just
  publishing.
- **UI changes:** rules from comparable games, a check per device, cheap web mockups instead of the engine, a blind
  judge model, then a human decision that can override it.
- **Next:** tagging competitors' player feedback by feature, before and after their fixes.

## What I'd study next
Across these findings, the least-checked signal is the agent's own claim, whether a forecast ("−24%", where at most
−4% showed), a report ("done"), or an instruction it was given ("apply the correction"). This sits between AI control
(which checks keep an agent safe when its own report is wrong?) and scalable oversight (can a cheaper checker reliably
supervise a stronger agent?).

My approach is a central system that holds a project's ideas, rules and features, and that people and agents consult
before they act: does this fit the project's goals? What could it affect? Who is already working on something
similar? Has this idea already been tried and ruled out? Guardrails, permissions and security rules live there too. I
call it a neural knowledge project. Each answer is a check, to be measured like the others.

I'd measure it in three steps, each pre-registered:
1. **Label claims against ground truth:** "done" against an evaluator, git and later fixes; forecasts against measured
   cost; with the labelling method and agreement rates published. Section 1 is a first measurement of this, from one
   setup; the study would do it at scale, with more than one labeller.
2. **Compare the catchers** (automated checks, a fresh judge model, hooks and permission rules, the system's answers,
   a human) by catch rate, false alarms and cost, on the same tasks with and without each one.
3. **Find leading signals** of a false claim: scope drift, skipped tests, context pressure, task size.

**Why this matters to me.** I've always been passionate about automation; it's why I studied automation engineering.
With AI, we can now automate so much, and I care that we do it ethically, legally and safely, in a way that keeps the
people using it informed. I believe there is a good future in a symbiosis between humans and AI, and I want to help us
work in that direction.

This note is the cheap half: what one setup already records. The expensive half needs controlled runs and more than
one operator.

## Data and code
The [full write-up](README.md) has each section with its limits. The [analysis package](package/) re-runs the tables
(aggregates only); [`findings/`](findings/) and [`data/`](../data/) hold the newer findings, codebooks, data and
scripts.
