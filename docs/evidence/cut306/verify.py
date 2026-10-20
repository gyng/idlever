#!/usr/bin/env python3
"""Independent archived preparation, wealth/ledger, timer and utility audit."""
import collections
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile

r = Path('docs/evidence/cut306')
load = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
ordinary = load(r / 'ordinary-identity.json')
assert sha(r / 'initial-contract.md') == ordinary['contract_sha256']
for p, h in ordinary['core_sources'].items():
    assert sha(Path(p)) == h, p
frozen = load(r / 'utility-preflight.json')
for p, h in frozen['files'].items():
    assert sha(Path(p)) == h, p
if (r / 'identity.json').exists():
    for p, h in load(r / 'identity.json')['files'].items():
        assert sha(Path(p)) == h, p

def extract(archive, out):
    proc = subprocess.Popen(['zstd', '-dc', str(archive)], stdout=subprocess.PIPE)
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

def move(g, delta, why, term):
    """Independently derive the entire declared camp payment from gold_move."""
    l = g['lineage']
    assert l['tree']['chest'] == 0 and not l['pkg']['literal']
    l['gold'] += delta
    l['gold_tally'][term] = l['gold_tally'].get(term, 0) + delta
    if not why.startswith('bank '):
        l['tree']['ledger'] += delta
    line = {'t': l['total_turns'], 'delta': delta, 'why': why}
    bid = l.get('bloodline_id', 1)
    if bid != 1:
        line['bloodline_id'] = bid
    ledger = l['gold_ledger']
    if ledger and ledger[-1]['t'] == line['t'] and ledger[-1]['why'] == why and ledger[-1].get('bloodline_id', 1) == bid:
        ledger[-1]['delta'] += delta
    else:
        ledger.append(line)
        del ledger[:-80]

