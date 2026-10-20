"""Reconcile the ordinary pen trace and retain useful earned deep-wall parents."""
import gzip
import hashlib
import json
from pathlib import Path

out = Path('target/cut282/pen')
archive = Path('docs/evidence/cut282/pen')
archive.mkdir(exist_ok=True)
result = json.loads((out / 'exit.json').read_text())
assert result['exit_code'] == 0
identity = json.loads((out / 'identity.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(archive / 'frozen-contract.md') == identity['contract_sha256']
assert sha('target/cut282-native/fast/examples/dayplayer') == identity['binary_sha256']
for path, digest in identity['gameplay_source'].items():
    assert sha(path) == digest, path
paths = sorted((out / 'camps').glob('*.json'))
assert len(paths) == 24
rows = []
selected = {'TUNED-s1-d2-c0', 'TUNED-s2-d1-c2'}
for path in paths:
    game = json.loads(path.read_text())
    l = game['lineage']
    assert l['gold'] + l['town']['bank'] == l['tree']['ledger']
    bot, rest = path.stem.split('-s')
    seed, rest = rest.split('-d')
    day, ci = rest.split('-c')
    assert bot in ['PICKED','TUNED'] and int(seed) in [1,2] and int(day) in [1,2] and int(ci) in [0,1,2]
    rules = l['sets'][l['active_set']]['rows']
    pen = l['pkg']['pen']
    assert rules[:len(pen)] == pen
    if bot == 'PICKED': assert not pen
    rows.append({'camp':path.stem, 'sha256':sha(path), 'bot':bot, 'seed':int(seed), 'day':int(day), 'ci':int(ci),
        'best':l['best_depth'], 'start':l['start'], 'kit':l['kit'], 'gold':l['gold'], 'bank':l['town']['bank'],
        'pen':pen, 'rules':rules, 'tactics':l['pkg']['tactics'], 'package_xp':l['pkg']['runs'], 'pen_open':l['pkg']['pen_open'],
        'boss_counter_facts':[f for f in l['facts'] if f.startswith('boss:') and ':counter=' in f],
        'drills':l['pkg']['drills'], 'supplies':l['supplies'], 'unlocks':l['unlocks']})
    if (day == '2' and ci == '1') or path.stem in selected:
        (archive / (path.stem+'.json.gz')).write_bytes(gzip.compress(path.read_bytes(),mtime=0))
assert len({(r['bot'],r['seed'],r['day'],r['ci']) for r in rows}) == 24
(archive / 'camps.json').write_text(json.dumps(rows,indent=2)+'\n')
for file in ['identity.json','exit.json']:
    (archive / file).write_bytes((out / file).read_bytes())
(archive / 'dayplayer.txt').write_text(''.join(line.rstrip()+'\n' for line in (out/'dayplayer.log').read_text().splitlines()))
print('PASS: all24 seed/policy/check-in combinations; source/runtime identity; Gold conservation; compiled pen prefix/origins; six exact earned parent saves archived')
