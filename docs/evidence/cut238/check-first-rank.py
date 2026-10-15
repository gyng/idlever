#!/usr/bin/env python3
"""Independent read-only verification of recorded native checkpoints; no game mutation."""
import json, sys
from pathlib import Path

root = Path(sys.argv[1])
rows, failures = [], []
exit_count = 0

def check(ok, message):
    if not ok:
        failures.append(message)

for seed in range(1, 17):
    folder = root / f'seed-{seed}'
    r = json.loads((folder / 'results.json').read_text())
    load = lambda name: json.loads((folder / name).read_text())
    fork = load(r['first_eligible_post_intro_home_purchase']['save'])
    fork_s = fork['lineage']['clock_s']
    check(fork['run'] is None, f'seed{seed}: naturally home fork')
    check(not fork['others'] and fork['selected'] == 1, f'seed{seed}: no fabricated resident')
    check(r['manual_sends'] == 2 and r['scout'] is not None, f'seed{seed}: actual strict introduction')
    check(len(r['arms']) == 4, f'seed{seed}: all4 arms retained')
    common = fork['lineage']['bloodline']
    check(common['spent'] == 0 and not common['upgrades'], f'seed{seed}: no baseline Legacy spending')
    first15 = load(r['first_affordable_15']['save'])
    first15_exit = first15['lineage']['run_log'][-1]['clock_s']
    first15_observed = first15['lineage']['clock_s']
    check(first15['lineage']['bloodline']['points'] >= 15, f'seed{seed}: genuine15point balance')
    check(0 <= first15_observed-first15_exit <= 1, f'seed{seed}: affordability credit associated with actual completed exit')
    for e in r['baseline_prefix_exits']:
        exit_count += 1
        check(e['sampled'] is None, f'seed{seed}: sampled prefix exit{e["id"]}')
    components = []
    base_stats = r['arms'][0]['first_departure']['detail']
    for arm in r['arms']:
        label = arm['arm']
        treated = label != 'no-spend'
        expected = {'points': common['points'] - (15 if treated else 0),
                    'spent': 15 if treated else 0,
                    'upgrades': {label: 1} if treated else {}}
        stats = arm['first_departure']['detail']
        check(stats['owned_at_send'] == expected, f'seed{seed}/{label}: exact paid ownership at actual send')
        check(stats['sent_snapshot']['legacy'] == expected, f'seed{seed}/{label}: exact sent snapshot ownership')
        check(stats['run_id'] == base_stats['run_id'], f'seed{seed}/{label}: first deterministic future run')
        check(stats['run_id'] == fork['lineage']['next_run_id'], f'seed{seed}/{label}: genuinely first new run')
        check(stats['name'] == r['first_eligible_post_intro_home_purchase']['observed']['name'], f'seed{seed}/{label}: private hero identity')
        sent = load(arm['first_departure']['save'])
        # Core emits a flat live capsule when there are no retained boss kills, otherwise {live,kills}.
        encoded = sent['live_capsule']
        cap = encoded.get('live', encoded)
        check(cap['id'] == stats['run_id'] and cap['game']['run']['turn'] == 0,
              f'seed{seed}/{label}: real serialized initial replay capsule')
        check(cap['game']['lineage']['bloodline'] == expected, f'seed{seed}/{label}: replay capsule paid ownership')
        initial = cap['game']['run']['hero']
        for field, delta in [('max_hp', 3 if label == 'health' else 0),
                             ('str_bonus', 1 if label == 'damage' else 0),
                             ('legacy_armour', 1 if label == 'armour' else 0)]:
            check(initial[field] == stats[field] == base_stats[field] + delta,
                  f'seed{seed}/{label}: actual first-sent {field} effect')
        if treated:
            bought = load(arm['purchase']['save'])
            check(bought['lineage']['bloodline'] == expected, f'seed{seed}/{label}: exact debit')
            # A home purchase may only modify this private allocation. This includes full historical
            # death, run, sent/replay capsule, receipt, shared Gold/tally/ledger and other-slot state.
            outside_lineage = [key for key in fork if key != 'lineage']
            check(all(fork[key] == bought[key] for key in outside_lineage),
                  f'seed{seed}/{label}: full Session/replay/history untouched outside private lineage')
            check(set(fork['lineage']) == set(bought['lineage']) and
                  all(v == bought['lineage'][k] for k, v in fork['lineage'].items() if k != 'bloodline'),
                  f'seed{seed}/{label}: Gold/ledger/history/all other lineage fields untouched')
        seen = set()
        for e in arm['exits']:
            exit_count += 1
            check(e['sampled'] is None, f'seed{seed}/{label}: sampled exit{e["id"]}')
            check(e['id'] not in seen, f'seed{seed}/{label}: duplicate recorded finish{e["id"]}')
            seen.add(e['id'])
        check(not arm['censored'] and arm['endpoint'] is not None, f'seed{seed}/{label}: finite endpoint retained')
        end = load(arm['endpoint']['save'])
        d = arm['endpoint']['detail']
        actual_run = end.get('run')
        actual_exit = next((e for e in end['lineage']['run_log'] if e['id'] == d['run_id']), None)
        real = actual_run and actual_run['id'] == d['run_id'] and actual_run['max_depth'] >= 13
        real = real or (actual_exit and actual_exit['depth'] >= 13 and not actual_exit.get('sampled'))
        check(bool(real), f'seed{seed}/{label}: actual live/finished D13 endpoint, never a historical best')
        check(d['run_id'] >= stats['run_id'], f'seed{seed}/{label}: no pre-purchase run endpoint')
        low, high = d['elapsed_from_fork_s_bracket']
        check(high-low == 1 and low >= 0 and high <= 48*3600,
              f'seed{seed}/{label}: positive bounded1s endpoint bracket')
        check(end['lineage']['clock_s']-fork_s == high == arm['elapsed_s'],
              f'seed{seed}/{label}: exact common-fork elapsed accounting')
        final = load(arm['final']['save'])
        check(final['lineage']['bloodline']['spent'] == expected['spent'] and
              final['lineage']['bloodline']['upgrades'] == expected['upgrades'],
              f'seed{seed}/{label}: no later treatment-only spending')
        waiting = stats['observed_clock_s']-fork_s
        components.append({'arm': label, 'firstDepartureWaitSBracket': [waiting-1, waiting],
                           'nextD13ElapsedSBracket': [low, high],
                           'climbAfterDepartureSConservativeBracket': [low-waiting, high-(waiting-1)]})
    rows.append({'seed': seed, 'firstDeathActualExitS': r['first_death']['detail']['actual_exit']['clock_s'],
                 'first15ActualCreditExitS': first15_exit, 'first15ObservedS': first15_observed,
                 'firstHomeOpportunityObservedS': r['first_home_eligible_after_death']['observed']['clock_s'],
                 'actualForkAndPurchaseS': fork_s, 'historicalBestAtFork': fork['lineage']['best_depth'],
                 'mandatoryRecoverySAtFork': max(0, fork['lineage']['persistent']['recovery_until_tick']-fork['lineage']['total_turns'])/10,
                 'totalRestSAtFork': fork['lineage']['rest_left']/10, 'components': components})
result = {'scope': 'Independent read-only raw-save checks, not a canonical dayplayer/PICKED/policy acceptance.',
          'seeds': 16, 'arms': 64, 'paidPurchases': 48, 'completedExitRecordsChecked': exit_count,
          'sampledExitOrEndpointFailures': [f for f in failures if 'sampled' in f],
          'failures': failures, 'rows': rows,
          'replayScope': 'Serialized genuine turn0 departure capsules and sent ownership verified64/64; entire historical/replay/session state unchanged at all48 home purchases. No claim of executing replay animation or event-hash comparison.'}
(root / 'independent-proof.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps({'seeds':16,'arms':64,'exits':exit_count,'failures':failures},indent=2))
raise SystemExit(bool(failures))
