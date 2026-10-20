"""Independent native provenance, full UI matrix, save/response and failure checks."""
from pathlib import Path
import json,gzip,hashlib,subprocess,tarfile,tempfile
from PIL import Image
r=Path('docs/evidence/cut295');sha=lambda b:hashlib.sha256(b).hexdigest();load=lambda p:json.loads(p.read_bytes());js=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
identity=load(r/'identity.json')
for name,digest in identity['files'].items():assert sha((r/name).read_bytes())==digest
selection=load(r/'selection.json');cases={c['id']:c for c in selection['cases']};old={c['id']:c for c in load(r/'selection-absence.json')['cases']};assert len(cases)==len(old)==14
final=r/'capture-final';data=load(final/'results.json');assert data['status']=='PASS' and data['errors']==[] and len(data['rows'])==56 and data['wasmSha256']==identity['wasm_sha256']
assert data['scriptSha256']==identity['files']['capture.mjs'] and data['selectionSha256']==identity['files']['selection.json']
assert 'D3D12' in data['gpu'] and 'NVIDIA' in data['gpu'] and data['served'] and all(s==identity['wasm_sha256'] for s in data['served'])
prior=load(r/'capture/results.json');assert len(prior['rows'])==10 and data['resumedFrom']['rows']==10
assert data['resumedFrom']['resultsSha256']==sha((r/'capture/results.json').read_bytes())
assert data['resumedFrom']['scriptSha256']==prior['scriptSha256']==identity['files']['capture-original-reconstructed.mjs']
assert all(x in data['rows'] for x in prior['rows'])
failed=load(r/'pilot-debug/results.json');assert failed['failureState']['probe']=={'loads':0,'state':False,'calls':[],'replayAvailable':False} and failed['failureState']['sheets']==['sheet-body runs-sheet']
oldr=Path('docs/evidence/cut293');manifest=load(oldr/'manifest.json');assert sha((oldr/'capture.tar.zst').read_bytes())==manifest['archive_sha256']
expected={f['path']:f for f in manifest['files']};seen=set();matrix=set();prepared=0
with tempfile.TemporaryDirectory(prefix='idlever-cut295-verify-') as tmp:
 tmp=Path(tmp);proc=subprocess.Popen(['zstd','-q','-dc','--long=27',str(oldr/'capture.tar.zst')],stdout=subprocess.PIPE)
 try:
  with tarfile.open(fileobj=proc.stdout,mode='r|') as tar:
   for member in tar:
    assert member.name in expected and member.name not in seen and not Path(member.name).is_absolute() and '..' not in Path(member.name).parts
    f=expected[member.name];dest=tmp/member.name;dest.parent.mkdir(parents=True,exist_ok=True)
    if member.islnk():assert member.linkname in seen and f['same_bytes_as']==member.linkname;dest.hardlink_to(tmp/member.linkname)
    else:
     assert member.isfile();raw=tar.extractfile(member).read();assert len(raw)==f['bytes'] and sha(raw)==f['sha256'];dest.write_bytes(raw)
    seen.add(member.name)
 finally:proc.stdout.close();code=proc.wait()
 assert code==0 and seen==set(expected)
 def native(path):return tmp/Path(path).relative_to('target/cut293')
 for key,c in cases.items():
  source=native(c['inputPath']).read_bytes();assert sha(source)==c['inputSha256'];original=native(old[key]['inputPath']).read_bytes();assert sha(original)==old[key]['inputSha256']
  assert c['moment']==old[key]['moment'] and c['nextWeapon']==old[key]['nextWeapon'] and c['nextWeapon']!=c['weapon']
  if c.get('completeSeconds'):
   assert c['completeSeconds']==28800 and key.startswith('caster-') and key.endswith('authored') and c['inputPath'].endswith('/sent.json')
  else:assert c['inputPath']==old[key]['inputPath'] and c['inputSha256']==old[key]['inputSha256']
 for row in data['rows']:
  c=cases[row['id']];key=(row['id'],row['backend'],row['viewport']['width']);assert key not in matrix;matrix.add(key)
  assert row['inputSha256']==c['inputSha256'] and row['nextWeapon']==c['nextWeapon'] and row['recordedWeapon']==c['weapon']
  assert row['cost']==row['afterCost'] and row['afterChoiceSha256']==row['afterViewSha256']
  saved=gzip.decompress((final/row['saveFile']).read_bytes());assert sha(saved)==row['afterChoiceSha256'];state=json.loads(saved)
  assert state.get('run') is None and state['lineage']['class']==c['class']
  if c['class']=='gunner':assert ('short_gun' if state['lineage']['kit'].get('gun_choice')==1 else 'long_gun')==c['nextWeapon']
  else:assert state['lineage']['starting_config']['weapon']==c['nextWeapon']
  assert row['cost']=={'gold':state['lineage']['gold'],'marks':state['lineage']['marks'],'clock':state['lineage']['clock_s']}
  native_replay=load(native(c['replayPath']));wasm_replay=json.loads(gzip.decompress((final/row['replayFile']).read_bytes()));assert wasm_replay==native_replay and native_replay['hash']==row['nativeReplayHash']==c['nativeReplayHash']
  floor=next(f for f in wasm_replay['floors'] if f['snapshot']['depth']==c['moment']['floor']['snapshot']['depth']);assert floor==c['moment']['floor']
  assert sha(js(floor['snapshot']))==row['loadedSnapshotSha256'];assert sha(js([e for e in floor['events'] if e['k'] not in ['descend','exit']]))==row['appliedEventsSha256']
  assert row['replayCalls']==[[c['runId']]] and c['runId']==133 and row['ui']['backend']==row['backend']
  assert row['ui']['overflow'] is False and row['diagnosticSeek'] and row['ui']['tick']==row['target']==c['moment']['target']
  assert row['ui']['stateKind']==row['kind'] and row['ui']['canvas']['w']>0 and row['ui']['canvas']['h']>0
  assert '133' in row['ui']['panel'] and row['textScale']==1
  if c.get('completeSeconds'):
   assert row['completion']==load(native(c['inputPath'].replace('sent.json','absence-report.json'))) and row['completion']['runs']==1 and row['completion']['elapsed_s']==28800;prepared+=1
  else:assert row.get('completion') is None
  original_after=load(native(old[c['id']]['inputPath']))['lineage'];assert row['cost']=={'gold':original_after['gold'],'marks':original_after['marks'],'clock':original_after['clock_s']}
  assert sha((final/row['file']).read_bytes())==row['frameSha256']
  with Image.open(final/row['file']) as im:assert abs(im.width-row['viewport']['width']*1.5)<=1 and abs(im.height-row['viewport']['height']*1.5)<=1
 assert matrix=={(key,b,w) for key in cases for b in ['gl','canvas'] for w in [402,1440]} and prepared==8
 retention=load(r/'retention/results.json');assert retention['status']=='PASS' and len(retention['rows'])==2
 for row in retention['rows']:
  c=old[row['id']];assert sha(native(c['inputPath']).read_bytes())==row['inputSha256']
  assert row['replayAvailable'] is False and row['runEntryVisible'] and row['replayButtons']==0 and row['readSaveBytesExact']
  assert sha((r/'retention'/row['file']).read_bytes())==row['frameSha256']
nav=load(r/'navigation-results.json');assert nav['status']=='PASS' and nav['checks']==15 and nav['errors']==[] and len(nav['cases'])==8
validation=load(r/'validation.json')
for name,h in validation['logs'].items():assert sha((r/'validation'/name).read_bytes())==h
result={'status':'PASS_WITH_DECLARED_INPUT_AMENDMENT','native_receipts':len(seen),'viewing_flows':56,'restored_absence_flows':48,'same_original_inflight_completions':8,'recorded_weapon_isolated_from_next_kit':56,'whole_post_choice_save_bytes_unchanged':56,'native_wasm_replay_pairs':56,'original_unavailable_replays':2,'navigation_controls':15,'original_blanket_retention_claim_passed':False,'normal_user_pause_controls_claimed':False}
(r/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
