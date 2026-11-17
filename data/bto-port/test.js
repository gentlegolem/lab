// SPDX-License-Identifier: MIT
// Tests for timing.js on made-up transcripts whose answers are worked out by hand (README.md, "Tests").
//   node test.js
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert'), cp = require('child_process');
const T = require('./timing.js');

const day = '2026-12-01T';
const at = hm => `${day}${hm}:00.000Z`;
const ms = hm => Date.parse(at(hm));
const min = n => n * 60000;

// Phases: A 10:00-11:00; B 10:30-12:00 (overlaps A); "Audio and UI" 12:00-12:30 written with commas;
// C starts 13:00 and is still open (counted to --until 14:00). One bad line, one stop with no start.
const phasesLog = [
	'# test markers',
	`${at('10:00')}\tA\tstart`,
	`${at('10:30')} B start`,
	`${at('11:00')}\tA\tstop`,
	`${at('12:00')}\tB\tstop`,
	`${at('12:00')},Audio and UI,start`,
	`${at('12:30')},Audio and UI,stop`,
	`${at('13:00')}\tC\tstart`,
	'not a marker',
	`${at('09:00')}\tD\tstop`,
].join('\n');

let uid = 0;   // every user and assistant entry has its own uuid, as in real transcripts
const asst = (t, id, u, extra = {}) => ({ type: 'assistant', uuid: 'a' + (uid++), timestamp: at(t), sessionId: 'S1', requestId: 'r' + id, cwd: 'D:\\Git',
	message: { id: 'm' + id, model: 'claude-opus-5-5', usage: { input_tokens: u[0], output_tokens: u[1], cache_creation_input_tokens: u[2], cache_read_input_tokens: u[3] }, content: [] }, ...extra });
const user = (t, extra = {}) => ({ type: 'user', timestamp: at(t), sessionId: 'S1', uuid: 'u' + t + (extra.tag || ''), cwd: 'D:\\Git',
	message: { role: 'user', content: [{ type: 'tool_result', content: 'ok' }] }, ...extra });
const human = (t, extra = {}) => user(t, { origin: { kind: 'human' }, message: { role: 'user', content: [{ type: 'text', text: 'go' }] }, ...extra });

// S1 lead (matched by a tool call that names the port folder): messages at 10:00 10:04 10:20 10:22 10:40 10:41.
// Gaps <= 5 min: 10:00-10:04 (4), 10:20-10:22 (2), 10:40-10:41 (1) = 7 min, all in A; 10:40-10:41 also in B.
const s1 = [
	{ type: 'custom-title', sessionId: 'S1', customTitle: 'x' },
	human('10:00'),
	asst('10:04', 1, [1, 10, 100, 1000], { message: { id: 'm1', model: 'claude-opus-5-5', usage: { input_tokens: 1, output_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000 },
		content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'D:\\Git\\BackToOne-Godot\\project.godot' } }] } }),
	asst('10:04', 1, [1, 10, 100, 1000]),                        // same response, second content line: counted once
	user('10:20', { origin: { kind: 'peer' }, isMeta: true }),   // a peer message: not an owner message
	asst('10:22', 2, [2, 20, 200, 2000]),
	user('10:40', { origin: { kind: 'task-notification' } }),    // not an owner message
	human('10:41'),
	user('10:41', { tag: 'i', message: { role: 'user', content: [{ type: 'text', text: '[Request interrupted by user for tool use]' }] } }), // an interrupt
	asst('10:41', 3, [0, 0, 0, 0], { message: { id: 'm3', model: '<synthetic>', usage: { input_tokens: 0, output_tokens: 0 }, content: [] } }), // skipped
];
// S1 subagent: 10:01 10:03 (2 min). Its usage 5/50/500/5000 at 10:03. A human-looking line in a sidechain: not owner.
const s1sub = [
	{ ...asst('10:01', 4, [5, 50, 500, 5000]), isSidechain: true, agentId: 'aaa' },
	{ ...human('10:03'), isSidechain: true, agentId: 'aaa' },
];
// S2: other folder, never names the port: left out unless --all.
const s2 = [{ ...human('10:10'), sessionId: 'S2', cwd: 'D:\\Git\\Other' }, { ...asst('10:12', 9, [9, 9, 9, 9]), sessionId: 'S2', cwd: 'D:\\Git\\Other' }];
// S3: started inside the port folder (cwd match); messages 13:10 13:12 (2 min, in C); an old-style owner line (no origin).
const s3 = [
	{ type: 'user', timestamp: at('13:10'), sessionId: 'S3', uuid: 'v1', cwd: 'D:/Git/BackToOne-Godot', message: { role: 'user', content: 'start the systems phase' } },
	{ type: 'user', timestamp: at('13:11'), sessionId: 'S3', uuid: 'v2', cwd: 'D:/Git/BackToOne-Godot', message: { role: 'user', content: '<local-command-stdout>x</local-command-stdout>' } },
	{ ...asst('13:12', 7, [7, 70, 700, 7000]), sessionId: 'S3', cwd: 'D:/Git/BackToOne-Godot' },
];
const stepsLog = [`${at('10:15')}\t12\t[T1] exported the meshes`, `${at('12:10')},3,checked a scene`, `${at('15:00')} 5 outside`, 'bad'].join('\n');

