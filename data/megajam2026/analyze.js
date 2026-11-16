// SPDX-License-Identifier: MIT
// Finding 16 analysis, as pre-registered in agent-study/findings/finding-16-prereg.md (tag f16-prereg).
//   node analyze.js            reads the snapshot next to this script, prints the tables, writes results.json
const fs = require('fs'); const path = require('path');
const E = require('../../agent-study/package/src/lib/evals.js'); // finding 9's own isFixLike / reworkSignal
const D = __dirname;
const tsv = (f) => { const [h, ...rows] = fs.readFileSync(path.join(D, f), 'utf8').split('\n').filter((l) => l.length); const k = h.split('\t'); return rows.map((r) => { const c = r.split('\t'); const o = {}; k.forEach((x, i) => { o[x] = c[i] ?? ''; }); return o; }); };
const median = (xs) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); if (!s.length) return NaN; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : NaN);
const out = {};
const manifest = JSON.parse(fs.readFileSync(path.join(D, 'MANIFEST.json'), 'utf8'));

// ---------- Q1: did "done" hold up? ----------
// Bookkeeping files left out of the rework signal, as finding 9 left out the studio's notes, ledger and status files.
// F16_NO_NOISE=1 turns the filter off (sensitivity check, reported in the finding).
const NOISE = process.env.F16_NO_NOISE ? /$^/ : /^(ledger\/|devlog\/|docs\/(devlog\/|MORNING_REPORT|QUESTIONS\.md|ANSWERED\.md))|^(CREDITS|DECLARED|SOURCES)\.md$/;
const commits = tsv('commits.tsv').map((c) => ({ sha: c.sha, parents: c.parents ? c.parents.split(' ') : [], t: Date.parse(c.time), subject: c.subject, body: c.revert_of, files: [] }));
const bySha = new Map(commits.map((c) => [c.sha, c]));
for (const f of tsv('files.tsv')) {
	const c = bySha.get(f.sha); if (!c || NOISE.test(f.path)) continue;
	c.files.push({ path: f.path, add: f.added === '-' ? 1 : Number(f.added), del: f.deleted === '-' ? 0 : Number(f.deleted) });
}
commits.sort((a, b) => a.t - b.t);
const END = bySha.get(manifest.commit).t; // the submitted build
const resolve = (short) => { const m = commits.filter((c) => c.sha.startsWith(short)); return m.length === 1 ? m[0] : null; };
const ancestors = (sha, stop) => { const seen = new Set(); const st = [sha]; while (st.length) { const s = st.pop(); if (seen.has(s) || (stop && stop.has(s))) continue; seen.add(s); const c = bySha.get(s); if (c) st.push(...c.parents); } return seen; };
const expand = (c) => { // a merge stands for the commits it brought in: merge^1..merge
	if (c.parents.length < 2) return [c];
	const base = ancestors(c.parents[0]);
	return [...ancestors(c.sha, base)].map((s) => bySha.get(s)).filter(Boolean);
};
const ledger = fs.readFileSync(path.join(D, 'ledger.jsonl'), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const statusCount = {}; for (const r of ledger) statusCount[r.status] = (statusCount[r.status] || 0) + 1;
const q1 = { rows: ledger.length, status: statusCount, cutShare: pct(statusCount.cut || 0, ledger.length) };
const landed = ledger.filter((r) => r.status === 'landed');
let unresolved = 0;
const tasks = landed.map((r) => {
	const own = new Map();
	for (const s of r.commits || []) { const c = resolve(String(s)); if (!c) { unresolved++; continue; } for (const x of expand(c)) own.set(x.sha, x); }
	return { id: r.id, role: String(r.role || '').toLowerCase(), own: [...own.values()] }; // role names differ only in case
}).filter((t) => t.own.length);
q1.landed = landed.length; q1.withCommits = tasks.length; q1.unresolvedShas = unresolved;
const classify = (days) => {
	const g = { closed: 0, noCode: 0, leftAlone: 0, small: 0, material: 0, reverted: 0, open: 0, byRole: {} };
	for (const t of tasks) {
		const last = Math.max(...t.own.map((c) => c.t));
		if (last + days * 86400e3 > END) { g.open++; continue; }
		const r = E.reworkSignal(t.own, commits, days, t.id);
		if (!r) { g.noCode++; continue; }
		g.closed++;
		const k = r.fixCommits === 0 ? 'leftAlone' : r.ratio >= 0.25 ? 'material' : 'small';
		g[k]++;
		const shas = t.own.map((c) => c.sha);
		if (commits.some((c) => c.t > last && /^(\[\w+\] )?Revert\b/i.test(c.subject) && c.body.split(' ').some((p) => p && shas.some((s) => s.startsWith(p))))) g.reverted++;
		const role = (g.byRole[t.role] = g.byRole[t.role] || { closed: 0, leftAlone: 0, small: 0, material: 0 }); role.closed++; role[k]++;
	}
	g.share = { leftAlone: pct(g.leftAlone, g.closed), small: pct(g.small, g.closed), material: pct(g.material, g.closed) };
	return g;
};
q1.d3 = classify(3); q1.d1 = classify(1);
const useWindow = q1.d3.closed >= 30 ? 'd3' : 'd1';
q1.rule = { window: useWindow, lowConfidence: useWindow === 'd1', leftAloneShare: q1[useWindow].share.leftAlone, verdict: q1[useWindow].share.leftAlone <= 50 ? 'agrees' : 'disagrees' };
out.q1 = q1;

// ---------- Q2: how good were the time quotes? ----------
const toMin = (text) => { // a duration in words -> minutes; ranges -> midpoint; "+" parts add up; null if not a duration
	let s = String(text).split('(')[0].replace(/\bover\b.*$/i, '').replace(/[~≤≥]|about|roughly|at the latest/gi, ' ').trim();
	if (/\d{1,2}:\d{2}/.test(s)) return null; // a clock time, not a duration
	if (/^\s*an? hour\s*$/i.test(s)) return 60;
	const parts = [...s.matchAll(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(h(?:ours?)?|min(?:utes?)?|s(?:ec)?)?\b/gi)]
		.map((m) => ({ v: m[2] ? (Number(m[1]) + Number(m[2])) / 2 : Number(m[1]), u: (m[3] || '').toLowerCase()[0] || '' }));
	if (!parts.length) return null;
	for (let i = 0; i < parts.length; i++) if (!parts[i].u) parts[i].u = i > 0 && parts[i - 1].u === 'h' ? 'm' : (parts.slice(i + 1).find((p) => p.u) || {}).u || '';
	if (parts.some((p) => !p.u)) return null;
	return parts.reduce((a, p) => a + p.v * (p.u === 'h' ? 60 : p.u === 's' ? 1 / 60 : 1), 0);
};
const est = tsv('estimates.tsv');
const dur = est.filter((r) => /^A\./.test(r.section)).map((r) => {
	const e = toMin(r.Estimate); const a = toMin(r.Actual);
	const flagged = /\?|LOW|HIGH/.test(r.Ratio) || /≤|≥/.test(r.Actual);
	const who = /^HQ/.test(r.Who) && !/Atlas/i.test(r.Who) ? 'HQ' : /^AtlasJam$/i.test(r.Who) ? 'jam lead' : 'mixed';
	return { n: r['#'], who, estimate: r.Estimate, actual: r.Actual, fileRatio: r.Ratio, e, a, ratio: e && a != null ? a / e : null, flagged };
});
const pairs = dur.filter((p) => p.ratio != null);
const summ = (ps) => {
	const r = ps.map((p) => p.ratio);
	const raw = median(r.map((x) => Math.abs(x - 1))); const k = median(r.map((x) => Math.abs(x / 0.34 - 1)));
	return { n: ps.length, medianRatio: median(r), medianErrRaw: raw, medianErrX034: k, x034Closer: k < raw, under1: ps.filter((p) => p.ratio < 1).length, quotesHighBy: 1 / median(r) };
};
const q2 = { rows: dur.length, converted: pairs.length, excluded: dur.filter((p) => p.ratio == null).map((p) => `${p.n}: ${p.estimate} -> ${p.actual}`), all: summ(pairs), unflagged: summ(pairs.filter((p) => !p.flagged)), byWho: {} };
for (const w of ['HQ', 'jam lead', 'mixed']) q2.byWho[w] = summ(pairs.filter((p) => p.who === w));
q2.rule = { direction: q2.all.medianRatio < 0.67 ? 'agrees' : q2.all.medianRatio > 1 ? 'disagrees' : 'mixed', correction: q2.all.x034Closer ? 'x0.34 closer' : 'raw closer' };
// check against the file's own ratio column, where it is a plain number
q2.fileRatioCheck = pairs.filter((p) => /^\d*\.?\d+$/.test(p.fileRatio)).map((p) => Math.abs(p.ratio - Number(p.fileRatio))).filter((d) => d > 0.05).length;
// ETA section: lateness = actual clock time - ETA clock time (wrapped to +-12 h); described only
const clocks = (s) => [...String(s).matchAll(/(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?/g)].map((m) => { const a = +m[1] * 60 + +m[2]; return m[3] ? (a + (+m[3] * 60 + +m[4])) / 2 : a; });
const late = [];
for (const r of est.filter((x) => /^B\./.test(x.section))) {
	const e = clocks(r.ETA); const a = clocks(r.Actual); if (!e.length || !a.length) continue;
	const n = e.length === a.length ? e.length : 1;
	for (let i = 0; i < n; i++) { let d = a[i] - e[i]; if (d > 720) d -= 1440; if (d < -720) d += 1440; late.push(d); }
}
q2.eta = { rows: est.filter((x) => /^B\./.test(x.section)).length, pairs: late.length, medianLatenessMin: median(late), late: late.filter((d) => d > 0).length, medianFileRatio: median(est.filter((x) => /^B\./.test(x.section)).map((x) => Number(String(x.Ratio).replace(/[^\d.]/g, '').slice(0, 4)) || NaN)) };
q2.usage = est.filter((x) => /^C\./.test(x.section)).map((x) => ({ what: x.What, estimate: x.Estimate, actual: x.Actual, ratio: x.Ratio }));
out.q2 = q2;

// ---------- Q3: is the bot a usable ground truth? ----------
const pt = tsv('playtests.tsv').filter((r) => r.note !== 'unreadable');
const real = pt.filter((r) => r.mock === '0');
const q3 = { reports: pt.length, mock: pt.filter((r) => r.mock === '1').length, real: real.length, passShare: pct(real.filter((r) => r.ok === '1').length, real.length) };
const byPair = new Map();
for (const r of real) { const k = r.scenario + '\0' + r.git; (byPair.get(k) || byPair.set(k, []).get(k)).push(r); }
const multi = [...byPair.values()].filter((v) => v.length >= 2);
const mixed = multi.filter((v) => v.some((r) => r.ok === '1') && v.some((r) => r.ok === '0'));
q3.pairsRunTwice = multi.length; q3.flaky = mixed.length; q3.flakeRate = pct(mixed.length, multi.length);
let steps = 0, redAfterGreen = 0;
const byScen = new Map(); for (const r of real) (byScen.get(r.scenario) || byScen.set(r.scenario, []).get(r.scenario)).push(r);
for (const v of byScen.values()) {
	v.sort((a, b) => a.run.localeCompare(b.run));
	for (let i = 1; i < v.length; i++) if (v[i].git !== v[i - 1].git) { steps++; if (v[i - 1].ok === '1' && v[i].ok === '0') redAfterGreen++; }
}
q3.scenarios = byScen.size; q3.consecutiveCommitSteps = steps; q3.redAfterGreen = redAfterGreen; q3.redAfterGreenShare = pct(redAfterGreen, steps);
q3.rule = { verdict: q3.flakeRate < 10 ? 'usable' : 'noisy' };
// Added after the pre-registration (Deviations): the jam reran each failure once, so pairs run twice are mostly failures.
// Of the failed reports, how many were followed by a run of the same scenario on the same commit, and did it pass?
q3.allPairs = byPair.size;
let fails = 0, rerun = 0, rerunPassed = 0;
for (const v of byPair.values()) {
	v.sort((a, b) => a.run.localeCompare(b.run));
	v.forEach((r, i) => { if (r.ok !== '0') return; fails++; const next = v[i + 1]; if (next) { rerun++; if (next.ok === '1') rerunPassed++; } });
}
q3.failures = { failed: fails, rerunOnSameCommit: rerun, rerunPassed, rerunPassedShare: pct(rerunPassed, rerun) };
out.q3 = q3;

// ---------- context ----------
const jam = commits.filter((c) => c.t >= Date.parse('2026-11-12T05:00:00Z') && c.t <= END);
out.context = { commitsAtSubmitted: commits.length, merges: commits.filter((c) => c.parents.length > 1).length, inJamWindow: jam.length, first: new Date(commits[0].t).toISOString(), submitted: new Date(END).toISOString() };
fs.writeFileSync(path.join(D, 'results.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out, null, 1));
