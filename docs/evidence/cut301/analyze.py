#!/usr/bin/env python3
"""Reconcile three predetermined target-choice continuations from one earned camp."""
import collections
import copy
import hashlib
import json
from pathlib import Path
import sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('target/cut301')
out=Path(sys.argv[2]) if len(sys.argv)>2 else Path('docs/evidence/cut301/summary.json')
load=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()

def is_summon(r):return r.get('origin')=='player' and r['verb']=={'v':'attack','a':'tag:summoned'} and r['conds']==[{'k':'foe_tag','t':'summoned'},{'k':'hp>','n':45}]
def is_boss(r):return r.get('origin')=='player' and r['verb']=={'v':'attack','a':'tag:boss'} and r['conds']==[{'k':'foe_tag','t':'undead'},{'k':'hp>','n':45}]

summary={'scope':'One current earned seed2 16h intervention parent. Three fixed8h API absences, including repeat; no population/independent samples or adoption.','cases':[]}
for phase in ('capture',):
 root=base/phase/'parent';canonical=load(root/'canonical.json')
 for branch in sorted(p for p in root.iterdir()if p.is_dir()):
  expected=copy.deepcopy(canonical);l=expected['lineage'];variant=branch.name
  for rows in (l['pkg']['pen'],l['sets'][l['active_set']]['rows']):
   if variant=='target-undead':
    changed=[r for r in rows if is_summon(r)];assert len(changed)==1;changed[0]['verb']['a']='tag:undead'
  prepared=load(branch/'prepared.json');after=load(branch/'after.json');assert prepared==expected,variant
  assert prepared['lineage']['seed']==2
  assert after['lineage']['clock_s']-prepared['lineage']['clock_s']==28800
  assert after['lineage']['gold']+after['lineage']['town']['bank']==after['lineage']['tree']['ledger']
  result=load(branch/'result.json');records=[];fires=collections.Counter();targets=collections.Counter();ticks=[0,0,0];lickills=0
  for item in result['records']:
   rid=item['record']['id'];raw=load(branch/f'run-{rid:06}.json');cap=load(branch/f'send-{rid:06}.json')
   assert cap['game']['run']['turn']==0 and not cap['inputs']
   assert raw['record']==item['record'] and raw['public_events_exact']
   assert raw['replay']['hash']==item['replay_hash'] and raw['replay']['ticks']==item['record']['turns']
   assert raw['terminal_run']['turn']==item['record']['turns'] and raw['terminal_run']['depth']==item['record']['depth']
   ticks=[a+b for a,b in zip(ticks,raw['lich_ticks'])];assert raw['lich_ticks'][0]==sum(raw['lich_ticks'][1:])
   for i,row in enumerate(raw['rules']['rows']):
    if row.get('origin')=='player' and row['verb']=={'v':'attack','a':'tag:undead' if variant=='target-undead' else 'tag:summoned'} and row['conds']==[{'k':'foe_tag','t':'summoned'},{'k':'hp>','n':45}]:
     targets.update(raw['raw_row_tally'][i]['fired_on'])
     for floor in raw['replay']['floors']:
      fires[str(floor['snapshot']['depth'])]+=sum(e['k']=='rule' and e.get('row')==i for e in floor['events'])
   records.append(item['record'])
  assert len(records)==len(list(branch.glob('run-*.json')))==len(list(branch.glob('send-*.json')))
  summary['cases'].append({'variant':variant,'records':records,'best':result['best'],
    'outcomes':dict(collections.Counter(r['tier']for r in records)),'gold':result['gold'],'gold_delta':result['gold']-prepared['lineage']['gold'],
    'total_ticks':after['lineage']['total_turns']-prepared['lineage']['total_turns'],
    'finish_run_ticks_past_budget':max(0,after['lineage']['total_turns']-prepared['lineage']['total_turns']-288000),
    'summon_row_rule_events_by_floor':dict(sorted(fires.items(),key=lambda x:int(x[0]))),'summon_row_fired_on':dict(targets),
    'lich_alive_ticks_total_no_skeletons_with_skeletons':ticks,'packing':load(branch/'packing.json'),
    'prepared_sha256':sha(branch/'prepared.json'),'after_sha256':sha(branch/'after.json')})
a=base/'capture/parent/unchanged';b=base/'capture/parent/unchanged-repeat'
assert {p.name for p in a.iterdir()}=={p.name for p in b.iterdir()}
for p in a.iterdir():assert p.read_bytes()==(b/p.name).read_bytes(),p.name
assert len(summary['cases'])==3
summary['completed_actual_runs']=sum(len(c['records'])for c in summary['cases'])
summary['repeat_all_files_byte_exact']=True
summary['counter_packing_equal']=all(c['packing']==summary['cases'][0]['packing']for c in summary['cases']);assert summary['counter_packing_equal']
cases={c['variant']:c for c in summary['cases']}
candidate=cases['target-undead']
summary['diagnostic_bars']={'no_spectral_blade_target_tallies':candidate['summon_row_fired_on'].get('spectral_blade',0)==0,'positive_skeleton_target_tallies':candidate['summon_row_fired_on'].get('skeleton',0)>0,'reaches_d28':candidate['best']>=28}
summary['diagnostic_all_pass']=all(summary['diagnostic_bars'].values())
out.write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'actual_runs':summary['completed_actual_runs'],'cases':[{k:c[k]for k in ['variant','best','outcomes','gold_delta','finish_run_ticks_past_budget','summon_row_rule_events_by_floor','summon_row_fired_on']}for c in summary['cases']]},indent=2))
