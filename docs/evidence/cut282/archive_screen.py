"""Validate and archive the complete fixed guide-gap catalog screen."""
import hashlib
import json
from pathlib import Path

raw = Path('target/sweep/cut282-guide-gap')
archive = Path('docs/evidence/cut282/catalog-screen')
archive.mkdir(exist_ok=True)
report = json.loads((raw/'results.json').read_text())
assert report['meta']['seeds'] == 2 and not report['meta']['failFast']
assert report['meta']['rows'] == ['tuned-picked','automation-pays']
assert report['meta']['timing']['ran'] == 3 and report['meta']['timing']['skipped'] == 0
base = json.loads(Path('tuning/balance.json').read_text())
assert {r['name'] for r in report['ranked']} == {'shipping-gap4','gap6','gap8'}
for result in report['ranked']:
    path = raw/result['dir']
    profile = json.loads((path/'profile.json').read_text())
    gap = {'shipping-gap4':4,'gap6':6,'gap8':8}[result['name']]
    assert profile['tree']['guide_gap'] == gap
    profile['tree']['guide_gap'] = 4
    assert profile == base, 'only the Guide gap may differ'
    assert hashlib.sha256((path/'profile.json').read_bytes()).hexdigest() == result['profileSha']
    assert all(not row.get('approx',False) for row in result['rows'].values())
    destination = archive/result['dir']
    destination.mkdir(exist_ok=True)
    for name in ['profile.json','result.json','out.txt','err.txt','time.txt']:
        if name.endswith('.json'):
            (destination/name).write_bytes((path/name).read_bytes())
        else:
            (destination/name).write_text(''.join(line.rstrip()+'\n' for line in (path/name).read_text().splitlines()))
    assert hashlib.sha256((destination/'profile.json').read_bytes()).hexdigest() == result['profileSha']
control = next(r for r in report['ranked'] if r['name'] == 'shipping-gap4')
assert control['rows']['tuned-picked']['value'] == '1.10'
assert 'mean best 29.93 vs 30.14' in control['rows']['automation-pays']['value']
for name in ['results.json','results.md']:
    (archive/name).write_bytes((raw/name).read_bytes())
identity = {'binary_sha256':hashlib.sha256(Path(report['meta']['bin']).read_bytes()).hexdigest(), 'core_key':report['meta']['binKey'], 'profiles':{r['name']:r['profileSha'] for r in report['ranked']}, 'scope':'two fixed regression seeds, targeted rows only, no population claim'}
(archive/'identity.json').write_text(json.dumps(identity,indent=2)+'\n')
print('PASS: all three fixed profiles differ only in Guide gap; no fail-fast/approximate values or reused candidates; shipping control reproduces both inherited failures')
