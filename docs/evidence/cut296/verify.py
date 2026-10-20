#!/usr/bin/env python3
"""Verify preserved raw trials without rerunning or editing game state."""
import collections
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile

root = Path('docs/evidence/cut296')
sha = lambda b: hashlib.sha256(b).hexdigest()
identity = json.loads((root / 'identity.json').read_text())
for name, digest in identity['evidence_files'].items():
    assert sha(Path(name).read_bytes()) == digest, name
for name, digest in identity['final_source_files'].items():
    assert sha(Path(name).read_bytes()) == digest, name
assert sha((root / 'earned.tar.zst').read_bytes()) == identity['archive_sha256']
raw = subprocess.check_output(['zstd', '-dc', str(root / 'earned.tar.zst')])
files = {}
with tarfile.open(fileobj=io.BytesIO(raw), mode='r:') as archive:
    for item in archive:
        assert not item.issym() and not item.islnk()
        assert not item.name.startswith('/') and '..' not in Path(item.name).parts
        if item.isfile():
            files[item.name] = archive.extractfile(item).read()
manifest = json.loads(files['raw-manifest.json'])
for name, digest in manifest.items():
    assert sha(files[name]) == digest, name
j = lambda p: json.loads(files[p])
summary = json.loads((root / 'summary.json').read_text())
assert sha((root / 'summary.json').read_bytes()) == identity['summary_sha256']
assert files['baseline/original.session.json'] == files['candidate/original.session.json']
assert sha(files['baseline/original.session.json']) == summary['input']['sha256']
assert j('baseline/state.json')['config']['identity']['binary_sha256'] != j('candidate/state.json')['config']['identity']['binary_sha256']
counts = {}
completed = 0
for study in ('baseline', 'candidate'):
    for label in ('no-selection', 'parent-only', 'selected'):
        prefix = f'{study}/pair/{label}/'
        r = j(prefix + 'result.json')
        receipts = j(prefix + 'receipts.json')
        assert r['requested_seconds'] == 28800
        assert r['no_selection_source_unchanged']
        assert [x['run'] for x in receipts] == r['actual_runs']
        assert len(receipts) == len(j(prefix + 'departures.json'))
        counter = collections.Counter()
        for row in receipts:
            reconstruction = j(prefix + f"run-{row['run']['id']:06}.reconstruction.json")
            assert reconstruction['public_replay_events_exact']
            assert reconstruction['public_replay_hash'] == row['replay_hash']
            assert reconstruction['actual_record'] == row['run']
            interactions = [e for e in reconstruction['events'] if e['k'] == 'class_interaction']
            assert interactions == row['interactions']
            for e in interactions:
                assert e['amount'] > 0
                counter[f"{e['skill']['id']}|{e['phase']}|{e['effect']}|{e['amount']}"] += 1
            completed += 1
        assert dict(counter) == summary['studies'][study]['branches'][label]['interactions']
        counts[(study,label)] = counter
for label in ('no-selection','parent-only'):
    for name in files:
        prefix = f'baseline/pair/{label}/'
        if name.startswith(prefix) and name.endswith('.reconstruction.json'):
            assert files[name] == files[name.replace('baseline/', 'candidate/', 1)]
    for name in ('after.session.json','receipts.json','departures.json','branch-row-reasons.json'):
        assert files[f'baseline/pair/{label}/{name}'] == files[f'candidate/pair/{label}/{name}']
assert not any(k.startswith('path:caster_conduct|') for k in counts[('baseline','selected')])
assert counts[('candidate','selected')]['path:caster_conduct|applied|slow|10'] == 4
wasm = json.loads((root / 'wasm-results.json').read_text())
assert wasm['status'] == 'PASS'
assert wasm['wasm']['sha256'] != 'fdd96f989ee720759496a9611fab74baf8b803ae812c1ae4b3b36f165a22f494'
for case in wasm['cases']:
    prefix = f"candidate/pair/{case['label']}/"
    assert case['inputSha256'] == sha(files[prefix + 'prepared.session.json'])
    assert case['afterSha256'] == sha(files[prefix + 'after.session.json'])
    assert case['nativeWasmWholeSaveBytesExact'] and case['nativeWasmReportExact']
result = {'status': 'PASS', 'raw_files': len(manifest), 'actual_completed_runs': completed, 'earned_camps': 1, 'baseline_conduct_payoffs': 0, 'candidate_conduct_payoffs': 4, 'unchanged_controls': 2, 'native_wasm_whole_save_pairs': 3, 'population_acceptance': False}
print(json.dumps(result))
