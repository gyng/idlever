"""Amend only the inspected reason reclassification; all other fields exact."""
import gzip,json,hashlib
from pathlib import Path
r=Path('docs/evidence/cut291');p=r/'settlements-inputs-fb23.json';m=json.loads(p.read_text());out=Path('target/cut291/settlements-out');changes=[]
for e in m['entries']:
 raw=(out/(e['id']+'.after.session.json')).read_bytes();old=gzip.decompress(Path(e['afterHome']).read_bytes());a=json.loads(old);b=json.loads(raw)
 assert json.loads((out/(e['id']+'.expected.json')).read_text())==e['expected']
 if a!=b:
  assert e['id']=='multihero-absence'
  blocked=b['lineage']['row_stats'][8][1]['blocked'];assert blocked['not learned']==90 and blocked['no line']==273
  blocked.pop('not learned');blocked['no line']=363;assert a==b
  changes.append({'id':e['id'],'path':'$.lineage.row_stats[8][1].blocked','before':{'no line':363},'after':{'no line':273,'not learned':90},'all_other_fields_exact':True})
  dest=r/'settlements'/f"{e['id']}.after.session.json.gz";dest.parent.mkdir(exist_ok=True);gz=gzip.compress(raw,compresslevel=9,mtime=0);dest.write_bytes(gz);e.update(afterHome=str(dest),afterRawSha256=hashlib.sha256(raw).hexdigest(),afterHomeSha256=hashlib.sha256(gz).hexdigest())
 else:changes.append({'id':e['id'],'complete_save_unchanged':True})
(r/'settlement-reason-diff.json').write_text(json.dumps(changes,indent=2)+'\n');p.write_text(json.dumps(m,indent=2)+'\n');print(json.dumps(changes))
f=Path('web/tests/gold-settlements.mjs');s=f.read_text().replace('// Current package: Cut284','// Current package: Cut291 Throw refusal fast WASM (fb23): native Gold/ledger/ExitLine and expected unchanged 4/4; one after-save amended only for inspected blocked-reason keys (363 = 273 + 90); four earned native/WASM prefixes match complete saves/events. Earlier: Cut284');f.write_text(s)
