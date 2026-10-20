#!/usr/bin/env python3
"""Independently check archived Cut310 preparation, traces and accounting."""
import collections
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
root=Path('docs/evidence/cut310')
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
with tempfile.TemporaryDirectory(prefix='idlever-cut310-') as td:
 temp=Path(td);out=temp/'study';unpack(root/'capture.tar.zst',out)
 manifest=load(root/'raw-manifest.json')
 assert {str(p.relative_to(out)):sha(p)for p in out.rglob('*')if p.is_file()}==manifest
 original=temp/'cut301';unpack(Path('docs/evidence/cut301/capture.tar.zst'),original)
 assert {str(p.relative_to(original)):sha(p)for p in original.rglob('*')if p.is_file()}==load(Path('docs/evidence/cut301/raw-manifest.json'))
 new=out/'capture/parent/unchanged';old=original/'capture/parent/unchanged';repeat=out/'capture/parent/unchanged-repeat'
 for other in (old,repeat):
  assert {p.name for p in new.iterdir()}=={p.name for p in other.iterdir()}
  for p in new.iterdir():assert p.read_bytes()==(other/p.name).read_bytes(),p.name
 ident=load(root/'preflight.json')
 for name,h in ident['files'].items():assert sha(root/name)==h,name
 assert sha(Path('docs/evidence/cut309/source.tar.zst'))==ident['source_base_sha256']
 assert sha(Path('docs/evidence/cut309/source-manifest.json'))==ident['source_manifest_sha256']
 assert sha(Path('docs/evidence/cut301/capture.tar.zst'))==ident['old_capture_sha256']
 assert sha(out/'parent.json')=='ffdfd0cf6baabe72ad1ae2458ec0244b85189b5ab2647a3f71e47decc7faebe8'
 canonical=load(out/'capture/parent/canonical.json');summary=load(root/'summary.json');count=0
 for case in summary['cases']:
  variant=case['variant'];branch=out/'capture/parent'/variant;prepared=load(branch/'prepared.json');expected=copy.deepcopy(canonical)
  if variant=='target-undead-present':
   lin=expected['lineage']
   for rows in (lin['pkg']['pen'],lin['sets'][lin['active_set']]['rows']):
    matches=[r for r in rows if r.get('origin')=='player' and r['verb']=={'v':'attack','a':'tag:summoned'} and r['conds']==[{'k':'foe_tag','t':'summoned'},{'k':'hp>','n':45}]]
    assert len(matches)==1;matches[0]['verb']['a']='tag:undead';matches[0]['conds'][0]['t']='undead'
  assert prepared==expected
  after=load(branch/'after.json');a=after['lineage'];b=prepared['lineage']
  assert a['clock_s']-b['clock_s']==28800
  assert a['gold']+a['town']['bank']==a['tree']['ledger']
  terms={k:a['gold_tally'].get(k,0)-b['gold_tally'].get(k,0)for k in set(a['gold_tally'])|set(b['gold_tally'])}
  interest=a['town']['interest']-b['town']['interest']
  assert a['gold']-b['gold']==sum(terms.values())
  assert a['town']['bank']-b['town']['bank']==interest-terms.get('bank',0)
  assert a['tree']['ledger']-b['tree']['ledger']==interest+sum(v for k,v in terms.items()if k!='bank')
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
    selector='tag:undead' if variant=='target-undead-present' else 'tag:summoned'
    if row.get('origin')=='player' and row['verb']=={'v':'attack','a':selector} and row['conds']==[{'k':'foe_tag','t':'undead' if variant=='target-undead-present' else 'summoned'},{'k':'hp>','n':45}]:
     targets.update(raw['raw_row_tally'][i]['fired_on'])
     for floor in raw['replay']['floors']:
      fires[str(floor['snapshot']['depth'])]+=sum(e['k']=='rule' and e.get('row')==i for e in floor['events'])
  assert records==case['records']
  assert dict(targets)==case['candidate_row_fired_on'] and dict(fires)==case['candidate_row_rule_events_by_floor']
  assert dict(collections.Counter(r['tier']for r in records))==case['outcomes'];count+=len(records)
 assert count==summary['completed_actual_runs']
 dest=temp/'rederived.json'
 subprocess.run(['python3',str(root/'analyze.py'),str(out),str(dest)],check=True,stdout=subprocess.PIPE)
 assert dest.read_bytes()==(root/'summary.json').read_bytes()
 assert summary['diagnostic_all_pass']==all(summary['diagnostic_bars'].values())
 print(json.dumps({'status':'AUDIT_PASS_DIAGNOSTIC_PASS' if summary['diagnostic_all_pass'] else 'AUDIT_PASS_DIAGNOSTIC_FAIL','completed_actual_runs':count,'continuations':3,'baseline_matches_cut301_byte_exact':True,'repeat_all_files_byte_exact':True,'diagnostic_bars':summary['diagnostic_bars'],'native_event_assertions':'producer checks actual public events; archive verifier does not resimulate','default_adoption':False,'population_or_canonical_acceptance':False}))
