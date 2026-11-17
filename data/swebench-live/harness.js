// SPDX-License-Identifier: MIT
// Finding 17 harness (agent-study/findings/finding-17-prereg.md). Node 18+, Docker, Claude Code 2.1.322.
//   node harness.js copy                 repo of each task out of its image -> <runs>/<A|B>/<id>/repo (fresh git, 1 commit)
//   node harness.js up | down            containers swl-<A|B>-<num>: no network, the copy mounted at the repo's path
//   node harness.js estimate             A's estimate (Opus, read-only, in A's folder) -> kit/estimate-A.txt
//   node harness.js architect            B's architect (Opus) -> B/PLAN.md
//   node harness.js build --cap-a <tokens> --cap-b <tokens>   A's agent and B's groups at once
//   node harness.js collect              patches from the containers -> kit/predictions-{A,B,empty,noop}.json
//   node harness.js measure              tokens and minutes per run -> kit/measured.json
//   node harness.js audit                every run's tool calls -> kit/audit.json
//   node harness.js score                the pre-registered measures and rules -> kit/score.json
//   node harness.js gold-summary         the gold check's resolved flags per task and run -> kit/gold-check.json
//   node harness.js seal-check           lists the dataset folder, the Hugging Face cache and stray rows -> kit/seal-<time>.txt
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
		const same = !!kv.CONTENT_IMAGE && kv.CONTENT_IMAGE === kv.CONTENT_COPY;
		console.log(`${cond} ${t.instance_id}: repo ${kv.REPO}, same content ${same} (${kv.FILES} files), tar errors ${kv.TAR_ERRORS}, dirty ${kv.DIRTY}`);
		if (!same || kv.DIRTY !== '0' || kv.TAR_ERRORS !== '0') console.log('  CHECK THIS COPY: its files differ from the image, or the copy is not clean');
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
// Claude Code checks Write (new files too) against Edit rules: a Write(...) rule grants nothing (probed 2026-11-17), so
// every path an agent may write gets an Edit rule. docker exec is allowed from both shells (Bash and PowerShell);
// a chained command that does anything more is refused (probed).
function rules({ read, edit = [], write = [], exec = [] }) {
	return { permissions: {
		allow: [...read.flatMap((p) => [`Read(${p})`, `Glob(${p})`, `Grep(${p})`]), ...[...new Set([...edit, ...write])].map((p) => `Edit(${p})`),
			...exec.flatMap((c) => [`Bash(docker exec ${c} bash -lc:*)`, `PowerShell(docker exec ${c} bash -lc:*)`])],
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
// The evaluator counts an empty patch as unresolved without running it, so the gold check's "without the fix" run uses
// NOOP: a patch that only adds one new text file at the repo root (the test patch is applied as usual).
const NOOP = 'diff --git a/F17_NOOP.txt b/F17_NOOP.txt\nnew file mode 100644\n--- /dev/null\n+++ b/F17_NOOP.txt\n@@ -0,0 +1 @@\n+finding 17 no-op patch\n';
function collect() {
	const T = tasks(); const preds = { A: {}, B: {}, empty: {}, noop: {} };
	for (const cond of ['A', 'B']) for (const t of T) {
		const c = cname(cond, t);
		docker(['exec', c, 'bash', '-lc', 'git add -A']);
		const bin = docker(['exec', c, 'bash', '-lc', 'git diff --cached --numstat HEAD']).stdout.split('\n').filter((l) => l.startsWith('-\t-\t')).map((l) => l.slice(4));
		for (const f of bin) docker(['exec', c, 'git', 'reset', '-q', '--', f]);
		const patch = docker(['exec', c, 'bash', '-lc', 'git --no-pager diff --cached HEAD --text']).stdout;
		preds[cond][t.instance_id] = { model_patch: patch, model_name_or_path: `finding17-${cond}` };
		console.log(`${cond} ${t.instance_id}: ${patch.split('\n').length} patch lines${bin.length ? `, ${bin.length} binary files left out` : ''}`);
		if (cond === 'A') { preds.empty[t.instance_id] = { model_patch: '', model_name_or_path: 'finding17-empty' }; preds.noop[t.instance_id] = { model_patch: NOOP, model_name_or_path: 'finding17-noop' }; }
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
				if ((c.name === 'Bash' || c.name === 'PowerShell') && !allowedExec.test(String(inp.command || '').trim())) flags.push(`${c.name} not a docker exec into its own containers: ${String(inp.command).slice(0, 160)}`);
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
		while (st.length) { const x = st.pop(); for (const e of fs.readdirSync(x, { withFileTypes: true })) { const p = path.join(x, e.name); if (e.isDirectory()) st.push(p); else { let size = '?'; try { size = fs.lstatSync(p).size; } catch { /* a Linux symlink on the Windows mount */ } out.push(`${p} ${size}`); } } }
		return out.length ? out : [`${d}: empty`]; };
	for (const d of DATASET_DIRS) { const hits = walk(d).filter((l) => !/huggingface/i.test(l) || /swe-bench|swe_bench/i.test(l) || /absent|empty/.test(l));
		lines.push(...(hits.length ? hits : [`${d}: no SWE-bench copy`])); }
	// dataset rows or evaluator logs left in the runs folder (eval.jsonl, gold_patch_evaluated_instances.jsonl, kit/logs)
	const left = walk(RUNS).filter((l) => /\.jsonl |[\\/]kit[\\/]logs[\\/]/.test(l));
	lines.push(`${RUNS}: ${left.length ? 'dataset rows or evaluator logs left:' : 'no .jsonl and no evaluator logs'}`, ...left);
	const file = path.join(KIT, `seal-${now().replace(/[:.]/g, '-')}.txt`); fs.writeFileSync(file, lines.join('\n') + '\n'); console.log(lines.join('\n'));
}

// ---------- gold check summary: resolved or not per task per evaluator run, before the logs are deleted at the seal ----------
function goldSummary() {
	const logs = path.join(KIT, 'logs'); const out = {};
	for (const run of fs.readdirSync(logs, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
		out[run] = {};
		for (const t of tasks()) { const f = path.join(logs, run, t.instance_id, 'report.json');
			out[run][t.instance_id] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).resolved : null; }
	}
	const golds = Object.keys(out).filter((r) => r.startsWith('gold-'));
	const keep = tasks().filter((t) => golds.length === 3 && golds.every((r) => out[r][t.instance_id] === true) && out.noop && out.noop[t.instance_id] === false).map((t) => t.instance_id);
	fs.writeFileSync(path.join(KIT, 'gold-check.json'), JSON.stringify({ runs: out, counts: keep }, null, 1));
	for (const t of tasks()) console.log(t.instance_id, Object.keys(out).map((r) => `${r}=${out[r][t.instance_id]}`).join(' '), keep.includes(t.instance_id) ? 'COUNTS' : 'REPLACE');
}

// ---------- score: the pre-registered measures and rules (written after the gold check, before any build) ----------
// Needs the evaluator's reports in kit/logs/eval-A and kit/logs/eval-B, kit/measured.json, kit/estimate-A.txt, B/PLAN.md,
// A/RESULT.md and B/RESULT-G*.md, and kit/audit.json if present. Writes kit/score.json.
function score() {
	const ids = tasks().map((t) => t.instance_id); const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const ev = (c) => JSON.parse(fs.readFileSync(path.join(KIT, 'logs', `eval-${c}`, 'results.json'), 'utf8'));
	const claims = (c) => { const dir = path.join(RUNS, c); const files = c === 'A' ? ['RESULT.md'] : fs.readdirSync(dir).filter((f) => /^RESULT-G\d+\.md$/.test(f));
		const txt = files.map((f) => path.join(dir, f)).filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
		return Object.fromEntries(ids.map((id) => { const m = txt.match(new RegExp(`${esc(id)}\\s*:\\s*(NOT DONE|DONE)`)); return [id, m ? m[1] : 'no line']; })); };
	const R = {}, C = {};
	for (const c of ['A', 'B']) { const e = ev(c); R[c] = new Set(e.success_ids); C[c] = claims(c); R[c].errors = e.error_ids; R[c].empty = e.empty_patch_ids; }
	const resolved = { A: ids.filter((id) => R.A.has(id)).length, B: ids.filter((id) => R.B.has(id)).length };
	const diff = resolved.B - resolved.A;
	const main = diff >= 2 ? 'B ahead' : diff <= -2 ? 'A ahead' : 'no difference found';
	const doneStats = (cs) => { const done = cs.flatMap((c) => ids.filter((id) => C[c][id] === 'DONE').map((id) => ({ c, id })));
		const bad = done.filter(({ c, id }) => !R[c].has(id)); return { done: done.length, doneButUnresolved: bad.length, share: done.length ? bad.length / done.length : null }; };
	const done = { A: doneStats(['A']), B: doneStats(['B']), pooled: doneStats(['A', 'B']) };
	done.verdict = done.pooled.share === null ? 'no DONE claims' : done.pooled.share >= 0.25 ? 'agrees' : 'disagrees';
	const m = JSON.parse(fs.readFileSync(path.join(KIT, 'measured.json'), 'utf8')); const plan = parsePlan();
	const estA = fs.readFileSync(path.join(KIT, 'estimate-A.txt'), 'utf8').match(/ESTIMATE:\s*([\d.]+)\s*agent-min,\s*([\d.,]+)k reported/);
	const quote = { A: { minutes: Number(estA[1]), reported: Number(estA[2].replace(/,/g, '')) * 1000 },
		B: { minutes: plan.architect.minutes + plan.groups.reduce((a, g) => a + g.minutes, 0), reported: (plan.architect.reportedK + plan.groups.reduce((a, g) => a + g.reportedK, 0)) * 1000 } };
	const err = (measured, est) => Math.abs(measured / est - 1);
	const minutes = {}; for (const c of ['A', 'B']) { const raw = err(m[c].agentMinutes, quote[c].minutes), corr = err(m[c].agentMinutes, quote[c].minutes * 0.34);
		minutes[c] = { measured: m[c].agentMinutes, raw: quote[c].minutes, errRaw: raw, corrected: quote[c].minutes * 0.34, errCorrected: corr, closer: corr < raw ? 'x0.34' : 'raw' }; }
	minutes.verdict = minutes.A.closer === 'x0.34' && minutes.B.closer === 'x0.34' ? 'agrees' : minutes.A.closer === 'raw' && minutes.B.closer === 'raw' ? 'disagrees' : 'mixed';
	minutes.Bwall = { measured: m.B.wallMinutes, raw: plan.wall, errRaw: err(m.B.wallMinutes, plan.wall), errCorrected: err(m.B.wallMinutes, plan.wall * 0.34) };
	const groupRows = m.rows.filter((r) => r.cond === 'B' && r.role === 'group');
	const perGroup = plan.groups.map((g) => { const rs = groupRows.filter((r) => r.group === g.group);
		return { group: g.group, tasks: g.tasks, forecastK: g.reportedK, measuredK: rs.reduce((a, r) => a + r.reported, 0) / 1000, forecastMin: g.minutes, measuredMin: rs.reduce((a, r) => a + r.minutes, 0) }; });
	const groupsForecast = perGroup.reduce((a, g) => a + g.forecastK, 0), groupsMeasured = perGroup.reduce((a, g) => a + g.measuredK, 0);
	const measuredSaving = (m.A.planEq - m.B.planEq) / m.A.planEq, forecastSaving = plan.saving.tokensPct / 100;
	const split = { groupsForecastK: groupsForecast, groupsMeasuredK: groupsMeasured, groupsOver: groupsMeasured / groupsForecast - 1, measuredSaving, forecastSaving, perGroup };
	split.verdict = split.groupsOver >= 0.15 && measuredSaving < forecastSaving ? 'agrees' : 'disagrees';
	if (measuredSaving > 0 && resolved.B < resolved.A) split.note = 'the split saved tokens but resolved fewer tasks';
	const runs = loadRuns(); const audit = fs.existsSync(path.join(KIT, 'audit.json')) ? JSON.parse(fs.readFileSync(path.join(KIT, 'audit.json'), 'utf8')) : null;
	const also = { restarts: { A: runs.filter((r) => r.cond === 'A' && r.resumed).length, B: runs.filter((r) => r.cond === 'B' && r.resumed).length },
		refused: audit && Object.fromEntries(Object.entries(audit).map(([k, v]) => [k, v.refused])), auditFlags: audit && Object.fromEntries(Object.entries(audit).map(([k, v]) => [k, (v.flags || []).length])),
		models: runs.map((r) => `${r.cond}-${r.role}${r.group ? '-' + r.group : ''}: ${r.model}, effort ${r.effort}${r.resumed ? ' (continue)' : ''}`),
		tokens: { A: { quoteK: quote.A.reported / 1000, measuredK: m.A.reported / 1000, planEqK: m.A.planEq / 1000 }, B: { quoteK: quote.B.reported / 1000, measuredK: m.B.reported / 1000, planEqK: m.B.planEq / 1000 } },
		evaluatorErrors: { A: R.A.errors, B: R.B.errors }, emptyPatches: { A: R.A.empty, B: R.B.empty } };
	const perTask = ids.map((id) => ({ id, A: R.A.has(id), B: R.B.has(id), claimA: C.A[id], claimB: C.B[id] }));
	const out = { resolved, main, perTask, done, minutes, split, also };
	fs.writeFileSync(path.join(KIT, 'score.json'), JSON.stringify(out, null, 1));
	const pct = (x) => (x === null || x === undefined ? 'n/a' : `${Math.round(x * 100)}%`);
	console.log(`resolved: A ${resolved.A}/10, B ${resolved.B}/10 -> ${main}`);
	for (const t of perTask) console.log(`  ${t.id}: A ${t.A ? 'resolved' : '-'} (${t.claimA}), B ${t.B ? 'resolved' : '-'} (${t.claimB})`);
	console.log(`done claims unresolved: A ${done.A.doneButUnresolved}/${done.A.done}, B ${done.B.doneButUnresolved}/${done.B.done}, pooled ${pct(done.pooled.share)} -> ${done.verdict}`);
	for (const c of ['A', 'B']) console.log(`minutes ${c}: measured ${minutes[c].measured.toFixed(1)}, raw ${minutes[c].raw} (err ${pct(minutes[c].errRaw)}), x0.34 ${minutes[c].corrected.toFixed(1)} (err ${pct(minutes[c].errCorrected)}) -> ${minutes[c].closer}`);
	console.log(`minutes verdict: ${minutes.verdict}; B wall ${minutes.Bwall.measured.toFixed(1)} vs ${minutes.Bwall.raw} (err raw ${pct(minutes.Bwall.errRaw)}, x0.34 ${pct(minutes.Bwall.errCorrected)})`);
	console.log(`split: groups ${groupsMeasured.toFixed(0)}k vs ${groupsForecast}k forecast (${pct(split.groupsOver)} over); saving measured ${pct(measuredSaving)} vs forecast ${pct(forecastSaving)} -> ${split.verdict}${split.note ? ' (' + split.note + ')' : ''}`);
}

const [cmd, ...rest] = process.argv.slice(2);
const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? Number(rest[i + 1]) : NaN; };
const cmds = { copy, up, down, estimate, architect, collect, measure, audit, 'seal-check': sealCheck, 'gold-summary': goldSummary, score, plan: () => console.log(JSON.stringify(parsePlan(), null, 1)),
	build: () => { const a = opt('--cap-a'), b = opt('--cap-b'); if (!(a > 0 && b > 0)) throw new Error('build needs --cap-a and --cap-b (reported tokens)'); return build(a, b); } };
if (!cmds[cmd]) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 14).join('\n')); process.exit(1); }
Promise.resolve(cmds[cmd]()).catch((e) => { console.error(e.message); process.exit(1); });
