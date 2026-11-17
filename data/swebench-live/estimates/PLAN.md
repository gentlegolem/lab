ARCHITECT: 10 min, 50k reported
GROUP G1: tasks xroche__httrack-849, xroche__httrack-837; after: none; ESTIMATE: 50 agent-min, 165k reported
GROUP G2: tasks xroche__httrack-851, xroche__httrack-830; after: none; ESTIMATE: 45 agent-min, 150k reported
GROUP G3: tasks xroche__httrack-850, xroche__httrack-835, xroche__httrack-829; after: none; ESTIMATE: 35 agent-min, 130k reported
GROUP G4: tasks xroche__httrack-893, xroche__httrack-876, xroche__httrack-856; after: none; ESTIMATE: 35 agent-min, 140k reported
WALL: 62 min
SOLO: 190 agent-min, 690k reported
SAVING: 6% of tokens, 67% of wall-clock

# Notes for engineers

Every task has its own repository folder and its own container, so no group touches
another group's files and nothing has to wait: all four groups start together.
Tasks were grouped by the code they share, so what you learn on the first task in your group
helps with the next one. Line numbers in the issues are approximate (each repo is at a different
commit), so grep for the symbol names.

General workflow for each task: `docker exec <container> bash -lc "pwd"` to find the mount; build inside
the container (`./configure && make -j`, or reuse an existing build if there is one); write the fix;
add or extend a test under `tests/` in the repo's existing style (`NN_name.test`, listed in
`tests/Makefile.am`) when that's feasible; and run the relevant tests with `make check TESTS=...`.
Keep each diff small and scoped to its own issue. Don't commit across repos.

## G1 — WARC 304 / revisit handling (849, 837) — both in `src/htsback.c` `back_wait()`, `src/htswarc.c`
Do **837 first**: it's the base that 849's issue text builds on.
- **837**: In `back_wait()`'s `HTTP_NOT_MODIFIED` branch, a struct assignment (the cache entry is read into
  `tmp`, followed by `back_connxfr` and then a copy back into `back[i].r`) overwrites `warc_reqhdr`/`warc_resphdr`
  before `back_finalize()` gets to `warc_write_backtransaction()` (`src/htswarc.c`). Save those members
  across the swap the way `back_connxfr` saves the socket and keep-alive members, and don't double-free
  or leak them. Then `cache_read_including_broken()` in `src/htscache.c` (caller: `src/htsname.c`):
  `back_clear_entry` frees `adr`/`headers` and then the struct is returned still holding them. Null them
  out (or stop freeing them), and check that the htsname.c caller doesn't need them.
- **849**: The repo already has `server_sent_304` in place (that was #826). Two parts: (a) carry
  `r.address` (the peer IP; check its type in `htsblk`, `src/htsopt.h`/`htsback.h`) across the same
  swap so revisit records get `WARC-IP-Address`; (b) when the engine forces `HTTP_NOT_MODIFIED`
  and the server didn't send a 304 (same-size hack, #176 error-on-update), don't write a
  `server-not-modified` revisit. The simplest correct option is to write no WARC record for the forced case
  (gate on `!server_sent_304`, which needs a flag kept in `back[i]`/`r` for `back_finalize`), or else write
  an `identical-payload-digest` revisit. Look at `tests/warc-validate.py --revisit-exchange` and the mini304
  fixture tests (`grep -l mini304 tests/*`) and extend them.

## G2 — transfer completeness in `src/htsback.c` (851, 830)
- **851**: The incomplete-transfer guard in `back_finalize()` (`r.totalsize >= 0 && r.statuscode > 0 ...`)
  never fires for chunked bodies. In the chunk parser in `back_wait()` (look for `is_chunk`, `chunk_adr`,
  and the `sscanf(chunk_data, "%x", &chunk_size)` around the `chunk_size > 0` test), record when the
  terminating zero-length chunk is seen (add a field to `lien_back` in `htsback.h`, and reset it where
  `is_chunk` is reset). On READ_EOF/finalize, a chunked transfer that never saw the terminator is
  incomplete: treat it like a short Content-Length body (error status, don't write to the mirror or cache,
  keep the old copy on `--update`). Add a code comment saying that an HTTP/1.0 close-delimited identity body
  can't be checked. For a test, see how the existing truncated Content-Length tests serve broken
  responses (`grep -ril "truncat\|Content-Length" tests/*.test tests/*.py`).
- **830**: In `back_add()`, FTP resume sets `range_req_size = file_size` when the local file exists but
  there's no cache entry. FTP has no conditional GET, so without a cache entry to validate against, don't
  resume: restart from 0, i.e. skip the REST/range path for `ftp://` when there's no cache entry (but
  keep resuming when the cache shows a genuine partial). Read the neighbouring #810 logic just below it
  (`range_req_size = sz`) and follow its style. Look for existing FTP tests (`grep -il ftp tests/*`).

