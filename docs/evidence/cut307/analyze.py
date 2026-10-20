#!/usr/bin/env python3
"""Fixed diagnostic summaries. No population/statistical acceptance."""
import json
from pathlib import Path

r = Path('docs/evidence/cut307')
base = Path('target/cut307')
load = lambda p: json.loads(p.read_text())
old = Path('target/cut306/prototype/s1-d7')
reference = base / 'reference/s1-d7'
for role in ('unchanged', 'unchanged-repeat', 'bank-first', 'vat-first'):
    for p in (old / role).iterdir():
        assert p.read_bytes() == (reference / role / p.name).read_bytes(), (role, p.name)

def delta(branch, control):
    a, b = load(branch / 'after.json')['lineage'], load(control / 'after.json')['lineage']
    return {'wealth': a['gold'] + a['town']['bank'] - b['gold'] - b['town']['bank'],
            'available_legacy': a['bloodline']['points'] - b['bloodline']['points'],
            'rations': a['feats'].get('rations', 0) - b['feats'].get('rations', 0),
            'tithes': a['feats'].get('tithed', 0) - b['feats'].get('tithed', 0),
            'best': a['best_depth'] - b['best_depth']}

earliest = []
for c in load(r / 'earliest-spec.json')['contexts']:
    parent = base / 'earliest' / c['label']
    for p in (parent / 'unchanged').iterdir():
        assert p.read_bytes() == (parent / 'unchanged-repeat' / p.name).read_bytes()
    role = c['roles'][-1]
    a, b = load(parent / role / 'result.json'), load(parent / 'unchanged/result.json')
    baseline_nights = {n['night']: n for n in b['nights']}
    differences = [{'night': n['night'], 'extra_interest': n['interest'] - baseline_nights[n['night']]['interest']}
                   for n in a['nights'] if n['night'] in baseline_nights]
    paid = a['purchase']['status'] == 'paid'
    payback = next((n['night'] for n in differences if paid and n['extra_interest'] >= 3400), None)
    timers = all(d['actual_ticks'] == (d['base_ticks'] * 80 + 99) // 100 for d in a['deaths'])
    passed = paid and (payback is not None if role == 'bank-first' else bool(a['deaths']) and timers)
    milestones = {}
    for name, data in [('baseline', b), ('treatment', a)]:
        initial = load(parent / ('unchanged' if name == 'baseline' else role) / 'canonical.json')['lineage']
        milestones[name] = {str(depth): 0 if initial['best_depth'] >= depth else next(
            (rec['clock_s'] - initial['clock_s'] for rec in data['runs'] if rec['depth'] >= depth), None)
            for depth in (28, 33)}
    earliest.append({'label': c['label'], 'role': role, 'paid': paid,
                     'utility_status': 'PASS' if passed else 'FAIL', 'payback_night': payback,
                     'matched_payments': differences, 'deaths': len(a['deaths']),
                     'completed': a['completed'], 'baseline_completed': b['completed'],
                     'milestone_seconds_after_camp': milestones,
                     'endpoint_difference': delta(parent / role, parent / 'unchanged')})

saving = []
for c in load(r / 'saving-spec.json')['contexts']:
    parent = base / 'saving' / c['label']
    for p in (parent / 'town-first').iterdir():
        assert p.read_bytes() == (parent / 'town-first-repeat' / p.name).read_bytes(), p.name
    a, b = load(parent / 'town-first/result.json'), load(parent / 'unchanged/result.json')
    saving.append({'label': c['label'], 'target_pass': a['target_pass'], 'total_spend': a['total_spend'],
                   'late_spend': a['late_spend'], 'all_four_bought': a['all_four_bought'],
                   'sink_restored': a['sink_restored'], 'king_slain': a['king_slain'],
                   'baseline_king_slain': b['king_slain'], 'completed': a['completed'],
                   'baseline_completed': b['completed'], 'deaths': a['deaths'],
                   'baseline_deaths': b['deaths'],
                   'purchases': [{'id': p['id'], 'level': p['offer']['level'], 'price': p['offer']['price'],
                                  'checkin': p['checkin'], 'clock_s': p['clock_s'], 'town_day': p['town_day']}
                                 for p in a['purchases']],
                   'endpoint_difference': delta(parent / 'town-first', parent / 'unchanged')})
result = {'scope': 'fixed reference/earliest purchase/saving diagnostics, not population/gate adoption',
          'reference_all_four_roles_byte_exact': True, 'earliest': earliest, 'saving': saving,
          'earliest_completed_runs': sum(load(p)['completed'] for p in (base / 'earliest').glob('*/*/result.json')),
          'saving_completed_runs': sum(load(p)['completed'] for p in (base / 'saving').glob('*/*/result.json')),
          'shipping_adopted': False}
(r / 'summary.json').write_text(json.dumps(result, indent=2) + '\n')
for c in earliest:
    print(c['label'], c['utility_status'], 'payback', c['payback_night'], 'delta', c['endpoint_difference'])
for c in saving:
    print(c['label'], 'target', c['target_pass'], 'spend', c['total_spend'], 'late', c['late_spend'],
          'purchases', c['purchases'], 'delta', c['endpoint_difference'])