(async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bto-timing-test-'));
	const proj = path.join(dir, 'D--Git');
	fs.mkdirSync(path.join(proj, 'S1', 'subagents'), { recursive: true });
	const w = (f, rows) => fs.writeFileSync(f, rows.map(r => JSON.stringify(r)).join('\n') + '\nnot json\n');
	w(path.join(proj, 'S1.jsonl'), s1); w(path.join(proj, 'S1', 'subagents', 'agent-aaa.jsonl'), s1sub);
	w(path.join(proj, 'S2.jsonl'), s2); w(path.join(proj, 'S3.jsonl'), s3);
	fs.writeFileSync(path.join(proj, 'S1', 'subagents', 'agent-aaa.meta.json'), JSON.stringify({ description: 'T1 port the clock' }));

	const P = T.parsePhases(phasesLog, ms('14:00'));
	assert.deepStrictEqual(P.phases.map(p => p.name), ['A', 'B', 'Audio and UI', 'C', 'D']);
	assert.deepStrictEqual(P.phases.find(p => p.name === 'C').intervals, [[ms('13:00'), ms('14:00')]]);
	assert.strictEqual(P.phases.find(p => p.name === 'C').open, true);
	assert.strictEqual(P.phases.find(p => p.name === 'D').intervals.length, 0);
	assert.strictEqual(P.problems.length, 3, P.problems.join('; '));  // bad line, stop with no start, C still open
	const S = T.parseOwnerSteps(stepsLog);
	assert.strictEqual(S.steps.length, 3); assert.strictEqual(S.problems.length, 1);

	const raw = await T.readTranscripts([proj], ['BackToOne-Godot']);
	assert.strictEqual(raw.fileStats.badLines, 4);
	assert.deepStrictEqual([...raw.sessions.get('S1').matched], ['tool call']);
	assert.deepStrictEqual([...raw.sessions.get('S3').matched], ['cwd']);
	assert.strictEqual(raw.sessions.get('S2').matched.size, 0);

	const { data, keep } = T.selectSessions(raw, { all: false, sessions: [], excludeSessions: [] });
	assert.deepStrictEqual([...keep].sort(), ['S1', 'S3']);
	const R = T.compute(P, data, S.steps);
	const row = n => R.rows.find(r => r.phase === n);
	const A = row('A'), B = row('B'), AU = row('Audio and UI'), C = row('C');

	assert.strictEqual(A.wallMs, min(60)); assert.strictEqual(B.wallMs, min(90)); assert.strictEqual(C.wallMs, min(60));
	// Active, agents summed: lead 7 + subagent 2 = 9 in A; in B only 10:40-10:41 = 1.
	assert.strictEqual(A.activeStreamsMs, min(9)); assert.strictEqual(B.activeStreamsMs, min(1));
	// Per session: S1's merged times 10:00 10:01 10:03 10:04 10:04 10:20 10:22 10:40 10:41 10:41 -> 4 + 2 + 1 = 7.
	assert.strictEqual(A.activeSessionsMs, min(7)); assert.strictEqual(A.activeAnyMs, min(7));
	// First to last: lead 10:00-10:41 (41 in A), subagent 10:01-10:03 (2) = 43 in A; lead's 10:30-10:41 = 11 in B.
	assert.strictEqual(A.spanMs, min(43)); assert.strictEqual(B.spanMs, min(11));
	// Tokens in A: responses 1, 2 and the subagent's (synthetic skipped, duplicate counted once).
	assert.strictEqual(A.messages, 3);
	assert.strictEqual(A.reported, (1 + 10 + 100) + (2 + 20 + 200) + (5 + 50 + 500));
	assert.strictEqual(A.cacheRead, 8000); assert.strictEqual(A.planEquivalent, A.reported + 800);
	assert.strictEqual(B.messages, 0);   // no response between 10:30 and 12:00 (the synthetic one is skipped)
	assert.deepStrictEqual(A.models, { 'claude-opus-5-5': 3 });
	// Owner messages: S1 10:00 and 10:41 (A has both; B has 10:41); S3 13:10 old style (C). Peer, task, sidechain, tags: no.
	assert.strictEqual(A.ownerMessages, 2); assert.strictEqual(B.ownerMessages, 1); assert.strictEqual(C.ownerMessages, 1);
	assert.strictEqual(A.ownerInterrupts, 1); assert.strictEqual(B.ownerInterrupts, 1); assert.strictEqual(C.ownerInterrupts, 0);
	// Owner steps: 10:15 (12 min) in A; 12:10 (3 min) in Audio and UI; 15:00 outside.
	assert.strictEqual(A.ownerMinutes, 12); assert.strictEqual(AU.ownerMinutes, 3); assert.strictEqual(R.outside.ownerMinutes, 5);
	// C: S3 13:10-13:12 = 2 min active, response 7 counted.
	assert.strictEqual(C.activeStreamsMs, min(2)); assert.strictEqual(C.reported, 777);
	// Union of phases: 10:00-12:30 and 13:00-14:00 = 210 min; first start to last stop 10:00-14:00.
	assert.strictEqual(R.total.wallMs, min(210)); assert.strictEqual(R.total.firstToLastMs, min(240));
	assert.strictEqual(R.total.activeStreamsMs, min(11));   // 9 (A) + 2 (C); B's minute is inside A
	assert.strictEqual(R.total.reported, A.reported + 777);
	assert.strictEqual(R.outside.messages, 0); assert.strictEqual(R.outside.ownerMessages, 0);

	const all = T.selectSessions(raw, { all: true, sessions: [], excludeSessions: ['S3'] });
	assert.deepStrictEqual([...all.keep].sort(), ['S1', 'S2']);
	assert.strictEqual(T.compute(P, all.data, []).rows.find(r => r.phase === 'A').reported, A.reported + 27);

	// Tag check: a repo with phase/a/start at 10:00 (right), phase/a/stop at 11:20 (20 min off), phase/audio-and-ui/start
	// at 12:01 (within 5 min). Every other first start and last stop has no tag.
	const repo = path.join(dir, 'repo'); fs.mkdirSync(repo);
	const git = (args, date) => cp.execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args],
		{ env: { ...process.env, GIT_COMMITTER_DATE: date || at('09:00'), GIT_AUTHOR_DATE: at('09:00') }, stdio: 'pipe' });
	git(['init', '-q']); git(['commit', '-q', '--allow-empty', '-m', 'x']);
	git(['tag', '-a', 'phase/a/start', '-m', 'x'], at('10:00'));
	git(['tag', '-a', 'phase/a/stop', '-m', 'x'], at('11:20'));
	git(['tag', '-a', 'phase/audio-and-ui/start', '-m', 'x'], at('12:01'));
	const tp = T.checkTags(repo, P.phases).sort();
	assert.deepStrictEqual(tp, ['tag phase/a/stop: 2026-12-01T11:20:00.000Z, log says 2026-12-01T11:00:00.000Z',
		'tag phase/audio-and-ui/stop: missing', 'tag phase/b/start: missing', 'tag phase/b/stop: missing',
		'tag phase/c/start: missing', 'tag phase/d/stop: missing']);

	// Transcript copies: the same files under a second folder count once.
	const copy = path.join(dir, 'copies', 'D--Git');
	fs.cpSync(proj, copy, { recursive: true });
	const twice = await T.readTranscripts([proj, path.join(dir, 'copies')], ['BackToOne-Godot']);
	assert.strictEqual(twice.fileStats.repeated, raw.fileStats.lines - raw.fileStats.badLines - 1);  // all but S1's title line (no uuid)
	const A2 = T.compute(P, T.selectSessions(twice, { all: false, sessions: [], excludeSessions: [] }).data, S.steps).rows.find(r => r.phase === 'A');
	for (const k of ['activeStreamsMs', 'activeSessionsMs', 'spanMs', 'reported', 'cacheRead', 'messages', 'ownerMessages', 'ownerInterrupts'])
		assert.strictEqual(A2[k], A[k], k);

	// Ledger (deviation 1), in tools/ledger.js's event format plus the proposed claim events and links.
	const L = [
		{ ev: 'open', at: at('10:00'), id: 'T1', phase: 'a', title: 'clock', estimate: { agent_min: 10, ktokens: 1 } },
		{ ev: 'done', at: at('10:05'), id: 'T1', claim: 'x', check: { kind: 'scenario', result: 'pass' }, actual: { agent_min: 4 } },
		{ ev: 'open', at: at('13:00'), id: 'T2', phase: 'c', estimate: { agent_min: 4 }, session: 'S3' },
		{ ev: 'claim', at: at('13:05'), id: 'T2' },
		{ ev: 'check', at: at('13:06'), id: 'T2', check: { kind: 'x', result: 'fail' } },
		{ ev: 'done', at: at('13:20'), id: 'T2', check: { result: 'pass' } },
		{ ev: 'open', at: at('09:30'), id: 'T3', phase: 'setup', estimate: { agent_min: 5 } },
		{ ev: 'park', at: at('09:40'), id: 'T3', reason: 'r', left: 'l', next: 'n' },
		{ ev: 'open', at: at('12:00'), id: 'T4', phase: 'audio-and-ui', estimate: { agent_min: 3 } },
		{ ev: 'check', at: at('12:10'), id: 'T4', check: { kind: 'x', result: 'not checked' } },
		{ ev: 'open', at: at('12:15'), id: 'T5', phase: 'audio-and-ui', estimate: { agent_min: 3 } },
		{ ev: 'claim', at: at('12:20'), id: 'T5' },
		{ ev: 'sweep', at: at('12:30'), counts: { opened: 5 } },
		{ ev: 'done', at: at('12:31'), id: 'T9' },
	].map(e => JSON.stringify(e)).join('\n') + '\nnot json\n';
	const LG = T.parseLedger(L);
	assert.strictEqual(LG.problems.length, 2, LG.problems.join('; '));   // T9 before open, the bad line
	assert.strictEqual(LG.sweeps.length, 1);
	const byId = id => LG.tasks.find(t => t.id === id);
	assert.deepStrictEqual(['T1', 'T2', 'T3', 'T4', 'T5'].map(id => byId(id).state), ['done', 'done', 'parked', 'parked', 'open']);
	assert.strictEqual(byId('T2').retries, 1);
	// Claims: T1 done (pass), T2's claim (its check failed), T2 done (pass), T4 (not checked); T5's claim waits.
	assert.deepStrictEqual(LG.claims.map(c => c.task + ':' + c.result), ['T1:pass', 'T2:fail', 'T2:pass', 'T4:not checked', 'T5:no check yet']);
	const MT = T.measureTasks(LG, data, ms('14:00'), S.steps);
	assert.deepStrictEqual(S.steps.map(s => s.task), ['T1', null, null]);
	assert.strictEqual(MT.tasks.find(t => t.id === 'T1').ownerMinutes, 12);
	const m = id => MT.tasks.find(t => t.id === id);
	// T1: linked by its subagent's description; 10:01-10:03 inside 10:00-10:05 = 2 min of 10 estimated.
	assert.strictEqual(m('T1').linked, true); assert.strictEqual(m('T1').activeMs, min(2)); assert.strictEqual(m('T1').reported, 555);
	assert.strictEqual(m('T1').ratio, 0.2); assert.ok(Math.abs(m('T1').errorFactor - Math.abs(2 / 3.4 - 1)) < 1e-12);
	// T2: linked by its session's lead thread; 13:10-13:12 = 2 min of 4.
	assert.strictEqual(m('T2').activeMs, min(2)); assert.strictEqual(m('T2').ratio, 0.5); assert.strictEqual(m('T2').reported, 777);
	assert.strictEqual(m('T3').linked, false);
	assert.deepStrictEqual(MT.problems, ['3 task(s) with no transcript link (no subagent description starting with the id, no session or agent)']);
	const SM = T.summarizeTasks(MT.tasks, LG.claims, P);
	assert.deepStrictEqual(SM.rows.map(r => r.group + ':' + r.tasks), ['A:1', 'C:1', 'setup (no phase):1', 'Audio and UI:2']);
	const all5 = SM.all;   // T3 (setup) is left out of the re-tests
	assert.deepStrictEqual([all5.tasks, all5.done, all5.parked, all5.open, all5.retries, all5.claims, all5.claimsWaiting, all5.claimsNotConfirmed, all5.firstTry, all5.linked, all5.withRatio, all5.factorCloser],
		[4, 2, 1, 1, 1, 4, 1, 2, 1, 2, 2, 2]);
	assert.ok(Math.abs(all5.medianRatio - 0.35) < 1e-12); assert.ok(Math.abs(all5.medianErrorRaw - 0.65) < 1e-12);
	assert.deepStrictEqual([all5.tasksChecked, all5.tasksFirstNotPass], [3, 2]);   // T1 pass, T2 fail, T4 not checked

	// Ledger v2 (tools/ledger.js after the gap list): claim and check apart, a later fail on a done task, not-checked,
	// reopen, owner, a timed sweep, setup work with no phase.
	const L2 = [
		{ ev: 'open', at: at('10:00'), id: 'T1', phase: 'a', thread: 'agent', estimate: { agent_min: 10, ktokens: 1 }, jam_refs: ['gameplay-1112-1652'] },
		{ ev: 'claim', at: at('10:04'), id: 'T1', by: 'agent', text: 'clock done', commits: ['c1'] },
		{ ev: 'check', at: at('10:05'), id: 'T1', by: 'lead', result: 'pass', kind: 'scenario', ref: 'clock', commit: 'c1' },
		{ ev: 'check', at: at('10:30'), id: 'T1', by: 'lead', result: 'fail', kind: 'scenario', ref: 'clock-2' },
		{ ev: 'claim', at: at('10:40'), id: 'T1', by: 'agent', text: 'fixed', commits: ['c1', 'c2'] },
		{ ev: 'check', at: at('10:45'), id: 'T1', by: 'lead', result: 'pass', kind: 'scenario', ref: 'clock-2' },
		{ ev: 'open', at: at('12:00'), id: 'T6', phase: null, thread: 'main', session: 'S3', estimate: { agent_min: 5, ktokens: 1 } },
		{ ev: 'claim', at: at('12:05'), id: 'T6', by: 'lead', text: 'x' },
		{ ev: 'check', at: at('12:06'), id: 'T6', by: 'owner', result: 'not-checked', kind: 'x', ref: 'y' },
		{ ev: 'reopen', at: at('12:20'), id: 'T6', reason: 'r' },
		{ ev: 'owner', at: at('12:21'), id: 'T6' },
		{ ev: 'park', at: at('12:25'), id: 'T6', reason: 'r', left: 'l', next: 'n' },
		{ ev: 'sweep-start', at: at('12:26') },
		{ ev: 'sweep', start: at('12:26'), at: at('12:36'), counts: { opened: 2 } },
	].map(e => JSON.stringify(e)).join('\n') + '\n';
	const V = T.parseLedger(L2);
	assert.deepStrictEqual(V.problems, []);
	assert.deepStrictEqual(V.claims.map(c => c.task + ':' + c.result), ['T1:pass', 'T1:pass', 'T6:not checked']);
	const v1 = V.tasks.find(t => t.id === 'T1'), v6 = V.tasks.find(t => t.id === 'T6');
	assert.deepStrictEqual([v1.state, v1.retries, v1.laterFails, v1.end], ['done', 1, 1, ms('10:45')]);
	assert.deepStrictEqual(v1.commits, ['c1', 'c2']); assert.deepStrictEqual(v1.jamRefs, ['gameplay-1112-1652']);
	assert.deepStrictEqual([v6.state, v6.ownerNeeded, v6.phase], ['parked', true, null]);
	assert.deepStrictEqual(V.sweeps.map(s => (s.t - s.start) / 60000), [10]);
	const VS = T.summarizeTasks(T.measureTasks(V, data, ms('14:00')).tasks, V.claims, P);
	assert.deepStrictEqual(VS.rows.map(r => r.group), ['A', 'setup (no phase)']);
	// T6 is setup work, so the re-tests count T1 only: two claims, both passed; one reopened check, so not first-try.
	assert.deepStrictEqual([VS.all.tasks, VS.all.claims, VS.all.claimsNotConfirmed, VS.all.tasksChecked, VS.all.tasksFirstNotPass, VS.all.firstTry, VS.all.laterFails, VS.all.ownerNeeded],
		[1, 2, 0, 1, 0, 0, 1, 0]);
	assert.strictEqual(VS.rows.find(r => r.group === 'setup (no phase)').claimsNotConfirmed, 1);

	fs.rmSync(dir, { recursive: true, force: true });
	console.log('timing.js tests: all passed');
})().catch(e => { console.error(e); process.exit(1); });
