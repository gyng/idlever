"""Independently check legal prepared-state differences and archive all outcomes."""
import gzip
import hashlib
import json
from pathlib import Path

out = Path('target/cut282')
archive = Path('docs/evidence/cut282')
load = lambda name: json.loads((out / name).read_text())
identity = load('worker-identity.json')
assert hashlib.sha256((archive / 'worker-contract-frozen.md').read_bytes()).hexdigest() == identity['contract_sha256']
result = load('worker-exit.json')
assert result['exit_code'] == 0
packet = load('worker-comparison.json')
assert packet['diagnostic'] and packet['canonicalGateStatus'] == 'NOT_RUN' and packet['hours'] == 24
assert hashlib.sha256(Path('crates/idlever-core/examples/worker_absence.rs').read_bytes()).hexdigest() == identity['example_sha256']
assert hashlib.sha256(Path('target/cut282-native/fast/examples/worker_absence').read_bytes()).hexdigest() == identity['binary_sha256']
assert len(packet['cases']) == 16
assert {(c['input'], c['variant']) for c in packet['cases']} == {(p,v) for p in identity['inputs'] for v in identity['variants']}

def changes(a, b, path=''):
    if type(a) is not type(b):
        return [path]
    if isinstance(a, dict):
        return [item for key in sorted(a.keys() | b.keys()) for item in ([path+'/'+key] if key not in a or key not in b else changes(a[key],b[key],path+'/'+key))]
    return [] if a == b else [path]

rows = []
for case in packet['cases']:
    parent = Path(case['input'])
    assert hashlib.sha256(parent.read_bytes()).hexdigest() == identity['inputs'][str(parent)]
    baseline = next(c for c in packet['cases'] if c['input'] == case['input'] and c['variant'] == 'unchanged')
    before = json.loads(case['prepared'])
    source = json.loads(baseline['prepared'])
    assert source == json.loads(parent.read_text()), 'current loader must preserve the actual parent'
    delta = changes(source, before)
    if case['variant'].startswith('pause-'):
        assert delta == ['/lineage/tree/paused']
        expected = {'apprentice'} if case['variant'] == 'pause-apprentice' else {'drillmaster'} if case['variant'] == 'pause-drillmaster' else {'apprentice','drillmaster'}
        assert set(before['lineage']['tree']['paused']) == expected
    elif case['variant'].startswith('start'):
        assert set(delta) <= {'/lineage/start', '/lineage/tree/start_by_hand'}
        assert before['lineage']['start'] == int(case['variant'][5:])
    elif case['variant'] == 'forge-all':
        assert delta == ['/lineage/orders/forge']
        assert before['lineage']['orders']['forge'] == 'all'
    else:
        assert not delta
        assert case['summary'] == baseline['summary'] and case['after'] == baseline['after']
    after = json.loads(case['after'])['lineage']
    assert after['gold'] + after['town']['bank'] == after['tree']['ledger']
    assert case['summary']['best'] == after['best_depth']
    rows.append({'input': parent.name, 'variant': case['variant'], 'preparedChanges': delta,
        'bestDelta': case['summary']['best'] - baseline['summary']['best'],
        'deaths': sum(d['n'] for d in case['summary']['deaths']), **case['summary']})

for name in ['worker-identity.json','worker-exit.json']:
    (archive / name).write_bytes((out / name).read_bytes())
(archive / 'worker-comparison.json.gz').write_bytes(gzip.compress((out / 'worker-comparison.json').read_bytes(), mtime=0))
(archive / 'worker-summary.json').write_text(json.dumps(rows, indent=2) + '\n')
(archive / 'worker-validation.txt').write_bytes((out / 'worker-comparison.log').read_bytes())
(archive / 'worker-clippy.txt').write_bytes(Path('target/cut282-worker-clippy.log').read_bytes())
print('PASS: all16 cases, exact input/native/example identity, narrowly allowed public-command preparation changes, two exact repeated controls, no loader changes, final Gold conservation')
