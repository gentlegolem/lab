# What we learned: MegaJam 2026 (Back to One, UE 5.9)

Written by the jam lead session at the end of the jam (Nov 16 2026) for future Unreal work and for the studio's general lessons.

The jam ran Nov 12 00:00 to Nov 15 20:59 ET. We submitted build m35h, main `484badbe`, a 487 MB zip.

Over the jam, main got:
- 1,783 commits, 333 of them merges
- 44 numbered builds in `Build/Out`
- 224 playtest scenarios
- 253 ledger rows

Part A is engine-neutral and short enough to merge into a general lessons file. Part B is Unreal-specific and points to the docs and skills that hold the details.

---

## A. Running a multi-agent game jam (engine-neutral)

**What worked**

- **Lanes, one writer per file.**
  - Each task ran as a subagent in its own git worktree and branch (`<repo>-wt-<lane>`), owning named folders.
  - The lead merged `--no-ff` into main.
  - Binary assets never had two writers, so we never had to hand-merge one.
  - Text conflicts came up on shared lists (the credits CSV, the ledger) and were easy: keep both lines.
- **Briefs as the only context.** Every lane brief stated:
  - the goal and the owner's exact words
  - the owned folders and what not to touch
  - the test that proves it is done
  - the disk rules
  - "report, don't widen scope"

  Lanes that got a vague brief came back with work we had to redo.
- **Numbered builds plus one "Latest".**
  - Every packaged build got a label (m7 … m35h) and a `BUILD.txt` with its commit, map list, sourced-content share and zip size.
  - One folder, `<local path>`, was what the owner played.
  - In the last 24 h every good build was also packaged as a submittable `--final` fallback, so a known-good zip always existed.
- **A bot test suite against the packaged exe.**
  - JSON scenarios drive the real game over a local port: key presses, console commands, waits, asserts on log lines, screenshots.
  - Four test slots ran in parallel, each holding a hardlinked copy of the build.
  - Per merge we ran the touched scenarios plus 4 canaries (smoke, menu, real game flow, tutorial). The full suite (~120 jobs, about 25 min on 4 slots) ran every 4 merges and before any Latest or final.
  - Each failure got one solo rerun before anyone looked at it.
- **Repro first, then fix.** For a late bug, we first wrote a scenario that fails on the shipped build, then fixed it and showed the same scenario passing.
  - Example: the Arcade car smash, which took about 20 min from the owner's report to a green build.
  - That one scenario was the proof the owner and HQ needed. Asserting on log lines ("impact (real)" before "PRINT") plus an 8-frame sheet made it unambiguous.
- **Batch the owner's notes per build.**
  - The owner played a build and wrote notes, e.g. "F4 notes": numbered, one line each.
  - We grouped them into one or two lanes and shipped them together in the next build, instead of one build per note.
- **Text first.** Levels, tuning, cast, routes and credits lived in JSON or CSV, read at runtime or built into assets by scripts. Most changes were text diffs that merge and review cleanly.
- **A ledger row per task** (start, end or cut), with commit hashes and token counts. It made the devlog and the end-of-jam numbers free.

**What wasted time**

- **Disk.**
  - A lane script copied an empty `$SRC`, which copied the whole Git Bash root (173 GB) onto C:, and C: fell to 1.7 GB free.
  - About 25 lane zips (~470 MB each) were made for nothing.
  - Fixes:
    - Big files go on the data drive.
    - Scripts refuse an empty source, a root source or a system-drive target.
    - Lanes run tests on their staged build in place; we zip only merged builds.
    - Builds stop below 60 GB free.
- **Worktree cost.** Each worktree was about 6 GB, plus about 2.6 GB of compiler cache. 41 worktrees used about 92 GB of cache alone. Reuse a small pool of worktrees instead of one per task.
- **Stale tests counted as bugs.**
  - About a third of late "failures" were scenarios that still expected old text or timing.
  - Fix: when a lane changes visible text or timing, the same lane updates the scenarios that assert on it.
- **Two agents on one shared resource.**
  - A test driver from an old lane kept running on another session's port.
  - I once killed every game process, not just mine.
  - Filter processes by exe path and port; never kill by name.
- **Wrong clock times in reports.** Run `date` before writing any time.
- **A first diagnosis given as fact.** My first cause for the Arcade bug was wrong; the repro showed the real one. Say "suspected" until a log shows it.

**Do differently next time**

- Keep a pool of 4-6 worktrees and recycle them, not one per task.
- Make the scenario update part of every lane that changes UI text.
- Decide the "final build" cut-off and the fallback rule on day 1, not day 3.

---

## B. Unreal Engine 5.9 specifics

### Build, cook, package

- **Editor compile, incremental (~1 min):**
  ```
  python tools/run_low.py --log <log> -- "cmd /c <UE>\Engine\Build\BatchFiles\Build.bat MegaJam2026Editor Win64 Development -Project=<worktree>\MegaJam2026.uproject -WaitMutex -NoHotReloadFromIDE"
  ```
  Use `run_low.py` so it runs at low priority and checks disk space. The toolchain is VS 2022 Build Tools 17.14 (MSVC 14.44) with Windows SDK 10.0.26100; see `AGENTS.md` rule 5.
