// SPDX-License-Identifier: MIT
// Finding 18 timing tool (agent-study/findings/finding-18-prereg.md). Node 18+, no dependencies.
// Reads Claude Code session transcripts and the port's study/PHASES.log, puts each message in the phases open at its
// time, and prints per phase: wall-clock, active agent time, reported and plan-equivalent tokens, owner messages, and
// the owner step log's minutes. The rules are in README.md next to this file.
//   node timing.js --phases <PHASES.log> [--owner-steps <OWNER_STEPS.log>] [--projects <dir>]... [--match <text>]...
//                  [--all] [--session <id>]... [--exclude-session <id>]... [--until <ISO time>] [--repo <port repo>]
//                  [--json <out.json>]
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), readline = require('readline');
const cp = require('child_process');

const GAP_MS = 5 * 60 * 1000;      // gaps of 5 minutes or less between consecutive messages count as active
const CACHE_READ_WEIGHT = 0.1;     // plan-equivalent = reported + 10% of cache reads
const TAG_TOLERANCE_MS = 5 * 60 * 1000;

const norm = s => String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const slashes = s => String(s).toLowerCase().replace(/\\+/g, '/');

// ---- intervals ------------------------------------------------------------------------------------------------
function mergeIntervals(list) {
	const s = list.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
	const out = [];
	for (const [a, b] of s) {
		if (out.length && a <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], b);
		else out.push([a, b]);
	}
	return out;
}
const overlap = (a, b, intervals) => intervals.reduce((n, [s, e]) => n + Math.max(0, Math.min(b, e) - Math.max(a, s)), 0);
const inside = (t, intervals) => intervals.some(([s, e]) => t >= s && t < e);
const length = intervals => intervals.reduce((n, [a, b]) => n + b - a, 0);

// ---- PHASES.log ---------------------------------------------------------------------------------------------------
// One marker per line: <UTC ISO time> <phase name> <start|stop>, separated by tabs, commas or spaces. The phase name
// may hold spaces ("Audio and UI"). Blank lines and lines starting with # are skipped.
function parsePhases(text, untilMs) {
	const problems = [], byKey = new Map();
	text.split(/\r?\n/).forEach((raw, i) => {
		const line = raw.trim();
		if (!line || line.startsWith('#')) return;
		const m = line.match(/^(\S+?)[\s,]+(.+?)[\s,]+(start|stop)[\s,]*$/i);
		const t = m ? Date.parse(m[1]) : NaN;
		if (!m || isNaN(t) || !/(Z|[+-]\d\d:?\d\d)$/i.test(m[1])) { problems.push(`PHASES.log line ${i + 1}: not "<UTC time> <phase> <start|stop>"`); return; }
		const key = norm(m[2]);
		if (!byKey.has(key)) byKey.set(key, { name: m[2].trim(), key, events: [] });
		byKey.get(key).events.push({ t, event: m[3].toLowerCase(), line: i + 1 });
	});
	const phases = [];
	for (const p of byKey.values()) {
		p.events.sort((a, b) => a.t - b.t);
		const intervals = []; let open = null;
		for (const e of p.events) {
			if (e.event === 'start') {
				if (open !== null) problems.push(`${p.name}: start at line ${e.line} while already started (ignored)`);
				else open = e.t;
			} else if (open === null) problems.push(`${p.name}: stop at line ${e.line} with no start (ignored)`);
			else { intervals.push([open, e.t]); open = null; }
		}
		p.open = open !== null;
		if (p.open) {
			if (untilMs > open) intervals.push([open, untilMs]);
			problems.push(`${p.name}: still open, counted up to ${new Date(untilMs).toISOString()}`);
		}
		p.intervals = mergeIntervals(intervals);
		p.firstStart = p.events.find(e => e.event === 'start')?.t ?? null;
		p.lastStop = [...p.events].reverse().find(e => e.event === 'stop')?.t ?? null;
		phases.push(p);
	}
	phases.sort((a, b) => (a.intervals[0]?.[0] ?? Infinity) - (b.intervals[0]?.[0] ?? Infinity));
	return { phases, problems };
}

