// Small helpers for the ledger CSV and the "ESTIMATE:" line of an agent brief.
'use strict';
// project = a commit tag ([Tag] subject prefix): the agent type when it is a tag, else a tag named in the description
let TAGS = [];
const setTags = (tags) => { TAGS = [...new Set(tags)]; };
const projectOf = (type, desc) => {
	if (TAGS.includes(type)) return type;
	const d = String(desc || '').toLowerCase();
	const hits = TAGS.filter((t) => t.length >= 4 && d.includes(t.toLowerCase())).sort((a, b) => d.indexOf(a.toLowerCase()) - d.indexOf(b.toLowerCase()));
	return hits[0] || ''; // the tag named first in the description
};
function taskIdOf(desc) {
	const tok = String(desc || '').trim().split(/\s+/)[0] || '';
	return /^[A-Z][A-Z0-9]*(-[A-Z0-9]+)*$/.test(tok) ? tok : '';
}

function classify(id, map = {}) {
	if (map[id]) return map[id];
	const u = String(id || '').toUpperCase();
	if (/VERIFY|^V\d/.test(u)) return 'verify';
	if (/CANARY|TINY|^T\d+$/.test(u)) return 'tiny';
	if (/RESEARCH|ANALYSIS|RETRO|^R\d+$/.test(u)) return 'research';
	if (/(^|-)(DOC|DOCS|LOG)(-|$)/.test(u)) return 'docs';
	return 'build';
}

// "ESTIMATE: 25 agent-min, 400k reported, type fix pass" (one line of an agent brief) -> { tokens, minutes, type } or null.
// tokens: "400k" / "1.2M" (a number + k / m not followed by a letter, so "25 agent-min" is not read as millions);
// minutes: "25 agent-min" / "25 min" / "1.5 h"; type: "type fix pass" / "type: fix pass" (an entry of TASK_TYPES, free text kept).
function parseEstimate(text) {
	const line = (String(text || '').match(/^[ \t>*_-]*ESTIMATE[ \t]*:[ \t]*(.+)$/im) || [])[1];
	if (!line) return null;
	const tok = line.match(/(\d+(?:\.\d+)?)\s*([kKmM])(?![A-Za-z])/);
	const min = line.match(/(\d+(?:\.\d+)?)\s*(?:agent[-\s]?)?(min(?:ute)?s?|h(?:ours?)?)\b/i);
	const type = (line.match(/\btype\s*[:=]?\s*([A-Za-z][A-Za-z /-]*?)\s*(?:[,;.]|$)/i) || [])[1];
	const tokens = tok ? Number(tok[1]) * (/k/i.test(tok[2]) ? 1e3 : 1e6) : NaN;
	const minutes = min ? Number(min[1]) * (/^h/i.test(min[2]) ? 60 : 1) : NaN;
	if (!Number.isFinite(tokens) && !Number.isFinite(minutes)) return null;
	return { tokens, minutes, type: type ? type.trim().toLowerCase() : '' };
}

// The task types of the studio's estimating guide. A guess from the task id / description; an ESTIMATE line's "type" wins.
const TASK_TYPES = ['new system', 'feature in existing system', 'engine verify', 'fix pass', 'polish / UI', 'research',
	'asset generation / art', 'tooling / editors', 'docs'];
function taskType(desc, id = '') {
	const d = `${id} ${desc || ''}`;
	if (/verify|VERIFY|smoke test|stress test|cold-start/i.test(d)) return 'engine verify';
	if (/research|teardown|measure|analysis|inventory|market|review/i.test(d)) return 'research';
	if (/(^|[\s-])fix(es)?\b|NOTE-|retest|follow-up/i.test(d)) return 'fix pass';
	if (/editor|reviewer|plugin|tool\b|kit\b|ledger|digest/i.test(d)) return 'tooling / editors';
	if (/mesh|skin|loft|bench|blocky|texture|model|palette|icon/i.test(d)) return 'asset generation / art';
	if (/polish|UI\b|HUD|layout|panel|toast|touch/i.test(d)) return 'polish / UI';
	if (/(^|[\s-])(doc|docs|log|retro|pitch)\b/i.test(d)) return 'docs';
	return 'feature in existing system';
}

function parseCsv(text) {
	const lines = text.split(/\r?\n/).filter((l) => l.trim());
	if (!lines.length) return [];
	const split = (l) => {
		const out = []; let cur = ''; let q = false;
		for (let i = 0; i < l.length; i++) {
			const ch = l[i];
			if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
			else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
		}
		out.push(cur);
		return out;
	};
	const head = split(lines[0]);
	return lines.slice(1).map((l) => { const v = split(l); const o = {}; head.forEach((h, i) => { o[h] = v[i] ?? ''; }); return o; });
}
module.exports = { setTags, taskIdOf, classify, projectOf, parseEstimate, TASK_TYPES, taskType, parseCsv };
