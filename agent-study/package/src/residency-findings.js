#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Read-only analysis of how Claude models behaved in an agent pipeline (see ../README.md).
// Usage:  node src/residency-findings.js [finding|all]      finding = 1 | 2 | 3 | 6 | 7 | 8 | 9 | 10 (default all). Prints markdown tables to stdout; writes nothing.
// Inputs (arguments are environment variables, nothing is hard-coded):
//   RESIDENCY_TRANSCRIPTS  folder of Claude Code sessions: <dir>/<session>/subagents/agent-*.jsonl (+ agent-*.meta.json), default ~/.claude/projects/<one project>
//   RESIDENCY_REPO         a git checkout of the studio's repository (commit history for the rework signal), default the current folder
//   RESIDENCY_LEDGER       the estimate ledger CSV (required)
//   RESIDENCY_LAND_LOG     the landing log (tab-separated: iso, branch, result, extra); optional, the gate rows are empty without it
//   RESIDENCY_UNTIL        optional end date (ISO, e.g. 2026-11-10T00:00:00Z): every finding uses only data from before it
//   RESIDENCY_CONFIG       optional JSON of studio-specific settings (see src/config.js and config.example.json)
// Only aggregate numbers are printed: no transcript text, no ids.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(process.env.RESIDENCY_REPO || process.cwd());
const { loadRuns, ROOT } = require('./lib/usage');
const L = require('./lib/ledger');
const C = require('./config');
const LEDGER_FILE = process.env.RESIDENCY_LEDGER;
if (!LEDGER_FILE) { console.error('Set RESIDENCY_LEDGER to the estimate ledger CSV (see README.md).'); process.exit(1); }
const LAND_LOG = process.env.RESIDENCY_LAND_LOG || '';
// one end date for every data source (runs by start time, ledger seed rows, commits, landing log, hook refusals)
const UNTIL = process.env.RESIDENCY_UNTIL ? Date.parse(process.env.RESIDENCY_UNTIL) : Infinity;
if (Number.isNaN(UNTIL)) { console.error('RESIDENCY_UNTIL is not a date: ' + process.env.RESIDENCY_UNTIL); process.exit(1); }
const before = (ms) => !(ms >= UNTIL);
const TS_RE = /"timestamp":"([^"]+)"/;
const lineBefore = (line) => { const m = line.match(TS_RE); return !m || before(Date.parse(m[1])); };
const landText = () => (LAND_LOG && fs.existsSync(LAND_LOG) ? fs.readFileSync(LAND_LOG, 'utf8').split('\n').filter((l) => l && before(Date.parse(l.split('\t')[0]))).join('\n') : '');
const isPass2 = (t) => C.pass2Re.test(t.taskId || '');

// ---- dated rule changes (commit author dates, converted to UTC; edit for another studio) ----
const T = {
	sonnetDefault: Date.parse('2026-10-26T12:38:52Z'), // project agents default to Sonnet, Opus only by override
	capOn: Date.parse('2026-10-29T09:18:07Z'), // agent tasks <= 150k tokens (hard), ESTIMATE line required
	capWarn: Date.parse('2026-10-29T10:24:43Z'), // > 150k is a warning only
	judge: Date.parse('2026-10-31T00:00:00Z'), // a fresh Opus judge decides each ui-rework round
};
const CAP = 150000;
// a brief that states a ~150k per-task budget ("aim for <= 150k", "Budget <= 150k", "ESTIMATE ... 150k tokens", "tasks of about 150k each")
const CAP_RE = /(budget|aim for|estimate|tasks? of|<=|≤)[^\n]{0,70}150\s?k/i;
const READONLY = ['Explore', 'Plan', 'claude-code-guide', 'statusline-setup'];

// ---- stats ----
const num = (v) => (v === '' || v === undefined || v === null ? NaN : Number(v));
const q = (xs, p) => {
	const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
	if (!s.length) return NaN;
	const i = (s.length - 1) * p; const lo = Math.floor(i); const hi = Math.ceil(i);
	return s[lo] + (s[hi] - s[lo]) * (i - lo);
};
const med = (xs) => q(xs, 0.5);
const k = (x) => (Number.isFinite(x) ? `${Math.round(x / 1000)}k` : 'n/a');
const m1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : 'n/a');
const r2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : 'n/a');
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : 'n/a');
const row = (...c) => `| ${c.join(' | ')} |`;
const head = (...c) => `${row(...c)}\n${row(...c.map(() => '---'))}`;
const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);

// ---- transcript scan: engine tool calls, usage-limit endings (one pass over every subagent file) ----
function listFiles() {
	const out = [];
	if (!fs.existsSync(ROOT)) return out;
	for (const s of fs.readdirSync(ROOT)) {
		const base = path.join(ROOT, s, 'subagents');
		if (!fs.existsSync(base)) continue;
		const dirs = [base];
		const wf = path.join(base, 'workflows');
		if (fs.existsSync(wf)) for (const r of fs.readdirSync(wf)) dirs.push(path.join(wf, r));
		for (const d of dirs) if (fs.statSync(d).isDirectory()) for (const f of fs.readdirSync(d)) if (/^agent-.*\.jsonl$/.test(f)) out.push(path.join(d, f));
	}
	return out;
}
const LIMIT_RE = /usage limit|hit your limit|limit (reached|will reset)|you've reached your/i;
function scanFile(file) {
	const txt = fs.readFileSync(file, 'utf8');
	const lines = txt.split('\n').filter(Boolean);
	const engine = C.engineCallRe ? (txt.match(C.engineCallRe) || []).length : 0;
	const tail = lines.slice(-3).join('\n');
	// final report = the last assistant text (or the SubagentHandback message); gate runs = Bash calls of check.js / land.js / tests (finding 9)
	let finalText = '';
	for (let i = lines.length - 1; i >= Math.max(0, lines.length - 40) && !finalText; i--) {
		if (!lines[i].includes('"type":"assistant"')) continue;
		try {
			for (const b of ((JSON.parse(lines[i]).message || {}).content || [])) {
				if (b.type === 'text' && b.text) finalText += b.text;
				else if (b.type === 'tool_use' && b.name === 'SubagentHandback' && b.input) finalText += String(b.input.message || '');
			}
		} catch (e) { /* not a message line */ }
	}
	const gateRuns = (txt.match(/"name":"(Bash|PowerShell)","input":\{"command":"[^"]*(check\.js|land\.js|heavy\.ps1|\.test\.|run-tests|--test|soak|smoke)/g) || []).length;
	// idle pauses: the longest gap between two messages, and the span with every gap capped at 10 minutes
	const ts = []; for (const l of lines) { const m = l.match(TS_RE); if (m) { const t = Date.parse(m[1]); if (t) ts.push(t); } }
	ts.sort((a, b) => a - b);
	let maxGap = 0; let active = 0;
	for (let i = 1; i < ts.length; i++) { const g = ts[i] - ts[i - 1]; maxGap = Math.max(maxGap, g); active += Math.min(g, 10 * 60000); }
	return { engine, finalText, gateRuns, limitEnd: LIMIT_RE.test(tail), maxGapMin: maxGap / 60000, spanMin: ts.length > 1 ? (ts[ts.length - 1] - ts[0]) / 60000 : NaN, activeMin: ts.length > 1 ? active / 60000 : NaN, id: path.basename(file).replace(/^agent-|\.jsonl$/g, '') };
}

// free-text types from ESTIMATE lines ("feature", "fix", "analysis"...) -> the nine task types of the studio's estimating guide
function canon(t, desc, id) {
	const x = String(t || '').toLowerCase();
	const hit = L.TASK_TYPES.find((y) => y.toLowerCase() === x);
	if (hit) return hit;
	if (/verify/.test(x)) return 'engine verify';
	if (/fix|bug|note/.test(x)) return 'fix pass';
	if (/research|analysis|audit|review|study/.test(x)) return 'research';
	if (/doc|writ|log|retro/.test(x)) return 'docs';
	if (/tool|editor|kit|script/.test(x)) return 'tooling / editors';
	if (/art|asset|mesh|model|texture/.test(x)) return 'asset generation / art';
	if (/ui|polish|hud/.test(x)) return 'polish / UI';
	if (/new system/.test(x)) return 'new system';
	if (/feature|build|system/.test(x)) return 'feature in existing system';
	return L.taskType(desc, id);
}

