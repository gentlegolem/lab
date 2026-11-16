// SPDX-License-Identifier: MIT
// Finding 17 harness (agent-study/findings/finding-17-prereg.md). Node 18+, Docker, Claude Code 2.1.322.
//   node harness.js copy                 repo of each task out of its image -> <runs>/<A|B>/<id>/repo (fresh git, 1 commit)
//   node harness.js up | down            containers swl-<A|B>-<num>: no network, the copy mounted at the repo's path
//   node harness.js estimate             A's estimate (Opus, read-only, in A's folder) -> kit/estimate-A.txt
//   node harness.js architect            B's architect (Opus) -> B/PLAN.md
//   node harness.js build --cap-a <tokens> --cap-b <tokens>   A's agent and B's groups at once
//   node harness.js collect              patches from the containers -> kit/predictions-{A,B,empty}.json
//   node harness.js measure              tokens and minutes per run -> kit/measured.json
//   node harness.js audit                every run's tool calls -> kit/audit.json
//   node harness.js seal-check           lists the dataset folder and the Hugging Face cache -> kit/seal-<time>.txt
// <runs> is SWL_RUNS or D:/LabData/swelive-runs. Every agent run goes in kit/runs.json.
const fs = require('fs'); const path = require('path'); const os = require('os'); const cp = require('child_process'); const crypto = require('crypto');
const { parseTranscript } = require('../../agent-study/package/src/lib/usage.js');