with tempfile.TemporaryDirectory(prefix='idlever-cut306-') as td:
    out = Path(td)
    sources = out / 'source'
    extract(r / 'source.tar.zst', sources)
    for p, h in frozen['prototype_sources'].items():
        assert sha(sources / p) == h, p
    assert (sources / 'crates/idlever-core/src/cut306_upgrades.rs').read_bytes() == (r / 'prototype-upgrades.rs').read_bytes()
    assert (sources / 'crates/idlever-core/examples/upgrade_utility_probe.rs').read_bytes() == (r / 'producer.rs').read_bytes()
    # Keep the source archive out of the raw gameplay manifest comparison.
    out = out / 'capture'
    extract(r / 'capture.tar.zst', out)
    manifest = load(r / 'raw-manifest.json')
    assert {str(p.relative_to(out)): sha(p) for p in out.rglob('*') if p.is_file()} == manifest
    assert len(list((out / 'ordinary/camps').glob('*.json'))) == 42
    initial = load(out / 'ordinary-partial/observations.json')
    accepted = load(out / 'ordinary/observations.json')
    for doc in (initial, accepted):
        for row in doc['records']:
            row.pop('elapsed_seconds')
    assert initial == accepted
    for p in (out / 'ordinary-partial/camps').glob('*.json'):
        assert p.read_bytes() == (out / 'ordinary/camps' / p.name).read_bytes()
    spec, summary = load(r / 'spec.json'), load(r / 'summary.json')
    assert len(spec['contexts']) == 4
    cases = []
    total = 0
    for ctx in spec['contexts']:
        label = ctx['label']
        source = out / Path(ctx['input']).relative_to('target/cut306')
        assert sha(source) == ctx['sha256']
        base = out / 'prototype' / label / 'unchanged'
        for p in base.iterdir():
            assert p.read_bytes() == (out / 'prototype' / label / 'unchanged-repeat' / p.name).read_bytes()
            assert p.read_bytes() == (out / 'shipping' / label / 'unchanged' / p.name).read_bytes()
        baseline = load(base / 'result.json')
        for role in spec['roles']:
            branch = out / 'prototype' / label / role
            canonical, prepared, after = [load(branch / f'{n}.json') for n in ('canonical', 'prepared', 'after')]
            assert (branch / 'original.json').read_bytes() == source.read_bytes()
            result = load(branch / 'result.json')
            purchase = result['purchase']
            assert purchase == load(branch / 'purchase.json')
            expected = copy.deepcopy(canonical)
            if purchase['status'] == 'paid':
                receipt = purchase['receipt']
                assert receipt['before'] == canonical
                amount = receipt['withdrawal']
                if amount:
                    expected['lineage']['town']['bank'] -= amount
                    move(expected, amount, 'bank withdraw', 'bank')
                assert expected == receipt['after_withdrawal']
                offer = receipt['offer']
                assert offer['price'] == 3400 and offer['gate'] == 13 and offer['ready']
                assert canonical['lineage']['best_depth'] >= 13 and canonical['run'] is None
                assert offer['id'] == ('bank' if role == 'bank-first' else 'device')
                assert offer['level'] == (3 if role == 'bank-first' else 2)
                reserve = 3 * (100 + 25 * canonical['lineage']['best_depth'])
                assert receipt['reserve'] == reserve
                assert amount == max(0, 3400 + reserve - canonical['lineage']['gold'])
                assert prepared['lineage']['gold'] >= reserve
                move(expected, -3400, f"upgrade {offer['id']} {offer['level']}", 'town')
                expected['lineage']['town'].setdefault('levels', {})[offer['id']] = offer['level']
            assert prepared == expected, (label, role, 'whole legal preparation')
            a, b = after['lineage'], prepared['lineage']
            assert a['gold'] + a['town']['bank'] == a['tree']['ledger'] == result['ledger']
            assert b['gold'] + b['town']['bank'] == b['tree']['ledger']
            terms = {k: a['gold_tally'].get(k, 0) - b['gold_tally'].get(k, 0) for k in set(a['gold_tally']) | set(b['gold_tally'])}
            interest = a['town']['interest'] - b['town']['interest']
            assert a['gold'] - b['gold'] == sum(terms.values())
            assert a['town']['bank'] - b['town']['bank'] == interest - terms.get('bank', 0)
            assert a['tree']['ledger'] - b['tree']['ledger'] == interest + sum(v for k, v in terms.items() if k != 'bank')
            assert result['actual_interest'] == interest
            assert result['elapsed_ticks'] == a['total_turns'] - b['total_turns']
            assert result['completed'] == len(result['runs']) == a['persistent']['completed'] - b['persistent']['completed']
            assert result['horizon_completed'] + len(result['finish_run_tail']) == a['persistent']['completed']
            assert len(result['finish_run_tail']) <= 1
            assert 0 <= result['horizon_ticks'] <= 7 * 86400 * 10
            assert len({x['id'] for x in result['runs']}) == len(result['runs'])
            by_id = {x['id']: x for x in result['runs']}
            assert {d['id'] for d in result['deaths']} == {x['id'] for x in result['runs'] if x['tier'] == 'death'}
            for d in result['deaths']:
                depth = by_id[d['id']]['depth']
                base_ticks = 600 if depth <= 14 else 12000 if depth >= 28 else 600 + 11400 * (depth - 14) // 14
                off = 20 if role == 'vat-first' and purchase['status'] == 'paid' else 0
                assert d['depth'] == depth and d['base_ticks'] == base_ticks and d['off_pct'] == off
                assert d['actual_ticks'] == (base_ticks * (100 - off) + 99) // 100
            for i, n in enumerate(result['nights'], 1):
                assert n['night'] == i and n['gold'] + n['bank'] == n['ledger']
                assert n['completed'] // 16 == result['night0'] + i
            total += result['completed']
            if role not in ('bank-first', 'vat-first'):
                continue
            bc = {x['night']: x for x in baseline['nights']}
            matched = [{'night': x['night'], 'extra_interest': x['interest'] - bc[x['night']]['interest'],
                        'baseline_ticks': bc[x['night']]['elapsed_ticks'], 'treatment_ticks': x['elapsed_ticks']}
                       for x in result['nights'] if x['night'] in bc]
            paid = purchase['status'] == 'paid'
            payback = next((x['night'] for x in matched if paid and x['extra_interest'] >= 3400), None)
            status = 'PASS' if paid and (payback is not None if role == 'bank-first' else bool(result['deaths'])) else 'FAIL'
            case = next(c for c in summary['cases'] if c['context'] == label and c['role'] == role)
            assert case['utility_status'] == status and case['payback_night'] == payback
            assert case['matched_payments'] == matched and case['deaths'] == len(result['deaths'])
            assert case['scheduled_base_recovery'] == sum(d['base_ticks'] for d in result['deaths'])
            assert case['scheduled_actual_recovery'] == sum(d['actual_ticks'] for d in result['deaths'])
            assert case['exits'] == dict(collections.Counter(x['tier'] for x in result['runs']))
            assert case['baseline_exits'] == dict(collections.Counter(x['tier'] for x in baseline['runs']))
            for k in ('completed', 'horizon_ticks', 'actual_interest', 'best', 'recovery_spent_ticks', 'reached_30_payments'):
                assert case[k] == result[k]
            assert case['wealth'] == a['gold'] + a['town']['bank']
            assert case['baseline_wealth'] == baseline['gold'] + baseline['bank']
            cases.append(case)
    assert len(cases) == 8 and total == summary['prototype_completed_runs']
    assert summary['all_no_level_parity'] and summary['all_repeats_exact'] and summary['adopted'] is False
    for building in ('bank', 'vat'):
        assert summary[building + '_utility'] == ('PASS' if all(c['utility_status'] == 'PASS' for c in cases if c['role'] == building + '-first') else 'FAIL')
    print('All archived inputs/preparations, exact controls/repeats, ledgers, deaths and utility verdicts agree:', total, 'prototype runs.')
