#!/usr/bin/env python3
"""Recompute the fixed TUNED policy discovery without resimulation/resampling."""
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import statistics
import subprocess
import sys
import tarfile

r = Path(__file__).resolve().parent
load = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
pre = load(r / 'preflight.json')
for path, digest in pre['files'].items():
    assert sha(r / path) == digest, path
source = {}
proc = subprocess.Popen(['zstd', '-dc', str(r / 'source.tar.zst')], stdout=subprocess.PIPE)
with tarfile.open(fileobj=proc.stdout, mode='r|') as archive:
    for entry in archive:
        assert entry.isfile() and not entry.name.startswith('/') and '..' not in Path(entry.name).parts
        source[entry.name] = hashlib.sha256(archive.extractfile(entry).read()).hexdigest()
assert proc.wait() == 0 and source == pre['sources']
old_file = r.parent / 'cut309' / 'reference.json'
assert sha(old_file) == pre['reference_sha256']
old = load(old_file)
original = lambda row: {k: v for k, v in row.items() if k != 'elapsed_seconds'}
keyed = lambda packet: {(v['bot'], v['seed']): v for v in packet['records']}
old_rows = keyed(old)
packets = {name: load(r / (name + '.json')) for name in ('control', 'candidate')}
rows = {name: keyed(p) for name, p in packets.items()}
for name, packet in packets.items():
    assert packet['request'] == old['request']
    assert packet['balance'] == old['balance']
    assert packet['milestones'] == old['milestones']
    assert set(rows[name]) == set(old_rows) and len(rows[name]) == 4
    assert load(r / 'validation' / (name + '-exit.json'))['status'] == 0
assert packets['control']['pen_policy'] == 'original'
assert packets['candidate']['pen_policy'] == 'lich-boss-only'
for key in old_rows:
    assert original(rows['control'][key]) == original(old_rows[key])
    if key[0] == 'PICKED':
        assert original(rows['candidate'][key]) == original(old_rows[key]), 'PICKED must remain fully unchanged'

arrivals, outcomes, ratios = [], [], []
for bot in ('PICKED', 'TUNED'):
    for depth in (13, 18, 23, 33):
        index = old['milestones'].index(depth)
        before = [rows['control'][(bot, seed)]['seed_out']['hours'][index] for seed in ('1', '2')]
        after = [rows['candidate'][(bot, seed)]['seed_out']['hours'][index] for seed in ('1', '2')]
        status = 'INCONCLUSIVE' if None in before + after else 'PASS' if statistics.median(after) <= statistics.median(before) else 'FAIL'
        arrivals.append({'bot': bot, 'depth': depth, 'control_hours': before, 'candidate_hours': after, 'median_requirement': status})
    for seed in ('1', '2'):
        b, c = [rows[name][(bot, seed)] for name in ('control', 'candidate')]
        a, z = b['seed_out'], c['seed_out']
        king = z['king_day'] is None or (a['king_day'] is not None and z['king_day'] >= a['king_day'])
        outcomes.append({'bot': bot, 'seed': seed, 'control_observed_hours': b['observed_hours'],
                         'candidate_observed_hours': c['observed_hours'], 'control_stop': b['stop_reason'],
                         'candidate_stop': c['stop_reason'], 'control_sends': a['sends'], 'candidate_sends': z['sends'],
                         'control_deaths': a['deaths'], 'candidate_deaths': z['deaths'],
                         'control_gold_day': a['gold_day'], 'candidate_gold_day': z['gold_day'],
                         'control_kit_h': a['kit_h'], 'candidate_kit_h': z['kit_h'],
                         'control_unconserved': a['unconserved'], 'candidate_unconserved': z['unconserved'],
                         'control_king_day': a['king_day'], 'candidate_king_day': z['king_day'],
                         'observed_king_requirement': 'PASS' if king else 'FAIL'})
for seed in ('1', '2'):
    p, t = [rows['candidate'][(bot, seed)]['seed_out']['hours'][-1] for bot in ('PICKED', 'TUNED')]
    ratios.append(None if p is None or t is None else Fraction(str(p)) / Fraction(str(t)))
median = None if None in ratios else statistics.median(ratios)
pen = 'INCONCLUSIVE' if median is None else 'PASS' if median >= Fraction(115, 100) else 'FAIL'
requirements = [pen] + [v['median_requirement'] for v in arrivals] + [v['observed_king_requirement'] for v in outcomes]
summary = {'scope': 'fixed reused-seed ordinary policy discovery; not independent, worker-away or fortnight acceptance',
           'status': 'FAIL' if 'FAIL' in requirements else 'INCONCLUSIVE' if 'INCONCLUSIVE' in requirements else 'PASS',
           'original_record_parity': 'PASS4/4', 'picked_original_record_parity': 'PASS2/2',
           'pen_ratios_exact': [None if v is None else str(v) for v in ratios],
           'pen_median_exact': None if median is None else str(median), 'pen_requirement': pen,
           'arrivals': arrivals, 'prefix_tradeoffs': outcomes}
if '--write' in sys.argv:
    (r / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
else:
    assert summary == load(r / 'summary.json')
print(json.dumps(summary, indent=2))