const RUNS = process.env.SWL_RUNS || 'D:/LabData/swelive-runs';
const KIT = path.join(RUNS, 'kit');
const BRIEFS = path.join(__dirname, 'briefs');
const CLAUDE = process.env.SWL_CLAUDE || path.join(process.env.APPDATA || '', 'npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe');
const MODELS = process.env.SWL_TEST_MODEL ? { sonnet: process.env.SWL_TEST_MODEL, opus: process.env.SWL_TEST_MODEL } : { sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5' }; // SWL_TEST_MODEL: harness tests only
const EFFORT = 'high';
const DATASET_DIRS = ['D:/LabData/swe-bench-live', path.join(os.homedir(), '.cache/huggingface')];
const tasks = () => JSON.parse(fs.readFileSync(path.join(KIT, 'tasks.json'), 'utf8'));
const cname = (cond, t) => `swl-${cond}-${t.num}`;
const repoDir = (cond, t) => path.join(RUNS, cond, t.instance_id, 'repo');
const now = () => new Date().toISOString();
const runsFile = path.join(KIT, 'runs.json');
const loadRuns = () => (fs.existsSync(runsFile) ? JSON.parse(fs.readFileSync(runsFile, 'utf8')) : []);
const runKey = (r) => `${r.sessionId}:${r.resumed}`;
const saveRun = (r) => { const all = loadRuns().filter((x) => runKey(x) !== runKey(r)); all.push(r); fs.writeFileSync(runsFile, JSON.stringify(all, null, 1)); };
const winPath = (p) => path.resolve(p).replace(/\//g, '\\');

function docker(args, opts = {}) {
	const r = cp.spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
	if (r.status !== 0 && !opts.allowFail) throw new Error(`docker ${args.slice(0, 3).join(' ')} failed (${r.status}): ${(r.stderr || '').slice(0, 800)}`);
	return r;
}

// ---------- copy: the repo at its base commit, as a fresh repository with one commit and no history ----------
const COPY_SH = fs.readFileSync(path.join(__dirname, 'copy.sh'), 'utf8').split('\r').join('');
function copy() {
	const out = {};
	for (const t of tasks()) for (const cond of ['A', 'B']) {
		const dest = path.join(RUNS, cond, t.instance_id); fs.mkdirSync(dest, { recursive: true });
		const r = docker(['run', '--rm', '--network', 'none', '-e', `BASE=${t.base_commit}`, '-v', `${winPath(dest)}:/out`, '--entrypoint', 'bash', t.docker_image, '-c', COPY_SH]);
		const kv = Object.fromEntries(r.stdout.split('\n').filter((l) => l.includes('=')).map((l) => l.trim().split('=')));
		out[`${cond}/${t.instance_id}`] = kv;
		const same = kv.TREE_IMAGE === kv.TREE_COPY;
		console.log(`${cond} ${t.instance_id}: repo ${kv.REPO}, same tree ${same}, tar errors ${kv.TAR_ERRORS}, dirty ${kv.DIRTY}`);
		if (!same || kv.DIRTY !== '0') console.log('  CHECK THIS COPY: the tree differs from the image or the copy is not clean');
	}
	fs.writeFileSync(path.join(KIT, 'copy.json'), JSON.stringify(out, null, 1));
}
const repoPathOf = (cond, t) => { const c = JSON.parse(fs.readFileSync(path.join(KIT, 'copy.json'), 'utf8')); return c[`${cond}/${t.instance_id}`].REPO; };

// ---------- containers ----------
function up() {
	for (const t of tasks()) for (const cond of ['A', 'B']) {
		const repo = repoPathOf(cond, t);
		docker(['rm', '-f', cname(cond, t)], { allowFail: true });
		docker(['run', '-d', '--name', cname(cond, t), '--network', 'none', '-v', `${winPath(repoDir(cond, t))}:${repo}`, '-w', repo, '--entrypoint', 'sleep', t.docker_image, 'infinity']);
		console.log('up', cname(cond, t), '->', repo);
	}
}
function down() { for (const t of tasks()) for (const cond of ['A', 'B']) { docker(['rm', '-f', cname(cond, t)], { allowFail: true }); console.log('removed', cname(cond, t)); } }

// ---------- agent runs ----------
function rules({ read, edit = [], write = [], exec = [] }) {
	return { permissions: {
		allow: [...read.flatMap((p) => [`Read(${p})`, `Glob(${p})`, `Grep(${p})`]), ...edit.map((p) => `Edit(${p})`), ...write.map((p) => `Write(${p})`),
			...exec.map((c) => `Bash(docker exec ${c} bash -lc:*)`)],
		deny: ['WebFetch', 'WebSearch'],
	} };
}
const live = new Set();
function claudeRun({ cond, role, group = null, model, cwd, prompt, perms, resume = null }) {
	const sessionId = resume || crypto.randomUUID();
	const tag = [cond, role, group].filter(Boolean).join('-');
	const rulesFile = path.join(KIT, `rules-${tag}.json`); fs.writeFileSync(rulesFile, JSON.stringify(perms, null, 1));
	const outFile = path.join(KIT, `out-${tag}${resume ? '-resume' : ''}.json`);
	const args = ['-p', prompt, '--safe-mode', '--model', MODELS[model], '--effort', EFFORT, '--settings', winPath(rulesFile),
		'--permission-mode', 'dontAsk', '--output-format', 'json', ...(resume ? ['--resume', sessionId] : ['--session-id', sessionId])];
	const rec = { cond, role, group, model: MODELS[model], effort: EFFORT, sessionId, cwd, start: now(), end: null, exit: null, resumed: !!resume, outFile };
	saveRun(rec);
	return new Promise((resolve) => {
		const out = fs.openSync(outFile, 'w'); const err = fs.openSync(outFile.replace(/.json$/, '.err.txt'), 'w');
		const child = cp.spawn(CLAUDE, args, { cwd, stdio: ['ignore', out, err], windowsHide: true });
		const entry = { child, cond, sessionId }; live.add(entry);
		console.log(`${now()} start ${tag}${resume ? ' (continue)' : ''} ${sessionId}`);
		child.on('exit', (code) => { live.delete(entry); fs.closeSync(out); fs.closeSync(err); rec.end = now(); rec.exit = code;
			try { const j = JSON.parse(fs.readFileSync(outFile, 'utf8')); rec.actualSessionId = j.session_id; rec.refused = (j.permission_denials || []).length; } catch { rec.unreadableOut = true; }
			saveRun(rec); console.log(`${now()} end ${tag} exit ${code}`); resolve(rec); });
	});
}
const brief = (name, vars = {}) => Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), fs.readFileSync(path.join(BRIEFS, name), 'utf8'));

