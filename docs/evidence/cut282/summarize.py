"""Archive and reconcile completed bounded worker diagnostic camps."""
import gzip
import hashlib
import json
from pathlib import Path

raw = Path('target/cut282')
archive = Path('docs/evidence/cut282')
result = json.loads((raw / 'exit.json').read_text())
assert result['exit_code'] == 0, result
identity = json.loads((raw / 'identity.json').read_text())
assert hashlib.sha256(Path('target/cut282-native/fast/examples/dayplayer').read_bytes()).hexdigest() == identity['binary_sha256']
for name, expected in identity['source_sha256'].items():
    assert hashlib.sha256(Path(name).read_bytes()).hexdigest() == expected, name
paths = sorted((raw / 'camps').glob('*.json'))
assert len(paths) == 16, len(paths)
(archive / 'camps').mkdir(exist_ok=True)
rows = []
for path in paths:
    data = path.read_bytes()
    game = json.loads(data)
    lineage = game['lineage']
    tree = lineage['tree']
    package = lineage['pkg']
    assert lineage['gold'] + lineage['town']['bank'] == tree['ledger'], path
    assert 0 <= tree.get('chest', 0) <= lineage['gold'], path
    name = path.stem
    bot, rest = name.split('-s')
    seed, rest = rest.split('-d')
    day, ci = rest.split('-c')
    assert ci == '0'
    assert int(seed) in [1, 2] and 1 <= int(day) <= 4 and bot in ['AWAY', 'AWAY-nodes']
    levels = {key: 1 + sum(xp >= n for n in [10,40,120,200]) for key, xp in package['runs'].items()}
    rows.append({
        'camp': name, 'bot': bot, 'seed': int(seed), 'beforeAbsenceDay': int(day),
        'sha256': hashlib.sha256(data).hexdigest(), 'depth': lineage['best_depth'],
        'gold': lineage['gold'], 'bank': lineage['town']['bank'], 'ledger': tree['ledger'],
        'marks': lineage['marks'], 'start': lineage['start'], 'kit': lineage['kit'],
        'stance': package['stance'], 'tactics': package['tactics'], 'levels': levels,
        'hired': tree['hired'], 'acts': tree.get('acts', {}), 'orders': lineage.get('orders', {}),
        'runInFlight': game['run'] is not None,
    })
    (archive / 'camps' / (name + '.json.gz')).write_bytes(gzip.compress(data, mtime=0))
assert len({(r['bot'],r['seed'],r['beforeAbsenceDay']) for r in rows}) == 16
(archive / 'camps.json').write_text(json.dumps(rows, indent=2) + '\n')
for name in ['identity.json', 'exit.json']:
    (archive / name).write_bytes((raw / name).read_bytes())
(archive / 'dayplayer.txt').write_text(''.join(line.rstrip() + '\n' for line in (raw / 'dayplayer.log').read_text().splitlines()))
(archive / 'isolated-build.txt').write_bytes(Path('target/cut282-clean-build.log').read_bytes())
print('PASS: 16 camps; all seed/day/bot combinations, source/native identity, gold/ledger/chest reconciliation; immutable raw saves archived')
