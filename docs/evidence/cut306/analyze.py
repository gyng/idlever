#!/usr/bin/env python3
"""Fixed utility screen. No population or confidence claim."""
import json
from pathlib import Path
import collections

root = Path('target/cut306')
evidence = Path('docs/evidence/cut306')
load = lambda p: json.loads(p.read_text())
spec = load(evidence / 'spec.json')
cases = []
for context in spec['contexts']:
    label = context['label']
    proto = root / 'prototype' / label
    control = load(proto / 'unchanged/result.json')
    for p in (proto / 'unchanged').iterdir():
        assert p.read_bytes() == (proto / 'unchanged-repeat' / p.name).read_bytes(), (label, p.name, 'repeat')
        assert p.read_bytes() == (root / 'shipping' / label / 'unchanged' / p.name).read_bytes(), (label, p.name, 'shipping parity')
    cnights = {n['night']: n for n in control['nights']}
    for role in ('bank-first', 'vat-first'):
        branch = proto / role
        result = load(branch / 'result.json')
        paid = result['purchase']['status'] == 'paid'
        price = result['purchase']['receipt']['offer']['price'] if paid else None
        deltas = [{'night': n['night'], 'extra_interest': n['interest'] - cnights[n['night']]['interest'],
                   'baseline_ticks': cnights[n['night']]['elapsed_ticks'], 'treatment_ticks': n['elapsed_ticks']}
                  for n in result['nights'] if n['night'] in cnights]
        payback = next((n['night'] for n in deltas if paid and n['extra_interest'] >= price), None)
        depths = [d['depth'] for d in result['deaths']]
        scheduled = sum(d['actual_ticks'] for d in result['deaths'])
        bases = sum(d['base_ticks'] for d in result['deaths'])
        timers = all(d['actual_ticks'] == (d['base_ticks'] * 80 + 99) // 100 for d in result['deaths'])
        passed = paid and (payback is not None if role == 'bank-first' else bool(depths) and timers)
        cases.append({'context': label, 'role': role, 'purchase': result['purchase']['status'],
                      'price': price, 'withdrawal': result['purchase'].get('receipt', {}).get('withdrawal'),
                      'utility_status': 'PASS' if passed else 'FAIL', 'payback_night': payback,
                      'matched_payments': deltas, 'deaths': len(depths),
                      'scheduled_base_recovery': bases, 'scheduled_actual_recovery': scheduled,
                      'recovery_spent_ticks': result['recovery_spent_ticks'],
                      'baseline_recovery_spent_ticks': control['recovery_spent_ticks'],
                      'completed': result['completed'], 'baseline_completed': control['completed'],
                      'horizon_ticks': result['horizon_ticks'], 'baseline_horizon_ticks': control['horizon_ticks'],
                      'finish_run_tail_count': len(result['finish_run_tail']),
                      'actual_interest': result['actual_interest'], 'baseline_actual_interest': control['actual_interest'],
                      'best': result['best'], 'baseline_best': control['best'],
                      'wealth': result['gold'] + result['bank'], 'baseline_wealth': control['gold'] + control['bank'],
                      'exits': dict(collections.Counter(r['tier'] for r in result['runs'])),
                      'baseline_exits': dict(collections.Counter(r['tier'] for r in control['runs'])),
                      'reached_30_payments': result['reached_30_payments']})
summary = {'scope': 'fixed earned-context utility screen, no population/default acceptance',
           'contexts': len(spec['contexts']), 'prototype_continuations': 16, 'shipping_controls': 4,
           'prototype_completed_runs': sum(load(p)['completed'] for p in (root / 'prototype').glob('*/*/result.json')),
           'all_no_level_parity': True, 'all_repeats_exact': True,
           'bank_utility': 'PASS' if all(c['utility_status'] == 'PASS' for c in cases if c['role'] == 'bank-first') else 'FAIL',
           'vat_utility': 'PASS' if all(c['utility_status'] == 'PASS' for c in cases if c['role'] == 'vat-first') else 'FAIL',
           'cases': cases, 'adopted': False}
(evidence / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
for case in cases:
    print(case['context'], case['role'], case['utility_status'], 'payback', case['payback_night'],
          'deaths', case['deaths'], 'best', case['best'], 'wealth delta', case['wealth'] - case['baseline_wealth'])
print('Bank', summary['bank_utility'], 'Vat', summary['vat_utility'], 'not adoption')
