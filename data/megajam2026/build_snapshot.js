// SPDX-License-Identifier: MIT
// Rebuilds the finding 16 data snapshot from the jam repo (read only) and the operator's estimates file.
//   node build_snapshot.js --repo <jam repo> --estimates <ESTIMATES.md> [--commit 484badbe] [--learnings 4afa21d7] [--out <dir>]
// Writes, next to this script by default:
//   commits.tsv    sha, parents, time (UTC ISO), subject, revert_of (shas named in a Revert commit's body)
//   files.tsv      sha, added, deleted, path  (git --numstat; "-" for binary files is kept as "-")
//   ledger.jsonl   the task ledger at the commit
//   estimates.tsv  every table row of the estimates file: section, then its own columns as written
//   playtests.tsv  one row per bot report under tools/playtest/runs (not under version control)
//   UE5_LEARNINGS.md  the learnings file at the learnings commit
//   MANIFEST.json  source commit, sha-256 of every input and output, row counts
// No author names or emails, no commit bodies, no game code, no assets. Email addresses and absolute local paths in any
// text are replaced by <email>, <repo> or <local path>.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const { execFileSync } = require('child_process');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const REPO = arg('repo'); const EST = arg('estimates');
const COMMIT = arg('commit', '484badbe'); const LEARN = arg('learnings', '4afa21d7');
const OUT = path.resolve(arg('out', __dirname));
if (!REPO || !EST) { console.error('usage: node build_snapshot.js --repo <jam repo> --estimates <ESTIMATES.md> [--commit sha] [--learnings sha] [--out dir]'); process.exit(2); }
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', maxBuffer: 1 << 30 });
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const clean = (s) => String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' ').trim();
// Scrub: email addresses and absolute local paths (a path inside the jam repo keeps its part after the repo folder).
const scrubbed = { emails: 0, paths: 0 };
const scrub = (text) => String(text)
	.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, () => { scrubbed.emails++; return '<email>'; })
	.replace(/\b[A-Za-z]:[\\/]+[^\s"'`|<>()]*/g, (p) => {
		scrubbed.paths++;
		const m = p.match(/^[A-Za-z]:[\\/]+Git[\\/]+MegaJam2026(-wt-)?(.*)$/i);
		return m ? '<repo>' + (m[1] || '') + m[2] : '<local path>';
	})
	.replace(/\/[a-z]\/Users\/[^\s"'`|<>()]*/gi, () => { scrubbed.paths++; return '<local path>'; });
const write = (name, text) => { const t = scrub(text); fs.writeFileSync(path.join(OUT, name), t); return sha256(Buffer.from(t)); };
fs.mkdirSync(OUT, { recursive: true });
const manifest = { built: new Date().toISOString(), commit: git('rev-parse', COMMIT).trim(), learningsCommit: git('rev-parse', LEARN).trim(), files: {}, counts: {} };

// 1. history at the commit
const SEP = '\x01', F = '\x02', END = '\x03';
const log = git('log', '--numstat', `--format=${SEP}%H${F}%P${F}%at${F}%s${F}%b${END}`, manifest.commit);
const commits = []; const files = [];
for (const chunk of log.split(SEP)) {
	if (!chunk.trim()) continue;
	const e = chunk.indexOf(END); if (e < 0) continue;
	const [sha, parents, at, subject, body] = chunk.slice(0, e).split(F);
	const revertOf = /^(\[\w+\] )?Revert\b/i.test(subject) ? [...new Set((body.match(/\b[0-9a-f]{7,40}\b/g) || []))].join(' ') : '';
	commits.push([sha, parents, new Date(Number(at) * 1000).toISOString(), clean(subject), revertOf].join('\t'));
	for (const line of chunk.slice(e + 1).split('\n')) {
		const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
		if (m) files.push([sha, m[1], m[2], clean(m[3])].join('\t'));
	}
}
manifest.files['commits.tsv'] = write('commits.tsv', 'sha\tparents\ttime\tsubject\trevert_of\n' + commits.reverse().join('\n') + '\n');
manifest.files['files.tsv'] = write('files.tsv', 'sha\tadded\tdeleted\tpath\n' + files.join('\n') + '\n');
manifest.counts.commits = commits.length; manifest.counts.fileRows = files.length;

// 2. the ledger at the commit
const ledger = git('show', `${manifest.commit}:ledger/tasks.jsonl`);
manifest.files['ledger.jsonl'] = write('ledger.jsonl', ledger);
manifest.counts.ledgerRows = ledger.split('\n').filter((l) => l.trim()).length;

// 3. estimates file (outside the repo): every table row, with its section heading
const estText = fs.readFileSync(EST, 'utf8');
manifest.inputs = { estimates: { sha256: sha256(Buffer.from(estText)), bytes: Buffer.byteLength(estText) } };
const estRows = []; let section = ''; let header = null;
for (const line of estText.split(/\r?\n/)) {
	if (/^#{1,6} /.test(line)) { section = line.replace(/^#+ /, '').trim(); header = null; continue; }
	if (!/^\s*\|/.test(line)) { header = null; continue; }
	const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => clean(c));
	if (cells.every((c) => /^:?-+:?$/.test(c))) continue; // the |---| row
	if (!header) { header = cells; continue; }
	const row = { section }; header.forEach((h, i) => { row[h] = cells[i] || ''; });
	estRows.push(row);
}
const estCols = ['section', ...new Set(estRows.flatMap((r) => Object.keys(r).filter((k) => k !== 'section')))];
manifest.files['estimates.tsv'] = write('estimates.tsv', estCols.join('\t') + '\n' + estRows.map((r) => estCols.map((c) => r[c] || '').join('\t')).join('\n') + '\n');
manifest.counts.estimateRows = estRows.length;

// 4. bot playtest reports (git-ignored run folders)
const RUNS = path.join(REPO, 'tools', 'playtest', 'runs');
const pt = []; const runHash = crypto.createHash('sha256'); let folders = 0;
for (const d of fs.readdirSync(RUNS).sort()) {
	const dir = path.join(RUNS, d); if (!fs.statSync(dir).isDirectory()) continue; folders++;
	const f = path.join(dir, 'report.json'); if (!fs.existsSync(f)) continue;
	const raw = fs.readFileSync(f); runHash.update(d + '\0' + sha256(raw) + '\n');
	let j; try { j = JSON.parse(raw.toString('utf8')); } catch (e) { pt.push([d, '', '', '', '', '', '', '', '', '', 'unreadable'].join('\t')); continue; }
	const h = j.header || {}; const steps = Array.isArray(j.steps) ? j.steps : [];
	pt.push([d, clean(j.scenario), j.ok === true ? 1 : j.ok === false ? 0 : '', j.seconds ?? '', clean(h.git), clean(h.build), h.mock === true ? 1 : h.mock === false ? 0 : '',
		clean(h.started), steps.length, steps.filter((s) => s && s.ok === false).length, Array.isArray(j.console_errors) ? j.console_errors.length : '', ''].join('\t'));
}
manifest.files['playtests.tsv'] = write('playtests.tsv', 'run\tscenario\tok\tseconds\tgit\tbuild\tmock\tstarted\tsteps\tsteps_failed\tconsole_errors\tnote\n' + pt.join('\n') + '\n');
manifest.inputs.playtestRuns = { folders, reports: pt.length, sha256OfReports: runHash.digest('hex') };

// 5. the learnings file
const learn = git('show', `${manifest.learningsCommit}:docs/UE5_LEARNINGS.md`);
manifest.files['UE5_LEARNINGS.md'] = write('UE5_LEARNINGS.md', learn);

manifest.scrubbed = scrubbed; // outputs' hashes are of the scrubbed text
fs.writeFileSync(path.join(OUT, 'MANIFEST.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(JSON.stringify(manifest.counts), JSON.stringify(manifest.inputs.playtestRuns));
