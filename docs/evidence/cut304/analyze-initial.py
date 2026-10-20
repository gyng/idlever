#!/usr/bin/env python3
"""Reconcile ordinary worker camps and six fixed actual-replay exit traces."""
import collections
import copy
from fractions import Fraction
import gzip
import hashlib
import json
from pathlib import Path
import statistics
import sys
base=Path(sys.argv[1])if len(sys.argv)>1 else Path('target/cut304');out=Path(sys.argv[2])if len(sys.argv)>2 else Path('docs/evidence/cut304/summary.json')
load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
ordinary=load(base/'ordinary/observations.json');assert ordinary['request']=={'seeds':['1','2'],'bots':['AWAY','AWAY-nodes'],'days':4,'until_depth':None,'checkins_per_day':3}
assert len(ordinary['records'])==4
arrivals=[];means={};camps=[]
for bot in ('AWAY','AWAY-nodes'):
 rs=[r for r in ordinary['records']if r['bot']==bot];assert len(rs)==2
 means[bot]=str(Fraction(sum(sum(r['seed_out']['best_day'])for r in rs),8))
 for r in rs:
  assert r['effective_checkins_per_day']==1 and r['completed_days']==4 and r['campaign_complete']
  arrivals.append({'bot':bot,'seed':r['seed'],'d18_hours':r['seed_out']['hours'][2],'best_day':r['seed_out']['best_day']})
for p in sorted((base/'ordinary/camps').glob('*.json')):
 d=load(p);l=d['lineage'];assert l['gold']+l['town']['bank']==l['tree']['ledger'];assert 0<=l['tree'].get('chest',0)<=l['gold']
 old=Path('docs/evidence/cut282/camps')/(p.name+'.gz');assert p.read_bytes()==gzip.decompress(old.read_bytes()),p.name
 camps.append({'name':p.stem,'sha256':sha(p),'byte_equal_cut282':True,'best':l['best_depth'],'start':l['start'],'gold':l['gold'],'kit':l['kit']})