// ---- OWNER_STEPS.log -------------------------------------------------------------------------------------------
// One step per line: <UTC ISO time> <minutes> <what>, separated by tabs, commas or spaces.
function parseOwnerSteps(text) {
	const steps = [], problems = [];
	text.split(/\r?\n/).forEach((raw, i) => {
		const line = raw.trim();
		if (!line || line.startsWith('#')) return;
		const m = line.match(/^(\S+?)[\s,]+(\d+(?:\.\d+)?)(?:[\s,]+(.*))?$/);
		const t = m ? Date.parse(m[1]) : NaN;
		if (!m || isNaN(t) || !/(Z|[+-]\d\d:?\d\d)$/i.test(m[1])) { problems.push(`OWNER_STEPS.log line ${i + 1}: not "<UTC time> <minutes> <what>"`); return; }
		steps.push({ t, minutes: Number(m[2]) });
	});
	return { steps, problems };
}

// ---- transcripts --------------------------------------------------------------------------------------------------
function listTranscripts(dir) {
	const out = [];
	const walk = d => {
		let entries; try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
		for (const e of entries) {
			const p = path.join(d, e.name);
			if (e.isDirectory()) walk(p);
			else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(p);
		}
	};
	walk(dir);
	return out.sort();
}

const textOf = c => typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b && b.type === 'text').map(b => b.text || '').join('\n') : '';
// The owner's own entries in a session's main thread (never in a subagent's):
// - 'interrupt': the owner stopped the agent ("[Request interrupted by user...]"), counted on its own;
// - 'message': typed by a person. Newer transcripts mark it origin.kind "human"; with no origin field, a text entry
//   with no tool result that doesn't start with a system tag ("<...>").
function ownerKind(o) {
	if (o.type !== 'user' || o.isSidechain || o.isMeta || o.isCompactSummary) return null;
	const c = o.message && o.message.content;
	const t = textOf(c).trim();
	if (t.startsWith('[Request interrupted by user')) return 'interrupt';
	if (o.origin && typeof o.origin === 'object') return o.origin.kind === 'human' ? 'message' : null;
	if (o.turnOrigin !== undefined) return o.turnOrigin === 'human' ? 'message' : null;
	if (Array.isArray(c) && c.some(b => b && b.type === 'tool_result')) return null;
	return t.length > 0 && !t.startsWith('<') ? 'message' : null;
}
const isOwnerMessage = o => ownerKind(o) === 'message';

