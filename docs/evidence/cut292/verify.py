"""Independent retained input/save/wire and browser outcome checks."""
from pathlib import Path
import gzip,json,hashlib
r=Path('docs/evidence/cut292');sha=lambda b:hashlib.sha256(b).hexdigest();load=lambda p:json.loads(p.read_bytes())
identity=load(r/'identity.json');native=load(r/'native-results.json');wasm=load(r/'wasm-results.json');browser=load(r/'browser/results.json')
for name,digest in identity['evidence_sources'].items():assert sha((r/name).read_bytes())==digest
assert len(native)==len(wasm['cases'])==4 and wasm['wasm']==identity['wasm']
for n,w in zip(native,wasm['cases']):
 name=n['case'];assert name==w['label'] and n['exit']==0
 source=gzip.decompress(Path('docs/evidence/cut291/wasm/'+name+'-input.json.gz').read_bytes())
 saved=gzip.decompress((r/(name+'-native-save.json.gz')).read_bytes());assert source==saved
 assert sha(source)==n['input_sha256']==n['after_sha256']==w['inputSha256']==w['saveSha256']
 p=next(x for x in load(r/(name+'-packages.json'))['all'] if x['id']=='gas_step');needs=p.get('variant_needs',[])
 assert needs==n['variant_needs']==w['variantNeeds']==(['','Learn Throw'] if name.endswith('locked') else [])
 for x in load(r/(name+'-packages.json'))['all']:
  if x['id']!='gas_step':assert not x.get('variant_needs')
 assert all(len(h.split())<=3 for h in needs)
assert browser['status']=='PASS' and browser['errors']==[] and len(browser['cases'])==2
assert browser['sourceSha256']==native[0]['input_sha256'] and browser['wasmSha256']==identity['wasm']['sha256']
assert len(browser['served'])>=2 and all(s==browser['wasmSha256'] for s in browser['served'])
for c in browser['cases']:
 assert c['horizontalOverflow'] is False and c['textScale']==1 and c['captureKind']=='visible viewport'
 assert c['locked']['owned'] is False and c['initial']['marks']==c['locked']['marks']
 assert c['initial']['marks']==json.loads(gzip.decompress(Path('docs/evidence/cut291/wasm/gas-locked-input.json.gz').read_bytes()))['lineage']['marks']
 assert c['purchase']['before']-c['purchase']['after']==3 and c['purchase']['owned'] and c['purchase']['variant']==1
 for phase in ['locked','learned']:assert (r/'browser'/f"{c['name']}-{phase}.png").stat().st_size>10000
assert browser['cases'][0]['viewport']=={'width':402,'height':681}
manifest=load(r/'settlements-inputs-fdd9.json');old=load(Path('docs/evidence/cut291/settlements-inputs-fb23.json'))
assert manifest['wasm']==identity['wasm']
assert manifest['entries']==old['entries']
for e in manifest['entries']:
 gz=Path(e['afterHome']).read_bytes();raw=gzip.decompress(gz)
 assert sha(gz)==e['afterHomeSha256'] and sha(raw)==e['afterRawSha256']
result={'status':'PASS','earned_read_only_pairs':4,'native_wasm_whole_save_pairs':4,'browser_real_purchases':2,'visible_viewport_captures':4,'wrong_variant_hints':0}
(r/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
