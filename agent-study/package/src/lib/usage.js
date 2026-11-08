// SPDX-License-Identifier: MIT
// Parsing of Claude Code subagent transcripts: <root>/<session>/subagents/agent-*.jsonl (+ .meta.json: description, agentType, and `model`
// when the agent was launched with an explicit model) and subagents/workflows/<run>/ (workflow agents).
// Each assistant message carries `usage`; a message is logged once per content block with the same id and its usage
// grows (output at the end), so the max per field is kept per message id.
const fs = require('fs');
const path = require('path');
const os = require('os');

const defaultRoot = () => { // default: the only project folder under ~/.claude/projects, else ask for RESIDENCY_TRANSCRIPTS
	const base = path.join(os.homedir(), '.claude', 'projects');
	const ds = fs.existsSync(base) ? fs.readdirSync(base) : [];
	return ds.length === 1 ? path.join(base, ds[0]) : base;
};
const ROOT = process.env.RESIDENCY_TRANSCRIPTS || defaultRoot();

function sessionsOf(root, session) {
	if (session) return [session];
	if (!fs.existsSync(root)) return [];
	return fs.readdirSync(root).filter((d) => fs.existsSync(path.join(root, d, 'subagents')));
}

// subagents/ + subagents/workflows/<run>/ (workflow agents live one level down)
function dirsOf(root, s) {
	const base = path.join(root, s, 'subagents');
	const wf = path.join(base, 'workflows');
	const out = [{ dir: base, workflow: '' }];
	if (fs.existsSync(wf)) for (const r of fs.readdirSync(wf)) out.push({ dir: path.join(wf, r), workflow: r });
	return out.filter((d) => fs.existsSync(d.dir) && fs.statSync(d.dir).isDirectory());
}

// A file's lines, read in chunks: one transcript can pass Node's 512 MB string limit. Same lines as split('\n').
function* linesOf(file) {
	const fd = fs.openSync(file, 'r');
	const buf = Buffer.allocUnsafe(Math.max(1, Math.min(32 << 20, fs.fstatSync(fd).size)));
	const dec = new (require('string_decoder').StringDecoder)('utf8'); // keeps a character split across two chunks whole
	let rest = '';
	let n;
	try {
		while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
			const parts = (rest + dec.write(buf.subarray(0, n))).split('\n');
			rest = parts.pop();
			yield* parts;
		}
		yield rest + dec.end();
	} finally { fs.closeSync(fd); }
}

// One transcript -> totals. models = distinct message.model values on assistant messages (the real model).
function parseTranscript(file) {
	const byMsg = new Map();
	const tools = new Set();
	const models = new Set();
	const t = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, calls: 0, toolCalls: 0, first: null, last: null, model: '', brief: '', briefChars: 0, skills: [] };
	const skills = new Set();
	let briefSeen = false;
	for (const line of linesOf(file)) {
		if (!briefSeen && line.includes('"type":"user"')) { // the agent's first prompt (its brief): ledger.js reads an "ESTIMATE:" line from it
			briefSeen = true;
			try {
				const c = (JSON.parse(line).message || {}).content;
				const full = typeof c === 'string' ? c : (c || []).filter((b) => b && b.type === 'text').map((b) => b.text).join('\n');
				t.briefChars = full.length;
				t.brief = full.slice(0, 20000);
			} catch (e) { /* not a message line */ }
			continue;
		}
		if (line.includes('"name":"Skill"')) for (const m of line.matchAll(/"name":"Skill","input":{"skill":"([^"]+)"/g)) skills.add(m[1]);
		if (!line.includes('"usage"')) continue;
		let j; try { j = JSON.parse(line); } catch (e) { continue; }
		const m = j.message || {};
		const u = m.usage; if (!u) continue;
		const key = m.id || j.uuid;
		const prev = byMsg.get(key) || { i: 0, o: 0, w: 0, c: 0 };
		byMsg.set(key, {
			i: Math.max(prev.i, u.input_tokens || 0), o: Math.max(prev.o, u.output_tokens || 0),
			w: Math.max(prev.w, u.cache_creation_input_tokens || 0), c: Math.max(prev.c, u.cache_read_input_tokens || 0),
		});
		if (j.type === 'assistant' && m.model && m.model !== '<synthetic>') models.add(m.model);
		if (Array.isArray(m.content) && m.content.some((b) => b && b.type === 'tool_use')) tools.add(key);
		t.model = m.model || t.model;
		const ts = Date.parse(j.timestamp || ''); if (ts) { t.first = t.first ? Math.min(t.first, ts) : ts; t.last = Math.max(t.last || 0, ts); }
	}
	for (const v of byMsg.values()) { t.input += v.i; t.output += v.o; t.cacheWrite += v.w; t.cacheRead += v.c; t.calls++; }
	t.toolCalls = tools.size;
	t.models = [...models];
	t.skills = [...skills].sort();
	return t;
}

// All subagent runs. opts: { session, filter (text in description), since (ms epoch), root }
function loadRuns(opts = {}) {
	const root = opts.root || ROOT;
	const filter = (opts.filter || '').toLowerCase();
	const since = opts.since || 0;
	const rows = [];
	for (const s of sessionsOf(root, opts.session)) for (const { dir, workflow } of dirsOf(root, s)) {
		for (const f of fs.readdirSync(dir).filter((x) => /^agent-.*\.jsonl$/.test(x))) {
			const id = f.slice(6, -6);
			let meta = {};
			try { meta = JSON.parse(fs.readFileSync(path.join(dir, `agent-${id}.meta.json`), 'utf8')); } catch (e) { /* no meta */ }
			const desc = meta.description || '';
			if (filter && !desc.toLowerCase().includes(filter)) continue;
			if (since && fs.statSync(path.join(dir, f)).mtimeMs < since) continue; // last write before --since: it cannot have started after it
			const t = parseTranscript(path.join(dir, f));
			if (!t.calls || (since && (t.first || 0) < since)) continue;
			rows.push({
				id, session: s, workflow, type: meta.agentType || '', desc, requestedModel: meta.model || '',
				...t, minutes: t.first ? (t.last - t.first) / 60000 : 0,
			});
		}
	}
	rows.sort((a, b) => (a.first || 0) - (b.first || 0));
	return rows;
}

module.exports = { ROOT, loadRuns, parseTranscript, linesOf };
