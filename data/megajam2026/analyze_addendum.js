// SPDX-License-Identifier: MIT
// Finding 16 addendum (16a), as pre-registered in agent-study/findings/finding-16a-prereg.md (tag f16a-prereg):
// question 3 (the bot) on main's reports plus the worktree reports from the archive.
//   node analyze_addendum.js        reads playtests.tsv and playtests-archive.tsv next to it, writes results-addendum.json
// F16A_ARCHIVE=<file> reads another archive table (an empty or missing one leaves main alone: the f16 check).
const fs = require('fs'); const path = require('path');
const D = __dirname;
const tsvFile = (file) => { const [h, ...rows] = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.length); const k = h.split('\t'); return rows.map((r) => { const c = r.split('\t'); const o = {}; k.forEach((x, i) => { o[x] = c[i] ?? ''; }); return o; }); };
const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : NaN);
const time = (s) => Date.parse(String(s).replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
const f16 = JSON.parse(fs.readFileSync(path.join(D, 'results.json'), 'utf8'));
const END = Date.parse(f16.context.submitted); const T0 = Date.parse('2026-11-11T22:00:00Z'); // 17:00 ET, the first commit's hour
const HOURS = Math.ceil((END - T0) / 3600e3);

const main = tsvFile(path.join(D, 'playtests.tsv')).map((r) => ({ ...r, tree: 'main' }));
const archFile = process.env.F16A_ARCHIVE || path.join(D, 'playtests-archive.tsv');
const arch = fs.existsSync(archFile) ? tsvFile(archFile) : [];
const out = { archiveFile: path.basename(archFile), archiveRows: arch.length };
out.dropped = { unreadable: arch.filter((r) => r.note === 'unreadable').length, mock: arch.filter((r) => r.mock === '1').length, dupOfMain: arch.filter((r) => r.dup_of_main === '1').length };
const keep = (r) => r.note !== 'unreadable' && r.mock === '0' && r.dup_of_main !== '1';
const mainReal = main.filter(keep); const wtReal = arch.filter(keep);

// Q3 measures, exactly as analyze.js: pairs are (scenario, commit); runs sort by run folder name (a timestamp).
const byRun = (a, b) => a.run.localeCompare(b.run) || a.tree.localeCompare(b.tree);
function q3(real, seqKey) {
	const o = { reports: real.length, passShare: pct(real.filter((r) => r.ok === '1').length, real.length) };
	const byPair = new Map();
	for (const r of real) { const k = r.scenario + '\0' + r.git; (byPair.get(k) || byPair.set(k, []).get(k)).push(r); }
	const multi = [...byPair.values()].filter((v) => v.length >= 2);
	const mixed = multi.filter((v) => v.some((r) => r.ok === '1') && v.some((r) => r.ok === '0'));
	o.pairsRunTwice = multi.length; o.flaky = mixed.length; o.flakeRate = pct(mixed.length, multi.length);
	o.allPairs = byPair.size; o.flakyFloor = pct(mixed.length, byPair.size);
	let fails = 0, rerun = 0, rerunPassed = 0;
	for (const v of byPair.values()) {
		v.sort(byRun);
		v.forEach((r, i) => { if (r.ok !== '0') return; fails++; const next = v[i + 1]; if (next) { rerun++; if (next.ok === '1') rerunPassed++; } });
	}
	o.failures = { failed: fails, rerunOnSameCommit: rerun, rerunPassed, rerunPassedShare: pct(rerunPassed, rerun) };
	const seq = (key) => {
		let steps = 0, rag = 0; const g = new Map();
		for (const r of real) { const k = key(r); (g.get(k) || g.set(k, []).get(k)).push(r); }
		for (const v of g.values()) { v.sort(byRun); for (let i = 1; i < v.length; i++) if (v[i].git !== v[i - 1].git) { steps++; if (v[i - 1].ok === '1' && v[i].ok === '0') rag++; } }
		return { steps, redAfterGreen: rag, share: pct(rag, steps) };
	};
	o.scenarios = new Set(real.map((r) => r.scenario)).size;
	o.redAfterGreen = seq((r) => r.scenario); // one sequence per scenario, all trees in time order (f16's method)
	o.redAfterGreenWithinTree = seq((r) => r.scenario + '\0' + r.tree); // one sequence per scenario and tree
	const ts = real.map((r) => time(r.started)).filter(Number.isFinite);
	const hrs = new Set(ts.map((t) => Math.floor((t - T0) / 3600e3)).filter((i) => i >= 0 && i < HOURS));
	o.coverage = { first: ts.length ? new Date(Math.min(...ts)).toISOString() : null, last: ts.length ? new Date(Math.max(...ts)).toISOString() : null, jamHoursWithAReport: hrs.size, jamHours: HOURS };
	return o;
}

out.main = q3(mainReal);
const chk = ['passShare', 'pairsRunTwice', 'flaky', 'flakeRate', 'allPairs', 'scenarios'].filter((k) => out.main[k] !== f16.q3[k]);
if (out.main.redAfterGreen.redAfterGreen !== f16.q3.redAfterGreen || out.main.redAfterGreen.steps !== f16.q3.consecutiveCommitSteps) chk.push('redAfterGreen');
if (JSON.stringify(out.main.failures) !== JSON.stringify(f16.q3.failures)) chk.push('failures');
out.mainMatchesF16 = chk.length === 0; out.mainMismatch = chk;
if (!out.mainMatchesF16) { console.error('main does not reproduce finding 16:', chk.join(', ')); process.exit(1); }

const mainLast = Math.max(...mainReal.map((r) => time(r.started)));
out.mainLast = new Date(mainLast).toISOString();
out.combined = q3([...mainReal, ...wtReal]);
out.worktrees = q3(wtReal);
out.afterMainLast = q3([...mainReal, ...wtReal].filter((r) => time(r.started) > mainLast));
out.byTree = {}; for (const r of wtReal) out.byTree[r.tree] = (out.byTree[r.tree] || 0) + 1;
out.rule = { verdict: out.combined.flakeRate < 10 ? 'usable' : 'noisy', f16Verdict: f16.q3.rule.verdict };
if (!process.env.F16A_ARCHIVE) fs.writeFileSync(path.join(D, 'results-addendum.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({ archiveRows: out.archiveRows, mainMatchesF16: out.mainMatchesF16, combinedReports: out.combined.reports }));
