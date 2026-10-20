#!/usr/bin/env python3
"""Post-result descriptive table only; does not change inference or select a winner."""
from fractions import Fraction
import json
from pathlib import Path
import statistics
import sys

root = Path(__file__).resolve().parent
out = Path(sys.argv[1]) if len(sys.argv)>1 else Path('target/cut312/study')
spec = json.loads((root/'spec.json').read_text())
packets = {role:json.loads((out/'packets'/f'0-32-{role}.json').read_text()) for role in spec['runtimes']}
rows = {role:{(r['seed'],r['bot']):r for r in packet['records']} for role,packet in packets.items()}
table = []
for seed in spec['seeds']:
    entry = {'seed':seed, 'roles':{}}
    for bot in ['PICKED','TUNED']:
        before, after = [rows[role][seed,bot] for role in ['shipping','candidate']]
        keep = lambda r:{'hours':r['seed_out']['hours'], 'observed_hours':r['observed_hours'],
                        'completed_days':r['completed_days'], 'stop_reason':r['stop_reason'],
                        'sends':r['seed_out']['sends'], 'deaths':r['seed_out']['deaths'],
                        'gold_day':r['seed_out']['gold_day'], 'kit_h':r['seed_out']['kit_h'],
                        'king_day':r['seed_out']['king_day'], 'unconserved':r['seed_out']['unconserved']}
        entry['roles'][bot] = {'control':keep(before),'candidate':keep(after)}
    for role in ['shipping','candidate']:
        p,t = [rows[role][seed,bot]['seed_out']['hours'][-1] for bot in ['PICKED','TUNED']]
        assert p is not None and t is not None, 'this completed study has zero censoring'
        entry[role+'_pen_ratio_exact'] = str(Fraction(p)/Fraction(t))
    entry['tuned_d33_delta_hours'] = rows['candidate'][seed,'TUNED']['seed_out']['hours'][-1]-rows['shipping'][seed,'TUNED']['seed_out']['hours'][-1]
    table.append(entry)
diffs = [e['tuned_d33_delta_hours'] for e in table]
original = lambda r:{k:v for k,v in r.items() if k!='elapsed_seconds'}
ratios = {role:[Fraction(e[role+'_pen_ratio_exact']) for e in table] for role in ['shipping','candidate']}
summary = {'scope':'post-result descriptive only; no new confidence claim or candidate selection',
           'n':32, 'tuned_d33_faster_tie_slower':[sum(d<0 for d in diffs),sum(d==0 for d in diffs),sum(d>0 for d in diffs)],
           'tuned_d33_delta_min_max':[min(diffs),max(diffs)],
           'tuned_original_records_unchanged':sum(original(rows['shipping'][seed,'TUNED'])==original(rows['candidate'][seed,'TUNED']) for seed in spec['seeds']),
           'control_pen_median_exact':str(statistics.median(ratios['shipping'])),
           'candidate_pen_median_exact':str(statistics.median(ratios['candidate'])),
           'candidate_ratio_at_least_1_15':sum(v>=Fraction(115,100) for v in ratios['candidate']),
           'all_seed_prefix_tradeoffs':table}
serialized = json.dumps(summary,indent=2)+'\n'
if '--write' in sys.argv:
    (root/'descriptive.json').write_text(serialized)
else:
    assert (root/'descriptive.json').read_text()==serialized
print(json.dumps({k:v for k,v in summary.items() if k!='all_seed_prefix_tradeoffs'}))
