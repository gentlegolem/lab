// Attribution of commits to agent tasks and the rework / revert / landing-gate signals (adapted from the studio's own scorer).
// Signals: checks (no check-failed before the first landed entry), land (no conflict / push failure before it), rework (lines of later fix-like
// commits <= N days on files the task touched, relative to the task's own lines), revert (a later commit reverts one of the task's commits).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const REPO = path.resolve(process.env.RESIDENCY_REPO || process.cwd());

const WEIGHTS = { checks: 20, land: 10, rework: 30, revert: 15, verify: 15, notes: 10 };
const MIN_SIGNALS = 2;
const STRONG = ['checks', 'land', 'rework', 'verify'];
const THIN_N = 5;
const REWORK_DAYS = 3;
const WINDOW_LAG_MIN = 40; // a commit lands up to this long after its agent's last message
const FIX_RE = /\b(fix\w*|hotfix|regress\w*|revert\w*|verify|retest|bugs?|note-[\w-]+|owner[- ]?notes?)\b/i;
const NOISE_PATH = require('../config').noiseRe;
const canonProject = (p) => p || '';
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const median = (xs) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); if (!s.length) return NaN; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasId = (text, id) => !!id && new RegExp(`(^|[^A-Za-z0-9-])${escRe(id)}($|[^A-Za-z0-9-])`).test(text);
const tagOf = (subject) => { const m = String(subject).match(/^\[(\w+)\]/); return m ? m[1] : ''; };
const isFold = (subject) => /\] Fold \d+ note\(s\)/.test(subject);

// ---------- inputs ----------
// git log -> [{ sha, t (ms, author date), subject, body, files: [{ path, add, del }] }] oldest first (history order, not date order:
// a rebased commit keeps its author date, so the order matters for "commits between two lands")
function parseGitLog(text) {
	const out = [];
	for (const chunk of String(text).split('\x01')) {
		if (!chunk.trim()) continue;
		const end = chunk.indexOf('\x03');
		if (end < 0) continue;
		const [sha, at, subject, body] = chunk.slice(0, end).split('\x02');
		const files = [];
		for (const line of chunk.slice(end + 1).split('\n')) {
			const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
			if (m) files.push({ path: m[3], add: m[1] === '-' ? 1 : Number(m[1]), del: m[2] === '-' ? 0 : Number(m[2]) });
		}
		out.push({ sha, t: Number(at) * 1000, subject: subject || '', body: body || '', files });
	}
	return out.reverse(); // git log prints newest first
}
// <git common dir>/land.log: "<iso>\t<branch>\t<result>\t<extra>"
function parseLandLog(text) {
	return String(text || '').split('\n').filter(Boolean).map((l) => { const [iso, branch, result, extra] = l.split('\t'); return { t: Date.parse(iso), branch, result, extra: extra || '' }; });
}
// ---------- pure scoring pieces ----------
// Ledger rows -> tasks (session + task id; an id-less row is its own task). `date` of the first row.
function groupRows(rows) {
	const map = new Map();
	for (const r of rows) {
		const key = r.task_id ? `${r.session}|${r.task_id}` : `agent|${r.agent_id}`;
		const t = map.get(key) || { key, id: r.task_id || '', rows: [], order: map.size };
		t.rows.push(r);
		map.set(key, t);
	}
	return [...map.values()].map((t) => {
		const rs = t.rows;
		const starts = rs.map((r) => Date.parse(r.date)).filter(Number.isFinite);
		const start = starts.length ? Math.min(...starts) : NaN;
		const end = Math.max(...rs.map((r) => { const s = Date.parse(r.date); return Number.isFinite(s) ? s + (Number(r.minutes) || 0) * 60000 : NaN; }).filter(Number.isFinite), start);
		return {
			...t, start, end, project: canonProject(rs.find((r) => r.project)?.project), agents: rs.map((r) => r.agent_id),
			model: [...new Set(rs.map((r) => r.model).filter(Boolean))].join('+') || '(unknown)',
			type: rs.find((r) => r.task_type)?.task_type || require('./ledger').taskType(rs.find((r) => r.note)?.note || '', t.id), agentType: rs.find((r) => r.agent_type)?.agent_type || '',
			briefChars: Math.max(0, ...rs.map((r) => Number(r.brief_chars) || 0)), instr: rs.find((r) => r.instr)?.instr || '',
			what: rs.find((r) => r.note)?.note || t.id, seed: rs.every((r) => String(r.agent_id).startsWith('seed:')),
		};
	});
}

