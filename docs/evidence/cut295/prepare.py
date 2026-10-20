from pathlib import Path
import json,gzip,hashlib
r=Path('docs/evidence/cut295');t=Path('target/cut295');selection=json.loads(Path('docs/evidence/cut293/selection.json').read_text());results=json.loads(Path('docs/evidence/cut293/results.json').read_text());moments=json.loads(Path('docs/evidence/cut294/moments.json').read_text());rows=[]
for item in results:
 c=next(c for c in moments['cases'] if c['id']==item['case']);src=Path('target/cut293')/item['dir'];save=(src/'absence-after.json').read_bytes();replay=(src/'replay.json').read_bytes();ss=json.loads(save);assert ss.get('run') is None and 'scout' in ss['lineage']['tree']['paused']
 cls,weapon,policy=next(x for x in selection['cases'] if '-'.join(x)==item['case']);weapons={'fighter':['sword','crownsplitter'],'rogue':['dagger','crownsplitter'],'ranger':['bow','sword'],'caster':['dagger','bow'],'gunner':['long_gun','short_gun']}[cls];other=next(w for w in weapons if w!=weapon)
 (t/(item['case']+'.input.json')).write_bytes(save)
 rows.append({'id':item['case'],'class':cls,'weapon':weapon,'nextWeapon':other,'inputPath':str(src/'absence-after.json'),'inputSha256':hashlib.sha256(save).hexdigest(),'replayPath':str(src/'replay.json'),'replaySha256':hashlib.sha256(replay).hexdigest(),'nativeReplayHash':json.loads(replay)['hash'],'runId':json.loads(replay)['run_id'],'moment':c})
(r/'selection.json').write_text(json.dumps({'cases':rows},separators=(',',':'))+'\n');print(len(rows))
