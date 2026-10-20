"""Check archived complete probe outputs and the preregistered timing rule."""
import gzip
import hashlib
import json
from pathlib import Path
import statistics

root = Path('docs/evidence/cut285')
read = lambda p: json.loads(p.read_text())
timings = read(root / 'timings.json')
identity = read(root / 'identity.json')
assert hashlib.sha256((root / 'frozen-contract.md').read_bytes()).hexdigest() == identity['contract_sha256']
assert hashlib.sha256((root / 'stat-before.rs').read_bytes()).hexdigest() == identity['before_source_sha256']
assert hashlib.sha256((root / 'stat-after.rs').read_bytes()).hexdigest() == identity['after_source_sha256']
assert len(timings) == 6
reference = None
for t in timings:
    assert t['exit'] == 0
    variant = t['name'].split('-')[0]
    assert t['executable_sha256'] == identity[variant+'_executable_sha256']
    document = json.loads(gzip.decompress((root / (t['name']+'.json.gz')).read_bytes()))
    assert document['kind'] == 'dayplayer-stat-probe'
    assert document['request'] == dict(seeds=['1','2'], bots=['PICKED','TUNED'], days=14, until_depth=33, checkins_per_day=3)
    assert len(document['records']) == 4
    for r in document['records']:
        assert r['stop_reason'] == 'depth'
        assert r['best_depth'] >= 33
        assert r.pop('elapsed_seconds') > 0
    if reference is None:
        reference = document
    assert reference == document, 'Gameplay export changed: '+t['name']
ratios = []
for repeat in range(1,4):
    before = next(t for t in timings if t['name'] == f'before-r{repeat}')
    after = next(t for t in timings if t['name'] == f'after-r{repeat}')
    ratios.append(after['wall_seconds']/before['wall_seconds'])
summary = dict(paired_wall_ratios=ratios, median_ratio=statistics.median(ratios),
               performance_bar_passes=statistics.median(ratios)<=0.90 and max(ratios)<=1.10,
               gameplay_parity='PASS: all six complete documents identical except elapsed_seconds')
print(json.dumps(summary,indent=2))