// Which commits belong to which task. By task id in the subject; an id-less task by its run window, when exactly one task
// of that project could have made the commit. Returns Map(taskKey -> commit[]) and the method per task.
// a run's project name and a commit tag name the same project when one contains the other or they share a 4-letter start
const sameProject = (a, b) => { const x = String(a).toLowerCase(); const y = String(b).toLowerCase(); return !!x && !!y && (x.includes(y) || y.includes(x) || x.slice(0, 4) === y.slice(0, 4)); };
function attribute(tasks, commits, landLog = []) {
	const ids = tasks.filter((t) => t.id).map((t) => t.id);
	const res = new Map();
	for (const t of tasks) res.set(t.key, { commits: [], how: '' });
	for (const c of commits) {
		if (isFold(c.subject)) continue;
		let byId = false;
		for (const t of tasks) if (t.id && hasId(c.subject, t.id)) {
			// longest id wins: "A-FIX-UI" must not also feed "A-FIX"
			if (ids.some((o) => o.length > t.id.length && hasId(c.subject, o) && o.includes(t.id))) continue;
			res.get(t.key).commits.push(c); res.get(t.key).how = 'id'; byId = true;
		}
		if (byId || ids.some((o) => hasId(c.subject, o))) continue;
		const proj = tagOf(c.subject);
		const claim = tasks.filter((t) => !t.id && !t.seed && t.project && sameProject(t.project, proj) && c.t >= t.start - 5 * 60000 && c.t <= t.end + WINDOW_LAG_MIN * 60000);
		if (claim.length === 1) { const r = res.get(claim[0].key); r.commits.push(c); r.how = r.how || 'window'; }
	}
	// A landed branch: the commits between the previous landed head and its head (lands are serialized), authored during the run.
	const pos = new Map(commits.map((c, i) => [c.sha.slice(0, 8), i]));
	const landed = landLog.filter((e) => e.result === 'landed').sort((a, b) => a.t - b.t).map((e) => ({ ...e, i: pos.get((e.extra.split(' ')[0] || '').slice(0, 8)) })).filter((e) => e.i !== undefined);
	for (const t of tasks) {
		const branches = new Set(t.agents.map((id) => `worktree-agent-${id}`));
		for (let k = 0; k < landed.length; k++) {
			if (!branches.has(landed[k].branch)) continue;
			const from = k > 0 ? Math.min(landed[k - 1].i, landed[k].i) : landed[k].i - 8;
			const r = res.get(t.key);
			for (const c of commits.slice(from + 1, landed[k].i + 1)) {
				if (isFold(c.subject) || r.commits.includes(c) || c.t < t.start - 5 * 60000 || c.t > t.end + WINDOW_LAG_MIN * 60000) continue;
				if (ids.some((o) => o !== t.id && hasId(c.subject, o) && !(t.id && o.includes(t.id)))) continue; // another task's commit
				r.commits.push(c); r.how = r.how ? r.how : 'land';
			}
		}
	}
	for (const r of res.values()) r.commits.sort((a, b) => commits.indexOf(a) - commits.indexOf(b));
	return res;
}

// Land log entries of a task's agent branches -> { landed, conflicts, checkFails, pushFails } or null (no entries / never landed).
function landSignals(entries) {
	if (!entries.length) return null;
	let conflicts = 0; let checkFails = 0; let pushFails = 0; let landed = false;
	for (const e of entries.sort((a, b) => a.t - b.t)) {
		if (e.result === 'landed') { landed = true; break; }
		if (e.result === 'conflict') conflicts++;
		else if (e.result === 'check-failed') checkFails++;
		else if (e.result === 'push-failed' || e.result === 'bad-note') pushFails++;
	}
	return landed ? { conflicts, checkFails, pushFails } : null;
}

const codeFiles = (commits) => {
	const m = new Map();
	for (const c of commits) for (const f of c.files) if (!NOISE_PATH.test(f.path)) m.set(f.path, (m.get(f.path) || 0) + f.add + f.del);
	return m;
};
const isFixLike = (c) => FIX_RE.test(c.subject) || /(^|[^A-Z])(FIX|NOTE|VERIFY)(-|\b)/.test(c.subject);

// Lines of later fix-like commits (<= days) on the files this task touched, relative to the task's own lines.
// later = all commits (any order); own = the task's commit shas. -> { ratio, fixCommits, taskLines } or null (no code files).
function reworkSignal(own, all, days = REWORK_DAYS, taskId = '') {
	if (!own.length) return null;
	const mine = codeFiles(own);
	if (!mine.size) return null;
	const taskLines = [...mine.values()].reduce((a, b) => a + b, 0);
	const last = Math.max(...own.map((c) => c.t));
	const shas = new Set(own.map((c) => c.sha));
	const perFile = new Map(); const fixes = [];
	for (const c of all) {
		if (c.t <= last || c.t > last + days * 86400e3 || shas.has(c.sha) || isFold(c.subject) || !isFixLike(c)) continue;
		if (taskId && hasId(c.subject, taskId)) continue; // the task's own later commits are not rework by a later task
		let hit = false;
		for (const f of c.files) if (mine.has(f.path)) { perFile.set(f.path, (perFile.get(f.path) || 0) + f.add + f.del); hit = true; }
		if (hit) fixes.push(c.sha);
	}
	// per file, the fix lines count at most the task's own lines in that file: the ratio is "share of the task's lines re-touched"
	let lines = 0;
	for (const [p, n] of perFile) lines += Math.min(n, mine.get(p));
	return { ratio: lines / Math.max(taskLines, 1), fixCommits: fixes.length, taskLines, fixLines: lines };
}

