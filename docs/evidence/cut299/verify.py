#!/usr/bin/env python3
"""Check preserved fixed-choice receipts without resimulating native gameplay."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
root=Path('docs/evidence/cut299')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
identity=json.loads((root/'identity.json').read_text())
for p,h in identity['files'].items():assert sha(Path(p))==h,p
with tempfile.TemporaryDirectory(prefix='idlever-cut299-')as temp:
 dest=Path(temp)
 process=subprocess.Popen(['zstd','-dc',str(root/'capture.tar.zst')],stdout=subprocess.PIPE)
 with tarfile.open(fileobj=process.stdout,mode='r|')as tar:
  for entry in tar:
   assert not entry.name.startswith('/')and '..'not in Path(entry.name).parts
   assert not entry.issym()and not entry.islnk()
   p=dest/entry.name
   if entry.isdir():p.mkdir(parents=True,exist_ok=True)
   else:
    assert entry.isfile();p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(tar.extractfile(entry).read())
 assert process.wait()==0
 manifest=json.loads((dest/'manifest.json').read_text())
 for p,h in manifest.items():assert sha(dest/p)==h,p
 baseline=json.loads((root/'runtime-identity.json').read_text());candidate=json.loads((root/'candidate-identity.json').read_text())
 producer='crates/idlever-core/examples/lich_pen_probe.rs'
 assert sha(root/'baseline-producer.rs')==baseline['sources'][producer]
 assert sha(Path(producer))==candidate['sources'][producer]
 for p,h in baseline['sources'].items():
  if p!=producer:assert h==candidate['sources'][p]==sha(Path(p)),p
 assert sha(dest/'capture/parent/original.json')==baseline['input_sha256']==candidate['input_sha256']
 assert (dest/'capture/parent/original.json').read_bytes()==(dest/'scoped/parent/original.json').read_bytes()
 prior=json.loads(Path('docs/evidence/cut298/fresh-summary.json').read_text())
 assert baseline['input_sha256']==next(c['sha256']for c in prior['camps']if c['name']=='TUNED-s2-d1-c2')
 output=dest/'summary.json'
 subprocess.run(['python3',str(root/'analyze.py'),str(dest),str(output)],check=True,stdout=subprocess.PIPE)
 assert output.read_bytes()==(root/'summary.json').read_bytes()
 summary=json.loads(output.read_text());cases={c['variant']:c for c in summary['cases']}
 assert summary['completed_actual_runs']==76 and summary['repeat_all_files_byte_exact']
 assert cases['unchanged']['best']==cases['remove-boss']['best']==23
 assert cases['remove-both']['best']==cases['remove-summoned']['best']==cases['scope-undead']['best']==28
 assert sum(cases['unchanged']['summon_row_rule_events_by_floor'].get(str(d),0)for d in (14,15,16,17))==73
 assert sum(cases['scope-undead']['summon_row_rule_events_by_floor'].get(str(d),0)for d in (14,15,16,17))==20
 assert cases['scope-undead']['summon_row_fired_on']['skeleton']>0
 pilot=dest/'pilot';pilot.mkdir()
 process=subprocess.Popen(['zstd','-dc',str(root/'pilot.tar.zst')],stdout=subprocess.PIPE)
 with tarfile.open(fileobj=process.stdout,mode='r|')as tar:
  for entry in tar:
   assert not entry.name.startswith('/')and '..'not in Path(entry.name).parts
   assert not entry.issym()and not entry.islnk()
   p=pilot/entry.name
   if entry.isdir():p.mkdir(parents=True,exist_ok=True)
   else:
    assert entry.isfile();p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(tar.extractfile(entry).read())
 assert process.wait()==0
 for p,h in json.loads((pilot/'manifest.json').read_text()).items():assert sha(pilot/p)==h,p
 pilot_id=json.loads((root/'pilot-identity.json').read_text())
 assert sha(root/'pilot-packages.rs')==pilot_id['sources']['crates/idlever-core/src/packages.rs']
 for p,h in pilot_id['sources'].items():
  if p!='crates/idlever-core/src/packages.rs':assert h==baseline['sources'][p],p
 control=dest/'control.json';control.write_bytes(gzip.decompress((root/'control-observations.json.gz').read_bytes()))
 assert sha(control)==pilot_id['shipping_control']['raw_sha256']
 pilot_output=dest/'pilot-summary.json'
 subprocess.run(['python3',str(root/'pilot.py'),str(pilot),str(pilot_output),str(control)],check=True,stdout=subprocess.PIPE)
 assert pilot_output.read_bytes()==(root/'pilot-summary.json').read_bytes()
 print(json.dumps({'status':'PASS_SAVED_WORLD_DIAGNOSTIC','raw_files':len(manifest),'actual_completed_runs':76,'same_parent_8h_continuations':6,'repeat_all_files_byte_exact':True,'baseline_depth':23,'remove_summoned_or_scope_depth':28,'off_lich_floor_14_17_rule_events':[73,20],'scoped_skeleton_target_tallies':cases['scope-undead']['summon_row_fired_on']['skeleton'],'public_event_equality':'native producer assertions, not archive resimulation','isolated_ordinary_pilot_trajectories':4,'pilot_camps':20,'pilot_median_ratio':['11/10','5/4'],'unchanged_whole_trajectories_except_elapsed':3,'default_adoption':False,'population_or_canonical_acceptance':False}))
