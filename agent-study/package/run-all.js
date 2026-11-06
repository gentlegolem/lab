#!/usr/bin/env node
// Re-runs every finding and writes one Markdown table file per finding into ./tables (the folder is overwritten).
// Usage: node run-all.js     (set RESIDENCY_TRANSCRIPTS / RESIDENCY_REPO / RESIDENCY_LEDGER / RESIDENCY_LAND_LOG first, see README.md)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const out = path.join(__dirname, 'tables');
fs.mkdirSync(out, { recursive: true });
for (const n of [1, 2, 3, 6, 7, 8, 9, 10]) {
	const txt = execFileSync(process.execPath, [path.join(__dirname, 'src', 'residency-findings.js'), String(n)], { encoding: 'utf8', maxBuffer: 1 << 28, env: process.env });
	fs.writeFileSync(path.join(out, `finding-${n}.md`), txt);
	console.log(`finding ${n}: ${txt.split('\n').length} lines`);
}
