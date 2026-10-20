#!/usr/bin/env python3
"""Recompute bounded recovery discovery results; never resimulate or resample."""
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
protocol = load(r / 'protocol.json')
assert sha(r / 'frozen-contract.md') == protocol['contract_sha256']
old_path = r.parent / 'cut308' / 'old-prefix.json'
assert sha(old_path) == protocol['reference_observations_sha256']
old = load(old_path)
pre = load(r / 'preflight.json')
for p, digest in pre['files'].items():
    assert sha(r / p) == digest, p
proc = subprocess.Popen(['zstd', '-dc', str(r / 'source.tar.zst')], stdout=subprocess.PIPE)
source_hashes = {}
with tarfile.open(fileobj=proc.stdout, mode='r|') as archive:
    for entry in archive:
        assert not entry.name.startswith('/') and '..' not in Path(entry.name).parts
        assert entry.isfile()
        source_hashes[entry.name] = hashlib.sha256(archive.extractfile(entry).read()).hexdigest()
assert proc.wait() == 0 and source_hashes == pre['sources']

packets = {}
records = {}
for name in ('reference', 'shallow15', 'deep5m'):
    profile = load(r / 'profiles' / (name + '.json'))
    assert sha(r / 'profiles' / (name + '.json')) == protocol['profiles'][name + '.json']
    packet = load(r / (name + '.json'))
    assert packet['balance'] == profile
    assert packet['request'] == old['request']
    assert packet['milestones'] == old['milestones']
    assert load(r / 'validation' / (name + '-exit.json'))['status'] == 0
    rows = {(v['bot'], v['seed']): v for v in packet['records']}
    assert len(rows) == 4 and set(rows) == {(b, s) for b in ('PICKED', 'TUNED') for s in ('1', '2')}
    packets[name], records[name] = packet, rows
ref_balance = dict(packets['reference']['balance'])
assert ref_balance.pop('recovery_full_ticks') == 12000
assert ref_balance == old['balance'], 'only additive default metadata differs'
original = lambda v: {k: x for k, x in v.items() if k != 'elapsed_seconds'}
for v in old['records']:
    assert original(records['reference'][(v['bot'], v['seed'])]) == original(v)

results = {}
for name in ('shallow15', 'deep5m'):
    paired, arrivals, tradeoffs = [], [], []
    missing = False
    for seed in ('1', '2'):
        p, t = [records[name][(bot, seed)]['seed_out']['hours'][-1] for bot in ('PICKED', 'TUNED')]
        if p is None or t is None:
            missing = True
        else:
            paired.append(Fraction(str(p)) / Fraction(str(t)))
    for bot in ('PICKED', 'TUNED'):
        for depth in (13, 18, 23, 33):
            i = old['milestones'].index(depth)
            before = [records['reference'][(bot, s)]['seed_out']['hours'][i] for s in ('1', '2')]
            after = [records[name][(bot, s)]['seed_out']['hours'][i] for s in ('1', '2')]
            complete = None not in before + after
            arrivals.append({'bot': bot, 'depth': depth, 'reference_hours': before, 'candidate_hours': after,
                             'median_requirement': 'INCONCLUSIVE' if not complete else 'PASS' if statistics.median(after) <= statistics.median(before) else 'FAIL'})
        for seed in ('1', '2'):
            before = records['reference'][(bot, seed)]
            after = records[name][(bot, seed)]
            b, a = before['seed_out'], after['seed_out']
            king_pass = a['king_day'] is None or (a['king_day'] >= 7 and b['king_day'] is not None and a['king_day'] >= b['king_day'])
            # Endpoint differences compare different milestone-stop clocks; label them.
            tradeoffs.append({'bot': bot, 'seed': seed,
                             'reference_observed_hours': before['observed_hours'], 'candidate_observed_hours': after['observed_hours'],
                             'reference_stop': before['stop_reason'], 'candidate_stop': after['stop_reason'],
                             'reference_completed_days': before['completed_days'], 'candidate_completed_days': after['completed_days'],
                             'reference_sends': b['sends'], 'candidate_sends': a['sends'],
                             'reference_deaths': b['deaths'], 'candidate_deaths': a['deaths'],
                             'reference_gold_day': b['gold_day'], 'candidate_gold_day': a['gold_day'],
                             'reference_kit_h': b['kit_h'], 'candidate_kit_h': a['kit_h'],
                             'reference_king_day': b['king_day'], 'candidate_king_day': a['king_day'],
                             'observed_king_requirement': 'PASS' if king_pass else 'FAIL',
                             'reference_unconserved': b['unconserved'], 'candidate_unconserved': a['unconserved']})
    median = None if missing else statistics.median(paired)
    pen = 'INCONCLUSIVE' if missing else 'PASS' if median >= Fraction(115, 100) else 'FAIL'
    requirements = [pen] + [v['median_requirement'] for v in arrivals] + [v['observed_king_requirement'] for v in tradeoffs]
    results[name] = {'status': 'FAIL' if 'FAIL' in requirements else 'INCONCLUSIVE' if 'INCONCLUSIVE' in requirements else 'PASS',
                     'pen_ratios_exact': [str(v) for v in paired], 'pen_median_exact': None if median is None else str(median),
                     'pen_requirement': pen, 'arrivals': arrivals, 'endpoint_tradeoffs': tradeoffs}
summary = {'scope': 'reused-seed recovery-only discovery; not combined town-upgrade or population acceptance',
           'default_original_parity': 'PASS', 'candidates': results}
if '--write' in sys.argv:
    (r / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
else:
    assert summary == load(r / 'summary.json')
print(json.dumps(summary, indent=2))
