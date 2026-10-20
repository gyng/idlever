from pathlib import Path
import hashlib,json
r=Path('docs/evidence/cut294');source=Path('docs/evidence/cut293/results.json');results=json.loads(source.read_text());cases=[]
for c in results:
 d=Path('target/cut293')/c['dir'];p=d/'replay.json';raw=p.read_bytes();replay=json.loads(raw);preferred='cleave' if c['case'].startswith('fighter') and c['case'].endswith('authored') else 'bolt' if c['case'].startswith('caster') and c['case'].endswith('authored') else None
 chosen=None
 for floor in replay['floors']:
  hero=floor['snapshot']['hero'];deaths=[e for e in floor['events'] if e['k']=='die']
  for event in floor['events']:
   if event['k']!='attack' or event['src']!=hero['id'] or not event['hit'] or (preferred and event.get('verb')!=preferred):continue
   if any(e['id']==event['dst'] and e['t']<=event['t']+2 for e in deaths):continue
   chosen=(floor,event);break
  if chosen:break
 assert chosen,c['case'];floor,event=chosen;ready=json.loads((d/'ready-save.json').read_bytes());look=ready['lineage'].get('look','')
 cases.append({'id':c['case'],'source_path':str(p),'source_sha256':hashlib.sha256(raw).hexdigest(),'look':look,'actual_weapon':floor['snapshot']['hero'].get('weapon'),'floor':floor,'event':event,'target':event['t']+2})
(r/'moments.json').write_text(json.dumps({'source_results_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'cases':cases},separators=(',',':'))+'\n');print([(c['id'],c['actual_weapon'],c['event']['verb'],c['event']['t']) for c in cases])
