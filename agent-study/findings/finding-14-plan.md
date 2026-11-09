# PLAN: Make a Lisp in JavaScript, steps 0 to A

Architect's plan for `TASK.md`. It holds the forecasts, the shared contract every task codes against, and one brief per
task. Units: agent-minutes (first to last message of one run, waits included) and reported tokens (input + output +
cache-write; cache reads not counted).

## 1. Unsplit forecast

UNSPLIT: 45 agent-min, 330k reported

Basis: about 180 tool calls at about 12 s each, plus test waits. Reported tokens are roughly everything that enters the
context once: system prompt (15k), guide, pseudocode and test reads (40k), about 2,000 lines of code written plus
thinking (both counted twice, as output and then as cache-write, 130k), test output (50k) and edit round-trips (50k).
That passes Sonnet's 200k window, so one auto-compaction adds about 45k (summary, rebuilt prefix, files re-read).

## Shared contract (all tasks read this section)

Why it exists: once the shared modules exist, each step file is a standalone program. T1 builds and tests the modules,
then three agents write the step files at the same time against this contract. **T1 implements it exactly. Later tasks
use it and don't change it.** Any detail T1 adds goes in the header comment of `impls/js/types.js`.

**Rules for every task**
- Run tests from this folder: `node runner/run.js step4` (prints failures, then a JSON line; exit 0 = no hard failure).
- The runner runs the deferrable and optional sections as hard tests. Only tests after a `;>>> soft=True` line are soft.
  So every Deferrable item in the guide is required.
- Node 24, no npm packages, CommonJS `require`.
- Read the guide by line range (given in each brief); don't read all 1,745 lines.
- Don't look for other mal implementations, on the web or on disk.

**File ownership** (a task edits only the files it owns)

| Files | T1 | T2, T3 and T4 (running at the same time) | T5 |
|---|---|---|---|
| `impls/js/types.js reader.js printer.js io.js env.js core.js` | writes | frozen: read only, bugs go to the notes | owns |
| `impls/js/step0_repl.js step1_read_print.js` | writes | n/a | owns |
| `impls/js/step2_eval.js` to `step6_file.js` | n/a | T2 | owns |
| `impls/js/step7_quote.js step8_macros.js` | n/a | T3 | owns |
| `impls/js/core_ext.js step9_try.js stepA_mal.js` | n/a | T4 | owns |
| `notes/T2.md`, `notes/T3.md`, `notes/T4.md` | n/a | each task writes its own | reads |

Frozen-file rule (T2, T3 and T4): if a failure comes from a frozen module, don't edit the module and don't work around it
in a step file (no overriding of core functions in the REPL env). Add one entry to your notes file: one line of mal that
shows the bug, what it prints, what the test expects, the suspected file and fix. Then move on. T5 fixes these.

**Data model (`types.js`)**

| mal | JavaScript |
|---|---|
| nil, true, false | `null`, `true`, `false` |
| integer | JS number (`/` truncates toward zero) |
| string | JS string |
| keyword | JS string starting with `"ʞ"` followed by the name (printer shows `:name`; `string?` is false for it) |
| symbol | `MalSymbol` with field `name` |
| list, vector | `MalList` and `MalVector`, each with `items` (JS array) and `meta` (default `null`) |
| hash-map | `MalMap` with `map` (JS `Map` keyed by mal strings or keywords, insertion order) and `meta` |
| native function | plain JS function taking mal values as positional arguments; may carry a `meta` property |
| user function | `MalFn` with `ast`, `params` (array of `MalSymbol`), `env`, `fn` (JS function `(...args)` that runs the body; the step file sets it), `isMacro` (false), `meta` (null) |
| atom | `MalAtom` with field `value` |
| thrown mal value | `MalError` (extends `Error`), field `value` holds the mal value |

`types.js` also exports: `sym(name)`, `keyword(name)` (returns a keyword unchanged), `isSymbol`, `isKeyword`, `isString`,
`isList`, `isVector`, `isSeq` (list or vector), `isMap`, `isFn` (native function or non-macro `MalFn`), `isMacro`,
`callFn(f, args)` (`f.fn(...args)` for a `MalFn`, `f(...args)` otherwise) and `equals(a, b)` (mal `=`: a list equals a
vector with equal elements; maps compare keys and values).

**Modules**
- `reader.js`: `read_str(text)` returns a mal value, or nil (`null`) when the text holds no form (blank or comment only).
  Unbalanced input (list, vector, map, string) throws an `Error` whose message contains `EOF`. Reader macros: `'x` gives
  `(quote x)`, `` `x `` gives `(quasiquote x)`, `~x` gives `(unquote x)`, `~@x` gives `(splice-unquote x)`, `@x` gives
  `(deref x)`, `^m x` gives `(with-meta x m)`.
- `printer.js`: `pr_str(value, readably)`. With `readably`, strings are quoted with `\"`, `\\` and `\n` escaped. Functions
  print as `#<function>`, atoms as `(atom <value>)`.
