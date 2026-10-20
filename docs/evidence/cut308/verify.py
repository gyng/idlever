#!/usr/bin/env python3
"""Audit retained native observations and whole public-action preparations.

Default reads the immutable capture archive; --raw audits the local producer
directory before archiving. No native replay, resampling or candidate selection.
"""
import argparse
import copy
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import statistics
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parent
load = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def unpack(path, dest):
    proc = subprocess.Popen(['zstd', '-dc', str(path)], stdout=subprocess.PIPE)
    with tarfile.open(fileobj=proc.stdout, mode='r|') as archive:
        for entry in archive:
            assert not entry.name.startswith('/') and '..' not in Path(entry.name).parts
            assert entry.isfile() or entry.isdir()
            p = dest / entry.name
            if entry.isdir():
                p.mkdir(parents=True, exist_ok=True)
            else:
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_bytes(archive.extractfile(entry).read())
    assert proc.wait() == 0


def move(game, delta, why, term):
    l = game['lineage']
    assert l['tree']['chest'] == 0
    l['gold'] += delta
    l['gold_tally'][term] = l['gold_tally'].get(term, 0) + delta
    if not why.startswith('bank '):
        l['tree']['ledger'] += delta
    line = {'t': l['total_turns'], 'delta': delta, 'why': why}
    bid = l.get('bloodline_id', 1)
    if bid != 1:
        line['bloodline_id'] = bid
    entries = l['gold_ledger']
    if entries and entries[-1]['t'] == line['t'] and entries[-1]['why'] == why and entries[-1].get('bloodline_id', 1) == bid:
        entries[-1]['delta'] += delta
    else:
        entries.append(line)
        del entries[:-80]


def conserved(l):
    assert l['gold'] + l['town']['bank'] == l['tree']['ledger']
    assert l['tree']['chest'] == 0


def original(record):
    return {k: v for k, v in record.items() if k not in ('elapsed_seconds', 'upgrade_plan')}


def records(raw, job):
    d = load(raw / job / 'observations.json')
    assert d['request']['seeds'] == ['1', '2']
    assert d['request']['days'] == 14 and d['request']['checkins_per_day'] == 3
    return d, {(r['bot'], r['seed']): r for r in d['records']}