async function readTranscripts(dirs, needles) {
	const ns = needles.map(slashes);
	const streams = new Map();   // "<session>|<lead or agent id>" -> { session, times: [] }
	const sessions = new Map();  // session -> { files, matched: Set of reasons, first, last }
	const usage = new Map();     // "<message id>|<request id>" -> one record per API response
	const owner = new Map();     // uuid -> { t, session }
	const fileStats = { files: 0, lines: 0, badLines: 0 };
	for (const dir of dirs) for (const file of listTranscripts(dir)) {
		fileStats.files++;
		const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
		for await (const line of rl) {
			if (!line) continue;
			fileStats.lines++;
			let o; try { o = JSON.parse(line); } catch { fileStats.badLines++; continue; }
			const session = o.sessionId || path.basename(file, '.jsonl');
			if (!sessions.has(session)) sessions.set(session, { files: new Set(), matched: new Set(), first: Infinity, last: -Infinity });
			const S = sessions.get(session); S.files.add(file);
			if (o.cwd && ns.some(n => slashes(o.cwd).includes(n))) S.matched.add('cwd');
			if (o.type === 'assistant' && Array.isArray(o.message?.content) && !S.matched.has('tool call')) {
				for (const b of o.message.content) if (b && b.type === 'tool_use' && ns.some(n => slashes(JSON.stringify(b.input)).includes(n))) S.matched.add('tool call');
			}
			const t = Date.parse(o.timestamp);
			if ((o.type !== 'user' && o.type !== 'assistant') || isNaN(t)) continue;
			S.first = Math.min(S.first, t); S.last = Math.max(S.last, t);
			const sk = session + '|' + (o.isSidechain ? (o.agentId || 'sidechain') : 'lead');
			if (!streams.has(sk)) streams.set(sk, { session, lead: !o.isSidechain, times: [] });
			streams.get(sk).times.push(t);
			if (o.type === 'assistant' && o.message?.usage && o.message.model !== '<synthetic>') {
				const u = o.message.usage, key = (o.message.id || '') + '|' + (o.requestId || '');
				const r = { t, session, model: o.message.model || 'unknown', input: u.input_tokens || 0, output: u.output_tokens || 0,
					cacheWrite: u.cache_creation_input_tokens || 0, cacheRead: u.cache_read_input_tokens || 0 };
				const prev = usage.get(key);
				if (!prev) usage.set(key, r);
				else for (const f of ['input', 'output', 'cacheWrite', 'cacheRead']) prev[f] = Math.max(prev[f], r[f]), prev.t = Math.min(prev.t, t);
			}
			const kind = ownerKind(o);
			if (kind) { const id = o.uuid || session + '@' + t; if (!owner.has(id)) owner.set(id, { t, session, kind }); }
		}
	}
	for (const s of streams.values()) s.times.sort((a, b) => a - b);
	return { streams, sessions, usage: [...usage.values()], owner: [...owner.values()], fileStats };
}

// ---- measures -----------------------------------------------------------------------------------------------------
function activeMs(times, intervals) {
	let n = 0;
	for (let i = 1; i < times.length; i++) if (times[i] - times[i - 1] <= GAP_MS) n += overlap(times[i - 1], times[i], intervals);
	return n;
}

function measure(intervals, data, steps, test = t => inside(t, intervals)) {
	const r = { wallMs: length(intervals), activeStreamsMs: 0, activeSessionsMs: 0, activeAnyMs: 0, spanMs: 0,
		messages: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0, models: {}, ownerMessages: 0, ownerInterrupts: 0,
		ownerSteps: 0, ownerMinutes: 0 };
	const bySession = new Map(), all = [];
	for (const s of data.streams.values()) {
		r.activeStreamsMs += activeMs(s.times, intervals);
		if (s.times.length) r.spanMs += overlap(s.times[0], s.times[s.times.length - 1], intervals);
		if (!bySession.has(s.session)) bySession.set(s.session, []);
		bySession.get(s.session).push(...s.times); all.push(...s.times);
	}
	for (const times of bySession.values()) r.activeSessionsMs += activeMs(times.sort((a, b) => a - b), intervals);
	r.activeAnyMs = activeMs(all.sort((a, b) => a - b), intervals);
	for (const u of data.usage) if (test(u.t)) {
		r.messages++; r.input += u.input; r.output += u.output; r.cacheWrite += u.cacheWrite; r.cacheRead += u.cacheRead;
		r.models[u.model] = (r.models[u.model] || 0) + 1;
	}
	r.reported = r.input + r.output + r.cacheWrite;
	r.planEquivalent = r.reported + CACHE_READ_WEIGHT * r.cacheRead;
	r.ownerMessages = data.owner.filter(m => m.kind === 'message' && test(m.t)).length;
	r.ownerInterrupts = data.owner.filter(m => m.kind === 'interrupt' && test(m.t)).length;
	for (const s of steps) if (test(s.t)) { r.ownerSteps++; r.ownerMinutes += s.minutes; }
	return r;
}

function selectSessions(data, opts) {
	const keep = new Set(), why = new Map();
	for (const [id, s] of data.sessions) {
		let reason = null;
		if (opts.sessions.includes(id)) reason = 'named';
		else if (opts.all) reason = 'all';
		else if (s.matched.size) reason = [...s.matched].join(' + ');
		if (reason && !opts.excludeSessions.includes(id) && s.first !== Infinity) { keep.add(id); why.set(id, reason); }
	}
	const f = { ...data, streams: new Map([...data.streams].filter(([, s]) => keep.has(s.session))),
		usage: data.usage.filter(u => keep.has(u.session)), owner: data.owner.filter(m => keep.has(m.session)) };
	return { data: f, keep, why };
}

