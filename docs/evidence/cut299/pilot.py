#!/usr/bin/env python3
"""Compare discovery trajectories of pinned shipping/isolated content runtimes."""
import copy
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import statistics
import sys
base=Path(sys.argv[1])if len(sys.argv)>1 else Path('target/cut299/pilot')
out=Path(sys.argv[2])if len(sys.argv)>2 else Path('docs/evidence/cut299/pilot-summary.json')
control=Path(sys.argv[3])if len(sys.argv)>3 else Path('target/cut298/fresh/observations.json')
load=lambda p:json.loads(p.read_text())
a,b=load(control),load(base/'observations.json');assert a['request']==b['request'] and a['balance']==b['balance']
old={(r['bot'],r['seed']):r for r in a['records']};new={(r['bot'],r['seed']):r for r in b['records']};assert old.keys()==new.keys()
rows=[]
for key in sorted(old):
 x,y=copy.deepcopy(old[key]),copy.deepcopy(new[key]);x.pop('elapsed_seconds');y.pop('elapsed_seconds')
 if key!=('TUNED','2'):assert x==y, key
 rows.append({'bot':key[0],'seed':key[1],'before_d33_h':old[key]['depth_reached_hours'],'after_d33_h':new[key]['depth_reached_hours'],'whole_observation_equal_except_elapsed':x==y})
ratio=lambda data:statistics.median([Fraction(str(data[('PICKED',s)]['depth_reached_hours']))/Fraction(str(data[('TUNED',s)]['depth_reached_hours']))for s in ('1','2')])
camps=[]
for p in sorted((base/'camps').glob('*.json')):
 g=load(p);l=g['lineage'];name=p.stem;bot,seed,day,ci=name.split('-')
 camps.append({'name':name,'checkin_h':(int(day[1:])-1)*24+int(ci[1:])*8,'best':l['best_depth'],'queen_known':any(f.startswith('boss:lurker_queen:counter=')for f in l['facts']),'queen_pen':any(r['verb']=={'v':'read','a':'silence'} and {'k':'foe_tag','t':'brood'}in r['conds'] for r in l['pkg']['pen']),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
assert len(camps)==20
assert next(c for c in camps if c['name']=='TUNED-s2-d2-c0')['queen_pen']
summary={'scope':'Discovery on two reused regression seeds, isolated content runtime; no independent population or canonical16seed acceptance.', 'trajectories':rows,'before_median_paired_ratio':str(ratio(old)),'after_median_paired_ratio':str(ratio(new)),'picked_delayed':False,'seed2_queen_pen_first_h':min(c['checkin_h']for c in camps if c['name'].startswith('TUNED-s2')and c['queen_pen']),'camps':camps,'default_adoption':False}
assert summary['before_median_paired_ratio']=='11/10' and summary['after_median_paired_ratio']=='5/4'
out.write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items()if k!='camps'},indent=2))