- `io.js`: the only I/O path. `readline(prompt)` writes the prompt with `fs.writeSync(1, ...)`, then returns the next line
  without its newline, or `null` at end of input. It reads fd 0 with `fs.readSync` into one module-level buffer, so the
  REPL loop and the mal `readline` function (step A) share the input and never lose any. Treat an error with code `EOF`
  (Windows pipes) as end of input and retry on `EAGAIN`. Decode input and encode output as UTF-8. `print(line)` writes
  `line + "\n"` with `fs.writeSync(1, ...)`. Never use `process.stdin`, the `readline` module or `console.log`: with
  stdin as a pipe they hang or reorder output, and the runner then waits 20 s for the next prompt.
- `env.js`: `new Env(outer = null, binds = [], exprs = [])`. `binds` are `MalSymbol`s, and `&` binds the next symbol to a
  `MalList` of the remaining exprs. `set(key, value)` (key: `MalSymbol` or name string) returns `value`. `get(key)`
  returns the value from the nearest env that has it, or `undefined` if none does (`null` is the real value nil).
- `core.js` (T1): `ns`, an object from name to native function, for the functions of steps 4 to 8: `+ - * / < <= > >= =
  list list? empty? count pr-str str prn println read-string slurp atom atom? deref reset! swap! cons concat vec nth first
  rest`. `count` of nil is 0. `nth` out of range throws `Error("nth: index out of range")`. `first` of nil or empty is
  nil, `rest` of nil or empty is `()`. `prn` and `println` print through `io.print`. `swap!` uses `callFn`.
- `core_ext.js` (T4): `ns` with the functions of steps 9 and A: `throw apply map nil? true? false? symbol? symbol keyword
  keyword? vector vector? sequential? hash-map map? assoc dissoc get contains? keys vals readline time-ms meta with-meta
  fn? macro? string? number? seq conj`.

**Step files**: each is a REPL. It creates `repl_env = new Env()`, sets `core.ns` into it (steps 4 on; steps 9 and A also
set `core_ext.ns`), adds its mal-defined functions (`not`, `load-file`, `cond`, `*host-language*` as the guide says), then
loops. Each turn it calls `io.readline("user> ")` and exits on `null`; otherwise it does `io.print(rep(line))`. On an
error it prints `Error: ` followed by `pr_str(e.value, true)` for a `MalError`, or `e.message` otherwise. A missing symbol
throws `Error("'" + name + "' not found")`. `catch*` binds `e.value` for a `MalError`, else `e.message` as a mal string.
From step 6 on, a file also defines `eval` and `*ARGV*` (a `MalList` of `process.argv.slice(3)`), and
`node stepX.js file args...` runs `(load-file "file")` and then exits. Step 2 on: the `DEBUG-EVAL` print
(`EVAL: ` + `pr_str(ast, true)`), which steps 3, 7 and 8 test.

## 2. Tasks

Shape: **T1 -> {T2, T3, T4} -> T5**. T2, T3 and T4 run at the same time and share no editable file.

| Task | Depends on | Owns | Must pass (0 failing) | Estimate |
|---|---|---|---|---|
| T1 Foundation | none | types, reader, printer, io, env, core.js; step0, step1 | step0, step1 | 15 agent-min, 125k |
| T2 Evaluator 2-6 | T1 | step2 to step6 files, notes/T2.md | step2 to step6, except recorded frozen-module bugs | 11 agent-min, 110k |
| T3 Quote and macros | T1 | step7, step8 files, notes/T3.md | step7, step8, except recorded frozen-module bugs | 9 agent-min, 90k |
| T4 Try, step A, core_ext | T1 | core_ext.js, step9, stepA files, notes/T4.md | step9, stepA, except recorded frozen-module bugs | 13 agent-min, 130k |
| T5 Integration | T2, T3, T4 | every file | step0 to stepA, all at 0 failing | 9 agent-min, 85k |

### T1 brief: Foundation

ESTIMATE: 15 agent-min, 125k reported

You are building the shared layer of a Make a Lisp interpreter in JavaScript (Node 24, no npm packages), plus the first
two step files. Read `TASK.md`, then the "Shared contract" section of `PLAN.md`. Three agents will code against it in
parallel as soon as you finish, so implement it exactly: same names, fields, return values and error messages.

Build, in `impls/js/`: `types.js`, `reader.js`, `printer.js`, `io.js`, `env.js`, `core.js`, `step0_repl.js` and
`step1_read_print.js`.

