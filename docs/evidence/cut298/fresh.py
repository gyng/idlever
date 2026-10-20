#!/usr/bin/env python3
"""Reconcile current ordinary diagnostic arrivals and the late-edit timing bound."""
import hashlib
import json
from pathlib import Path
from fractions import Fraction
import statistics
import sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('target/cut298/fresh')
out=Path(sys.argv[2]) if len(sys.argv)>2 else Path('docs/evidence/cut298/fresh-summary.json')
load=lambda p:json.loads(p.read_text())
j=load(base/'observations.json')
assert j['request']=={'seeds':['1','2'],'bots':['PICKED','TUNED'],'days':14,'until_depth':33,'checkins_per_day':3}
assert j['balance']['tree']['guide_gap']==4
arrivals={(r['bot'],r['seed']):Fraction(str(r['depth_reached_hours'])) for r in j['records']}
assert len(arrivals)==4 and all(r['stop_reason']=='depth' and r['effective_checkins_per_day']==3 for r in j['records'])
rows=[]
for p in sorted((base/'camps').glob('*.json')):
    g=load(p);l=g['lineage'];name=p.stem
    bot,seed,day,ci=name.split('-');hour=(int(day[1:])-1)*24+int(ci[1:])*8
    rows.append({'name':name,'bot':bot,'seed':seed[1:],'checkin_h':hour,'clock_s':l['clock_s'],'best':l['best_depth'],
        'queen_known':any(f.startswith('boss:lurker_queen:counter=') for f in l['facts']),
        'queen_pen':any(r['verb']=={'v':'read','a':'silence'} and {'k':'foe_tag','t':'brood'} in r['conds'] for r in l['pkg']['pen']),
        'pen':l['pkg']['pen'],'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
assert len(rows)==21
first={}
for seed in ('1','2'):
    candidates=[r for r in rows if r['bot']=='TUNED' and r['seed']==seed]
    known=min(r['checkin_h'] for r in candidates if r['queen_known'])
    authored=min(r['checkin_h'] for r in candidates if r['queen_pen'])
    assert known==authored==32
    assert all(not r['queen_pen'] and not r['queen_known'] for r in candidates if r['checkin_h']<32)
    first[seed]={'first_counter_knowledge_h':known,'first_queen_pen_h':authored,'earliest_post_edit_checkin_h':authored+8}
ratios=[arrivals[('PICKED',s)]/arrivals[('TUNED',s)] for s in ('1','2')]
ceiling=[arrivals[('PICKED',s)]/first[s]['earliest_post_edit_checkin_h'] for s in ('1','2')]
summary={'scope':'Four ordinary current-runtime trajectories on the two known regression seeds, not independent population confirmation or full gate.',
 'arrivals_h':{f'{b}-s{s}':float(t) for (b,s),t in arrivals.items()},'median_paired_ratio':str(statistics.median(ratios)),
 'first_queen_opportunities':first,'conditional_queen_only_ratio_ceiling':str(statistics.median(ceiling)),
 'ceiling_scope':'Only changes to a Queen pen row first written at32h, preserving both pre32h histories, attendance and PICKED comparison; not a bound on all legal pen play or a population parameter.',
 'canonical_row_status':'FAIL at two-seed diagnostic scope:1.10 below1.15; explicit16seed row not rerun','camps':rows}
out.write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='camps'},indent=2))