async function estimate() {
	const r = await claudeRun({ cond: 'A', role: 'estimator', model: 'opus', cwd: path.join(RUNS, 'A'), prompt: brief('estimator.md'), perms: rules({ read: ['./**'] }) });
	const res = JSON.parse(fs.readFileSync(r.outFile, 'utf8'));
	const line = (String(res.result || '').match(/ESTIMATE:[^\n]*/) || [''])[0];
	fs.writeFileSync(path.join(KIT, 'estimate-A.txt'), line + '\n'); console.log(line || 'NO ESTIMATE LINE: see ' + r.outFile);
}
async function architect() {
	await claudeRun({ cond: 'B', role: 'architect', model: 'opus', cwd: path.join(RUNS, 'B'), prompt: brief('B-architect.md'), perms: rules({ read: ['./**'], edit: ['./PLAN.md'], write: ['./PLAN.md'] }) });
	console.log(JSON.stringify(parsePlan(), null, 1));
}
function parsePlan() {
	const text = fs.readFileSync(path.join(RUNS, 'B', 'PLAN.md'), 'utf8');
	const num = (s) => Number(String(s).replace(/,/g, ''));
	const m1 = text.match(/^ARCHITECT:\s*([\d.]+)\s*min,\s*([\d.,]+)k reported/m);
	const wall = text.match(/^WALL:\s*([\d.]+)\s*min/m);
	const solo = text.match(/^SOLO:\s*([\d.]+)\s*agent-min,\s*([\d.,]+)k reported/m);
	const saving = text.match(/^SAVING:\s*(-?[\d.]+)%\s*of tokens,\s*(-?[\d.]+)%\s*of wall-clock/m);
	const ids = new Set(tasks().map((t) => t.instance_id));
	const groups = [...text.matchAll(/^GROUP (G\d+):\s*tasks ([^;]+);\s*after:\s*([^;]+);\s*ESTIMATE:\s*([\d.]+)\s*agent-min,\s*([\d.,]+)k reported/gm)].map((m) => ({
		group: m[1], tasks: m[2].split(',').map((s) => s.trim()).filter(Boolean),
		after: /none/i.test(m[3]) ? [] : m[3].split(',').map((s) => s.trim()), minutes: num(m[4]), reportedK: num(m[5]) }));
	const assigned = groups.flatMap((g) => g.tasks);
	const problems = [];
	if (!m1 || !wall || !solo || !saving) problems.push('a header line is missing or not in the set form');
	if (!groups.length) problems.push('no GROUP lines');
	if (assigned.length !== ids.size || assigned.some((x) => !ids.has(x))) problems.push('every task must be in exactly one group, by its full id');
	for (const g of groups) for (const a of g.after) if (!groups.some((x) => x.group === a)) problems.push(`${g.group} waits for unknown ${a}`);
	return { architect: m1 && { minutes: num(m1[1]), reportedK: num(m1[2]) }, wall: wall && num(wall[1]), solo: solo && { minutes: num(solo[1]), reportedK: num(solo[2]) },
		saving: saving && { tokensPct: num(saving[1]), wallPct: num(saving[2]) }, groups, problems };
}

// A build's reported tokens so far, from its runs' transcripts (the cap watcher).
function transcriptOf(sessionId) {
	const base = path.join(os.homedir(), '.claude', 'projects');
	for (const d of fs.readdirSync(base)) { const f = path.join(base, d, `${sessionId}.jsonl`); if (fs.existsSync(f)) return f; }
	return null;
}
function reportedSoFar(cond) {
	let s = 0;
	const seen = new Set();
	for (const r of loadRuns().filter((x) => x.cond === cond && x.role !== 'estimator')) { const f = transcriptOf(r.actualSessionId || r.sessionId); if (!f || seen.has(f)) continue; seen.add(f); if (f) { const t = parseTranscript(f); s += t.input + t.output + t.cacheWrite; } }
	return s;
}
const resultDone = (file, ids) => { if (!fs.existsSync(file)) return false; const txt = fs.readFileSync(file, 'utf8'); return ids.every((id) => new RegExp(`${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*(NOT )?DONE`).test(txt)); };
async function runWithContinue(spec, resultFile, ids) {
	const first = await claudeRun(spec);
	if (resultDone(resultFile, ids) || stopped.has(spec.cond)) return;
	await claudeRun({ ...spec, resume: first.actualSessionId || first.sessionId, prompt: 'continue' });
}
const stopped = new Set();
async function build(capA, capB) {
	const plan = parsePlan(); if (plan.problems.length) throw new Error('PLAN.md: ' + plan.problems.join('; '));
	const T = tasks(); const byId = new Map(T.map((t) => [t.instance_id, t]));
	const caps = { A: capA, B: capB };
	const watcher = setInterval(() => { for (const cond of ['A', 'B']) { if (stopped.has(cond)) continue; const s = reportedSoFar(cond);
		if (s > caps[cond]) { stopped.add(cond); console.log(`${now()} ${cond} reached its cap (${s} > ${caps[cond]}): stopping its runs`); for (const e of live) if (e.cond === cond) e.child.kill(); } } }, 60000);
	const A = runWithContinue({ cond: 'A', role: 'agent', model: 'sonnet', cwd: path.join(RUNS, 'A'), prompt: brief('A.md'),
		perms: rules({ read: ['./**'], edit: ['./**'], write: ['./**'], exec: T.map((t) => cname('A', t)) }) }, path.join(RUNS, 'A', 'RESULT.md'), T.map((t) => t.instance_id));
	const done = new Map();
	const startGroup = (g) => runWithContinue({ cond: 'B', role: 'group', group: g.group, model: 'sonnet', cwd: path.join(RUNS, 'B'),
		prompt: brief('B-group.md', { GROUP: g.group, TASKS: g.tasks.join(', ') }),
		perms: rules({ read: ['./**'], edit: g.tasks.map((id) => `./${id}/**`), write: [...g.tasks.map((id) => `./${id}/**`), `./RESULT-${g.group}.md`],
			exec: g.tasks.map((id) => cname('B', byId.get(id))) }) }, path.join(RUNS, 'B', `RESULT-${g.group}.md`), g.tasks);
	const B = (async () => {
		const pending = new Map(plan.groups.map((g) => [g.group, g]));
		const running = new Map();
		while (pending.size || running.size) {
			if (stopped.has('B')) break;
			for (const [name, g] of pending) if (g.after.every((a) => done.has(a))) { pending.delete(name); running.set(name, startGroup(g).then(() => { running.delete(name); done.set(name, true); })); }
			if (running.size) await Promise.race(running.values()); else if (pending.size) throw new Error('PLAN.md dependencies can never be met');
		}
	})();
	await Promise.all([A, B]); clearInterval(watcher);
	console.log('build finished; stopped by cap:', [...stopped].join(', ') || 'none');
}

