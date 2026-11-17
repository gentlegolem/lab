# SPDX-License-Identifier: MIT
# A second, separate count for checking timing.js on real transcripts (README.md, "Tests"): reported tokens, cache
# reads, responses, owner messages and active agent time (agents summed) between two UTC times. Python 3, stdlib only.
#   python -I crosscheck.py <transcripts folder> <from ISO> <to ISO>
import json, os, sys, ctypes
from datetime import datetime

if os.name == 'nt':  # below-normal priority, so it stays out of the way of other work
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)

def ts(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp()

root, lo, hi = sys.argv[1], ts(sys.argv[2]), ts(sys.argv[3])
responses, owners, interrupts, streams, seen = {}, set(), set(), {}, set()
paths = sorted(os.path.join(d, f) for d, _, files in os.walk(root) for f in files if f.endswith('.jsonl'))
for p in paths:
        with open(p, encoding='utf-8') as fh:
            for line in fh:
                try:
                    o = json.loads(line)
                except ValueError:
                    continue
                if o.get('uuid'):  # an entry repeated in another file (a copy, or a subagent file) counts once
                    if o['uuid'] in seen:
                        continue
                    seen.add(o['uuid'])
                if o.get('type') not in ('user', 'assistant') or 'timestamp' not in o:
                    continue
                t = ts(o['timestamp'])
                key = (o.get('sessionId'), o.get('agentId') if o.get('isSidechain') else 'lead')
                streams.setdefault(key, []).append(t)
                m = o.get('message') or {}
                if o['type'] == 'assistant' and m.get('usage') and m.get('model') != '<synthetic>':
                    u = m['usage']
                    vals = [u.get('input_tokens') or 0, u.get('output_tokens') or 0,
                            u.get('cache_creation_input_tokens') or 0, u.get('cache_read_input_tokens') or 0]
                    k = (m.get('id') or '', o.get('requestId') or '')
                    old = responses.get(k)
                    responses[k] = (min(old[0], t), [max(a, b) for a, b in zip(old[1], vals)]) if old else (t, vals)
                if o['type'] == 'user' and not o.get('isSidechain') and not o.get('isMeta') and not o.get('isCompactSummary'):
                    c = m.get('content')
                    text = c if isinstance(c, str) else ' '.join(b.get('text') or '' for b in (c or []) if isinstance(b, dict) and b.get('type') == 'text')
                    if text.strip().startswith('[Request interrupted by user'):
                        interrupts.add((o.get('uuid'), t))
                    elif (o.get('origin') or {}).get('kind') == 'human':
                        owners.add((o.get('uuid'), t))

inside = [v for t, v in responses.values() if lo <= t < hi]
reported = sum(v[0] + v[1] + v[2] for v in inside)
cache_read = sum(v[3] for v in inside)
active = 0.0
for times in streams.values():
    times.sort()
    for a, b in zip(times, times[1:]):
        if b - a <= 300:
            active += max(0.0, min(b, hi) - max(a, lo))
print(json.dumps({'responses': len(inside), 'reported': reported, 'cacheRead': cache_read,
                  'ownerMessages': sum(1 for _, t in owners if lo <= t < hi),
                  'interrupts': sum(1 for _, t in interrupts if lo <= t < hi),
                  'activeAgentsSummedHours': round(active / 3600, 4), 'streams': len(streams)}))
