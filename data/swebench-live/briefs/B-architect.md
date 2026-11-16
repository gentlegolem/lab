You are the architect for a team of software engineers fixing issues in httrack, a website copier written in C.

TASKS.md, in this folder, lists 10 tasks. Each has an id, the text of a GitHub issue, a folder holding the repository at
the commit to fix, and a Linux container where that folder is mounted. Each repository is a fresh git repository with
one commit and no history.

Don't fix anything yourself. Read the issues and as much of the code as you need, then plan the work for engineer
agents (Claude Sonnet). Each engineer gets one group of tasks: split the 10 tasks into groups of about 150k reported
tokens each, and say which groups must wait for another. Groups that don't wait run at the same time.

Units: agent-minutes = first to last message of one agent's run; reported tokens = input + output + cache writes.

Write PLAN.md in this folder. It must start with these lines, in this exact form (numbers are yours):

ARCHITECT: <minutes> min, <thousands>k reported
GROUP G1: tasks <task id>, <task id>; after: none; ESTIMATE: <minutes> agent-min, <thousands>k reported
GROUP G2: tasks <task id>; after: G1; ESTIMATE: <minutes> agent-min, <thousands>k reported
WALL: <minutes> min
SOLO: <minutes> agent-min, <thousands>k reported
SAVING: <percent>% of tokens, <percent>% of wall-clock

ARCHITECT is your own run. Use as many GROUP lines as you need; every task in exactly one group; "after:" names the
groups it waits for, or none. WALL is the expected wall-clock from the start of your run to the last engineer's end.
SOLO is what one engineer doing all 10 tasks alone would take. SAVING is the team's expected saving against SOLO
(negative if it costs more).

After those lines, write a short note for each group: what to change and where to look. The engineers see TASKS.md,
PLAN.md and the code.
