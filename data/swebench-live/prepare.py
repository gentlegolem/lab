# SPDX-License-Identifier: MIT
"""Finding 17: turns the chosen tasks into the agents' task lists, and the evaluator's local dataset file.

    python -I prepare.py tasks   <parquet folder> <runs folder>   # kit/tasks.json + A/TASKS.md + B/TASKS.md
    python -I prepare.py evalset <parquet folder> <out.jsonl>      # every field of the chosen rows, for scoring only

`tasks` reads instance_id, base_commit, docker_image and problem_statement: the issue text is the only field an agent
sees (the benchmark's rule). `evalset` reads every field and is run only for the gold check and for scoring, never
while an agent is working.
"""
import json
import pathlib
import sys

import polars as pl

HERE = pathlib.Path(__file__).parent


def chosen() -> list[str]:
    rows = (HERE / "selection.tsv").read_text(encoding="utf-8").splitlines()[1:]
    return [r.split("\t")[0] for r in rows if r.strip()]


def load(folder: str, cols: list[str] | None) -> pl.DataFrame:
    ids = chosen()
    f = pathlib.Path(folder) / "c-00000-of-00001.parquet"  # every chosen task is in the C split
    df = pl.read_parquet(f, columns=cols).filter(pl.col("instance_id").is_in(ids))
    if df.height != len(ids):
        raise SystemExit(f"found {df.height} of {len(ids)} chosen tasks in {f}")
    order = {k: i for i, k in enumerate(ids)}
    return df.with_columns(pl.col("instance_id").replace_strict(order).alias("_o")).sort("_o").drop("_o")


def tasks(folder: str, runs: str) -> None:
    df = load(folder, ["instance_id", "base_commit", "docker_image", "problem_statement"])
    out = pathlib.Path(runs)
    (out / "kit").mkdir(parents=True, exist_ok=True)
    kit = []
    for r in df.iter_rows(named=True):
        num = r["instance_id"].rsplit("-", 1)[1]
        kit.append({"instance_id": r["instance_id"], "num": num, "base_commit": r["base_commit"],
                    "docker_image": r["docker_image"], "problem_statement": r["problem_statement"]})
    (out / "kit" / "tasks.json").write_text(json.dumps(kit, indent=1), encoding="utf-8")
    for cond in ("A", "B"):
        d = out / cond
        d.mkdir(parents=True, exist_ok=True)
        lines = [f"# Tasks ({len(kit)})", ""]
        for t in kit:
            lines += [f"## Task {t['instance_id']}", "",
                      f"- Folder: `{t['instance_id']}/repo`",
                      f"- Container: `swl-{cond}-{t['num']}` (the folder is mounted at the repository's path, shown by"
                      f" `docker exec swl-{cond}-{t['num']} bash -lc \"pwd\"`)",
                      "", "### Issue", "", t["problem_statement"].strip(), ""]
        (d / "TASKS.md").write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"wrote kit/tasks.json and TASKS.md for A and B: {len(kit)} tasks")


def evalset(folder: str, out: str) -> None:
    df = load(folder, None)
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        for r in df.iter_rows(named=True):
            fh.write(json.dumps(r, default=str) + "\n")
    print(f"wrote {df.height} rows to {out}")


if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[1] not in ("tasks", "evalset"):
        raise SystemExit(__doc__)
    (tasks if sys.argv[1] == "tasks" else evalset)(sys.argv[2], sys.argv[3])