function revertSignal(own, all) {
	if (!own.length) return null;
	const shas = own.map((c) => c.sha);
	const last = Math.max(...own.map((c) => c.t));
	for (const c of all) {
		if (c.t < last && !own.some((o) => o.t === c.t)) continue;
		if (/^Revert\b/i.test(c.subject) || /^\[\w+\] Revert\b/i.test(c.subject)) {
			if (shas.some((s) => c.body.includes(s))) return { reverted: true, by: c.sha };
			const quoted = (c.subject.match(/"(.+)"/) || [])[1];
			if (quoted && own.some((o) => o.subject.includes(quoted) || quoted.includes(o.subject))) return { reverted: true, by: c.sha };
		}
	}
	return { reverted: false };
}

const PASS_RE = /\b(pass(ed)?|verified|green|re-seen)\b|✅/i;
const FAIL_RE = /\b(fail(ed|s)?|broken|not fixed|regress\w*)\b|❌|✗/i;
function verifySignal(id, lines) {
	if (!id) return null;
	let pass = 0; let fail = 0;
	for (const l of lines) if (hasId(l.line, id)) { if (FAIL_RE.test(l.line)) fail++; if (PASS_RE.test(l.line)) pass++; }
	if (!pass && !fail) return null;
	return { pass, fail, result: fail && pass ? 'mixed' : fail ? 'fail' : 'pass' };
}

// Feature words of a task: file basenames and subject words (>= 5 letters, not boilerplate).
const ladder = (n, step) => Math.max(0, 100 - step * n);
// signals -> { score, parts, n, confidence }. Missing signals (null) are skipped; < MIN_SIGNALS -> score null.
function scoreTask(s) {
	const parts = {};
	if (s.checks) parts.checks = s.checks.checkFails === 0 ? 100 : s.checks.checkFails === 1 ? 40 : 0;
	if (s.land) parts.land = ladder(s.land.conflicts + s.land.pushFails, 30);
	if (s.rework) parts.rework = Math.round(100 * (1 - Math.min(1, s.rework.ratio)));
	if (s.revert) parts.revert = s.revert.reverted ? 0 : 100;
	if (s.verify) parts.verify = s.verify.result === 'pass' ? 100 : s.verify.result === 'mixed' ? 50 : 0;
	if (s.notes) parts.notes = ladder(s.notes.count, 25);
	const keys = Object.keys(parts);
	const n = keys.length;
	const strong = keys.filter((k) => STRONG.includes(k)).length; // revert / notes are absence-of-bad-news signals: weak evidence
	const w = keys.reduce((a, k) => a + WEIGHTS[k], 0);
	const score = n >= MIN_SIGNALS ? Math.round(keys.reduce((a, k) => a + parts[k] * WEIGHTS[k], 0) / w) : null;
	return { score, parts, n, strong, confidence: strong >= 3 ? 'high' : strong === 2 ? 'medium' : strong === 1 ? 'low' : 'none' };
}

// Everything together. inputs: { rows, commits, landLog, notes, verifyLines, days }
function evaluate({ rows, commits, landLog = [], notes = [], verifyLines = [], days = REWORK_DAYS }) {
	const tasks = groupRows(rows);
	const att = attribute(tasks, commits, landLog);
	const newest = commits.length ? Math.max(...commits.map((c) => c.t)) : 0;
	return tasks.map((t) => {
		const a = att.get(t.key);
		const own = a.commits;
		const branches = new Set(t.agents.map((id) => `worktree-agent-${id}`));
		const land = landSignals(landLog.filter((e) => branches.has(e.branch)));
		const signals = {
			checks: land ? { checkFails: land.checkFails } : null,
			land: land ? { conflicts: land.conflicts, pushFails: land.pushFails } : null,
			rework: reworkSignal(own, commits, days, t.id),
			revert: revertSignal(own, commits),
			verify: verifySignal(t.id, verifyLines),
			notes: null,
		};
		const sc = own.length ? scoreTask(signals) : { score: null, parts: {}, n: 0, strong: 0, confidence: 'none' }; // no commits found = nothing to judge
		const lastT = own.length ? Math.max(...own.map((c) => c.t)) : 0;
		return { ...t, rows: undefined, commits: own.length, provisional: !!signals.rework && lastT + days * 86400e3 > newest, // rework window not over yet
		 shas: own.map((c) => c.sha.slice(0, 8)), attribution: a.how || 'none', first: own[0]?.subject || '', signals, ...sc };
	});
}

module.exports = { WEIGHTS, parseGitLog, parseLandLog, groupRows, attribute, landSignals, reworkSignal, revertSignal, scoreTask, evaluate, hasId, isFixLike };