function compute(phaseInfo, data, steps) {
	const rows = phaseInfo.phases.map(p => ({ phase: p.name, open: p.open, intervals: p.intervals, ...measure(p.intervals, data, steps) }));
	const union = mergeIntervals(phaseInfo.phases.flatMap(p => p.intervals.map(i => [...i])));
	const total = { phase: 'All phases (union)', intervals: union, ...measure(union, data, steps) };
	if (union.length) total.firstToLastMs = union[union.length - 1][1] - union[0][0];
	// Outside: from the first to the last message of the counted sessions, minus the phases.
	const times = [...data.streams.values()].flatMap(s => s.times.length ? [s.times[0], s.times[s.times.length - 1]] : []);
	const gaps = [];
	if (times.length) {
		let at = Math.min(...times); const end = Math.max(...times) + 1;
		for (const [a, b] of union) { if (a > at) gaps.push([at, Math.min(a, end)]); at = Math.max(at, b); }
		if (end > at) gaps.push([at, end]);
	}
	const outside = { phase: 'Outside any phase', intervals: mergeIntervals(gaps), ...measure(mergeIntervals(gaps), data, steps, t => !inside(t, union)) };
	return { rows, total, outside };
}

function checkTags(repo, phases) {
	const problems = [];
	let out;
	try { out = cp.execFileSync('git', ['-C', repo, 'for-each-ref', '--format=%(refname:short)|%(creatordate:iso-strict)', 'refs/tags/phase'], { encoding: 'utf8' }); }
	catch (e) { return [`tag check: git failed in ${repo}`]; }
	const tags = new Map();
	for (const l of out.split(/\r?\n/).filter(Boolean)) {
		const [ref, date] = l.split('|'); const m = ref.match(/^phase\/(.+)\/(start|stop)$/);
		if (m) tags.set(norm(m[1]) + '/' + m[2], Date.parse(date));
	}
	for (const p of phases) for (const [ev, t] of [['start', p.firstStart], ['stop', p.lastStop]]) {
		if (t === null) continue;
		const tag = tags.get(p.key + '/' + ev);
		if (tag === undefined) problems.push(`tag phase/${p.key}/${ev}: missing`);
		else if (Math.abs(tag - t) > TAG_TOLERANCE_MS) problems.push(`tag phase/${p.key}/${ev}: ${new Date(tag).toISOString()}, log says ${new Date(t).toISOString()}`);
	}
	return problems;
}

// ---- CLI ----------------------------------------------------------------------------------------------------------
function parseArgs(argv) {
	const o = { projects: [], match: [], sessions: [], excludeSessions: [], all: false };
	const many = { '--projects': 'projects', '--match': 'match', '--session': 'sessions', '--exclude-session': 'excludeSessions' };
	const one = { '--phases': 'phases', '--owner-steps': 'ownerSteps', '--until': 'until', '--repo': 'repo', '--json': 'json' };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--all') o.all = true;
		else if (many[a]) o[many[a]].push(argv[++i]);
		else if (one[a]) o[one[a]] = argv[++i];
		else throw new Error(`unknown argument ${a}`);
	}
	if (!o.phases) throw new Error('--phases <PHASES.log> is required');
	const root = path.join(os.homedir(), '.claude', 'projects');
	if (!o.projects.length) {
		let names = []; try { names = fs.readdirSync(root); } catch { }
		o.projects = names.filter(n => /^d--git$/i.test(n) || /^d--git-backtoone-godot/i.test(n)).map(n => path.join(root, n));
	}
	if (!o.match.length) o.match = ['BackToOne-Godot'];
	return o;
}

