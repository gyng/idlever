"""Independent source/image identities, native moment provenance and matrix checks."""
from pathlib import Path
import json,hashlib,subprocess,tarfile,tempfile
from PIL import Image
r=Path('docs/evidence/cut294');sha=lambda b:hashlib.sha256(b).hexdigest();load=lambda p:json.loads(p.read_bytes());identity=load(r/'identity.json');moments=load(r/'moments.json');cases={c['id']:c for c in moments['cases']}
for name,digest in identity['files'].items():assert sha((r/name).read_bytes())==digest
assert moments['source_results_sha256']==sha(Path('docs/evidence/cut293/results.json').read_bytes()) and len(cases)==14
old=Path('docs/evidence/cut293');manifest=load(old/'manifest.json');assert sha((old/'capture.tar.zst').read_bytes())==manifest['archive_sha256']
expected={x['path']:x for x in manifest['files']};seen=set()
with tempfile.TemporaryDirectory(prefix='idlever-cut294-verify-') as scratch:
 scratch=Path(scratch);proc=subprocess.Popen(['zstd','-q','-dc','--long=27',str(old/'capture.tar.zst')],stdout=subprocess.PIPE)
 try:
  with tarfile.open(fileobj=proc.stdout,mode='r|') as tar:
   for member in tar:
    assert member.name in expected and member.name not in seen and not Path(member.name).is_absolute() and '..' not in Path(member.name).parts
    f=expected[member.name];dest=scratch/member.name;dest.parent.mkdir(parents=True,exist_ok=True)
    if member.islnk():
     assert member.linkname in seen and f['same_bytes_as']==member.linkname;dest.hardlink_to(scratch/member.linkname)
    else:
     assert member.isfile();raw=tar.extractfile(member).read();assert len(raw)==f['bytes'] and sha(raw)==f['sha256'];dest.write_bytes(raw)
    seen.add(member.name)
 finally:proc.stdout.close();exit_code=proc.wait()
 assert exit_code==0 and seen==set(expected)
 for c in cases.values():
  path=Path(c['source_path']).relative_to('target/cut293');raw=(scratch/path).read_bytes();assert sha(raw)==c['source_sha256'];replay=json.loads(raw)
  assert c['floor'] in replay['floors'] and c['event'] in c['floor']['events'] and c['target']==c['event']['t']+2
  hero=c['floor']['snapshot']['hero'];e=c['event'];assert e['k']=='attack' and e['hit'] and e['src']==hero['id'] and hero['weapon']==c['actual_weapon']
  assert not any(x['k']=='die' and x['id']==e['dst'] and x['t']<=c['target'] for x in c['floor']['events'])
combos={('fighter','crownsplitter'),('rogue','crownsplitter'),('ranger','sword'),('caster','dagger'),('caster','bow'),('gunner','short_gun')}
counts={}
for stage,count,status in [('before',12,'REPRODUCED'),('after-selector',56,'PASS'),('after',56,'PASS')]:
 data=load(r/stage/'results.json');assert data['status']==status and data['errors']==[] and len(data['rows'])==count
 assert 'D3D12' in data['gpu'] and 'NVIDIA' in data['gpu'] and data['momentsSha256']==identity['files']['moments.json']
 assert data['scriptSha256']==identity['files']['capture.mjs']
 if stage=='after':assert data['source']==identity['final_sources']
 for name in ['web/public/art/atlas.json','web/public/art/atlas.png']:assert data['source'][name]==identity['final_sources'][name]
 matrix=set()
 for row in data['rows']:
  c=cases[row['id']];matrix.add((row['id'],row['backend'],row['viewport']['width']))
  assert row['sourceReplaySha256']==c['source_sha256'] and row['event']==c['event'] and row['target']==c['target']
  image=(r/stage/row['file']).read_bytes();assert sha(image)==row['frameSha256']
  with Image.open(r/stage/row['file']) as im:
   assert abs(im.width-row['viewport']['width']*1.5)<=1 and abs(im.height-row['viewport']['height']*1.5)<=1
  cls=c['floor']['snapshot']['hero']['class'];look=c['look'] or 'male';expected_kind=f'hero_{cls}_{look}_{c["actual_weapon"]}' if (cls,c['actual_weapon']) in combos else f'hero_{cls}'+('_'+c['look'] if c['look'] else '')
  assert row['expected']==expected_kind and row['model']['immutableInput'] and row['textScale']==1
  if stage=='before':assert not row['matches'] and row['model']['kind']!=expected_kind
  else:
   assert row['matches'] and row['model']['kind']==row['actual']['heroKind']==expected_kind
   if row['backend']=='gl':
    rect=row['actual']['heroRect'];assert rect['kind']==expected_kind and rect['w']>0 and rect['h']>0 and rect['x']<row['viewport']['width'] and rect['x']+rect['w']>0 and rect['y']<row['viewport']['height'] and rect['y']+rect['h']>0
 assert len(matrix)==count
 if stage!='before':assert matrix=={(name,backend,width) for name in cases for backend in ['gl','canvas'] for width in [402,1440]}
 counts[stage]=count
control=load(r/'control-results.json');assert control['status']=='PASS' and control['checks']==341 and control['errors']==[]
assert {x['phase'] for x in control['phases']}=={'full','missing-variants','no-art'} and all(x['variantCases']==18 for x in control['phases'])
assert control['contextRestore']=={'kind':'hero_gunner_male_short_gun','lost':True,'restored':True}
validation=load(r/'validation.json')
for name,digest in validation['logs'].items():assert sha((r/'validation'/name).read_bytes())==digest
result={'status':'PASS','native_source_receipts':len(seen),'earned_moments':14,'initial_wrong_variant_frames':12,'superseded_selector_frames':56,'final_frames':56,'unchanged_art_bytes':True,'controlled_checks':341,'context_loss_restore':True,'full_Watch_UI_acceptance':False}
(r/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
