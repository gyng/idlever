#!/usr/bin/env python3
"""Independent receipt, preparation and exact-rational inference audit; no sim."""
import collections
import copy
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import subprocess
import tarfile
import tempfile

root = Path('docs/evidence/cut305')
load = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
pre = load(root / 'preflight.json')
previous = load(Path('docs/evidence/cut304/raw-manifest.json'))
assert all(digest in previous.values() for digest in pre['inputs'].values())
for group in ('files', 'core_sources'):
    for name, digest in pre[group].items():
        assert sha(Path(name)) == digest, name
if (root / 'identity.json').exists():
    for name, digest in load(root / 'identity.json')['files'].items():
        assert sha(Path(name)) == digest, name
spec = load(root / 'spec.json')
states = list(map(int, spec['seeds']))
assert len(states) == len(set(states)) == spec['look'] == 64
assert all(0 < s < 2**64 for s in states)
excluded = set(map(int, spec['excluded_original_states']))
assert len(excluded) == 2 and not (excluded & set(states))
reserve = Fraction(1, 2**40)
assert reserve > Fraction(64 * 2 + math.comb(64, 2), 2**64 - 1)
alpha = (Fraction(1, 20) - reserve) / 2
assert spec['alpha_each'] == float(alpha)
rank = max(j + 1 for j in range(32)
           if Fraction(sum(math.comb(64, i) for i in range(j + 1)), 2**64) <= alpha / 2)
with tempfile.TemporaryDirectory(prefix='idlever-cut305-') as td:
    out = Path(td)
    proc = subprocess.Popen(['zstd', '-dc', str(root / 'capture.tar.zst')], stdout=subprocess.PIPE)
    with tarfile.open(fileobj=proc.stdout, mode='r|') as tar:
        for item in tar:
            assert not item.name.startswith('/') and '..' not in Path(item.name).parts
            assert item.isfile() or item.isdir()
            path = out / item.name
            if item.isdir():
                path.mkdir(parents=True, exist_ok=True)
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(tar.extractfile(item).read())
    assert proc.wait() == 0
    manifest = load(root / 'raw-manifest.json')
    assert {str(p.relative_to(out)): sha(p) for p in out.rglob('*') if p.is_file()} == manifest
    assert (out / 'capture/spec.json').read_bytes() == (root / 'spec.json').read_bytes()
    rows = load(out / 'capture/rows.json')
    assert len(rows) == 256
    derived = []
    caps = {}
    actual_original_states = set()
    for context in spec['contexts']:
        label = context['context'] + '-' + context['role']
        cap_path = out / Path(context['send']).relative_to('target/cut305')
        actual_path = out / Path(context['run']).relative_to('target/cut305')
        assert sha(cap_path) == context['send_sha256'] == pre['inputs'][context['send']]
        assert sha(actual_path) == context['run_sha256'] == pre['inputs'][context['run']]
        cap, actual = load(cap_path), load(actual_path)
        caps[label] = cap
        assert cap['inputs'] == [] and cap['game']['run']['turn'] == 0
        actual_original_states.add(cap['game']['run']['rng']['s'])
        prepared0 = load(out / f'capture/{label}-original-prepared.json')
        expected0 = copy.deepcopy(cap['game'])
        expected0['events'] = cap['pre']
        assert prepared0 == expected0
        original = load(out / f'capture/{label}-original.json')
        assert original['state'] is None and not original['censored']
        assert original['events'] == [e for f in actual['replay']['floors'] for e in f['events']]
        assert original['events_hash'] == actual['replay']['hash']
        assert original['terminal_run'] == actual['terminal_run']
        for i, state in enumerate(states):
            prepared = load(out / f'capture/{label}-{i:02}-prepared.json')
            expected = copy.deepcopy(prepared0)
            expected['run']['rng'] = {'s': state}
            assert prepared == expected, (label, i, 'whole preparation')
            result = load(out / f'capture/{label}-{i:02}.json')
            assert result['state'] == str(state) and not result['censored']
            assert result['ticks'] <= spec['safety_ticks']
            terminal = result['terminal_run']
            for k, terminal_key in [('max_depth', 'max_depth'), ('depth', 'depth'),
                                    ('turns', 'turn'), ('carry', 'loot'), ('secured', 'secured'),
                                    ('tier', 'over'), ('death_cause', 'death_cause')]:
                assert result[k] == terminal[terminal_key], (label, i, k)
            assert result['hp'] == terminal['hero']['hp']
            row = {k: v for k, v in result.items() if k not in ('events', 'terminal_run')}
            row.update(label=label, index=i)
            derived.append(row)
        for suffix in ('', '-prepared'):
            assert (out / f'capture/{label}-00{suffix}.json').read_bytes() == (
                out / f'capture/{label}-repeat{suffix}.json').read_bytes()
    assert actual_original_states == excluded
    for context in ('s1-run18', 's2-run22'):
        on, off = [copy.deepcopy(caps[context + '-' + role]['game']['run'])
                   for role in ('worker-on', 'paused')]
        assert on['hero']['weapon'] == 2 and off['hero']['weapon'] == 1
        on['hero']['weapon'] = off['hero']['weapon']
        assert on == off, 'matched physical encounter except weapon rung'
    assert derived == rows
    summary = load(root / 'summary.json')
    assert summary['controlled_expeditions'] == 256 and summary['sample_units_per_context'] == 64
    assert summary['original_controls'] == summary['repeats'] == 4
    assert summary['censored'] == 0 and summary['adoption_authorized'] is False
    for result in summary['results']:
        context = result['context']
        on = [r for r in rows if r['label'] == context + '-worker-on']
        off = [r for r in rows if r['label'] == context + '-paused']
        diffs = [a['max_depth'] - b['max_depth'] for a, b in zip(on, off)]
        assert len(on) == len(off) == len(diffs) == 64
        assert result['pairs'] == diffs
        ordered = sorted(diffs)
        low, high = ordered[rank - 1], ordered[64 - rank]
        inf = result['inference']
        assert inf == {'status': 'PASS' if low >= 0 else 'FAIL' if high < 0 else 'INCONCLUSIVE',
                       'n': 64, 'estimate': (ordered[31] + ordered[32]) / 2,
                       'lower': low, 'upper': high, 'alpha': float(alpha), 'rank': rank}
        desc = result['descriptive']
        assert [desc[k] for k in ('wins', 'ties', 'losses')] == [sum(v > 0 for v in diffs), sum(v == 0 for v in diffs), sum(v < 0 for v in diffs)]
        assert desc['mean_difference'] == sum(diffs) / 64
        for name, items in [('worker_on', on), ('paused', off)]:
            counts = collections.Counter(r['tier'] for r in items)
            assert desc[name] == {'mean_max_depth': sum(r['max_depth'] for r in items) / 64,
                                  'mean_turns': sum(r['turns'] for r in items) / 64,
                                  'mean_carry': sum(r['carry'] for r in items) / 64,
                                  'exits': {t: counts[t] for t in ('bank', 'return', 'death')}}
        print(context, inf, desc['wins'], desc['ties'], desc['losses'])
print('Independent preparations, original controls, repeats, all receipts and exact ranks agree.')