const h = ms => (ms / 3600000).toFixed(2);
const M = n => (n / 1e6).toFixed(2);

async function main() {
	try { os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { }
	const opts = parseArgs(process.argv.slice(2));
	const untilMs = opts.until ? Date.parse(opts.until) : Date.now();
	if (isNaN(untilMs)) throw new Error('--until is not a time');
	const phaseInfo = parsePhases(fs.readFileSync(opts.phases, 'utf8'), untilMs);
	const stepInfo = opts.ownerSteps ? parseOwnerSteps(fs.readFileSync(opts.ownerSteps, 'utf8')) : { steps: [], problems: [] };
	const raw = await readTranscripts(opts.projects, opts.match);
	const { data, keep, why } = selectSessions(raw, opts);
	const result = compute(phaseInfo, data, stepInfo.steps);
	const problems = [...phaseInfo.problems, ...stepInfo.problems, ...(opts.repo ? checkTags(opts.repo, phaseInfo.phases) : [])];
	if (raw.fileStats.badLines) problems.push(`${raw.fileStats.badLines} transcript lines were not JSON (skipped)`);

	console.log(`Transcripts: ${raw.fileStats.files} files, ${raw.fileStats.lines} lines, in ${opts.projects.length} folder(s)`);
	console.log(`Sessions counted: ${keep.size} of ${raw.sessions.size}` + (opts.all ? ' (--all)' : ` (match: ${opts.match.join(', ')})`));
	for (const id of keep) {
		const s = raw.sessions.get(id), n = [...data.streams.values()].filter(x => x.session === id).length;
		console.log(`  ${id}  ${why.get(id)}  ${n - 1} subagent(s)  ${new Date(s.first).toISOString()} to ${new Date(s.last).toISOString()}`);
	}
	console.log('');
	console.log('| Phase | Wall-clock h | Active h (agents summed) | Active h (per session) | Any agent active h | First-to-last h | Reported M | Plan-eq M | Cache reads M | Responses | Owner messages | Interrupts | Owner steps (min) |');
	console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
	for (const r of [...result.rows, result.total, result.outside]) {
		const wall = r.phase === 'Outside any phase' ? '' : h(r.wallMs) + (r.open ? ' (open)' : '');
		console.log(`| ${r.phase} | ${wall} | ${h(r.activeStreamsMs)} | ${h(r.activeSessionsMs)} | ${h(r.activeAnyMs)} | ${h(r.spanMs)} | ${M(r.reported)} | ${M(r.planEquivalent)} | ${M(r.cacheRead)} | ${r.messages} | ${r.ownerMessages} | ${r.ownerInterrupts} | ${r.ownerSteps} (${r.ownerMinutes}) |`);
	}
	if (result.total.firstToLastMs !== undefined) console.log(`\nFirst start to last stop: ${h(result.total.firstToLastMs)} h`);
	const models = Object.entries(result.total.models).map(([k, v]) => `${k} ${v}`).join(', ');
	console.log(`Models (responses in any phase): ${models || 'none'}`);
	console.log(problems.length ? '\nProblems:\n' + problems.map(p => '- ' + p).join('\n') : '\nProblems: none');
	if (opts.json) {
		const sessionsOut = [...keep].map(id => ({ id, reason: why.get(id), first: new Date(raw.sessions.get(id).first).toISOString(), last: new Date(raw.sessions.get(id).last).toISOString() }));
		fs.writeFileSync(opts.json, JSON.stringify({ generated: new Date().toISOString(), until: new Date(untilMs).toISOString(),
			rules: { gapMinutes: GAP_MS / 60000, cacheReadWeight: CACHE_READ_WEIGHT }, files: raw.fileStats, sessions: sessionsOut,
			...result, problems }, null, 1) + '\n');
	}
}

module.exports = { parsePhases, parseOwnerSteps, readTranscripts, selectSessions, compute, checkTags, mergeIntervals, overlap,
	activeMs, ownerKind, isOwnerMessage, GAP_MS };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
