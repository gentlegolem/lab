# SPDX-License-Identifier: MIT
# Runs inside a task's own image (no network): copies the repo at its base commit to /out/repo as a fresh git
# repository with one commit and no history. Files untracked in the image are copied too and marked ignored.
# Needs BASE (the dataset's base_commit). Prints KEY=value lines for harness.js.
cd /testbed || exit 2
[ -d .git ] || { g=$(find . -maxdepth 2 -mindepth 2 -type d -name .git -print -quit); [ -n "$g" ] && cd "${g%/.git}"; }
REPO=$(pwd)
HEAD=$(git rev-parse HEAD)
[ "$HEAD" = "$BASE" ] || { echo "HEAD $HEAD is not the base $BASE" >&2; exit 3; }
git ls-files -z > /tmp/tracked
git ls-files -z -o > /tmp/untracked
rm -rf /out/repo && mkdir -p /out/repo
tar -C "$REPO" --exclude=./.git -cf - . | tar -C /out/repo --no-same-owner -xf - 2>/tmp/tar.err
cd /out/repo || exit 4
git init -q
git config core.fileMode false
git config core.autocrlf false
git config user.name base
git config user.email base@example.invalid
tr '\0' '\n' < /tmp/untracked | sed -e 's/[][*?!#]/\\&/g' -e 's#^#/#' >> .git/info/exclude
xargs -0 git add -f -- < /tmp/tracked
git commit -qm base --no-verify
echo "REPO=$REPO"
echo "TREE_IMAGE=$(cd "$REPO" && git rev-parse 'HEAD^{tree}')"
echo "TREE_COPY=$(git rev-parse 'HEAD^{tree}')"
echo "TAR_ERRORS=$(wc -l < /tmp/tar.err)"
echo "DIRTY=$(git status --porcelain | wc -l)"
