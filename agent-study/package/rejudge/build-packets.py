# SPDX-License-Identifier: MIT
"""Builds blinded A/B packets (side assignment by a seeded coin, a same-size mask over page chrome) for a fresh-judge re-run of UI rounds.
Reads the raw round shots + score JSONs, writes <out>/packets/<id>/ and <out>/keys/<id>.json (the key stays with the owner, never with the judge)."""
import json, random, os, shutil
from PIL import Image
import sys
# usage: python build-packets.py <rounds-dir> <out-dir> <rounds.json>
# <rounds-dir>/<src>/{today,proposed}_{pc,ipad,phone}.png and {today,proposed}.json (score files); rounds.json:
# {"r1": {"src": "1", "seed": 1, "job": "what the screen is for", "task": "what a player does here"}, ...}
if len(sys.argv) != 4:
    sys.exit('usage: python build-packets.py <rounds-dir> <out-dir> <rounds.json>')
SRC, OUT, CFG = sys.argv[1], sys.argv[2], sys.argv[3]
DEV = ('pc', 'ipad', 'phone')
MASK_W = 0.56   # fraction of the width, same box on both sides (hides page chrome)
MASK_COLOR = (20, 20, 28)
ROUNDS = json.load(open(CFG))
def green_bottom(im):
    px = im.load(); w, h = im.size; b = 0
    for y in range(min(h, 160)):
        for x in range(0, int(w * 0.62), 3):
            r, g, bl = px[x, y][:3]
            if g > 105 and r < 80 and bl < 110 and g - r > 45: b = max(b, y)
    return b
for rid, c in ROUNDS.items():
    rng = random.Random(c['seed'])
    a_is_proposed = rng.random() < 0.5
    side = {'A': 'proposed' if a_is_proposed else 'today', 'B': 'today' if a_is_proposed else 'proposed'}
    pk = f'{OUT}/packets/{rid}'
    if os.path.isdir(pk): shutil.rmtree(pk)
    os.makedirs(pk)
    score = {}
    for d in DEV:
        ims = {v: Image.open(f'{SRC}/{c["src"]}/{v}_{d}.png').convert('RGB') for v in ('today', 'proposed')}
        w, h = ims['today'].size
        mh = max(70, max(green_bottom(i) for i in ims.values()) + 8)
        for L, v in side.items():
            im = ims[v].copy()
            im.paste(MASK_COLOR, (0, 0, int(w * MASK_W), mh))
            im.save(f'{pk}/{L}_{d}.png', optimize=True)
    for L, v in side.items():
        j = json.load(open(f'{SRC}/{c["src"]}/{v}.json'))
        score[L] = {d: dict(score=x['score'], elements=x['elements'], words=x['words'], problems=x['problems'],
                            task_steps=[t[v] for t in x['tasks']]) for d, x in j['devices'].items()}
    json.dump(score, open(f'{pk}/score.json', 'w'), indent=1, ensure_ascii=False)
    prompt = open(f'{os.path.dirname(os.path.abspath(__file__))}/judge-prompt.template.md').read().replace('{JOB}', c['job']).replace('{TASK}', c['task'])
    open(f'{pk}/judge-prompt.md', 'w').write(prompt)
    os.makedirs(f'{OUT}/keys', exist_ok=True)
    key = dict(round=rid, seed=c['seed'], rng='python random.Random(seed).random() < 0.5 -> A is the proposed side',
               A=side['A'], B=side['B'], source_round=c['src'], mask=f'{int(MASK_W*100)}% wide, top, same box both sides')
    json.dump(key, open(f'{OUT}/keys/{rid}.json', 'w'), indent=1)
    print(rid, side)