// ---- dataset: one row per agent run, one task per (session, task id) ----
let CACHE;
function data() {
	if (CACHE) return CACHE;
	const scan = new Map(listFiles().map((f) => { const s = scanFile(f); return [s.id, s]; }));
	const ledger = L.parseCsv(fs.readFileSync(LEDGER_FILE, 'utf8'));
	const byId = new Map(ledger.map((r) => [r.agent_id, r]));
	const runs = [];
	for (const r of loadRuns({ since: 0 })) {
		if (!r.first || !before(r.first) || READONLY.includes(r.type)) continue;
		const models = (r.models || []).filter((m) => m !== '<synthetic>');
		if (!models.length || !r.toolCalls) continue;
		const id = L.taskIdOf(r.desc);
		const e = L.parseEstimate(r.brief);
		const old = byId.get(r.id);
		const estTok = e && Number.isFinite(e.tokens) ? e.tokens : (old ? num(old.est_tokens) : NaN);
		const estMin = e && Number.isFinite(e.minutes) ? e.minutes : (old ? num(old.est_minutes) : NaN);
		const sc = scan.get(r.id) || { engine: 0, limitEnd: false };
		runs.push({
			id: r.id, session: r.session, taskId: id, desc: r.desc, type: r.type, ts: r.first,
			model: /opus/.test(models[0]) ? 'Opus' : /sonnet/.test(models[0]) ? 'Sonnet' : /haiku/.test(models[0]) ? 'Haiku' : models[0],
			requested: r.requestedModel || '', reported: r.input + r.output + r.cacheWrite, inclCache: r.input + r.output + r.cacheWrite + r.cacheRead,
			minutes: r.minutes, calls: r.toolCalls, estTok, estMin, briefEst: !!e,
			estMinRec: old ? num(old.est_minutes) : NaN, estMinRaw: old ? num(old.est_minutes_raw) : NaN,
			taskType: canon((e && e.type) || (old && old.task_type), r.desc, id), cls: old && old.class ? old.class : L.classify(id),
			cap150: CAP_RE.test(r.brief), seeded: !!(old && String(old.agent_id).startsWith('seed:')), engine: sc.engine, finalText: sc.finalText || '', gateRuns: sc.gateRuns || 0, limitEnd: sc.limitEnd,
			maxGapMin: sc.maxGapMin || 0, spanMin: Number.isFinite(sc.spanMin) ? sc.spanMin : NaN, activeMin: Number.isFinite(sc.activeMin) ? sc.activeMin : NaN,
			brief: r.brief || '',
		});
	}
	// seed rows (the first night, no transcripts) are real runs of the ledger too
	const haveIds = new Set(runs.map((r) => r.taskId).filter(Boolean));
	const seedBy = new Map(ledger.filter((o) => String(o.agent_id).startsWith('seed:')).map((o) => [o.task_id, o]));
	for (const r of runs) { // the same task seen twice: keep the transcript run, take the estimate and type from the seed row
		const o = r.taskId && seedBy.get(r.taskId);
		if (!o || r.ts > Date.parse('2026-10-22T00:00:00Z')) continue;
		if (!(r.estTok > 0)) { r.estTok = num(o.est_tokens); r.estMin = num(o.est_minutes); }
		if (o.task_type) r.taskType = o.task_type;
		if (o.class) r.cls = o.class;
	}
	for (const o of ledger) {
		if (!String(o.agent_id).startsWith('seed:') || haveIds.has(o.task_id) || !before(Date.parse(o.date))) continue; // a seed row whose task also has a transcript is the same run
		runs.push({ id: o.agent_id, session: o.session, taskId: o.task_id, desc: o.note, type: '', ts: Date.parse(o.date), model: 'Opus', requested: '',
			reported: num(o.reported), inclCache: num(o.incl_cache), minutes: num(o.minutes), calls: num(o.calls), estTok: num(o.est_tokens), estMin: num(o.est_minutes),
			cap150: true, briefEst: false, taskType: o.task_type || L.taskType(o.note, o.task_id), cls: o.class, seeded: true, engine: 0, limitEnd: false, brief: '' });
	}
	// tasks: runs sharing a task id in one session are one task (a restart after a limit adds a run)
	const tasks = new Map();
	for (const r of runs.sort((a, b) => a.ts - b.ts)) {
		const key = r.taskId ? `${r.session}|${r.taskId}` : r.id;
		const t = tasks.get(key) || { key, runs: [], ts: r.ts, model: r.model, taskType: r.taskType, cls: r.cls, taskId: r.taskId, estTok: NaN, estMin: NaN, estMinRec: NaN, estMinRaw: NaN };
		t.runs.push(r);
		if (Number.isFinite(r.estTok)) t.estTok = Math.max(Number.isFinite(t.estTok) ? t.estTok : 0, r.estTok);
		if (Number.isFinite(r.estMin)) t.estMin = Math.max(Number.isFinite(t.estMin) ? t.estMin : 0, r.estMin);
		for (const kk of ['estMinRec', 'estMinRaw']) if (Number.isFinite(r[kk])) t[kk] = Math.max(Number.isFinite(t[kk]) ? t[kk] : 0, r[kk]);
		tasks.set(key, t);
	}
	const T2 = [...tasks.values()].map((t) => ({
		...t, reported: t.runs.reduce((a, r) => a + r.reported, 0), minutes: t.runs.reduce((a, r) => a + r.minutes, 0), calls: t.runs.reduce((a, r) => a + r.calls, 0),
		cap150: t.runs.some((r) => r.cap150), restarts: t.runs.length - 1, limitEnds: t.runs.filter((r) => r.limitEnd).length, engine: t.runs.reduce((a, r) => a + r.engine, 0),
	}));
	CACHE = { runs, tasks: T2 };
	return CACHE;
}
const builds = (tasks) => tasks.filter((t) => t.cls !== 'tiny' && t.calls >= 5); // tiny canaries and runs of < 5 tool calls are not tasks

// rework signal from the existing scorer (git history, 3-day window): task key -> { score, rework, confidence }
let COMMITS;
function commitLog() {
	if (COMMITS) return COMMITS;
	const E = require('./lib/evals');
	const txt = execFileSync('git', ['log', '--no-merges', '--format=%x01%H%x02%at%x02%s%x02%b%x03', '--numstat', '--no-renames', 'HEAD'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 29 });
	COMMITS = E.parseGitLog(txt).filter((c) => before(c.t)); // author time, the same clock the metrics use
	L.setTags(COMMITS.map((c) => (c.subject.match(/^\[(\w+)\]/) || [])[1]).filter(Boolean)); // commit tags = the project names
	return COMMITS;
}
let RW;
function reworkMap() {
	if (RW) return RW;
	RW = new Map();
	try {
		const E = require('./lib/evals');
		commitLog();
		const rows = data().runs.filter((r) => !r.seeded).map((r) => ({ agent_id: r.id, date: new Date(r.ts).toISOString(), session: r.session, task_id: r.taskId,
			project: L.projectOf(r.type, r.desc), class: r.cls, model: r.model, requested_model: r.requested, calls: r.calls, minutes: String(r.minutes), reported: r.reported,
			incl_cache: r.inclCache, est_tokens: r.estTok, est_minutes: r.estMin, task_type: r.taskType, note: r.desc, agent_type: r.type, brief_chars: r.brief.length, skills: '', instr: '' }));
		const lp = LAND_LOG;
		const landLog = E.parseLandLog(landText());
		const tasks = E.evaluate({ rows, commits: commitLog(), landLog, notes: [], verifyLines: [], days: 3 });
		for (const t of tasks) for (const a of t.agents || []) RW.set(a, t);
	} catch (e) { console.error('rework map failed:', e.message); }
	return RW;
}

