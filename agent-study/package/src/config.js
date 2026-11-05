// Studio-specific settings. The defaults are generic; a studio puts its own values in a JSON file and sets
// RESIDENCY_CONFIG to its path (see config.example.json). Regex settings are strings; '' turns the feature off.
'use strict';
const fs = require('fs');

const DEFAULTS = {
	engineToolPrefix: '', // name prefix of the game-engine MCP tools, e.g. "mcp__MyEngine__" ('' = engine calls not counted)
	engineWord: 'engine', // the word agents use for the engine in their reports ("verified in the engine")
	pass2TaskId: '', // regex on task ids: the tasks cut from the second architect plan
	architectPass1: '', // regex on run descriptions: the first architect run
	architectPass2: '', // regex on run descriptions: the second architect run
	noisePaths: '', // regex on file paths: bookkeeping files left out of the rework signal (notes, ledgers, status files)
};

let file = {};
if (process.env.RESIDENCY_CONFIG) file = JSON.parse(fs.readFileSync(process.env.RESIDENCY_CONFIG, 'utf8'));
const C = { ...DEFAULTS, ...file };
const re = (s, flags = '') => (s ? new RegExp(s, flags) : /$^/); // an empty setting matches nothing
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
	...C,
	engineCallRe: C.engineToolPrefix ? new RegExp(`"name":"${esc(C.engineToolPrefix)}`, 'g') : null,
	engineWordRe: esc(C.engineWord),
	pass2Re: re(C.pass2TaskId),
	arch1Re: re(C.architectPass1, 'i'),
	arch2Re: re(C.architectPass2, 'i'),
	noiseRe: re(C.noisePaths),
};
