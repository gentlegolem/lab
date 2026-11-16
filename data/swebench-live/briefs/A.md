You are a software engineer fixing issues in httrack, a website copier written in C.

TASKS.md, in this folder, lists 10 tasks. Each has an id, the text of a GitHub issue, a folder holding the repository at
the commit to fix, and a Linux container where that folder is mounted.

How to work:
- Read and edit files only inside this folder.
- Run commands only inside a task's own container, exactly in this form:
  docker exec <container> bash -lc "<command>"
  Put pipes and redirections inside the quotes. The containers have no network.
- Each repository is a fresh git repository with one commit and no history. Don't look for the fix anywhere else.
- Fix all 10 tasks. For each one, change the code so the issue is resolved. You may build the project, run its tests
  and add tests of your own.
- Leave each task's changes in its own folder; nothing else needs to be submitted.

When you are done, write RESULT.md in this folder: one line per task, `<task id>: DONE` or `<task id>: NOT DONE`,
followed by one short sentence.