// ---- finding 1: model per task ----
function f1() {
	const { tasks, runs } = data();
	const rw = reworkMap();
	const A = builds(tasks).filter((t) => t.ts < T.sonnetDefault);
	const B = builds(tasks).filter((t) => t.ts >= T.sonnetDefault);
	const stat = (ts) => {
		const rwTasks = ts.map((t) => rw.get(t.runs[0].id)).filter((x) => x && x.parts && Number.isFinite(x.parts.rework));
		return { n: ts.length, tok: med(ts.map((t) => t.reported)), min: med(ts.map((t) => t.minutes)), calls: med(ts.map((t) => t.calls)),
			restart: ts.filter((t) => t.restarts > 0).length, fix: ts.filter((t) => t.taskType === 'fix pass').length, rwN: rwTasks.length,
			rw: `median ${Math.round(med(rwTasks.map((x) => x.parts.rework)))}, ${pct(rwTasks.filter((x) => x.parts.rework < 100).length, rwTasks.length)} below 100 (n ${rwTasks.length})` };
	};
	const types = [...new Set(builds(tasks).map((t) => t.taskType))];
	let o = '#### 1a. Era comparison by task class (all models in the era)\n\n';
	o += head('Task class', 'Era', 'n tasks', 'Median tokens', 'Median agent-min', 'Median calls', 'Restarted', 'Rework sub-score (100 = none seen)') + '\n';
	for (const ty of types.concat(['ALL'])) {
		for (const [nm, set] of [['A: all Opus (before 2026-10-26)', A], ['B: model per task (from 2026-10-26)', B]]) {
			const s = stat(ty === 'ALL' ? set : set.filter((t) => t.taskType === ty));
			if (s.n < 3 && ty !== 'ALL') continue;
			o += row(ty, nm, s.n, k(s.tok), m1(s.min), Math.round(s.calls), `${s.restart} (${pct(s.restart, s.n)})`, s.rw) + '\n';
		}
	}
	o += '\n#### 1b. Inside era B: Sonnet vs Opus by task class\n\n';
	o += head('Task class', 'Model', 'n tasks', 'Median tokens', 'Median agent-min', 'Restarted', 'Rework sub-score (100 = none seen)') + '\n';
	for (const ty of types.concat(['ALL'])) {
		for (const mdl of ['Sonnet', 'Opus']) {
			const set = B.filter((t) => t.model === mdl && (ty === 'ALL' || t.taskType === ty));
			if (set.length < 3) continue;
			const s = stat(set);
			o += row(ty, mdl, s.n, k(s.tok), m1(s.min), `${s.restart} (${pct(s.restart, s.n)})`, s.rw) + '\n';
		}
	}
	const share = (set, m) => `${set.filter((t) => t.model === m).length} of ${set.length}`;
	o += `\nModel mix: era A Opus ${share(A, 'Opus')}, Sonnet ${share(A, 'Sonnet')}; era B Opus ${share(B, 'Opus')}, Sonnet ${share(B, 'Sonnet')}.\n`;
	// agent-minutes are wall-clock spans (first to last message): how much idle pauses weigh
	const rs = runs.filter((r) => !r.seeded);
	o += `\nIdle pauses: ${rs.filter((r) => r.maxGapMin > 15).length} of ${rs.length} runs paused over 15 minutes between two messages (${rs.filter((r) => r.maxGapMin > 60).length} over an hour). Median minutes per run from the transcript timestamps: ${m1(med(rs.map((r) => r.spanMin)))} first to last message, ${m1(med(rs.map((r) => r.activeMin)))} with every pause capped at 10 minutes (agent-minutes as used in the tables: ${m1(med(rs.map((r) => r.minutes)))}).\n`;
	return o;
}

// ---- finding 2: context budget ----
function f2() {
	const { tasks, runs } = data();
	const rw = reworkMap();
	const P1 = Date.parse('2026-10-19T21:12:00Z'); // first architect pass: the planning run that cut the build into <= ~150k tasks
	const P1END = Date.parse('2026-10-21T03:00:00Z'); // last brief of that night that states a 150k budget: 2026-10-21 01:18 UTC
	const P2 = Date.parse('2026-10-31T21:07:00Z'); // second architect pass: a feature on existing code split into build tasks of about 150k each
	const B = builds(tasks);
	const groups = [
		['0. Before pass 1 (2026-10-10 to 10-19), all Opus, no per-task budget', B.filter((t) => t.ts < P1)],
		['1. Pass 1 tasks: night of 10-19/21, brief or plan states <= 150k', B.filter((t) => t.ts >= P1 && t.ts < P1END && t.cap150)],
		['1x. Same days, no 150k statement', B.filter((t) => t.ts >= P1 && t.ts < P1END && !t.cap150)],
		['2a. Between the passes (10-21 to 10-31), briefs that state ~150k', B.filter((t) => t.ts >= P1END && t.ts < P2 && t.cap150)],
		['2b. Between the passes, briefs with no 150k statement', B.filter((t) => t.ts >= P1END && t.ts < P2 && !t.cap150)],
		['3. Pass 2 tasks (one architect plan, 15 tasks of ~150k, Sonnet builders)', B.filter(isPass2)],
		['4. After pass 2 (from 10-31 21:07 UTC), other tasks', B.filter((t) => t.ts >= P2 && !isPass2(t))],
	];
	let p = head('Cohort (by planning pass)', 'n tasks', 'Median tokens', 'Over 150k', 'Restarted (>1 agent)', 'Ended on a usage limit', 'Median actual / estimate (n)', 'Rework sub-score (n)') + '\n';
	for (const [nm, ts] of groups) {
		const est = ts.filter((t) => t.estTok > 0);
		const rs = ts.map((t) => rw.get(t.runs[0].id)).filter((x) => x && x.parts && Number.isFinite(x.parts.rework)).map((x) => x.parts.rework);
		p += row(nm, ts.length, k(med(ts.map((t) => t.reported))), `${ts.filter((t) => t.reported > CAP).length} (${pct(ts.filter((t) => t.reported > CAP).length, ts.length)})`,
			ts.filter((t) => t.restarts > 0).length, ts.filter((t) => t.limitEnds > 0).length, `${r2(med(est.map((t) => t.reported / t.estTok)))} (${est.length})`,
			`${Math.round(med(rs))} (${rs.length})`) + '\n';
	}
	// when each wording of the budget first shows up in an agent brief
	const first = (re, skip) => { const h = runs.filter((r) => re.test(r.brief) && !(skip && skip.test(r.brief))).sort((a, b) => a.ts - b.ts); return h.length ? `${dayOf(h[0].ts)} (${h.length} briefs)` : 'not found in any brief'; };
	p += '\n' + head('Wording of the budget in agent briefs', 'First seen (number of briefs)') + '\n';
	p += row('"Budget: aim for <= 150k reported tokens"', first(/aim for\s*(<=|≤)\s*150k/i)) + '\n';
	p += row('"Budget <= 150k reported tokens, <= N calls"', first(/Budget:?\s*(<=|≤)\s*150k/i)) + '\n';
	p += row('"ESTIMATE: ... 150k tokens" (estimate line)', first(/ESTIMATE:[^\n]*150\s?k/)) + '\n';
	p += row('"(hard cap 150k / 180k / 200k)" next to an estimate', first(/ESTIMATE:[^\n]*hard cap/i)) + '\n';
	p += row('"build tasks of about 150k reported tokens each" (architect pass 2)', first(/about \*{0,2}150k reported tokens each/i)) + '\n';
	p += row('"aim close to 150k" (or near / up to)', first(/(aim|close|near|up)\s+(close\s+)?(to|for)?\s*(about |~)?150k|close to 150k/i, /Architect memory/)) + '\n';
	p += '\n';
	const W = [['W0: before the config rule (before 2026-10-29 05:18 local)', (t) => t.ts < T.capOn], ['W1: hard 150k cap (66 minutes)', (t) => t.ts >= T.capOn && t.ts < T.capWarn],
		['W2: 150k is a warning only (from 2026-10-29 06:24 local)', (t) => t.ts >= T.capWarn]];
	let o = p + head('Window', 'n tasks', 'with an estimate', 'Median estimate', 'Median actual tokens', 'Tasks over 150k actual', 'Restarted tasks (>1 agent)', 'Tasks ended by a usage limit') + '\n';
	for (const [nm, f] of W) {
		const ts = builds(tasks).filter(f);
		const est = ts.filter((t) => t.estTok > 0);
		o += row(nm, ts.length, est.length, k(med(est.map((t) => t.estTok))), k(med(ts.map((t) => t.reported))), `${ts.filter((t) => t.reported > CAP).length} (${pct(ts.filter((t) => t.reported > CAP).length, ts.length)})`,
			`${ts.filter((t) => t.restarts > 0).length} (${pct(ts.filter((t) => t.restarts > 0).length, ts.length)})`, `${ts.filter((t) => t.limitEnds > 0).length}`) + '\n';
	}
	// tasks that had an estimate: was the estimate over the cap, and how did the actual land against the cap
	o += '\n' + head('Window (tasks with an estimate)', 'n', 'Estimate <= 150k', 'Actual <= 150k', 'Median actual / estimate') + '\n';
	for (const [nm, f] of W) {
		const ts = builds(tasks).filter(f).filter((t) => t.estTok > 0);
		o += row(nm, ts.length, pct(ts.filter((t) => t.estTok <= CAP).length, ts.length), pct(ts.filter((t) => t.reported <= CAP).length, ts.length), r2(med(ts.map((t) => t.reported / t.estTok)))) + '\n';
	}
	return o;
}

