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

const asst = (t, id, u, extra = {}) => ({ type: 'assistant', timestamp: at(t), sessionId: 'S1', requestId: 'r' + id, cwd: 'D:\\Git',
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
const stepsLog = [`${at('10:15')}\t12\texported the meshes`, `${at('12:10')},3,checked a scene`, `${at('15:00')} 5 outside`, 'bad'].join('\n');

(async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bto-timing-test-'));
	const proj = path.join(dir, 'D--Git');
	fs.mkdirSync(path.join(proj, 'S1', 'subagents'), { recursive: true });
	const w = (f, rows) => fs.writeFileSync(f, rows.map(r => JSON.stringify(r)).join('\n') + '\nnot json\n');
	w(path.join(proj, 'S1.jsonl'), s1); w(path.join(proj, 'S1', 'subagents', 'agent-aaa.jsonl'), s1sub);
	w(path.join(proj, 'S2.jsonl'), s2); w(path.join(proj, 'S3.jsonl'), s3);

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

	fs.rmSync(dir, { recursive: true, force: true });
	console.log('timing.js tests: all passed');
})().catch(e => { console.error(e); process.exit(1); });
