#!/bin/sh
# SPDX-License-Identifier: MIT
# Downloads SWE-bench-Live/MultiLang at the pinned revision, one file at a time, and checks each SHA-256 against
# dataset.sha256. Generic User-Agent, no account.   sh download.sh [<out folder>]
REV=eb09c2e5db6e4c5a95e01c903c8fd1d5da33c4f3
OUT=${1:-/d/LabData/swe-bench-live/multilang-eb09c2e5/data}
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$OUT"
tr -d '\r' < "$HERE/dataset.sha256" | while read -r sha name; do
  dest="$OUT/$name"
  if [ -s "$dest" ] && [ "$(sha256sum "$dest" | cut -d' ' -f1)" = "$sha" ]; then echo "ok (already there) $name"; continue; fi
  sleep 1
  curl -sL -A 'research-script/1.0' --retry 3 --retry-delay 5 -o "$dest" "https://huggingface.co/datasets/SWE-bench-Live/MultiLang/resolve/$REV/data/$name"
  if [ "$(sha256sum "$dest" | cut -d' ' -f1)" = "$sha" ]; then echo "ok $name"; else echo "HASH MISMATCH $name"; exit 1; fi
done
