#!/usr/bin/env python3
"""Verify archived ordinary-policy discovery evidence without resimulation."""
import copy
from fractions import Fraction
import gzip
import hashlib
import json
from pathlib import Path
import statistics
import subprocess
import tarfile
import tempfile
root=Path('docs/evidence/cut302');load=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
identity=load(root/'runtime-identity.json')
for p,h in identity['shipping_source_hashes'].items():assert sha(Path(p))==h,p
for p,h in identity['candidate_source_hashes'].items():
 source=root/'pilot-packages.rs' if p=='crates/idlever-core/src/packages.rs' else Path(p)
 assert sha(source)==h,p
 if p!='crates/idlever-core/src/packages.rs':assert identity['shipping_source_hashes'][p]==h,p
assert identity['shipping_runtime_sha256']!=identity['candidate_runtime_sha256']
a=json.loads(gzip.decompress(Path('docs/evidence/cut299/control-observations.json.gz').read_bytes()))
assert hashlib.sha256(gzip.decompress(Path('docs/evidence/cut299/control-observations.json.gz').read_bytes())).hexdigest()==identity['shipping_observations_sha256']
with tempfile.TemporaryDirectory(prefix='idlever-cut302-')as td:
 dest=Path(td)
 proc=subprocess.Popen(['zstd','-dc',str(root/'pilot.tar.zst')],stdout=subprocess.PIPE)
 with tarfile.open(fileobj=proc.stdout,mode='r|')as tar:
  for item in tar:
   assert not item.name.startswith('/')and '..'not in Path(item.name).parts
   assert item.isdir()or item.isfile()
   p=dest/item.name
   if item.isdir():p.mkdir(parents=True,exist_ok=True)
   else:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(tar.extractfile(item).read())
 assert proc.wait()==0
 assert {str(p.relative_to(dest)):sha(p)for p in dest.rglob('*')if p.is_file()}==load(root/'raw-manifest.json')
 b=load(dest/'observations.json');summary=load(root/'summary.json')
 assert a['request']==b['request'] and a['balance']==b['balance']
 assert len(b['records'])==4
 old={(r['bot'],r['seed']):r for r in a['records']};new={(r['bot'],r['seed']):r for r in b['records']}
 assert old.keys()==new.keys()=={(bot,seed)for bot in ('PICKED','TUNED')for seed in ('1','2')}
 for row in summary['trajectories']:
  key=row['bot'],row['seed'];x,y=old[key],new[key]
  assert row['before_seed_out']==x['seed_out']and row['after_seed_out']==y['seed_out']
  for data,word in [(x,'before'),(y,'after')]:
   assert row[word+'_d33_h']==data['depth_reached_hours']
   assert row[word+'_d23_h']==data['seed_out']['hours'][a['milestones'].index(23)]
  xx,yy=copy.deepcopy(x),copy.deepcopy(y);xx.pop('elapsed_seconds');yy.pop('elapsed_seconds')
  assert row['whole_observation_equal_except_elapsed']==(xx==yy)
 bars=summary['diagnostic_bars'];assert bars['no_d33_censoring']==all(r['depth_reached_hours']is not None for r in list(old.values())+list(new.values()))
 for bot in ('PICKED','TUNED'):
  verdict=all(new[bot,seed]['depth_reached_hours']is not None and new[bot,seed]['depth_reached_hours']<=old[bot,seed]['depth_reached_hours']for seed in ('1','2'))
  assert bars[bot.lower()+'_d33_nonregression_each']==verdict
 idx=a['milestones'].index(23)
 assert bars['picked_d23_nonregression_each']==all(new['PICKED',seed]['seed_out']['hours'][idx]is not None and new['PICKED',seed]['seed_out']['hours'][idx]<=old['PICKED',seed]['seed_out']['hours'][idx]for seed in ('1','2'))
 for data,word in [(old,'before'),(new,'after')]:
  ratios=[Fraction(data['PICKED',seed]['depth_reached_hours'])/Fraction(data['TUNED',seed]['depth_reached_hours'])for seed in ('1','2')if data['PICKED',seed]['depth_reached_hours']is not None and data['TUNED',seed]['depth_reached_hours']is not None]
  value=statistics.median(ratios)if len(ratios)==2 else None
  assert str(value)==summary[word+'_median_paired_ratio']
  if word=='after':assert bars['median_paired_d33_ratio_at_least_1_15']==(value is not None and value>=Fraction(23,20))
 assert summary['all_discovery_bars_pass']==all(bars.values())
 assert len(summary['camps'])==len(list((dest/'camps').glob('*.json')))
 for camp in summary['camps']:
  p=dest/'camps'/(camp['name']+'.json');assert sha(p)==camp['sha256']
  l=load(p)['lineage'];assert l['gold']+l['town']['bank']==l['tree']['ledger']
  assert l['gold']==camp['gold']and l['town']['bank']==camp['bank']and l['best_depth']==camp['best']
 output=dest/'rederived.json'
 subprocess.run(['python3',str(root/'analyze.py'),str(dest),str(output)],check=True,stdout=subprocess.PIPE)
 assert output.read_bytes()==(root/'summary.json').read_bytes()
 print(json.dumps({'status':'PASS_ISOLATED_DISCOVERY_ARCHIVE','trajectories':4,'camps':len(summary['camps']),'all_discovery_bars_pass':summary['all_discovery_bars_pass'],'median_paired_ratio':summary['after_median_paired_ratio'],'default_adoption':False,'independent_population_or_canonical_acceptance':False}))
