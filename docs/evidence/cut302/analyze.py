#!/usr/bin/env python3
"""Compare isolated target-choice discovery pilot with pinned shipping observations."""
import copy
from fractions import Fraction
import gzip
import hashlib
import json
from pathlib import Path
import statistics
import sys
base=Path(sys.argv[1])if len(sys.argv)>1 else Path('target/cut302/pilot')
out=Path(sys.argv[2])if len(sys.argv)>2 else Path('docs/evidence/cut302/summary.json')
a=json.loads(gzip.decompress(Path('docs/evidence/cut299/control-observations.json.gz').read_bytes()))
b=json.loads((base/'observations.json').read_text())
assert a['request']==b['request'] and a['balance']==b['balance']
assert b['request']=={'seeds':['1','2'],'bots':['PICKED','TUNED'],'days':14,'until_depth':33,'checkins_per_day':3}
old={(r['bot'],r['seed']):r for r in a['records']};new={(r['bot'],r['seed']):r for r in b['records']}
assert old.keys()==new.keys()=={(bot,seed)for bot in ('PICKED','TUNED')for seed in ('1','2')}
index=a['milestones'].index(23);rows=[];bars={'no_d33_censoring':True,'picked_d23_nonregression_each':True,'picked_d33_nonregression_each':True,'tuned_d33_nonregression_each':True}
for key in sorted(old):
 x,y=copy.deepcopy(old[key]),copy.deepcopy(new[key]);x.pop('elapsed_seconds');y.pop('elapsed_seconds')
 before,after=old[key],new[key];bot,seed=key
 d23x=before['seed_out']['hours'][index];d23y=after['seed_out']['hours'][index]
 d33x=before['depth_reached_hours'];d33y=after['depth_reached_hours']
 bars['no_d33_censoring'] &= d33x is not None and d33y is not None
 bars[('picked'if bot=='PICKED'else'tuned')+'_d33_nonregression_each'] &= d33y is not None and d33x is not None and d33y<=d33x
 if bot=='PICKED':bars['picked_d23_nonregression_each'] &= d23y is not None and d23x is not None and d23y<=d23x
 rows.append({'bot':bot,'seed':seed,'before_d23_h':d23x,'after_d23_h':d23y,'before_d33_h':d33x,'after_d33_h':d33y,'whole_observation_equal_except_elapsed':x==y,'before_seed_out':before['seed_out'],'after_seed_out':after['seed_out']})
def ratio(data):
 values=[Fraction(str(data['PICKED',seed]['depth_reached_hours']))/Fraction(str(data['TUNED',seed]['depth_reached_hours']))for seed in ('1','2')if data['PICKED',seed]['depth_reached_hours']is not None and data['TUNED',seed]['depth_reached_hours']is not None]
 return statistics.median(values)if len(values)==2 else None
before_ratio=ratio(old);after_ratio=ratio(new);bars['median_paired_d33_ratio_at_least_1_15']=after_ratio is not None and after_ratio>=Fraction(115,100)
camps=[]
for p in sorted((base/'camps').glob('*.json')):
 l=json.loads(p.read_text())['lineage'];name=p.stem;bot,seed,day,ci=name.split('-')
 lichrows=[row for row in l['pkg']['pen']if row['verb']['v']=='attack'and {'k':'foe_tag','t':'summoned'}in row['conds']]
 camps.append({'name':name,'checkin_h':(int(day[1:])-1)*24+int(ci[1:])*8,'best':l['best_depth'],'gold':l['gold'],'bank':l['town']['bank'],'queen_pen':any(r['verb']=={'v':'read','a':'silence'}and {'k':'foe_tag','t':'brood'}in r['conds']for r in l['pkg']['pen']),'lich_summon_rows':lichrows,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
assert camps and all(c['lich_summon_rows']==[]or all(r['verb']=={'v':'attack','a':'tag:undead'}for r in c['lich_summon_rows'])for c in camps)
summary={'scope':'Discovery on reused seeds1/2; isolated target-choice runtime; no independent population or canonical acceptance','trajectories':rows,'before_median_paired_ratio':str(before_ratio),'after_median_paired_ratio':str(after_ratio),'diagnostic_bars':bars,'all_discovery_bars_pass':all(bars.values()),'camps':camps,'first_seed2_queen_pen_h':min((c['checkin_h']for c in camps if c['name'].startswith('TUNED-s2')and c['queen_pen']),default=None),'default_adoption':False}
out.write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items()if k not in ('camps','trajectories')},indent=2))
print(json.dumps([{k:v for k,v in r.items()if k not in ('before_seed_out','after_seed_out')}for r in rows],indent=2))