def audit(raw):
    pre = load(ROOT / 'preflight.json')
    for p, digest in pre['files'].items():
        assert sha(ROOT / Path(p).name) == digest, p
    profile = load(ROOT / 'profile.json')
    data = {job: records(raw, job) for job in (
        'parity', 'baseline-picked', 'baseline-tuned',
        'candidate-picked', 'candidate-tuned', 'baseline-final-validation')}
    for job in data:
        assert load(ROOT / 'validation' / (job + '-exit.json'))['status'] == 0
    old = {(r['bot'], r['seed']): r for r in load(ROOT / 'old-prefix.json')['records']}
    assert set(data['parity'][1]) == set(old)
    for key, r in data['parity'][1].items():
        assert original(r) == original(old[key])
        assert not r['upgrade_plan']['enabled'] and not r['upgrade_plan']['events']
    baseline = data['baseline-picked'][1] | data['baseline-tuned'][1]
    candidate = data['candidate-picked'][1] | data['candidate-tuned'][1]
    assert set(baseline) == set(candidate) == set(old)
    for job in ('candidate-picked', 'candidate-tuned', 'parity', 'baseline-final-validation'):
        assert data[job][0]['upgrade_profile'] == profile
    for job in ('picked', 'tuned'):
        assert data['baseline-' + job][0]['request'] == data['candidate-' + job][0]['request']
    for key, r in data['baseline-final-validation'][1].items():
        assert original(r) == original(baseline[key]), 'validation-only reference must match shipping exactly'
        assert not r['upgrade_plan']['enabled'] and not r['upgrade_plan']['events']

    final = {}
    event_count = purchases = 0
    for job, (_, rs) in data.items():
        for key, r in rs.items():
            if 'upgrade_plan' not in r:
                continue
            plan = r['upgrade_plan']
            folder = raw / job / 'records'
            cumulative = 0
            for event in plan['events']:
                before = load(folder / event['before'])
                expected = copy.deepcopy(before)
                l = expected['lineage']
                conserved(l)
                if event['kind'] == 'order':
                    l['orders']['sink'] = event['sink']
                else:
                    offer = event['offer']
                    assert offer['ready'] and offer['gate'] <= l['best_depth']
                    level = offer['level']
                    assert level == l['town'].get('levels', {}).get(offer['id'], 2 if offer['id'] == 'bank' else 1) + 1
                    tier = level - (3 if offer['id'] == 'bank' else 2)
                    assert tier in (0, 1)
                    prices = profile['bank_price_units' if offer['id'] == 'bank' else 'vat_price_units']
                    assert offer['price'] == prices[tier] * (100 + 25 * profile['gate_depth'][tier])
                    reserve = 3 * (100 + 25 * l['best_depth'])
                    assert event['reserve'] == reserve
                    amount = max(0, offer['price'] + reserve - l['gold'])
                    assert amount == event['withdrawal'] and amount <= l['town']['bank']
                    if amount:
                        l['town']['bank'] -= amount
                        move(expected, amount, 'bank withdraw', 'bank')
                    assert expected == load(folder / event['withdrawn']), 'whole public withdrawal'
                    move(expected, -offer['price'], f"upgrade {offer['id']} {level}", 'town')
                    l['town'].setdefault('levels', {})[offer['id']] = level
                    assert l['gold'] >= reserve
                    cumulative += offer['price']
                    purchases += 1
                assert expected == load(folder / event['after']), 'whole declared action only'
                conserved(l)
                event_count += 1
            assert cumulative == plan['spent']
            state = plan['final_state']
            l = load(folder / state['file'])['lineage']
            conserved(l)
            for field, value in {'gold': l['gold'], 'bank': l['town']['bank'],
                                 'ledger': l['tree']['ledger'], 'legacy': l['bloodline']['points'],
                                 'sink': l['orders']['sink'], 'gold_tally': l['gold_tally'],
                                 'kit': l['kit']}.items():
                assert state[field] == value, field
            assert state['income'] == sum(l['gold_tally'].get(k, 0) for k in ('earned', 'fetched', 'recovered'))
            for i, day in enumerate(plan['daily'], 1):
                assert day['day'] == i
                assert day['gold'] + day['bank'] == day['ledger']
                assert day['income'] == sum(day['gold_tally'].get(k, 0) for k in ('earned', 'fetched', 'recovered'))
                assert day['spent'] == sum(e['offer']['price'] for e in plan['events'] if e['kind'] == 'purchase' and e['day'] <= i)
            final[(job, key)] = state

    rows, shares = [], []
    for seed in ('1', '2'):
        key = ('PICKED', seed)
        r, b = candidate[key], baseline[key]
        plan = r['upgrade_plan']
        assert r['campaign_complete'] and r['observed_hours'] == 336 and len(plan['daily']) == 14
        buys = [e for e in plan['events'] if e['kind'] == 'purchase']
        assert [(e['id'], e['offer']['level']) for e in buys] == [('bank', 3), ('device', 2), ('device', 3), ('bank', 4)]
        assert plan['next'] == 4 and plan['events'][-1]['sink'] == plan['original_sink'] == 'both'
        start, end = plan['daily'][1], plan['daily'][13]
        income, spent = end['income'] - start['income'], end['spent'] - start['spent']
        share = Fraction(spent, income)
        shares.append(share)
        f = final[('candidate-picked', key)]
        ref = final[('baseline-final-validation', key)]
        for field in ('income', 'spent', 'gold', 'bank', 'ledger', 'legacy', 'gold_tally'):
            assert end[field] == f[field], field
        rows.append({'seed': seed, 'income_days3_14': income, 'spend_days3_14': spent,
                     'share_exact': str(share), 'share_pct': float(100 * share),
                     'completed_plan_hours': plan['events'][-1]['hours'],
                     'wealth_delta': f['ledger'] - ref['ledger'],
                     'available_legacy_delta': f['legacy'] - ref['legacy'],
                     'baseline_legacy': ref['legacy'], 'candidate_legacy': f['legacy'],
                     'kit_hours_baseline_candidate': [b['seed_out']['kit_h'], r['seed_out']['kit_h']],
                     'final_kit_baseline_candidate': [ref['kit'], f['kit']],
                     'actual_sends_delta': r['seed_out']['sends'] - b['seed_out']['sends']})
    arrivals = []
    medians_pass = True
    for bot in ('PICKED', 'TUNED'):
        for depth in (13, 18, 23, 33):
            i = data['baseline-picked'][0]['milestones'].index(depth)
            bs = [baseline[(bot, s)]['seed_out']['hours'][i] for s in ('1', '2')]
            cs = [candidate[(bot, s)]['seed_out']['hours'][i] for s in ('1', '2')]
            assert all(v is not None for v in bs + cs)
            passed = statistics.median(cs) <= statistics.median(bs)
            medians_pass &= passed
            arrivals.append({'bot': bot, 'depth': depth, 'baseline_hours': bs, 'candidate_hours': cs, 'median_pass': passed})
    pen = [Fraction(str(candidate[('PICKED', s)]['seed_out']['hours'][-1])) /
           Fraction(str(candidate[('TUNED', s)]['seed_out']['hours'][-1])) for s in ('1', '2')]
    pen_median, spend_median = statistics.median(pen), statistics.median(shares)
    kings = []
    for key in sorted(candidate):
        b, c = baseline[key]['seed_out']['king_day'], candidate[key]['seed_out']['king_day']
        passed = c is None or ((b is None or c >= b) and c >= 7)
        kings.append({'bot': key[0], 'seed': key[1], 'baseline_day': b, 'candidate_day': c, 'pass': passed,
                      'horizon_hours': candidate[key]['observed_hours']})
    return {'scope': 'reused-seed diagnostic; no independent or population acceptance',
            'status': 'FAIL' if pen_median < Fraction(115, 100) else 'PASS' if medians_pass and spend_median >= Fraction(1, 10) and all(k['pass'] for k in kings) else 'FAIL',
            'no_plan_original_prefix_parity': 'PASS', 'final_reference_full_shipping_parity': 'PASS',
            'whole_action_audit': {'status': 'PASS', 'events': event_count, 'purchases': purchases},
            'spend_median_exact': str(spend_median), 'spend_median_pct': float(100 * spend_median),
            'spend_requirement': 'PASS' if spend_median >= Fraction(1, 10) else 'FAIL',
            'pen_ratios_exact': [str(v) for v in pen], 'pen_median_exact': str(pen_median),
            'pen_requirement': 'PASS' if pen_median >= Fraction(115, 100) else 'FAIL',
            'absolute_arrival_requirement': 'PASS' if medians_pass else 'FAIL',
            'king_requirement_observed_scope': 'PASS' if all(k['pass'] for k in kings) else 'FAIL',
            'picked': rows, 'arrivals': arrivals, 'kings': kings,
            'tuned_plan_completion': 'right-censored at D33; not a fortnight completion test'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--raw', type=Path)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='idlever-cut308-audit-') as td:
        source = Path(td) / 'source'
        unpack(ROOT / 'source.tar.zst', source)
        for p, digest in load(ROOT / 'preflight.json')['sources'].items():
            assert sha(source / p) == digest, p
        raw = args.raw or Path(td) / 'raw'
        if not args.raw:
            unpack(ROOT / 'capture.tar.zst', raw)
        jobs = ('parity', 'baseline-picked', 'baseline-tuned', 'candidate-picked', 'candidate-tuned', 'baseline-final-validation')
        manifest = {str(p.relative_to(raw)): sha(p) for job in jobs for p in (raw / job).rglob('*') if p.is_file()}
        if (ROOT / 'raw-manifest.json').exists():
            assert manifest == load(ROOT / 'raw-manifest.json')
        result = audit(raw)
        if args.write:
            (ROOT / 'summary.json').write_text(json.dumps(result, indent=2) + '\n')
        else:
            assert result == load(ROOT / 'summary.json')
        print(json.dumps(result, indent=2))
