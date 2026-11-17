# Sources

## github.com/kanaka/mal (Make a Lisp test kit) · 2026-11-08 · allowed with limits
Terms: https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies (read 2026-11-08): "Researchers may use public, non-personal information from the Service for research purposes, only if any publications resulting from that research are open access."
Terms: https://raw.githubusercontent.com/kanaka/mal/master/LICENSE (read 2026-11-08): "Mal (make-a-lisp) is licensed under the MPL 2.0 (Mozilla Public License 2.0)."
API docs: api.github.com, unauthenticated: header "X-RateLimit-Limit: 60" (per hour); 5 metadata requests used.
robots.txt: raw.githubusercontent.com: none on raw.githubusercontent.com (404). github.com: "User-agent: *" section has Allow / Disallow lines for site pages (e.g. "Disallow: /account-login"); none for raw file paths.
Limits: API 60 requests per hour unauthenticated; if run: one file at a time, 1 per second, about 40 files (~160 KB), once.
Account: none (plain curl, no GitHub login or token).
Why: public, non-personal files used for research whose write-up is open (CC BY 4.0); the files' own licence (MPL 2.0) allows use with the notice kept.

## huggingface.co/datasets/SWE-bench-Live (Python and MultiLang task sets) · 2026-11-16 · allowed with limits
Terms: https://huggingface.co/terms-of-service (effective September 15, 2022): a public repository grants each user a licence "to use, display, publish, reproduce, distribute, and make derivative works"; no clause on scraping, crawling, bots, harvesting or rate limits found.
Terms: dataset cards of SWE-bench-Live/SWE-bench-Live and SWE-bench-Live/MultiLang (read 2026-11-16): "license: mit". Code: https://github.com/microsoft/SWE-bench-Live (LICENSE: MIT).
API docs: huggingface.co/api (dataset metadata, file sizes) and datasets-server.huggingface.co (statistics, rows), unauthenticated. The /filter endpoint answered HTTP 500 "Authentication check on the Hugging Face Hub failed"; /statistics fails on MultiLang. Not used further.
robots.txt: huggingface.co: "User-agent: *" / "Allow: /". datasets-server.huggingface.co: none (404).
Limits: none documented found; if run: 1 request per second, one at a time, cached. 31 small requests used on 2026-11-16 (metadata, statistics, 9 pages of 4-6 rows).
Account: none (plain curl, generic User-Agent, no Hugging Face login or token).
Why: MIT-licensed public dataset, no terms against automated reads. Benchmark rule to keep: during a run the agent may see only the problem statement and the task's Docker image, and must not look up the fix, the tests or later commits.
Not checked yet: Docker Hub (the task images, starryzhang/sweb.eval.*): terms and anonymous pull limits, before the first pull.

## hub.docker.com (SWE-bench-Live task images, starryzhang/sweb.eval.x86_64.*) · 2026-11-16 · allowed with limits
Terms: https://www.docker.com/legal/docker-terms-service/ (effective August 26, 2026): automated access is allowed "through documented APIs and within published limits"; users must not "Transfer excessive amounts of data".
API docs: https://docs.docker.com/docker-hub/usage/ (read 2026-11-16): unauthenticated users, "100 per IPv4 address" per 6 hours, subject to fair use.
robots.txt: hub.docker.com: "User-agent: *" / "Disallow:" (nothing disallowed).
Limits: 100 anonymous pulls per 6 hours; if run: the 10 chosen images once (about 7.9 GB compressed), with the docker CLI, no account. 10 tag-metadata reads used on 2026-11-16.
Account: none (no Docker Hub login).
Why: documented client (docker pull) well within the published anonymous limit.

## github.com/microsoft/SWE-bench-Live and github.com/microsoft/RepoLaunch (the official evaluator) · 2026-11-16 · allowed
Terms: GitHub acceptable use, quoted in the kanaka/mal block above. Code: MIT in both repos (LICENSE: "MIT License", "Copyright (c) Microsoft Corporation").
Use: one `git clone` of SWE-bench-Live (commit afac77f2ce908ed37bc60ad0d42e7815a7589525) and its submodule RepoLaunch (c4b623d930f3728e5338664bb634021b98492cbf), into D:/LabData/swe-bench-eval. Python packages from PyPI through pip (the index's normal use), in a virtual environment there, pip cache off.
robots.txt: not applicable (git clone, not page fetching).
Limits: none hit; two clones.
Account: none (no credential helper). Owner's OK: LB32, in chat, 2026-11-16.
Why: a single clone of a public MIT repository is ordinary use.
