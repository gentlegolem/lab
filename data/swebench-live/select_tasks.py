# SPDX-License-Identifier: MIT
"""Picks the post-cutoff task bundle from SWE-bench-Live/MultiLang by the rule fixed before the data was read.

    python -I select_tasks.py <folder with the 8 parquet files> [--out selection.tsv]

Reads only repo, instance_id, created_at and docker_image (the rule's item 5). Problem statements, patches and tests
are not read here. Rule (also in the pre-registration):
  1. eligible task: created_at on or after 2026-07-01T00:00:00Z (the models' training data cutoff is June 2026);
  2. eligible repo: 8 or more eligible tasks;
  3. the repo with the most eligible tasks; ties: newest eligible task latest, then alphabetical;
  4. its 10 newest eligible tasks (all if 8 to 10).
"""
import argparse
import pathlib
import sys

import polars as pl

CUTOFF = "2026-07-01T00:00:00Z"
COLS = ["repo", "instance_id", "created_at", "docker_image"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--out", default=str(pathlib.Path(__file__).with_name("selection.tsv")))
    a = ap.parse_args()
    files = sorted(pathlib.Path(a.folder).glob("*-00000-of-00001.parquet"))
    if len(files) != 8:
        print(f"expected 8 parquet files, found {len(files)}", file=sys.stderr)
        return 1
    df = pl.concat([pl.read_parquet(f, columns=COLS).with_columns(pl.lit(f.name.split("-")[0]).alias("split")) for f in files])
    # created_at is an ISO string with a trailing Z in MultiLang; compare as text after normalising the format.
    df = df.with_columns(pl.col("created_at").cast(pl.Utf8))
    print(f"tasks: {df.height}; created_at range {df['created_at'].min()} to {df['created_at'].max()}")
    elig = df.filter(pl.col("created_at") >= CUTOFF)
    print(f"tasks on or after {CUTOFF}: {elig.height}, in {elig['repo'].n_unique()} repos")
    per = (elig.group_by("repo").agg(pl.len().alias("n"), pl.col("created_at").max().alias("newest"), pl.col("split").first())
           .sort(["n", "newest", "repo"], descending=[True, True, False]))
    print("repos with the most eligible tasks:")
    for r in per.head(12).iter_rows(named=True):
        print(f"  {r['n']:3d}  newest {r['newest']}  {r['split']:5s} {r['repo']}")
    ok = per.filter(pl.col("n") >= 8)
    if ok.height == 0:
        print("no repo has 8 or more eligible tasks: fall back to our own bundle (rule item 7)")
        return 2
    repo = ok.row(0, named=True)["repo"]
    pick = elig.filter(pl.col("repo") == repo).sort("created_at", descending=True).head(10)
    pick.select(["instance_id", "repo", "split", "created_at", "docker_image"]).write_csv(a.out, separator="\t")
    print(f"chosen repo: {repo}; {pick.height} tasks written to {a.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
