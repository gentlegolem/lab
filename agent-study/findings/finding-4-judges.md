# Finding 4, judge check: do fresh judges repeat the clean re-judge?

**Question.** Section 4's UI loop lets one fresh model judge decide each round. The 4 rounds re-judged with clean
blinding on Nov 4 kept their direction. Is one judge's verdict stable, or would another fresh judge on the same packet
decide differently?

**Data.** The 4 re-judge packets of Nov 4: per round, screenshots of both versions on PC, tablet and phone, the
automatic scores and the judge prompt, with page chrome masked the same way on both sides. The packets aren't in this
repo (they show the studio's game). `../package/rejudge/` holds the method that built them.

**Method.**
- 3 more fresh Opus judges per round (12 in all), each in its own folder, with the same prompt as on Nov 4.
- Which version is A was redrawn per judge by a seeded coin (seed 20261107 + judge number). The key stayed outside
  the folders.
- Control: 2 more judges got a packet whose two sides are the same screenshots. Both must answer "same", or the run is
  void.
- Fixed before any vote: a round's direction holds only when all 3 new judges pick the same winner as the Nov 4
  judge. 2 of 3 is "split", reported as no stable direction. No claim about the margin unless all 4 judges agree on it.

## Result (2026-11-07)

The control held: both judges answered "same" on all three devices.

| Round | Nov 4 judge | New judges, overall | Direction | Margin, all 4 judges | Per device, all 4 judges (PC / tablet / phone) |
|---|---|---|---|---|---|
| 1 | current better, small | current, current, current | holds (3 of 3) | 3 small, 1 clear | current 4 of 4 / current 4 of 4 / current 4 of 4 |
| 2 | proposal better, clear | proposal, proposal, proposal | holds (3 of 3) | 4 clear | proposal 4 of 4 / proposal 4 of 4 / proposal 4 of 4 |
| 3 | proposal better, small | proposal, proposal, proposal | holds (3 of 3) | 4 small | current 4 of 4 / proposal 4 of 4 / proposal 4 of 4 |
| 4 | proposal better, small | proposal, proposal, same | split (2 of 3) | 2 small, 1 clear, 1 same | same 4 of 4 / proposal 3 of 4 / proposal 3 of 4 |

- Not one of the 12 new votes picked the other side from the Nov 4 judge. In round 4 the third judge gave no win: it
  read the change as removing a choice from the player, which the prompt rules out of scope for a UX comparison.
- Round 3's split by device (PC prefers the current version, tablet and phone the proposal) came back in all 3 new
  judges. On Nov 4 it was one judge's reading; now it is 4 of 4.
- The margins match the Nov 4 re-judge more than the original verdicts: rounds 3 and 4 were "clear" in the original
  (leaky) judging, and the clean judges call round 3 small 4 of 4. Round 4's margin is mixed.

**Confidence: medium.** The direction is stable across 4 fresh judges in 3 of 4 rounds, and the control held. Only 4
rounds, one game and one model family. The judges share the prompt, so a flaw in the prompt would repeat in all of
them; agreement shows the verdict is repeatable, not that it is right for players.

## Limits

- Same packets, same prompt: this measures judge-to-judge noise, not whether the packets or the prompt are good.
- The judges are fresh Opus models, as on Nov 4. A different model might read the hard gates differently.
- The out-of-scope rule decided one vote. How often judges invoke it on other rounds isn't known.

Cost: 14 judges, about 65k to 72k tokens each (about 0.95M in all), 20 to 75 seconds each.
