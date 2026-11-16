// SPDX-License-Identifier: MIT
// Finding 16 addendum (16a): bot reports from the jam's worktrees, read from the archive HQ made of them (read only).
//   node build_archive.js --archive <playtest-runs dir> [--trees a,b,...] [--out <dir>]
// The archive holds one folder per worktree (and one for main), one run folder each, and a MANIFEST.csv.
// Writes, next to this script by default:
//   playtests-archive.tsv   one row per report.json: tree, then the same columns as playtests.tsv, then dup_of_main
//   MANIFEST-archive.json   sha-256 of the archive manifest and of this output, counts, the main-folder check
// Default trees: every folder except main (main's reports are already in playtests.tsv). The scrub and the report
// fields are copied from build_snapshot.js, so the rows match it column for column.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ARCH = arg('archive'); const OUT = path.resolve(arg('out', __dirname));
if (!ARCH) { console.error('usage: node build_archive.js --archive <playtest-runs dir> [--trees a,b] [--out dir]'); process.exit(2); }
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const clean = (s) => String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' ').trim();
const scrubbed = { emails: 0, paths: 0 };
const scrub = (text) => String(text)
	.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, () => { scrubbed.emails++; return '<email>'; })
	.replace(/\b[A-Za-z]:[\\/]+[^\s"'`|<>()]*/g, (p) => {
		scrubbed.paths++;
		const m = p.match(/^[A-Za-z]:[\\/]+Git[\\/]+MegaJam2026(-wt-)?(.*)$/i);
		return m ? '<repo>' + (m[1] || '') + m[2] : '<local path>';
	})
	.replace(/\/[a-z]\/Users\/[^\s"'`|<>()]*/gi, () => { scrubbed.paths++; return '<local path>'; });

const dirs = (p) => fs.readdirSync(p).filter((d) => fs.statSync(path.join(p, d)).isDirectory()).sort();
const allTrees = dirs(ARCH);
const trees = arg('trees') ? arg('trees').split(',') : allTrees.filter((t) => t !== 'main');
const manifest = { built: new Date().toISOString(), archiveManifest: null, trees: {}, counts: {}, mainCheck: null };
const man = path.join(ARCH, 'MANIFEST.csv');
if (fs.existsSync(man)) { const b = fs.readFileSync(man); manifest.archiveManifest = { sha256: sha256(b), bytes: b.length }; }

// main's reports: the folder-by-folder hash build_snapshot.js recorded (sha256OfReports), and the set of report hashes
const mainHashes = new Set(); const mainRunHash = crypto.createHash('sha256'); let mainReports = 0;
if (allTrees.includes('main')) {
	for (const d of dirs(path.join(ARCH, 'main'))) {
		const f = path.join(ARCH, 'main', d, 'report.json'); if (!fs.existsSync(f)) continue;
		const h = sha256(fs.readFileSync(f)); mainHashes.add(h); mainRunHash.update(d + '\0' + h + '\n'); mainReports++;
	}
	const snap = path.join(__dirname, 'MANIFEST.json');
	const expected = fs.existsSync(snap) ? JSON.parse(fs.readFileSync(snap, 'utf8')).inputs.playtestRuns.sha256OfReports : null;
	const got = mainRunHash.digest('hex');
	manifest.mainCheck = { reports: mainReports, sha256OfReports: got, snapshot: expected, same: got === expected };
}

const pt = [];
for (const t of trees) {
	let folders = 0, reports = 0, dups = 0;
	for (const d of dirs(path.join(ARCH, t))) {
		folders++;
		const f = path.join(ARCH, t, d, 'report.json'); if (!fs.existsSync(f)) continue;
		const raw = fs.readFileSync(f); reports++;
		const dup = t !== 'main' && mainHashes.has(sha256(raw)) ? 1 : 0; dups += dup;
		let j; try { j = JSON.parse(raw.toString('utf8')); } catch (e) { pt.push([t, d, '', '', '', '', '', '', '', '', '', '', 'unreadable', dup].join('\t')); continue; }
		const h = j.header || {}; const steps = Array.isArray(j.steps) ? j.steps : [];
		pt.push([t, d, clean(j.scenario), j.ok === true ? 1 : j.ok === false ? 0 : '', j.seconds ?? '', clean(h.git), clean(h.build), h.mock === true ? 1 : h.mock === false ? 0 : '',
			clean(h.started), steps.length, steps.filter((s) => s && s.ok === false).length, Array.isArray(j.console_errors) ? j.console_errors.length : '', '', dup].join('\t'));
	}
	manifest.trees[t] = { folders, reports, dupOfMain: dups };
}
const text = scrub('tree\trun\tscenario\tok\tseconds\tgit\tbuild\tmock\tstarted\tsteps\tsteps_failed\tconsole_errors\tnote\tdup_of_main\n' + pt.join('\n') + '\n');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'playtests-archive.tsv'), text);
manifest.counts = { trees: trees.length, rows: pt.length };
manifest.output = { 'playtests-archive.tsv': sha256(Buffer.from(text)) };
manifest.scrubbed = scrubbed;
fs.writeFileSync(path.join(OUT, 'MANIFEST-archive.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(JSON.stringify({ counts: manifest.counts, mainCheck: manifest.mainCheck && { reports: manifest.mainCheck.reports, same: manifest.mainCheck.same } }));
