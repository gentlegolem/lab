# SPDX-License-Identifier: MIT
"""Runs the official SWE-bench-Live evaluator (`python -m evaluation.evaluation`) from its own folder, unchanged except
for one method, so that a Windows host can drive its Linux task containers.

On Windows, RepoLaunch's LinuxRuntime.apply_patch writes the patch file in text mode (Windows line endings, locale
encoding) and joins the in-container path with a backslash (`/mnt_tmp\\<id>.diff`), so `git apply` in the container
fails. The copy below is the same method with the file written as UTF-8 with LF line endings and the container path
joined with '/'. Everything else (containers, test commands, parsing, grading, reports) is the evaluator's own code.

    cd D:/LabData/swe-bench-eval
    .venv/Scripts/python <path to this file> --dataset <eval.jsonl> --platform linux --patch_dir gold ...
"""
import os
import posixpath
import runpy
import sys
import uuid

sys.path.insert(0, os.path.join(os.getcwd(), "launch"))  # as evaluation.py does, so both use the same module
sys.path.insert(0, os.getcwd())
from launch.core.platforms import linux  # noqa: E402


def apply_patch(self, patch: str, verbose: bool = False) -> bool:
    output_temp = "\n\n<<<<<<PATCH FAILED TO APPLY CLEANLY\n{out}\n>>>>>>\n\n"

    filename = f"{uuid.uuid4()}.diff"
    hostpath = os.path.join(self.mnt_host, filename)
    with open(hostpath, "w", encoding="utf-8", newline="\n") as f:  # was: open(hostpath, "w")
        f.write(patch)
    containerpath = posixpath.join(self.mnt_container, filename)  # was: os.path.join

    cmd = f"""git apply --reject  --whitespace=nowarn  {containerpath} """
    res = self.send_command(cmd)
    self.send_command(f"rm {containerpath}")
    if int(res.metadata.exit_code) == 0:
        print(f"{cmd} ---- Patch applied Successfully!", flush=True)
        return True
    else:
        if verbose:
            print(output_temp.format(out=res.output), flush=True)
        return False


linux.LinuxRuntime.apply_patch = apply_patch
sys.argv[0] = "evaluation.evaluation"
runpy.run_module("evaluation.evaluation", run_name="__main__", alter_sys=True)
