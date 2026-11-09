# Sources

## github.com/kanaka/mal (Make a Lisp test kit) · 2026-11-08 · allowed with limits
Terms: https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies (read 2026-11-08): "Researchers may use public, non-personal information from the Service for research purposes, only if any publications resulting from that research are open access."
Terms: https://raw.githubusercontent.com/kanaka/mal/master/LICENSE (read 2026-11-08): "Mal (make-a-lisp) is licensed under the MPL 2.0 (Mozilla Public License 2.0)."
API docs: api.github.com, unauthenticated: header "X-RateLimit-Limit: 60" (per hour); 5 metadata requests used.
robots.txt: raw.githubusercontent.com: none on raw.githubusercontent.com (404). github.com: "User-agent: *" section has Allow / Disallow lines for site pages (e.g. "Disallow: /account-login"); none for raw file paths.
Limits: API 60 requests per hour unauthenticated; if run: one file at a time, 1 per second, about 40 files (~160 KB), once.
Account: none (plain curl, no GitHub login or token).
Why: public, non-personal files used for research whose write-up is open (CC BY 4.0); the files' own licence (MPL 2.0) allows use with the notice kept.