- **Package:**
  ```
  python tools/package/jam_package.py build --project MegaJam2026.uproject --engine <UE> --label <label> --build-tag <NNN> [--final] [--own-char] [--no-latest] [--skip-editor-build] --maps "<list>"
  ```
  - An incremental package with a warm DDC takes **1-2 min**. A cold first cook took about 30 min.
  - It writes `BUILD.txt`, the zip and the 1 GB check.
  - Only one UAT can run at a time per engine, so we retry on "conflicting instance".
  - Full guide: `Skills/packaging/SKILL.md`.
- **Checks before a merge:**
  - `tools/leveleditor/gen_schema.py --check`
  - `python -m unittest discover -s tests`
  - the credits generator `--check`
  - the touched scenarios
- **Port probe:** `tools/package/port_probe.py --expect none <exe>` confirms a final build opens no sockets.
- **Git Bash path mangling:** a bare `/x` argument becomes a drive path. Prefix commands with `MSYS_NO_PATHCONV=1` or quote the whole command line (`AGENTS.md` rule 6).

### Headless editor Python and commandlets

- `tools/art/import_sourced.py run <script.py>` runs editor Python with no renderer. Imports, `set_editor_property` and saves work.
- **`recompile_material` fails headless.** Call `mat.modify()` and save instead; the cook compiles the shaders.
- Live editor work goes through the MCP server, one call at a time; see `Skills/unreal-mcp-basics/SKILL.md`. Long jobs use the `start_*` / `*_status` pairs because tool calls time out at about 120 s.

### Text-first content

- Each scene is a JSON spec in `Content/Protos/BackToOne/Spec/` (pieces, keys, sounds, freezes, cast), read at runtime.
- Tuning lives in `Tuning.json`, bot routes in `Spec/Routes`, credits come from CSV through `gen_credits.py`, and the level editor schema is generated.
- See `Skills/text-first-content/SKILL.md` and `docs/level-authoring.md`.
- In practice, nearly all late fixes were C++ or JSON. No `.uasset` merge was ever needed.

### Art by script (Blender to UE)

- Props, the Chase street kit and characters were built by Blender Python under `SourceArt/Blender/<Set>/`: `make_*.py` makes the meshes, and `ue_build_*.py` imports them, builds materials and saves.
- Rebuilding from the script is the fix for any broken asset.
- Generated and sourced content is tracked in `Content/Art/ASSETS.csv`. `--final` refuses any shipped file under `Art/Sourced` that no row declares (`tools/art/assets_check.py`).

### Animation and retargeting

- Mixamo clips were imported onto the Y Bot skeleton and retargeted to the UE5 Manny with an IK Rig auto setup: `SourceArt/Blender/Characters/ue_mixamo_import.py`.
- The final build uses our own clip (`A_BTO_BracedHang_Own`, `--own-char`).
- We kept motion matching (GASP) out: it picks poses from history, so rewind and replay can't reproduce a take. Clips only, started from recorded state. See `docs/art/gasp-plan.md`.

### What broke, and the fix

| Symptom | Cause | Fix |
|---|---|---|
| Grey grid squares on the Chase street, packaged only | Materials used on Instanced Static Meshes lacked `used_with_instanced_static_meshes`. The editor sets it on the fly; the cook falls back to `WorldGridMaterial` | Set the flag in the build script (`ue_ism_flag.py`, `ue_build_kit.py`). Check every packaged log for 0 "missing usage flag" / "Please fix material usage" lines |
| Arcade car landed with no smash | A deferred impact was checked only while the set clock ran forward. A car let go while the set was held landed with the clock stopped | Check pending impacts every tick (`BTOSet.cpp`, `FirePendingImpacts`). Repro scenario `arcade_heldletgo_packaged` (branch `night3g/arcfx`) |
| A click on an F3 NUDGE button closed the game (the owner saw it as a crash) | The menu's own click handling also took clicks meant for the F3/F4 dev overlays, so the click reached QUIT | The menu leaves clicks and keys to the F3/F4 overlays while they are open (`4704176`) |
| C: filled up during packaging | Staging, the DDC and lane copies on the system drive | DDC on `<local path>` (`UE-LocalDataCachePath`); builds and lanes on D: (`AGENTS.md` rule 7) |

### Disk costs (per worktree)

- About 6 GB of working copy, plus about 2.6 GB of shared-PCH build cache once compiled.
- A packaged build is about 0.78 GB unzipped and about 0.49 GB zipped.
- Test slots are hardlinked to the build (`tools/safe_copy.py runarea`), so they cost almost nothing.

### Do differently next time (UE)

- Set the material usage flags (ISM, skeletal mesh, Niagara) in every material build script from the start, and fail the package step on any usage-flag line in the cook log.
- Warm the DDC on the data drive before day 1, and keep one UAT queue for all lanes.
- Keep runtime data as JSON from the start; it was the best decision of the jam.
- Use fewer, recycled worktrees, because the compiler cache per worktree adds up fast.
