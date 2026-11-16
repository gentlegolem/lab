// SPDX-License-Identifier: MIT
// Finding 16b, as pre-registered in agent-study/findings/finding-16b-prereg.md (tag f16b-prereg):
// "done" as time to the first fix, over every landed task with code, cut off (censored) at the submitted build.
//   node analyze_survival.js          reads the finding 16 snapshot next to it, writes results-survival.json
//   F16B_CHECK=1 node analyze_survival.js   only checks the event scan against finding 9's reworkSignal (1 and 3 days)
// Tasks, files and the fix signal are finding 16's (analyze.js) and finding 9's (evals.js): the same bookkeeping filter,
// the same merge expansion, the same fix-like test, the same per-file cap on fix lines, the same 25% material line.
const fs = require('fs'); const path = require('path');
const E = require('../../agent-study/package/src/lib/evals.js');
const NOISE_PATH = require('../../agent-study/package/src/config').noiseRe; // as evals.js codeFiles
const D = __dirname;
const tsv = (f) => { const [h, ...rows] = fs.readFileSync(path.join(D, f), 'utf8').split('\n').filter((l) => l.length); const k = h.split('\t'); return rows.map((r) => { const c = r.split('\t'); const o = {}; k.forEach((x, i) => { o[x] = c[i] ?? ''; }); return o; }); };
const isFold = (subject) => /\] Fold \d+ note\(s\)/.test(subject); // copied from evals.js
const HOUR = 3600e3;

