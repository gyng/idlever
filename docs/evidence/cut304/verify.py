#!/usr/bin/env python3
"""Independently inspect archived worker/exit receipts; no gameplay resimulation."""
import collections
import copy
from fractions import Fraction
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
r=Path('docs/evidence/cut304');load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if(r/'identity.json').exists():
 for p,h in load(r/'identity.json')['files'].items():assert sha(Path(p))==h,p
ordinaryid=load(r/'ordinary-identity.json');traceid=load(r/'trace-identity.json')
for p,h in ordinaryid['sources'].items():assert sha(Path(p))==h,p
for p,h in traceid['core_sources'].items():assert sha(Path(p))==h==ordinaryid['sources'][p],p
assert sha(Path('crates/idlever-core/examples/worker_trace_probe.rs'))==traceid['producer_sha256']
assert sha(r/'frozen-contract.md')==ordinaryid['frozen_contract_sha256']==traceid['contract_sha256']
with tempfile.TemporaryDirectory(prefix='idlever-cut304-')as td:
 out=Path(td);proc=subprocess.Popen(['zstd','-dc',str(r/'capture.tar.zst')],stdout=subprocess.PIPE)
 with tarfile.open(fileobj=proc.stdout,mode='r|')as tar:
  for item in tar:
   assert not item.name.startswith('/')and '..'not in Path(item.name).parts
   assert item.isdir()or item.isfile()
   p=out/item.name
   if item.isdir():p.mkdir(parents=True,exist_ok=True)
   else:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(tar.extractfile(item).read())
 assert proc.wait()==0
 manifest=load(r/'raw-manifest.json');assert len(manifest)==645
 assert {str(p.relative_to(out)):sha(p)for p in out.rglob('*')if p.is_file()}==manifest
 for name,h in traceid['inputs'].items():assert sha(out/Path(name).relative_to('target/cut304'))==h,name
 obs=load(out/'ordinary/observations.json');assert len(obs['records'])==4
 camps=list((out/'ordinary/camps').glob('*.json'));assert len(camps)==16
 for p in camps:
  assert p.read_bytes()==gzip.decompress((Path('docs/evidence/cut282/camps')/(p.name+'.gz')).read_bytes())
  l=load(p)['lineage'];assert l['gold']+l['town']['bank']==l['tree']['ledger']
 for bot in ('AWAY','AWAY-nodes'):
  records=[v for v in obs['records']if v['bot']==bot];assert len(records)==2
  assert all(v['seed_out']['hours'][2]==(48 if bot=='AWAY' else 24)for v in records)
 summary=load(r/'summary.json');count=0
 for case in summary['cases']:
  parent=out/'capture'/case['parent'];branch=parent/case['variant'];original=load(parent/'original.json');canonical=load(parent/'canonical.json')
  assert canonical=={**original,'bloodlines_v':1,'others':{},'elapsed_remainder_ms':0,'selected':1,'next_id':2}
  assert (parent/'original.json').read_bytes()==(out/'ordinary/camps'/(case['parent']+'.json')).read_bytes()
  expected=copy.deepcopy(canonical)
  if case['variant']=='pause-apprentice':expected['lineage']['tree']['paused']=sorted(set(expected['lineage']['tree'].get('paused',[]))|{'apprentice'})
  prepared=load(branch/'prepared.json');after=load(branch/'after.json');assert prepared==expected
  a,b=after['lineage'],prepared['lineage'];assert a['gold']+a['town']['bank']==a['tree']['ledger']
  assert a['clock_s']-b['clock_s']==86400 and case['total_ticks']==a['total_turns']-b['total_turns']
  assert case['net_wealth']==a['gold']+a['town']['bank']-b['gold']-b['town']['bank']
  reasons=collections.Counter();heals=collections.Counter();held=0;runs=[]
  for p in sorted(branch.glob('run-*.json')):
   d=load(p);rec=d['record'];cap=load(branch/p.name.replace('run-','send-'));run=d['terminal_run']
   assert cap['game']['run']['turn']==0 and cap['inputs']==[]
   assert d['public_events_exact']and d['replay']['ticks']==rec['turns']==run['turn']
   assert rec['depth']==run['depth']
   reasons[rec['reason']]+=1;heals[sum(x['kind']=='heal'for x in cap['game']['run']['hero']['inv'])]+=1;held+=bool(run.get('wall_held',False));runs.append(rec)
   row=run.get('exit_row');assert d['exit_row_body']==(d['rules']['rows'][row]if row is not None and row>=0 else None)
  assert len(runs)==case['runs']and len(runs)==len(list(branch.glob('send-*.json')))
  assert dict(reasons)==case['end_reasons']and {str(k):v for k,v in heals.items()}==case['send_heal_histogram']
  assert heals=={2:len(runs)}and held==case['wall_held_runs']==0;count+=len(runs)
 for parent in(out/'capture').iterdir():
  a=parent/'unchanged';b=parent/'unchanged-repeat';assert {p.name for p in a.iterdir()}=={p.name for p in b.iterdir()}
  for p in a.iterdir():assert p.read_bytes()==(b/p.name).read_bytes(),p.name
 for row in summary['first_divergences']:
  parent=out/'capture'/row['parent'];name=f"send-{row['first_run_id']:06}.json";x=load(parent/'unchanged'/name)['game']['run'];y=load(parent/'pause-apprentice'/name)['game']['run']
  assert set(x)==set(y)and all(x[k]==y[k]for k in x if k!='hero')
  assert set(x['hero'])==set(y['hero'])and all(x['hero'][k]==y['hero'][k]for k in x['hero']if k!='weapon')
  assert x['hero']['weapon']['enchant']==2 and y['hero']['weapon']['enchant']==1
  assert row['same_compiled_rules']and row['same_floor_monsters_rng']
  assert row['first_worker_on_different_event']['hit']and not row['first_worker_paused_different_event']['hit']
 assert count==summary['actual_completed_runs']==297
 fresh=out/'rederived.json';subprocess.run(['python3',str(r/'analyze.py'),str(out),str(fresh)],check=True,stdout=subprocess.PIPE)
 assert fresh.read_bytes()==(r/'summary.json').read_bytes()
 print(json.dumps({'status':'PASS_CURRENT_WORKER_EXIT_DIAGNOSTIC','ordinary_trajectories':4,'byte_equal_historical_camps':16,'fixed_continuations':6,'actual_completed_runs':count,'raw_json_files':645,'all_send_heal_counts':2,'wall_held_runs':0,'first_divergences_only_initial_run_weapon':True,'native_event_assertions':'actual public replay equality in producer; archive does not resimulate','default_adoption':False,'population_fortnight_or_canonical_acceptance':False}))