- Read `process/guide.md` lines 145-510 (general hints, steps 0 and 1 with their Deferrable section: strings,
  nil/true/false, keywords, vectors, hash-maps, comments, the reader macros and unbalanced-input errors). Also read
  `process/step0_repl.txt`, `process/step1_read_print.txt` and `runner/run.js` (how prompts and output are matched).
- For `core.js` read the function descriptions in the guide: lines 797-868 (step 4), 990-1062 (step 6: read-string,
  slurp, atoms), 1162-1170 and 1267-1281 (step 7: cons, concat, vec) and 1379-1404 (step 8: nth, first, rest). The core
  listing at the end of `process/stepA_mal.txt` is a summary.
- Step 0 is the stub REPL. In step 1, READ is `read_str` and PRINT is `pr_str(x, true)`, both going through `io.js`.
- The I/O rules in the contract are there because the runner drives the REPL through pipes on Windows. Follow them first,
  and check `node runner/run.js step0` before you write the reader.
- Done when `node runner/run.js step0` and `node runner/run.js step1` show 0 failing tests. Also check `env.js` and every
  `core.js` function with a few `node -e` one-liners (no new files). Build values with `read_str` and print them with
  `pr_str`. Cover `&` rest binding, a missing key returning `undefined`, list/vector equality, and `swap!` with a native
  function and with a hand-made `MalFn` whose `fn` is a JS function.
- Don't create step2 or later files; other agents own them. Report what passes and any detail you added to the contract
  (also written in the header of `types.js`).

### T2 brief: Evaluator, steps 2 to 6

ESTIMATE: 11 agent-min, 110k reported

You are writing step files of a Make a Lisp interpreter in JavaScript: `step2_eval.js`, `step3_env.js`,
`step4_if_fn_do.js`, `step5_tco.js` and `step6_file.js` in `impls/js/`. The shared modules (`types`, `reader`,
`printer`, `io`, `env`, `core`) are built, tested and frozen. Read `TASK.md`, the "Shared contract" section of `PLAN.md`
(file ownership, data model, REPL loop, error format) and the header of `impls/js/types.js`, then skim the modules.

- Guide: `process/guide.md` lines 511-1104 (steps 2 to 6, every Deferrable section included), and the pseudocode
  `process/step2_eval.txt` to `process/step6_file.txt`. `diff` between successive files shows what each step adds.
- Build each file by copying the previous one and extending it. Step 2: eval of symbols, lists, vectors and maps, plus
  the `DEBUG-EVAL` print. Step 3: `def!`, `let*`. Step 4: `do`, `if`, `fn*` returning a `MalFn`, `core.ns`, `not` in mal.
  Step 5: the TCO loop. Step 6: `eval`, `load-file`, `*ARGV*`, the command-line file mode.
- Done when `node runner/run.js step2` to `step6` each show 0 failing tests. The one exception is a failure you traced to
  a frozen module and recorded in `notes/T2.md` under the frozen-file rule in the contract.
- You own only those five files and `notes/T2.md`. Two other agents are writing `step7` to `stepA` and `core_ext.js` at
  the same time; don't touch them. Report the JSON result line of each step and your notes entries.

### T3 brief: Quote and macros, steps 7 and 8

ESTIMATE: 9 agent-min, 90k reported

You are writing `step7_quote.js` and `step8_macros.js` in `impls/js/` of a Make a Lisp interpreter in JavaScript. The
shared modules are built, tested and frozen. Read `TASK.md`, the "Shared contract" section of `PLAN.md` and the header
of `impls/js/types.js`, then skim the modules (`core.js` already has `cons`, `concat`, `vec`, `nth`, `first`, `rest` and
the atom functions).

- Another agent is writing `step6_file.js` at the same time, so write `step7_quote.js` from `process/step7_quote.txt`,
  which holds the whole program (TCO eval, `def!`, `let*`, `do`, `if`, `fn*`, `eval`, `load-file`, `*ARGV*`, `not`,
  `DEBUG-EVAL`). Then copy it to `step8_macros.js` and extend it.
- Guide: `process/guide.md` lines 870-1104 (TCO and step 6, which step 7 must also have) and 1105-1404 (steps 7 and 8
  with their Deferrable sections: quasiquote on vectors with `vec`, `defmacro!`, `cond`). Pseudocode:
  `process/step7_quote.txt` and `process/step8_macros.txt`.
- Done when `node runner/run.js step7` and `node runner/run.js step8` show 0 failing tests. The one exception is a failure
  you traced to a frozen module and recorded in `notes/T3.md` under the frozen-file rule in the contract.
- You own only those two files and `notes/T3.md`; other agents are writing the other step files right now. Report the
  JSON result line of each step and your notes entries.

### T4 brief: Try, step A and the rest of core

ESTIMATE: 13 agent-min, 130k reported