assert len(camps)==16
summary={'scope':'Current four-day known-seed reproduction and six public24h Session continuations; no population/fortnight/canonical acceptance','arrivals':arrivals,'four_day_mean_best':means,'all_16_camps_equal_cut282':True,'camps':camps,'cases':[],'first_divergences':[]}
for parent in sorted((base/'capture').iterdir()):
 canonical=load(parent/'canonical.json');source=parent/'original.json';pname=parent.name
 assert source.read_bytes()==(base/'ordinary/camps'/(pname+'.json')).read_bytes()
 for branch in sorted(p for p in parent.iterdir()if p.is_dir()):
  variant=branch.name;expected=copy.deepcopy(canonical)
  if variant=='pause-apprentice':expected['lineage']['tree']['paused']=sorted(set(expected['lineage']['tree'].get('paused',[]))|{'apprentice'})
  prepared=load(branch/'prepared.json');after=load(branch/'after.json');assert prepared==expected
  a=after['lineage'];b=prepared['lineage'];assert a['clock_s']-b['clock_s']==86400;assert a['gold']+a['town']['bank']==a['tree']['ledger']
  result=load(branch/'result.json');records=[];reasons=collections.Counter();depths=collections.Counter();heals=collections.Counter();exitrows=collections.Counter();held=0;hurts=collections.Counter();runs=[]
  for item in result['records']:
   rec=item['record'];p=branch/f"run-{rec['id']:06}.json";d=load(p);cap=load(branch/f"send-{rec['id']:06}.json");r=d['terminal_run'];start=cap['game']['run']
   assert d['record']==rec and d['replay']['hash']==item['replay_hash'] and d['public_events_exact']
   assert r['turn']==rec['turns']==d['replay']['ticks'];assert start['turn']==0 and cap['inputs']==[]
   row=r.get('exit_row');body=d['rules']['rows'][row]if row is not None and row>=0 else None;assert body==d['exit_row_body']
   actualheals=sum(i['kind']=='heal'for i in start['hero']['inv']);heals[actualheals]+=1
   reasons[rec['reason']]+=1;depths[f"{rec['tier']}@{rec['depth']}"]+=1;held+=bool(r.get('wall_held',False))
   exitrows[json.dumps(body,sort_keys=True)]+=1
   for cause,n in r['hp_lost']:hurts[cause]+=n
   runs.append({'id':rec['id'],'start':rec['start'],'depth':rec['depth'],'tier':rec['tier'],'reason':rec['reason'],'turns':rec['turns'],'exit_row':row,'exit_row_body':body,'send_heals':actualheals,'send_kit':d['send_kit'],'send_hp':start['hero']['hp'],'send_max_hp':start['hero']['max_hp'],'end_hp':r['hero']['hp'],'end_max_hp':r['hero']['max_hp'],'hunger_lost':r['hunger_lost'],'gold_credited':rec['gold'],'secured':r['secured'],'remaining_heals':sum(i['kind']=='heal'for i in r['hero']['inv'])})
   records.append(rec)
  assert records and len(records)==len(list(branch.glob('run-*.json')))==len(list(branch.glob('send-*.json')))
  olddoc=json.loads(gzip.decompress(Path('docs/evidence/cut282/worker-comparison.json.gz').read_bytes()))
  old=next(c for c in olddoc['cases']if Path(c['input']).stem==pname and c['variant']==variant)
  counts={'best':a['best_depth'],'runs':len(records),'banked':sum(r['tier']=='bank'for r in records),'returned':sum(r['tier']=='return'for r in records),'net_wealth':a['gold']+a['town']['bank']-b['gold']-b['town']['bank'],'kit':a['kit'],'acts':a['tree']['acts']}
  oldscalars={k:old['summary'][k]for k in counts};assert counts==oldscalars,(pname,variant,'Session vs old Game summary')
  ticks=a['total_turns']-b['total_turns']
  summary['cases'].append({'parent':pname,'variant':variant,**counts,'count_scalars_equal_old_game_probe':True,'total_ticks':ticks,'extra_finish_run_ticks':max(0,ticks-864000),'end_reasons':dict(reasons),'exits_by_tier_depth':dict(depths),'send_heal_histogram':dict(heals),'wall_held_runs':held,'hurt_by_cause':dict(hurts),'exit_row_counts':dict(exitrows),'runs_detail':runs,'prepared_sha256':sha(branch/'prepared.json'),'after_sha256':sha(branch/'after.json')})
 a=parent/'unchanged';b=parent/'unchanged-repeat';assert {p.name for p in a.iterdir()}=={p.name for p in b.iterdir()}
 for p in a.iterdir():assert p.read_bytes()==(b/p.name).read_bytes(),p.name
 b=parent/'pause-apprentice';prefix=[]
 for p in sorted(a.glob('run-*.json')):
  if not(b/p.name).exists():break
  x,y=load(p),load(b/p.name)
  if x['replay']['hash']==y['replay']['hash']:prefix.append(x['record']['id']);continue
  cx=load(a/p.name.replace('run-','send-'))['game'];cy=load(b/p.name.replace('run-','send-'))['game'];rx,ry=cx['run'],cy['run']
  fields=[k for k in rx if rx[k]!=ry.get(k)];hero=[k for k in rx['hero']if rx['hero'][k]!=ry['hero'].get(k)]
  ex=[e for f in x['replay']['floors']for e in f['events']];ey=[e for f in y['replay']['floors']for e in f['events']];common=0
  for e,f in zip(ex,ey):
   if e!=f:break
   common+=1
  summary['first_divergences'].append({'parent':pname,'same_replay_prefix_run_ids':prefix,'first_run_id':x['record']['id'],'different_initial_run_fields':fields,'different_initial_hero_fields':hero,'same_compiled_rules':x['rules']==y['rules'],'same_floor_monsters_rng':all(rx[k]==ry[k]for k in ('floor','monsters','rng')),'worker_on_kit':cx['lineage']['kit'],'worker_paused_kit':cy['lineage']['kit'],'worker_on_weapon':rx['hero']['weapon'],'worker_paused_weapon':ry['hero']['weapon'],'worker_on_record':x['record'],'worker_paused_record':y['record'],'first_different_public_event_index':common,'first_worker_on_different_event':ex[common]if common<len(ex)else None,'first_worker_paused_different_event':ey[common]if common<len(ey)else None})
  break
assert len(summary['cases'])==6 and len(summary['first_divergences'])==2
summary['actual_completed_runs']=sum(c['runs']for c in summary['cases']);summary['full_repeats_byte_exact']=True
out.write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'arrivals':arrivals,'four_day_mean_best':means,'actual_completed_runs':summary['actual_completed_runs'],'cases':[{k:c[k]for k in ('parent','variant','best','runs','banked','returned','net_wealth','end_reasons','send_heal_histogram','wall_held_runs')}for c in summary['cases']]},indent=2))