// ---------- patches: git add -A in the container, diff against the base commit, binary files left out ----------
function collect() {
	const T = tasks(); const preds = { A: {}, B: {}, empty: {} };
	for (const cond of ['A', 'B']) for (const t of T) {
		const c = cname(cond, t);
		docker(['exec', c, 'bash', '-lc', 'git add -A']);
		const bin = docker(['exec', c, 'bash', '-lc', 'git diff --cached --numstat HEAD']).stdout.split('\n').filter((l) => l.startsWith('-\t-\t')).map((l) => l.slice(4));
		for (const f of bin) docker(['exec', c, 'git', 'reset', '-q', '--', f]);
		const patch = docker(['exec', c, 'bash', '-lc', 'git --no-pager diff --cached HEAD --text']).stdout;
		preds[cond][t.instance_id] = { model_patch: patch, model_name_or_path: `finding17-${cond}` };
		console.log(`${cond} ${t.instance_id}: ${patch.split('\n').length} patch lines${bin.length ? `, ${bin.length} binary files left out` : ''}`);
		if (cond === 'A') preds.empty[t.instance_id] = { model_patch: '', model_name_or_path: 'finding17-empty' };
	}
	for (const k of Object.keys(preds)) fs.writeFileSync(path.join(KIT, `predictions-${k}.json`), JSON.stringify(preds[k], null, 1));
}

// ---------- measures ----------
function measure() {
	const seen = new Set();
	const rows = loadRuns().map((r) => { let f = transcriptOf(r.actualSessionId || r.sessionId); if (f && seen.has(f)) f = null; else if (f) seen.add(f); const t = f ? parseTranscript(f) : null; // a resumed run shares its first run's transcript: counted once
		const reported = t ? t.input + t.output + t.cacheWrite : 0;
		return { ...r, transcript: f, reported, cacheRead: t ? t.cacheRead : 0, planEq: t ? reported + 0.1 * t.cacheRead : 0, minutes: t && t.first ? (t.last - t.first) / 60000 : 0, first: t && t.first, last: t && t.last }; });
	const total = (cond) => { const rs = rows.filter((r) => r.cond === cond && r.role !== 'estimator');
		const first = Math.min(...rs.map((r) => r.first || Infinity)), last = Math.max(...rs.map((r) => r.last || 0));
		return { runs: rs.length, reported: rs.reduce((a, r) => a + r.reported, 0), planEq: rs.reduce((a, r) => a + r.planEq, 0), agentMinutes: rs.reduce((a, r) => a + r.minutes, 0), wallMinutes: (last - first) / 60000 }; };
	const out = { rows, A: total('A'), B: total('B') };
	fs.writeFileSync(path.join(KIT, 'measured.json'), JSON.stringify(out, null, 1));
	for (const c of ['A', 'B']) console.log(c, JSON.stringify(out[c]));
}