You are writing `core_ext.js`, `step9_try.js` and `stepA_mal.js` in `impls/js/` of a Make a Lisp interpreter in
JavaScript. The shared modules are built, tested and frozen. Read `TASK.md`, the "Shared contract" section of `PLAN.md`
and the header of `impls/js/types.js`, then skim the modules.

- `core_ext.js` exports `ns` with the step 9 and step A functions listed in the contract. Guide: `process/guide.md` lines
  1405-1716 (steps 9 and A, Deferrable sections included); the function semantics are in those lines. `readline` must use
  `io.readline` (the step A test prints a `mal-user> ` prompt and sends `"hello"`). `with-meta` returns a copy and never
  changes its argument; for a native function, wrap it. Check `core_ext.js` with `node -e` one-liners before the step
  files.
- Another agent is writing `step8_macros.js` at the same time, so write `step9_try.js` from `process/step9_try.txt`,
  which holds the whole program. Read `process/guide.md` lines 870-1404 only where the pseudocode is unclear (TCO, step 6
  file mode, quasiquote, macros, `cond`). Steps 9 and A set both `core.ns` and `core_ext.ns` in the REPL env. Then copy
  it to `stepA_mal.js` and extend it (`*host-language*`, startup banner). Interop such as `js-eval` is optional and
  untested.
- Done when `node runner/run.js step9` and `node runner/run.js stepA` show 0 failing tests. The one exception is a failure
  you traced to a frozen module and recorded in `notes/T4.md` under the frozen-file rule in the contract.
- You own only those three files and `notes/T4.md`; other agents are writing step2 to step8 right now. Report the JSON
  result line of each step and your notes entries.

### T5 brief: Integration

ESTIMATE: 9 agent-min, 85k reported

All the files of a Make a Lisp interpreter in JavaScript exist in `impls/js/`. Your job is to make every step pass. You
now own every file there. Read `TASK.md`, the "Shared contract" section of `PLAN.md`, and `notes/T2.md`, `notes/T3.md`,
`notes/T4.md` (bugs earlier agents found in the shared modules but were not allowed to fix).

- Run all eleven steps first: `for s in step0 step1 step2 step3 step4 step5 step6 step7 step8 step9 stepA; do node
  runner/run.js $s | tail -1; done`.
- Fix each recorded bug where it lives (in the module, not in a step file), keeping the contract. Then fix whatever still
  fails, using the guide sections for that step (step anchors in `process/guide.md`: step0 214, step1 263, step2 511,
  step3 603, step4 726, step5 870, step6 969, step7 1105, step8 1282, step9 1405, stepA 1553).
- A fix in a shared module can break another step, so re-run all eleven at the end.
- Done when all eleven steps show 0 failing tests (soft failures are allowed). Report the final JSON line of each step
  and what you changed.

## 3. Split forecast

| | Reported tokens | Agent-minutes |
|---|---|---|
| T1 | 125k | 15 |
| T2 | 110k | 11 |
| T3 | 90k | 9 |
| T4 | 130k | 13 |
| T5 | 85k | 9 |
| **Total** | **540k** | **57** |

Wall-clock: T1 (15) + the slowest of T2, T3, T4 (13) + T5 (9) = **37 minutes**.

Each task's estimate is a fixed part (15k system prompt, 3k brief, 15-25k of guide and code reads) plus the work part
(code and thinking counted twice, test output, edit round-trips). No task's context nears the 200k window, so no
compaction is expected. The main risk is T5: its size grows with the number of bugs that frozen modules pass to it
(about 5 expected). With 15 bugs it would be about 120k and 15 minutes.

## 4. Architect cost

ARCHITECT: 13 agent-min, 125k reported

## 5. Expected saving

| | Unsplit | Split (tasks) | Saving | Split + architect | Saving |
|---|---|---|---|---|---|
| Reported tokens | 330k | 540k | -210k (+64%) | 665k | -335k |
| Agent-minutes | 45 | 57 | -12 (+27%) | 70 | -25 |
| Wall-clock minutes | 45 | 37 | +8 (-18%) | 50 | -5 |

Why: in the studio's units the unsplit run's big cost, re-reading a growing context, is a cache read and isn't counted.
Each fresh agent pays again for the system prompt, the orientation reads and the integration work. The split only gains
wall-clock time, by building the three groups of step files at the same time once the shared layer exists. What it
buys: no task over about 130k (no compaction), smaller units to retry, and about 8 minutes off the build.

Alternative if tokens matter more than wall-clock: three sequential tasks (steps 0-4 with all shared modules, then 5-8,
then 9-A, each owning every file it needs). About 400k reported, 44 agent-min, 44 wall-clock minutes. That is 140k
cheaper than this plan, roughly the same time as unsplit, and needs no integration task.