// ---- finding 3: architect memory (no dated change in the repo): descriptive cohort only ----
function f3() {
	const { tasks } = data();
	const rw = reworkMap();
	const coh = builds(tasks).filter(isPass2);
	const rest = builds(tasks).filter((t) => t.ts >= T.sonnetDefault && !isPass2(t) && t.estTok > 0);
	const stat = (ts) => ({ n: ts.length, tok: med(ts.map((t) => t.reported)), over: ts.filter((t) => t.reported > CAP).length, rs: ts.filter((t) => t.restarts > 0).length,
		ratio: med(ts.filter((t) => t.estTok > 0).map((t) => t.reported / t.estTok)), fix: ts.filter((t) => t.taskType === 'fix pass').length,
		rwN: ts.map((t) => rw.get(t.runs[0].id)).filter((x) => x && x.parts && Number.isFinite(x.parts.rework)).length });
	let o = head('Cohort', 'n tasks', 'Median tokens', 'Over 150k', 'Restarted', 'Fix-pass tasks', 'Median actual / estimate', 'Rework-scored') + '\n';
	for (const [nm, ts] of [['Tasks cut from one architect plan (15 planned at ~150k, Sonnet builders)', coh], ['Other tasks since 2026-10-26 that carried an estimate', rest]]) {
		const s = stat(ts);
		o += row(nm, s.n, k(s.tok), s.over, s.rs, s.fix, r2(s.ratio), s.rwN) + '\n';
	}
	{
		const rs = (ts) => ts.map((t) => rw.get(t.runs[0].id)).filter((x) => x && x.parts && Number.isFinite(x.parts.rework)).map((x) => x.parts.rework);
		o += `\nRework sub-score (100 = none seen): architect-plan cohort median ${Math.round(med(rs(coh)))} (n ${rs(coh).length}); others ${Math.round(med(rs(rest)))} (n ${rs(rest).length}). The 3-day window is still open for the newest tasks.\n`;
		return o;
	}
	return o;
}

// ---- finding 6: estimates vs actuals ----
function f6() {
	const { tasks } = data();
	const ts = builds(tasks).filter((t) => t.estTok > 0 && t.reported > 0);
	const cut = Date.parse('2026-10-22T00:00:00Z');
	const stat = (set) => ({ n: set.length, tq: [q(set.map((t) => t.reported / t.estTok), 0.25), med(set.map((t) => t.reported / t.estTok)), q(set.map((t) => t.reported / t.estTok), 0.75)],
		mn: set.filter((t) => t.estMin > 0 && t.minutes > 0), });
	const line = (nm, set) => {
		const s = stat(set); const mm = s.mn.map((t) => t.minutes / t.estMin);
		return row(nm, s.n, `${r2(s.tq[1])} (${r2(s.tq[0])}-${r2(s.tq[2])})`, s.mn.length, `${r2(med(mm))} (${r2(q(mm, 0.25))}-${r2(q(mm, 0.75))})`);
	};
	let o = head('Set', 'n (tokens)', 'Tokens: actual / estimate, median (IQR)', 'n (minutes)', 'Minutes: actual / estimate, median (IQR)') + '\n';
	o += line('First sample, runs before 2026-10-22 (the x0.76 / x0.34 correction came from here)', ts.filter((t) => t.ts < cut)) + '\n';
	o += line('Runs from 2026-10-22 on', ts.filter((t) => t.ts >= cut)) + '\n';
	o += line('Whole ledger, all tasks with an estimate', ts) + '\n';
	o += '\n' + head('Task class (all dates)', 'n (tokens)', 'Tokens: actual / estimate, median (IQR)', 'n (minutes)', 'Minutes: actual / estimate, median (IQR)') + '\n';
	for (const ty of [...new Set(ts.map((t) => t.taskType))]) {
		const set = ts.filter((t) => t.taskType === ty);
		if (set.length >= 4) o += line(ty, set) + '\n';
	}
	return o + '\n' + f6trend();
}