## G3 — time helpers and proxytrack (850, 835, 829)
- **850**: Next to the existing `hts_gmtime()` (grep for it; probably `htslib.c`/`htsglobal`/`htssafe`),
  add `hts_localtime()` (`localtime_r` on POSIX, `localtime_s` on Windows; copy the gmtime helper's
  pattern). Switch `time_gmt_rfc822()` and `get_filetime_rfc822()` to `hts_gmtime`, and remove the
  localtime fallback there (if gmtime fails, produce no output or an error rather than local time labelled GMT).
  Switch `time_local_rfc822()`, the `localtime()` calls in `htsback.c` and `htscore.c` (progress/log
  timestamps), and `src/proxy/store.c` (`-localtime(&now)->tm_gmtoff`, which needs a NULL check) to `hts_localtime`.
  Check that `src/proxy` links against or includes the helper; proxytrack builds separately.
- **835**: In `src/proxy/store.c`'s .ndx parsing, initialize `pos` (`int pos;` around the `sscanf`) and handle a
  failed `sscanf`, e.g. skip the entry. Replace `strncat(cache->filenameDat, filename, nLen)` (and the
  matching Ndx line) with a copy bounded by `sizeof(cache->filenameDat)` (there may be strlcat-style
  helpers in `htssafe.h`).
- **829**: In `src/proxy/proxytrack.c`, `thisIsDir = (thisUrl[thisUrlLen - 1] == '/')` with `thisUrlLen == 0` reads
  out of bounds. Guard with `thisUrlLen > 0 &&` in both `proxytrack_process_DAV_Request()` and
  `proxytrack_process_HTTP_List()`. A regression test with a one-entry ARC cache and PROPFIND is nice to have
  if proxytrack tests already exist (`grep -l proxytrack tests/*`).

## G4 — crash report, htsserver MIME, charset escaping (893, 876, 856)
- **893**: (a) `configure.ac`: add `-funwind-tables` (also `-fasynchronous-unwind-tables` if supported) to
  CFLAGS on ARM hosts, or more simply whenever the compiler accepts it (use the existing
  AX_CHECK_COMPILE_FLAG-style checks). (b) `src/htsbacktrace.c` `hts_print_backtrace()`: when
  `backtrace()` returns 0, write a one-line notice (e.g. "No stack frames available (no unwind tables?)")
  instead of nothing. (c) Make `tests/140_crash-handler.test` and `tests/80_engine-crash-symbolize.test` accept
  or skip on that notice, the way they already handle the no-backtrace-OS case. Update the comment in `htsbacktrace.h`.
- **876**: `src/htsserver.c`: replace `is_image()` plus the hardcoded `ok_img` `image/gif` header with an
  extension→type mapping (gif, png, jpg/jpeg→image/jpeg, svg→image/svg+xml, ico→image/x-icon or
  image/vnd.microsoft.icon, xml→text/xml or application/xml) and build the Content-type header
  from it. Turn `is_html/is_txt/is_css/is_js` into a real case-insensitive suffix check, not `strstr`.
  Keep the HTML-specific behaviour, which is also gated on `is_html` (around the `virtualpath && is_html` paths).
- **856**: `src/htsencoding.c` `hts_unescapeEntitiesWithCharset()`: when `hts_convertStringFromUTF8` fails
  (`len` stays 0), write `%26%23<decimal codepoint>%3B` instead of copying the raw entity source. Only do this
  in the query/URL context (reached from `src/htsparse.c` around the `hts_unescapeEntitiesWithCharset` call);
  check the other callers so normal text isn't affected (add a flag or a separate function if needed). Add a
  unit/engine test: `&euro;` on a page with no charset → `%26%238364%3B`; `&eacute;` → `%e9`.
  Look for existing entity/charset tests (`grep -l unescapeEntities tests/* src/*test*`).

# Estimate basis
Per task, in reported tokens: 829/835 ~35k, 876/893 ~45k, 850/856 ~55k, 830 ~60k, 837 ~75k, 851 ~90k, 849 ~95k,
plus ~20k fixed overhead per engineer (system prompt, TASKS.md, PLAN.md, first build). SOLO adds ~25 min of
serial container builds and the extra tokens from context compaction over a single run of about 600k.
The team saves little on tokens (four engineers pay the startup cost four times), but finishes in about a third of the time.
