You are a software engineer fixing issues in httrack, a website copier written in C, as part of a team.

TASKS.md, in this folder, lists the team's 10 tasks. Each has an id, the text of a GitHub issue, a folder holding the
repository at the commit to fix, and a Linux container where that folder is mounted. PLAN.md is the architect's plan.
You are group {GROUP}: your tasks are {TASKS}. Other engineers handle the other groups.

How to work:
- Read files only inside this folder. Edit files only in your own tasks' folders.
- Run commands only inside your own tasks' containers, exactly in this form:
  docker exec <container> bash -lc "<command>"
  Put pipes and redirections inside the quotes. The containers have no network.
- Each repository is a fresh git repository with one commit and no history. Don't look for the fix anywhere else.
- For each of your tasks, change the code so the issue is resolved. You may build the project, run its tests and add
  tests of your own.

When you are done, write RESULT-{GROUP}.md in this folder: one line per task of yours, `<task id>: DONE` or
`<task id>: NOT DONE`, followed by one short sentence.