// ---- finding 6, extended: did feeding the results back into the estimates make later estimates more reliable? ----
// Dated changes to the estimating process (commit author dates in UTC):
//   (2026-10-19 21:16Z) estimation ledger and the "old way" baseline (150k tokens = 15 min); 79 capped tasks follow
//   (2026-10-20 15:23Z) ledger tool: rolling per-class actual/estimate and an `estimate` command that applies it
//   (2026-10-26 00:23Z) the first fixed correction published (tokens x0.76, minutes x0.34) + the ESTIMATE line in briefs
//   (2026-10-29 09:18Z) hook: a brief with no ESTIMATE line is refused (the line becomes universal)
const EST_PERIODS = [
	['P0 before the ledger tool', 0, Date.parse('2026-10-20T15:23:00Z')],
	['P1 rolling ratios available, no fixed factor', Date.parse('2026-10-20T15:23:00Z'), Date.parse('2026-10-26T00:23:00Z')],
	['P2 fixed factors published, line optional', Date.parse('2026-10-26T00:23:00Z'), Date.parse('2026-10-29T09:18:00Z')],
	['P3 estimate line required', Date.parse('2026-10-29T09:18:00Z'), Infinity],
];
function f6trend() {
	const { tasks } = data();
	const ts = builds(tasks).filter((t) => t.estTok > 0 && t.reported > 0);
	const tk = (t) => t.reported / t.estTok;
	const mn = (t) => t.minutes / t.estMin;
	const mset = (set) => set.filter((t) => t.estMin > 0 && t.minutes > 0);
	const ape = (xs) => med(xs.map((x) => Math.abs(x - 1))); // |actual - estimate| / estimate
	const w = (xs) => `${r2(med(xs))} (${r2(q(xs, 0.25))}-${r2(q(xs, 0.75))})`;
	const cols = ['Period', 'n tok', 'Tokens bias (median a/e)', 'IQR width', 'Tokens median abs % error', 'Tokens over 2x the estimate', 'n min', 'Minutes bias', 'IQR width', 'Minutes median abs % error'];
	const line = (nm, set) => {
		const a = set.map(tk); const mm = mset(set).map(mn);
		return row(nm, a.length, w(a), r2(q(a, 0.75) - q(a, 0.25)), a.length ? Math.round(100 * ape(a)) + '%' : 'n/a', pct(a.filter((x) => x > 2).length, a.length), mm.length, w(mm), r2(q(mm, 0.75) - q(mm, 0.25)), mm.length ? Math.round(100 * ape(mm)) + '%' : 'n/a');
	};
	let o = '#### Estimate quality by period between process changes\n\n' + head(...cols) + '\n';
	for (const [nm, a, b] of EST_PERIODS) o += line(nm, ts.filter((t) => t.ts >= a && t.ts < b)) + '\n';
	o += line('All', ts) + '\n';
	o += '\n#### Per week (UTC, weeks starting on the Monday)\n\n' + head(...cols) + '\n';
	const wk = (ms) => { const d = new Date(ms); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
	for (const key of [...new Set(ts.map((t) => wk(t.ts)))].sort()) o += line(`week of ${key}`, ts.filter((t) => wk(t.ts) === key)) + '\n';
	// mix
	o += '\n#### Mix per period (could a change in task mix explain the movement?)\n\n' + head('Period', 'tasks', 'Sonnet share', 'Opus share', 'Feature-in-existing-system share', 'Research + verify + tooling share', 'Median token estimate', 'Estimate line in the brief', 'Seeded ledger row') + '\n';
	for (const [nm, a, b] of EST_PERIODS) {
		const set = ts.filter((t) => t.ts >= a && t.ts < b); const n = set.length;
		const sh = (f) => pct(set.filter(f).length, n);
		o += row(nm, n, sh((t) => t.model === 'Sonnet'), sh((t) => t.model === 'Opus'), sh((t) => /^feature/i.test(t.taskType)), sh((t) => /^(research|engine verify|tooling)/i.test(t.taskType)), k(med(set.map((t) => t.estTok))), sh((t) => t.runs.some((r) => r.briefEst)), sh((t) => t.runs.some((r) => r.seeded))) + '\n';
	}
	o += '\n#### Same period, one slice at a time (holding model or class fixed; cells with 5 or more tasks; tokens a/e median, then minutes)\n\n' + head('Slice', ...EST_PERIODS.map((p) => p[0].split(' ')[0])) + '\n';
	const slices = [['Opus', (t) => t.model === 'Opus'], ['Sonnet', (t) => t.model === 'Sonnet'], ['Feature in an existing system', (t) => /^feature/i.test(t.taskType)], ['Fix pass', (t) => /^fix/i.test(t.taskType)]];
	for (const [nm, f] of slices) {
		o += row(nm, ...EST_PERIODS.map(([, a, b]) => {
			const set = ts.filter((t) => t.ts >= a && t.ts < b && f(t)); const mm = mset(set).map(mn);
			return set.length >= 5 ? `${r2(med(set.map(tk)))} / ${r2(med(mm))} (n ${set.length})` : `n ${set.length}`;
		})) + '\n';
	}
	// would the published fixed factors have helped? apply them to the later sets
	o += '\n#### What the published factors would have done on later tasks (corrected estimate = estimate x 0.76 tokens, x 0.34 minutes)\n\n' + head('Set', 'n', 'Tokens: median abs % error raw', 'after x0.76', 'Minutes: median abs % error raw', 'after x0.34') + '\n';
	for (const [nm, a, b] of [EST_PERIODS[2], EST_PERIODS[3], ['P2+P3', EST_PERIODS[2][1], Infinity]]) {
		const set = ts.filter((t) => t.ts >= a && t.ts < b); const mm = mset(set).map(mn);
		o += row(nm.split(' ')[0], set.length, Math.round(100 * ape(set.map(tk))) + '%', Math.round(100 * ape(set.map((t) => tk(t) / 0.76))) + '%', Math.round(100 * ape(mm)) + '%', Math.round(100 * ape(mm.map((x) => x / 0.34))) + '%') + '\n';
	}
	return o;
}

// ---- finding 10: the minutes fix (Nov 3): the ledger applies x0.34 when it records a run; the quote as written is kept ----
// Baseline = tasks with a required estimate line (from 2026-10-29 09:18Z) up to the fix; after = from the fix on.
// "As written" = the quote in the brief (what the agent wrote); "as recorded" = the ledger's corrected figure.
const FIX10 = Date.parse(process.env.RESIDENCY_FIX_AT || '2026-11-04T01:00:00Z');
function f10() {
	const { tasks } = data();
	const ts = builds(tasks).filter((t) => t.estMin > 0 && t.minutes > 0);
	const ape = (xs) => (xs.length ? Math.round(100 * med(xs.map((x) => Math.abs(x - 1)))) + '%' : 'n/a');
	const w = (xs) => `${r2(med(xs))} (${r2(q(xs, 0.25))}-${r2(q(xs, 0.75))})`;
	const sets = [['Baseline: estimate line required, before the fix', ts.filter((t) => t.ts >= EST_PERIODS[3][1] && t.ts < FIX10)],
		['After the fix', ts.filter((t) => t.ts >= FIX10)]];
	let o = `Fix applied from ${new Date(FIX10).toISOString().slice(0, 16)}Z. Tasks of 5+ tool calls with a minutes estimate and measured minutes.\n\n`;
	o += head('Set', 'n', 'Bias as written (median actual / quote, IQR)', 'Error as written (median abs)', 'Error if x0.34 applied', 'n with a recorded figure', 'Error as recorded by the ledger') + '\n';
	for (const [nm, set] of sets) {
		const a = set.map((t) => t.minutes / t.estMin);
		const rec = set.filter((t) => t.estMinRec > 0);
		o += row(nm, set.length, w(a), ape(a), ape(a.map((x) => x / 0.34)), rec.length, ape(rec.map((t) => t.minutes / t.estMinRec))) + '\n';
	}
	const chk = sets[1][1].filter((t) => t.estMinRec > 0 && t.estMin > 0);
	o += `\nCheck that the ledger applied the factor (after the fix): median recorded / written = ${r2(med(chk.map((t) => t.estMinRec / t.estMin)))} (n ${chk.length}; 0.34 expected).\n`;
	o += '\n' + head('Mix (could a change in task mix explain a movement?)', 'tasks', 'Sonnet share', 'Opus share', 'Feature-in-existing-system share', 'Median quote (min)', 'Median actual (min)') + '\n';
	for (const [nm, set] of sets) {
		const sh = (fn) => pct(set.filter(fn).length, set.length);
		o += row(nm, set.length, sh((t) => t.model === 'Sonnet'), sh((t) => t.model === 'Opus'), sh((t) => /^feature/i.test(t.taskType)), m1(med(set.map((t) => t.estMin))), m1(med(set.map((t) => t.minutes)))) + '\n';
	}
	return o;
}

// read a big transcript in 32 MB chunks (the main-session logs are hundreds of MB: too big for one string)
function eachLine(file, cb) {
	const fd = fs.openSync(file, 'r');
	const buf = Buffer.alloc(32 << 20);
	let rest = '';
	let n;
	while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
		const parts = (rest + buf.toString('utf8', 0, n)).split('\n');
		rest = parts.pop();
		for (const p of parts) cb(p);
	}
	if (rest) cb(rest);
	fs.closeSync(fd);
}