// ---------- audit ----------
const norm = (p) => String(p || '').replace(/\\/g, '/').toLowerCase();
function audit() {
	const report = {};
	for (const r of loadRuns().filter((x) => !x.resumed)) {
		const f = transcriptOf(r.actualSessionId || r.sessionId); if (!f) { report[r.sessionId] = { missing: true }; continue; }
		const own = norm(path.resolve(r.cwd)); const tools = {}; const flags = []; let refused = 0;
		const allowedExec = new RegExp(`^docker exec swl-${r.cond}-\\d+ bash -lc `);
		for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
			if (!line) continue; let j; try { j = JSON.parse(line); } catch { continue; }
			const content = j.message && Array.isArray(j.message.content) ? j.message.content : [];
			for (const c of content) {
				if (c.type === 'tool_result' && c.is_error && /permission|denied|don't ask/i.test(JSON.stringify(c.content || ''))) refused++;
				if (c.type !== 'tool_use') continue;
				tools[c.name] = (tools[c.name] || 0) + 1;
				const inp = c.input || {}; const p = inp.file_path || inp.path || inp.notebook_path;
				if (/^(WebFetch|WebSearch)$/.test(c.name) || /^mcp__/.test(c.name)) flags.push(`web or MCP tool ${c.name}`);
				if (p && !norm(path.resolve(r.cwd, p)).startsWith(own)) flags.push(`${c.name} outside its folder: ${p}`);
				if (c.name === 'Bash' && !allowedExec.test(String(inp.command || '').trim())) flags.push(`Bash not a docker exec into its own containers: ${String(inp.command).slice(0, 160)}`);
				if (/huggingface|github\.com|swe-bench|labdata\/swe-bench-live/i.test(JSON.stringify(inp))) flags.push(`${c.name} mentions the dataset or GitHub: ${JSON.stringify(inp).slice(0, 160)}`);
			}
		}
		const deniedByCli = loadRuns().filter((x) => x.sessionId === r.sessionId || x.actualSessionId === r.actualSessionId).reduce((a, x) => a + (x.refused || 0), 0);
		report[`${r.cond}-${r.role}${r.group ? '-' + r.group : ''}`] = { sessionId: r.actualSessionId || r.sessionId, tools, refused: Math.max(refused, deniedByCli), flags };
	}
	fs.writeFileSync(path.join(KIT, 'audit.json'), JSON.stringify(report, null, 1));
	for (const [k, v] of Object.entries(report)) console.log(k, v.missing ? 'NO TRANSCRIPT' : `tools ${JSON.stringify(v.tools)} refused ${v.refused} flags ${v.flags.length}`);
}

// ---------- seal check: the dataset must be absent while agents work ----------
function sealCheck() {
	const lines = [`seal check ${now()}`];
	const walk = (d) => { if (!fs.existsSync(d)) return [`${d}: absent`]; const out = []; const st = [d];
		while (st.length) { const x = st.pop(); for (const e of fs.readdirSync(x, { withFileTypes: true })) { const p = path.join(x, e.name); if (e.isDirectory()) st.push(p); else out.push(`${p} ${fs.statSync(p).size}`); } }
		return out.length ? out : [`${d}: empty`]; };
	for (const d of DATASET_DIRS) lines.push(...walk(d).filter((l) => !/huggingface/i.test(l) || /swe-bench|swe_bench/i.test(l) || /absent|empty/.test(l)));
	const file = path.join(KIT, `seal-${now().replace(/[:.]/g, '-')}.txt`); fs.writeFileSync(file, lines.join('\n') + '\n'); console.log(lines.join('\n'));
}

const [cmd, ...rest] = process.argv.slice(2);
const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? Number(rest[i + 1]) : NaN; };
const cmds = { copy, up, down, estimate, architect, collect, measure, audit, 'seal-check': sealCheck, plan: () => console.log(JSON.stringify(parsePlan(), null, 1)),
	build: () => { const a = opt('--cap-a'), b = opt('--cap-b'); if (!(a > 0 && b > 0)) throw new Error('build needs --cap-a and --cap-b (reported tokens)'); return build(a, b); } };
if (!cmds[cmd]) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 12).join('\n')); process.exit(1); }
Promise.resolve(cmds[cmd]()).catch((e) => { console.error(e.message); process.exit(1); });