// ---------- tasks, exactly as analyze.js ----------
const NOISE = /^(ledger\/|devlog\/|docs\/(devlog\/|MORNING_REPORT|QUESTIONS\.md|ANSWERED\.md))|^(CREDITS|DECLARED|SOURCES)\.md$/;
const manifest = JSON.parse(fs.readFileSync(path.join(D, 'MANIFEST.json'), 'utf8'));
const commits = tsv('commits.tsv').map((c) => ({ sha: c.sha, parents: c.parents ? c.parents.split(' ') : [], t: Date.parse(c.time), subject: c.subject, body: c.revert_of, files: [] }));
const bySha = new Map(commits.map((c) => [c.sha, c]));
for (const f of tsv('files.tsv')) { const c = bySha.get(f.sha); if (!c || NOISE.test(f.path)) continue; c.files.push({ path: f.path, add: f.added === '-' ? 1 : Number(f.added), del: f.deleted === '-' ? 0 : Number(f.deleted) }); }
commits.sort((a, b) => a.t - b.t);
const END = bySha.get(manifest.commit).t;
const START = commits[0].t;
const resolve = (short) => { const m = commits.filter((c) => c.sha.startsWith(short)); return m.length === 1 ? m[0] : null; };
const ancestors = (sha, stop) => { const seen = new Set(); const st = [sha]; while (st.length) { const s = st.pop(); if (seen.has(s) || (stop && stop.has(s))) continue; seen.add(s); const c = bySha.get(s); if (c) st.push(...c.parents); } return seen; };
const expand = (c) => (c.parents.length < 2 ? [c] : [...ancestors(c.sha, ancestors(c.parents[0]))].map((s) => bySha.get(s)).filter(Boolean));
const ledger = fs.readFileSync(path.join(D, 'ledger.jsonl'), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const tasks = ledger.filter((r) => r.status === 'landed').map((r) => {
	const own = new Map();
	for (const s of r.commits || []) { const c = resolve(String(s)); if (c) for (const x of expand(c)) own.set(x.sha, x); }
	return { id: r.id, role: String(r.role || '').toLowerCase(), own: [...own.values()] };
}).filter((t) => t.own.length);

// ---------- the event scan: every later fix commit on the task's code files, in time order ----------
function scan(t) {
	const mine = new Map();
	for (const c of t.own) for (const f of c.files) if (!NOISE_PATH.test(f.path)) mine.set(f.path, (mine.get(f.path) || 0) + f.add + f.del);
	if (!mine.size) return null;
	const taskLines = [...mine.values()].reduce((a, b) => a + b, 0);
	const last = Math.max(...t.own.map((c) => c.t)); const shas = new Set(t.own.map((c) => c.sha));
	const perFile = new Map(); const events = [];
	for (const c of commits) {
		if (c.t <= last || shas.has(c.sha) || isFold(c.subject) || !E.isFixLike(c)) continue;
		if (t.id && E.hasId(c.subject, t.id)) continue;
		let hit = false;
		for (const f of c.files) if (mine.has(f.path)) { perFile.set(f.path, (perFile.get(f.path) || 0) + f.add + f.del); hit = true; }
		if (!hit) continue;
		let lines = 0; for (const [p, n] of perFile) lines += Math.min(n, mine.get(p));
		events.push({ t: c.t, ratio: lines / Math.max(taskLines, 1) });
	}
	const first = events[0]; const mat = events.find((e) => e.ratio >= 0.25);
	return { last, taskLines, follow: (END - last) / HOUR, firstFix: first ? (first.t - last) / HOUR : null, material: mat ? (mat.t - last) / HOUR : null, events };
}
const S = tasks.map((t) => ({ ...t, s: scan(t) })).filter((t) => t.s);

// ---------- check: the scan reproduces reworkSignal's classification at 1 and 3 days, on every task ----------
const classOf = (r) => (r.fixCommits === 0 ? 'leftAlone' : r.ratio >= 0.25 ? 'material' : 'small');
let mismatches = 0;
for (const t of S) for (const days of [1, 3]) {
	const r = E.reworkSignal(t.own, commits, days, t.id);
	const inWin = t.s.events.filter((e) => e.t <= t.s.last + days * 86400e3);
	const mine = inWin.length === 0 ? 'leftAlone' : inWin[inWin.length - 1].ratio >= 0.25 ? 'material' : 'small';
	if (!r || classOf(r) !== mine || r.fixCommits !== inWin.length) mismatches++;
}
const check = { tasksWithCode: S.length, mismatches };
if (process.env.F16B_CHECK) { console.log(JSON.stringify(check)); process.exit(mismatches ? 1 : 0); }
if (mismatches) { console.error('event scan does not reproduce reworkSignal:', mismatches); process.exit(1); }

// ---------- Kaplan-Meier with Greenwood intervals, and the log-rank test ----------
const obs = (t, key) => { const e = t.s[key]; const fu = t.s.follow; return e != null && e <= fu ? { time: e, event: 1 } : { time: fu, event: 0 }; };
function km(items, key, at) {
	const d = items.map((t) => obs(t, key)).sort((a, b) => a.time - b.time);
	const times = [...new Set(d.filter((x) => x.event).map((x) => x.time))].sort((a, b) => a - b);
	let s = 1, gw = 0; const steps = [];
	for (const u of times) {
		const n = d.filter((x) => x.time >= u).length; const k = d.filter((x) => x.time === u && x.event).length;
		s *= 1 - k / n; if (n > k) gw += k / (n * (n - k)); steps.push({ t: u, s, se: s * Math.sqrt(gw), n });
	}
	const sAt = (h) => { let r = { s: 1, se: 0 }; for (const p of steps) if (p.t <= h) r = p; const n = d.filter((x) => x.time >= h).length; return { hours: h, survival: +(100 * r.s).toFixed(1), lo: +(100 * Math.max(0, r.s - 1.96 * r.se)).toFixed(1), hi: +(100 * Math.min(1, r.s + 1.96 * r.se)).toFixed(1), atRisk: n }; };
	const median = (steps.find((p) => p.s <= 0.5) || {}).t;
	return { n: d.length, events: d.filter((x) => x.event).length, censored: d.filter((x) => !x.event).length, at: at.map(sAt), medianHours: median == null ? null : +median.toFixed(2), curve: steps.map((p) => [+p.t.toFixed(3), +p.s.toFixed(4)]) };
}
function logrank(a, b, key) {
	const da = a.map((t) => obs(t, key)), db = b.map((t) => obs(t, key));
	const times = [...new Set([...da, ...db].filter((x) => x.event).map((x) => x.time))].sort((x, y) => x - y);
	let O = 0, Ex = 0, V = 0;
	for (const u of times) {
		const n1 = da.filter((x) => x.time >= u).length, n2 = db.filter((x) => x.time >= u).length, n = n1 + n2;
		const d1 = da.filter((x) => x.time === u && x.event).length, dd = d1 + db.filter((x) => x.time === u && x.event).length;
		if (n < 2) continue; O += d1; Ex += (dd * n1) / n; V += (dd * (n1 / n) * (1 - n1 / n) * (n - dd)) / (n - 1);
	}
	const chi = V > 0 ? (O - Ex) ** 2 / V : 0;
	const erfc = (x) => { const z = Math.abs(x), t = 1 / (1 + 0.5 * z); const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? r : 2 - r; };
	return { observedFirst: O, expectedFirst: +Ex.toFixed(2), chiSquare: +chi.toFixed(3), p: +erfc(Math.sqrt(chi / 2)).toFixed(4) };
}

const AT = [6, 12, 24, 48, 72];
const out = { check, end: new Date(END).toISOString(), start: new Date(START).toISOString() };
out.firstFix = km(S, 'firstFix', AT);
out.material = km(S, 'material', AT);
const MID = START + (END - START) / 2; out.midpoint = new Date(MID).toISOString();
const early = S.filter((t) => t.s.last < MID), late = S.filter((t) => t.s.last >= MID);
out.phase = { early: km(early, 'firstFix', [6, 12, 24, 48]), late: km(late, 'firstFix', [6, 12, 24, 48]), logrank: logrank(early, late, 'firstFix') };
out.phase.verdict = out.phase.logrank.p < 0.05 ? 'differs' : 'no difference found';
out.byRole = {};
for (const role of [...new Set(S.map((t) => t.role))]) { const g = S.filter((t) => t.role === role); if (g.length >= 20) out.byRole[role] = km(g, 'firstFix', [6, 24]); }
const s72 = out.firstFix.at.find((x) => x.hours === 72);
out.rule = { survival72: s72.survival, atRisk72: s72.atRisk, verdict: s72.survival <= 50 ? 'agrees' : 'disagrees' };
fs.writeFileSync(path.join(D, 'results-survival.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({ check, n: out.firstFix.n }));