// ---- finding 7: guardrails (hook deny texts in the transcripts; land.js outcomes) ----
const HOOK_PREFIX = /PreToolUse:[A-Za-z]+ hook (error|blocking error)/; // how Claude Code words a hook refusal in the tool reply
function f7() {
	const pats = [
		['`sed -i` on a managed source folder (no-sed-i hook)', /Blocked: `sed -i` under projects/],
		['Agent brief without an ESTIMATE line (agent-budget hook)', /No 'ESTIMATE: <min> agent-min/],
		['Whole-file read / long dump refused (output-cap hook)', /in full would be re-read every turn|sed -n range of \d+ lines|Grep content on a big doc without head_limit|Grep context of \d+ lines per match/],
	];
	const counts = pats.map(() => 0);
	const files = [];
	if (fs.existsSync(ROOT)) {
		for (const s of fs.readdirSync(ROOT)) {
			const p = path.join(ROOT, s);
			if (s.endsWith('.jsonl')) files.push(p);
			else if (fs.existsSync(path.join(p, 'subagents'))) files.push(...listFiles().filter((f) => f.startsWith(p)));
		}
	}
	const seen = new Set();
	for (const f of files) {
		if (seen.has(f)) continue; seen.add(f);
		eachLine(f, (line) => {
			if (!line.includes('hook') || !line.includes('tool_result') || !line.includes('"type":"user"') || !lineBefore(line)) return; // only the tool's reply, not a copy of the rule text
			pats.forEach((pt, i) => { if (HOOK_PREFIX.test(line) && pt[1].test(line)) counts[i]++; });
		});
	}
	let o = head('What the hook refused', 'Times (tool replies found in local transcripts)', 'Hook added') + '\n';
	const added = ['2026-10-20', '2026-10-29', '2026-10-29'];
	pats.forEach((pt, i) => { o += row(pt[0], counts[i], added[i]) + '\n'; });
	// land.js outcomes
	let landTxt = '';
	try {
		const E = require('./lib/evals');
		const lp = LAND_LOG;
		landTxt = landText();
	} catch (e) { /* no log on this PC */ }
	const st = {};
	for (const l of landTxt.split('\n').filter(Boolean)) { const s = l.split('\t')[2] || '?'; st[s] = (st[s] || 0) + 1; }
	o += '\n' + head('land.js outcome (land log, from 2026-10-24)', 'Count') + '\n';
	for (const [s, n] of Object.entries(st).sort((a, b) => b[1] - a[1])) o += row(s, n) + '\n';
	return o;
}

// ---- finding 8: architect break-even (what a planning pass cost vs what it saved) ----
// plan-equivalent tokens = reported + 10% of cache reads (the metric the planning session used for plan usage); cache reads = inclCache - reported.
const PEQ = (reported, incl) => reported + 0.1 * Math.max(0, incl - reported);
function f8() {
	const { tasks, runs } = data();
	const rw = reworkMap();
	const P1 = Date.parse('2026-10-19T21:12:00Z'); const P1END = Date.parse('2026-10-21T03:00:00Z'); const P2 = Date.parse('2026-10-31T21:07:00Z');
	const arch = [['Pass 1 (first architect run; also wrote the pure rule modules and tests, so an upper bound for planning alone)', runs.filter((r) => C.arch1Re.test(r.desc))],
		['Pass 2 (plan only, no build)', runs.filter((r) => C.arch2Re.test(r.desc))]];
	const cost = {};
	let o = head('Architect run', 'Runs', 'Reported tokens', 'Incl. cache reads', 'Plan-equivalent', 'Agent-min', 'Tool calls') + '\n';
	for (const [nm, rs] of arch) {
		const rep = rs.reduce((a, r) => a + r.reported, 0); const inc = rs.reduce((a, r) => a + r.inclCache, 0);
		cost[nm] = PEQ(rep, inc);
		o += row(nm, rs.length, k(rep), `${(inc / 1e6).toFixed(1)}M`, `${(PEQ(rep, inc) / 1e6).toFixed(2)}M`, m1(rs.reduce((a, r) => a + r.minutes, 0)), rs.reduce((a, r) => a + r.calls, 0)) + '\n';
	}
	const B = builds(tasks);
	const grp = {
		pre: B.filter((t) => t.ts < P1), p1: B.filter((t) => t.ts >= P1 && t.ts < P1END && t.cap150), mid: B.filter((t) => t.ts >= P1END && t.ts < P2 && !t.cap150),
		p2: B.filter(isPass2), post: B.filter((t) => t.ts >= P2 && !isPass2(t)),
	};
	const S = (ts) => {
		const rep = ts.reduce((a, t) => a + t.reported, 0);
		const inc = ts.reduce((a, t) => a + t.runs.reduce((b, r) => b + r.inclCache, 0), 0);
		const withC = ts.filter((t) => { const x = rw.get(t.runs[0].id); return x && x.commits > 0; });
		const commits = withC.reduce((a, t) => a + rw.get(t.runs[0].id).commits, 0);
		const peqC = withC.reduce((a, t) => a + PEQ(t.reported, t.runs.reduce((b, r) => b + r.inclCache, 0)), 0);
		return { n: ts.length, rep, peq: PEQ(rep, inc), nC: withC.length, commits, peqPerCommit: commits ? peqC / commits : NaN, peqPerTask: PEQ(rep, inc) / (ts.length || 1) };
	};
	o += '\n' + head('Task cohort', 'Tasks', 'Reported tokens (sum)', 'Plan-equivalent (sum)', 'Plan-eq per task', 'Tasks with an attributed commit', 'Commits', 'Plan-eq per commit') + '\n';
	const st = {};
	for (const [nm, ts] of [['Before pass 1, no plan', grp.pre], ['Pass 1 tasks', grp.p1], ['Between the passes, unplanned', grp.mid], ['Pass 2 tasks', grp.p2], ['After pass 2, other tasks', grp.post]]) {
		const s = S(ts); st[nm] = s;
		o += row(nm, s.n, `${(s.rep / 1e6).toFixed(2)}M`, `${(s.peq / 1e6).toFixed(2)}M`, k(s.peqPerTask), s.nC, s.commits, k(s.peqPerCommit)) + '\n';
	}
	const a2 = cost[arch[1][0]];
	// The saving (pass 2 only) is priced against the unsplit plan's cost, which the planning session wrote down before
	// the architect ran (plan-eq 9.3M, 6 big tasks). That figure is a forecast, so the break-even line says how far off it
	// may be before the sign of the result flips.
	const ORIG = 9.3e6; const SPLIT_FORECAST = ORIG - 1.6e6; // the plan's own forecast: 17% saved
	const p2 = st['Pass 2 tasks']; const actual = p2.peq;
	const each = grp.p2.map((t) => PEQ(t.reported, t.runs.reduce((b, r) => b + r.inclCache, 0)));
	const m = (x) => `${(x / 1e6).toFixed(2)}M`; const off = (x) => `${(100 * (x / ORIG - 1)).toFixed(1)}%`;
	const lo = q(each, 0.25); const mid15 = med(each); const hi = q(each, 0.75);
	o += `\nPass 2 against its forecasts (est.): the planning session forecast the unsplit work at ${m(ORIG)} plan-equivalent and the split work at ${m(SPLIT_FORECAST)}. The ${p2.n} of 15 tasks that have a transcript cost ${m(actual)} (measured; ${pct(actual - SPLIT_FORECAST, SPLIT_FORECAST)} over the split forecast before the 15th task). Saving against the unsplit forecast = ${m(ORIG - actual)}, net of the architect ${m(ORIG - actual - a2)}; with the 15th task at the other tasks' quartiles (${k(lo)}, ${k(mid15)}, ${k(hi)}): saving ${m(ORIG - actual - hi)} to ${m(ORIG - actual - lo)}, net ${m(ORIG - actual - hi - a2)} to ${m(ORIG - actual - lo - a2)}. Break-even: the pass pays for its architect only if the unsplit work would really have cost ${off(actual + a2)} more than forecast (${off(actual + lo + a2)} to ${off(actual + hi + a2)} with the 15th task).\n`;
	// No per-commit saving: a commit isn't a fixed unit of work (small planned tasks make small commits), so the gap in
	// cost per commit times the planned commits overstates the saving. The line shows what it would imply.
	const mid = st['Between the passes, unplanned']; const cpt = (s) => (s.nC ? (s.commits / s.nC).toFixed(1) : 'n/a');
	o += `\nNo per-commit saving: commits per task (tasks with a commit) were ${cpt(st['Before pass 1, no plan'])} before pass 1, ${cpt(st['Pass 1 tasks'])} in pass 1, ${cpt(mid)} between the passes and ${cpt(p2)} in pass 2, and smaller tasks make smaller commits. Pricing pass 2's ${p2.commits} commits at the between-passes rate (${k(mid.peqPerCommit)} each) would put the unsplit work at ${m(mid.peqPerCommit * p2.commits)}, ${r2((mid.peqPerCommit * p2.commits) / ORIG)}x the planning session's own forecast.\n`;
	// the skipped planning pass: stream the TOP-LEVEL (coordinator) session logs since 2026-10-27 for an assistant message that costs an architect / planning pass and skips it
	const SKIP = /(skip(ped|ping)?|not worth|no need for|without|instead of) (the |a |an )?(architect|planning pass|plan pass|plan agent)|(architect|planning pass|plan pass)[^.\n]{0,80}(not worth|skip|overkill|cost(s)? (about|almost|as much))/i;
	const NUM = /\d+(\.\d+)?\s?[kM]\b/;
	let files = 0; let msgs = 0; const hits = [];
	if (fs.existsSync(ROOT)) {
		for (const s of fs.readdirSync(ROOT)) {
			if (!s.endsWith('.jsonl')) continue;
			files++;
			eachLine(path.join(ROOT, s), (line) => {
				if (!/architect|planning pass|plan pass|plan agent/i.test(line)) return;
				let j; try { j = JSON.parse(line); } catch (e) { return; }
				if (j.type !== 'assistant' || Date.parse(j.timestamp) < Date.parse('2026-10-27T00:00:00Z') || !before(Date.parse(j.timestamp))) return;
				const txt = ((j.message || {}).content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
				msgs++;
				if (SKIP.test(txt) && NUM.test(txt) && !/finding 8|break-even|HQ/i.test(txt)) hits.push(j.timestamp.slice(0, 16));
			});
		}
	}
	o += `\nSkipped planning pass (owner-reported): searched ${files} coordinator-session logs, ${msgs} assistant messages mentioning an architect or planning pass since 2026-10-27; messages that cost it with a number and then skip it (excluding messages about this analysis): ${hits.length}${hits.length ? ` (${hits.join(', ')})` : ''}.\n`;
	return o;
}

// ---- main ----
// ---- finding 9: do "done" / "landed" / "checks pass" / "verified" claims hold up? ----
const NEG_WIDE = /\b(nothing|none|no|offline|skipped|unseen)\b|n't\b/i; // extra negations for the engine claim ("Nothing was seen in the engine")
const NEG = /\b(not|never|unable|cannot|can't|couldn't|didn't|wasn't|isn't|without|untested|unverified|failed|fails|until|once|still|should|must|to verify|todo|owner (to|must|should))\b|n't\b/i;
const CLAIM_RE = {
	landed: /\blanded\b|pushed to (main|origin)/i,
	checks: /\bchecks?(\.js)?\b[^.\n]{0,80}\b(pass(es|ed)?|clean|green|ok|succeed\w*|0 fail\w*|no (new )?fail\w*)\b|\b(pass(es|ed)?|green|clean)\b[^.\n]{0,40}\bchecks?\b|\bgate\b[^.\n]{0,40}\b(pass\w*|green|clean)\b/i,
	tests: /\b(tests?|suite|soak|smoke|assertions?|syntax|eval)\b[^.\n]{0,60}\b(pass(es|ed)?|green|ok|clean|\d+\s*\/\s*\d+)\b/i,
	engine: new RegExp(String.raw`\b(verified|confirmed|seen|playtest(ed)?|tested|clean console)\b[^.\n]{0,60}\b${C.engineWordRe}\b|\b${C.engineWordRe}\b[^.\n]{0,60}\b(verified|confirmed|clean|pass(ed)?|worked|ok)\b|\bplaytested\b`, 'i'),
};
const CLEAN_RE = /\b(no|0|zero)\s+(new\s+)?(errors?|warnings?|fail\w*|regressions?|issues?)\b|\bnone failed\b/gi;
const NOT_LANDED = /\b(nothing|none|no|will|to be|ready to|once)\b[^.\n]{0,30}\blanded\b/i;
const DONE_RE = /\b(done|complete[d]?|finished|implemented|fixed|added|built|wrote|written|created|changed|refactored|updated)\b/i;
const PARTIAL_RE = /\b(blocked|stopped early|handing back|next stage|could not finish|couldn't finish|incomplete|not finished|not done|ran out)\b/i;
function claimsOf(text) {
	const c = { done: false, partial: false, landed: false, checks: false, tests: false, engine: false, hedged: {} };
	const t = String(text || '').replace(/```[\s\S]*?```/g, ' ');
	if (!t.trim()) return null;
	for (const s0 of t.split(/(?<=[.!?])\s+|\n+|;\s+/)) {
		const s = s0.replace(CLEAN_RE, ' clean ').replace(/\bstill (pass\w*)/gi, '$1'); // "0 failed", "no errors", "still pass" are positive
		for (const [kind, re] of Object.entries(CLAIM_RE)) if (re.test(s)) { if (NEG.test(s) || (kind === 'engine' && NEG_WIDE.test(s)) || (kind === 'landed' && NOT_LANDED.test(s))) c.hedged[kind] = true; else c[kind] = true; }
	}
	c.partial = PARTIAL_RE.test(t);
	c.done = !c.partial && (DONE_RE.test(t) || c.landed || c.checks || c.tests || c.engine);
	return c;
}
const roleOf = (type) => (type === 'Shared' ? 'shared-tools agent' : !type || type === 'claude' || type === 'general-purpose' ? 'general agent' : 'game agent');
const NOISE = C.noiseRe;
const FIXTOUCH = new Map();
function evalMapDays(days) {
	if (FIXTOUCH.has(days)) return FIXTOUCH.get(days);
	const E = require('./lib/evals');
	commitLog();
		const rows = data().runs.filter((r) => !r.seeded).map((r) => ({ agent_id: r.id, date: new Date(r.ts).toISOString(), session: r.session, task_id: r.taskId,
		project: L.projectOf(r.type, r.desc), class: r.cls, model: r.model, requested_model: r.requested || '', calls: r.calls, minutes: String(r.minutes), reported: r.reported,
		incl_cache: r.inclCache, est_tokens: r.estTok, est_minutes: r.estMin, task_type: r.taskType, note: r.desc, agent_type: r.type, brief_chars: r.brief.length, skills: '', instr: '' }));
	const lp = LAND_LOG;
	const landLog = E.parseLandLog(landText());
	const commits = commitLog();
	const tasks = E.evaluate({ rows, commits, landLog, notes: [], verifyLines: [], days });
	const bySha = new Map(commits.map((c) => [c.sha.slice(0, 8), c]));
	const windows = data().runs.map((r) => [r.ts - 5 * 60000, r.ts + r.minutes * 60000 + 40 * 60000]);
	const newest = Math.max(...commits.map((c) => c.t));
	const m = new Map();
	for (const t of tasks) {
		const own = (t.shas || []).map((s) => bySha.get(s)).filter(Boolean);
		const mine = new Set();
		for (const c of own) for (const f of c.files) if (!NOISE.test(f.path)) mine.add(f.path);
		const last = own.length ? Math.max(...own.map((c) => c.t)) : 0;
		const fixes = [];
		if (mine.size) for (const c of commits) {
			if (c.t <= last || c.t > last + days * 86400e3 || own.includes(c) || /\] Fold \d+ note\(s\)/.test(c.subject) || !E.isFixLike(c)) continue;
			if (t.id && E.hasId(c.subject, t.id)) continue;
			if (c.files.some((f) => mine.has(f.path))) fixes.push(c);
		}
		const outside = fixes.filter((c) => !windows.some(([a, b]) => c.t >= a && c.t <= b)).length;
		const open = last + days * 86400e3 > newest;
		for (const a of t.agents || []) m.set(a, { t, fixes: fixes.length, outside, open, commits: own.length });
	}
	FIXTOUCH.set(days, m);
	return m;
}
function f9() {
	const { runs } = data();
	const LANDLOG_START = Date.parse('2026-10-24T00:00:00Z');
	const E = require('./lib/evals');
	const lp = LAND_LOG;
	const landLog = E.parseLandLog(landText());
	const landBy = new Map();
	for (const e of landLog) { const id = String(e.branch).replace(/^worktree-agent-/, ''); (landBy.get(id) || landBy.set(id, []).get(id)).push(e); }
	const rep = runs.filter((r) => !r.seeded && r.finalText).map((r) => ({ r, c: claimsOf(r.finalText), role: roleOf(r.type) })).filter((x) => x.c);
	const out = [];
	out.push(`Runs with a final report: ${rep.length} of ${runs.filter((r) => !r.seeded).length} transcript runs (${dayOf(Math.min(...rep.map((x) => x.r.ts)))} to ${dayOf(Math.max(...rep.map((x) => x.r.ts)))}). Claim = a non-negated sentence in the final report matching the pattern; a sentence with a negation or a to-do word ("not", "until", "owner to verify") counts as hedged, not as a claim.\n`);
	const kinds = ['done', 'landed', 'checks', 'tests', 'engine'];
	const roles = [...new Set(rep.map((x) => x.role))].sort();
	out.push('**A. What the reports claimed**\n');
	out.push(head('role', 'reports', ...kinds.map((x) => `claims "${x}"`), 'partial / handed back'));
	for (const ro of [...roles, 'all']) {
		const xs = rep.filter((x) => ro === 'all' || x.role === ro);
		out.push(row(ro, xs.length, ...kinds.map((kd) => `${xs.filter((x) => x.c[kd]).length} (${pct(xs.filter((x) => x.c[kd]).length, xs.length)})`), xs.filter((x) => x.c.partial).length));
	}
	const truth = {
		landed: (x) => { // the land log has a "landed" entry for the agent's branch; checkable from 2026-10-24
			if (x.r.ts < LANDLOG_START) return null;
			const es = landBy.get(x.r.id) || [];
			return es.length ? es.some((e) => e.result === 'landed') : false;
		},
		checks: (x) => { // a landed entry means the landing gate (check.js on every game touched) passed on the final commit
			if (x.r.ts < LANDLOG_START) return null;
			const es = landBy.get(x.r.id) || [];
			return es.length ? es.some((e) => e.result === 'landed') : null; // no gate attempt: not checkable
		},
		tests: (x) => x.r.gateRuns > 0, // a check / test / soak command appears in the run (output not parsed: weak)
		engine: (x) => x.r.engine > 0, // an engine tool call appears in the run (not that the result was good: weak)
	};
	out.push('\n**B. Claim vs ground truth** (held = the check below agrees; "checkable" excludes runs before the land log starts, 2026-10-24)\n');
	out.push(head('claim', 'ground truth used', 'claims', 'checkable', 'held', 'rate', ...roles.map((ro) => `${ro}: held/checkable`)));
	const gt = { landed: 'land log has a landed entry for the branch', checks: 'land log landed entry (gate = check.js on each game touched)', tests: 'a check/test/soak command in the run (weak)', engine: 'an engine tool call in the run (weak)' };
	for (const kd of ['landed', 'checks', 'tests', 'engine']) {
		const xs = rep.filter((x) => x.c[kd]);
		const ch = xs.map((x) => [x, truth[kd](x)]).filter(([, v]) => v !== null);
		const held = ch.filter(([, v]) => v).length;
		out.push(row(kd, gt[kd], xs.length, ch.length, held, pct(held, ch.length), ...roles.map((ro) => { const c2 = ch.filter(([x]) => x.role === ro); return `${c2.filter(([, v]) => v).length}/${c2.length}`; })));
	}
	out.push(`\nReports that say they did not verify in the engine (hedged): ${rep.filter((x) => x.c.hedged.engine).length} of ${rep.length}; reports claiming engine verification with no engine tool call in the run: ${rep.filter((x) => x.c.engine && x.r.engine === 0).length} of ${rep.filter((x) => x.c.engine).length}.`);
	out.push(`Reports that claim landing but whose branch has no landed entry (checkable runs only): ${rep.filter((x) => x.c.landed && truth.landed(x) === false).length}. Reports that never mention landing although the branch landed: ${rep.filter((x) => !x.c.landed && truth.landed(x) === true).length} of ${rep.filter((x) => truth.landed(x) === true).length} landed.`);
	const landedRuns = rep.filter((x) => truth.landed(x) === true && x.c.landed);
	// first try: no check-failed or conflict entry before the first landed one (a later re-land that hit a conflict doesn't count)
	const refusedFirst = (x) => { const es = landBy.get(x.r.id) || []; const t0 = Math.min(...es.filter((e) => e.result === 'landed').map((e) => e.t)); return es.some((e) => e.t < t0 && (e.result === 'check-failed' || e.result === 'conflict')); };
	const ft = landedRuns.filter((x) => !refusedFirst(x)).length;
	out.push(`Of ${landedRuns.length} reports that claim landing and did land, ${ft} (${pct(ft, landedRuns.length)}) landed without a check-failed or conflict entry first (the claim was true, but the gate refused ${landedRuns.length - ft} of them at least once before they landed).`);
	for (const days of [3, 7]) {
		const M = evalMapDays(days);
		out.push(`\n**C${days === 3 ? '' : '2'}. Did the work stay done? (${days} days after the task's last commit, on the files the task touched)**\n`);
		out.push('Strict = any later fix-like commit touched a file of the task; material = those fix lines were >= 25% of the task\'s lines on the same files; reverted = a later Revert commit. Only runs whose task has attributable commits and a closed window (the newest tasks are excluded). "outside" = the fix commit sits outside every subagent run window (made by the owner or a main session, est.: all commits share one author, so authorship cannot tell).\n');
		out.push(head('group', 'runs with commits', 'closed window', 'no later fix (strict)', 'material rework', 'reverted', 'with a fix made outside an agent window'));
		const mk = (label, xs) => {
			const ms = xs.map((x) => M.get(x.r.id)).filter((v) => v && v.commits > 0 && !v.open);
			const withC = xs.map((x) => M.get(x.r.id)).filter((v) => v && v.commits > 0);
			const clean = ms.filter((v) => v.fixes === 0).length;
			const mat = ms.filter((v) => v.t.signals.rework && v.t.signals.rework.ratio >= 0.25).length;
			const rev = ms.filter((v) => v.t.signals.revert && v.t.signals.revert.reverted).length;
			const outs = ms.filter((v) => v.outside > 0).length;
			out.push(row(label, withC.length, ms.length, `${clean} (${pct(clean, ms.length)})`, `${mat} (${pct(mat, ms.length)})`, `${rev} (${pct(rev, ms.length)})`, `${outs} (${pct(outs, ms.length)})`));
		};
		for (const ro of roles) mk(`${ro}, all reports`, rep.filter((x) => x.role === ro));
		mk('all reports', rep);
		mk('reports claiming "landed"', rep.filter((x) => x.c.landed));
		mk('reports claiming "checks pass"', rep.filter((x) => x.c.checks));
		mk('reports claiming engine verification', rep.filter((x) => x.c.engine));
		mk('reports hedging the engine ("not seen")', rep.filter((x) => x.c.hedged.engine && !x.c.engine));
		mk('reports with no landed or checks claim', rep.filter((x) => !x.c.landed && !x.c.checks));
		if (days === 3) {
			out.push('\nBy task class (strict, 3 days; classes with fewer than 8 closed runs are pooled in "other"):\n');
			out.push(head('task class', 'runs with commits', 'closed window', 'no later fix (strict)', 'material rework', 'reverted', 'with a fix made outside an agent window'));
			const cnt = new Map();
			for (const x of rep) { const v = M.get(x.r.id); if (v && v.commits > 0 && !v.open) cnt.set(x.r.taskType, (cnt.get(x.r.taskType) || 0) + 1); }
			const big = new Set([...cnt].filter(([, n]) => n >= 8).map(([kk]) => kk));
			for (const tt of [...big].sort()) mk(tt, rep.filter((x) => x.r.taskType === tt));
			mk('other (pooled)', rep.filter((x) => !big.has(x.r.taskType)));
		}
	}
	return out.join('\n');
}

const arg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'all';
const F = { 1: f1, 2: f2, 3: f3, 6: f6, 7: f7, 8: f8, 9: f9, 10: f10 };
const { runs, tasks } = data();
const ledgerHash = require('crypto').createHash('sha256').update(fs.readFileSync(LEDGER_FILE)).digest('hex').slice(0, 12);
console.log(`<!-- cut ${Number.isFinite(UNTIL) ? new Date(UNTIL).toISOString() : 'none'}, ledger sha256 ${ledgerHash}, ${runs.length} agent runs, ${tasks.length} tasks, ${dayOf(Math.min(...runs.map((r) => r.ts)))} to ${dayOf(Math.max(...runs.map((r) => r.ts)))} -->`);
for (const n of Object.keys(F)) if (arg === 'all' || arg === n) console.log(`\n### Finding ${n}\n\n${F[n]()}`);
