#!/usr/bin/env python3
"""Independently check archived Cut301 preparation, traces and accounting."""
import collections
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
root=Path('docs/evidence/cut301')
load=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def unpack(archive,dest):
 dest.mkdir()
 with subprocess.Popen(['zstd','-dc',str(archive)],stdout=subprocess.PIPE) as proc:
  with tarfile.open(fileobj=proc.stdout,mode='r|') as tar:
   for item in tar:
    assert not item.name.startswith('/') and '..' not in Path(item.name).parts
    assert item.isfile() or item.isdir()
    p=dest/item.name
    if item.isdir():p.mkdir(parents=True,exist_ok=True)
    else:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(tar.extractfile(item).read())
  assert proc.wait()==0
with tempfile.TemporaryDirectory(prefix='idlever-cut301-') as td:
 temp=Path(td);out=temp/'study';unpack(root/'capture.tar.zst',out)
 manifest=load(root/'raw-manifest.json')
 assert {str(p.relative_to(out)):sha(p)for p in out.rglob('*')if p.is_file()}==manifest
 original=temp/'cut299';unpack(Path('docs/evidence/cut299/capture.tar.zst'),original)
 for name,h in load(original/'manifest.json').items():assert sha(original/name)==h
 new=out/'capture/parent/unchanged';old=original/'capture/parent/unchanged';repeat=out/'capture/parent/unchanged-repeat'
 for other in (old,repeat):
  assert {p.name for p in new.iterdir()}=={p.name for p in other.iterdir()}
  for p in new.iterdir():assert p.read_bytes()==(other/p.name).read_bytes(),p.name
 ident=load(root/'runtime-identity.json')
 for name,h in ident['source_hashes'].items():
  p=out/'parent.json' if name=='target/cut301/parent.json' else Path(name)
  assert sha(p)==h,name
 assert sha(out/'parent.json')=='ffdfd0cf6baabe72ad1ae2458ec0244b85189b5ab2647a3f71e47decc7faebe8'
 canonical=load(out/'capture/parent/canonical.json');summary=load(root/'summary.json');count=0
 for case in summary['cases']:
  variant=case['variant'];branch=out/'capture/parent'/variant;prepared=load(branch/'prepared.json');expected=copy.deepcopy(canonical)
  if variant=='target-undead':
   lin=expected['lineage']
   for rows in (lin['pkg']['pen'],lin['sets'][lin['active_set']]['rows']):
    matches=[r for r in rows if r.get('origin')=='player' and r['verb']=={'v':'attack','a':'tag:summoned'} and r['conds']==[{'k':'foe_tag','t':'summoned'},{'k':'hp>','n':45}]]
    assert len(matches)==1;matches[0]['verb']['a']='tag:undead'
  assert prepared==expected
  after=load(branch/'after.json');a=after['lineage'];b=prepared['lineage']
  assert a['clock_s']-b['clock_s']==28800
  assert a['gold']+a['town']['bank']==a['tree']['ledger']
  assert case['gold_delta']==a['gold']-b['gold']
  assert case['total_ticks']==a['total_turns']-b['total_turns']
  assert case['finish_run_ticks_past_budget']==max(0,case['total_ticks']-288000)
  assert case['best']==a['best_depth']
  targets=collections.Counter();fires=collections.Counter();records=[]
  for p in sorted(branch.glob('run-*.json')):
   raw=load(p);rec=raw['record'];records.append(rec);cap=load(branch/p.name.replace('run-','send-'))
   assert cap['game']['run']['turn']==0 and cap['inputs']==[]
   assert raw['public_events_exact'] and raw['terminal_run']['turn']==rec['turns']==raw['replay']['ticks']
   for i,row in enumerate(raw['rules']['rows']):
    selector='tag:undead' if variant=='target-undead' else 'tag:summoned'
    if row.get('origin')=='player' and row['verb']=={'v':'attack','a':selector} and row['conds']==[{'k':'foe_tag','t':'summoned'},{'k':'hp>','n':45}]:
     targets.update(raw['raw_row_tally'][i]['fired_on'])
     for floor in raw['replay']['floors']:
      fires[str(floor['snapshot']['depth'])]+=sum(e['k']=='rule' and e.get('row')==i for e in floor['events'])
  assert records==case['records']
  assert dict(targets)==case['summon_row_fired_on'] and dict(fires)==case['summon_row_rule_events_by_floor']
  assert dict(collections.Counter(r['tier']for r in records))==case['outcomes'];count+=len(records)
 assert count==summary['completed_actual_runs']==38
 dest=temp/'rederived.json'
 subprocess.run(['python3',str(root/'analyze.py'),str(out),str(dest)],check=True,stdout=subprocess.PIPE)
 assert dest.read_bytes()==(root/'summary.json').read_bytes()
 assert summary['diagnostic_all_pass'] and all(summary['diagnostic_bars'].values())
 print(json.dumps({'status':'PASS_SAVED_WORLD_DIAGNOSTIC','completed_actual_runs':count,'continuations':3,'baseline_matches_cut299_byte_exact':True,'repeat_all_files_byte_exact':True,'diagnostic_bars':summary['diagnostic_bars'],'native_event_assertions':'producer checks actual public events; archive verifier does not resimulate','default_adoption':False,'population_or_canonical_acceptance':False}))
