#!/usr/bin/env python3
"""Losslessly deduplicate captured public responses; never runs a game process."""
import gzip,hashlib,json,os
from functools import lru_cache
from pathlib import Path
ROOT=Path(__file__).resolve().parent
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def decode(value):
 if isinstance(value,str):
  try:return json.loads(value)
  except ValueError:pass
 return value

def reconstruct(archive,key):
 rows=[]
 for r in archive['records'][key]['rows']:
  raw=r['prefix']+archive['payloads'][r['payload']]+r['suffix']
  value=json.loads(raw).get('r')
  rows.append({'request':archive['requests'][r['request']],'rawResponse':raw,'decoded':decode(value)})
 return rows

@lru_cache(maxsize=1)
def compact_data():
 return json.loads(gzip.decompress((ROOT/'responses.compact.json.gz').read_bytes()))

def load_rows(directory,side):
 raw=directory/(side+'.raw.json.gz')
 if raw.exists() and os.environ.get("CUT253_COMPACT")!="1":return json.loads(gzip.decompress(raw.read_bytes()))
 return reconstruct(compact_data(),directory.name+'/'+side)

def main():
 out=ROOT/'responses.compact.json.gz';assert not out.exists(),'refuse overwrite'
 data={'format':'cut253-public-response-content-addressed-v1','scope':'Exact rawResponse prefix/payload/suffix, original request and deterministically parsed decoded value; no removed fields or timing normalization.','requests':{},'payloads':{},'records':{}}
 originals={}
 for p in sorted(ROOT.glob('*-v*/[on]*.raw.json.gz')):
  original=p.read_bytes();rows=json.loads(gzip.decompress(original));key=p.parent.name+'/'+p.name.split('.')[0];entries=[]
  for row in rows:
   req=json.dumps(row['request'],separators=(',',':'),ensure_ascii=False);request_key=sha(req.encode());data['requests'].setdefault(request_key,row['request'])
   raw=row['rawResponse'];start=raw.index('"r":')+4;_,end=json.JSONDecoder().raw_decode(raw[start:]);payload=raw[start:start+end];payload_key=sha(payload.encode());data['payloads'].setdefault(payload_key,payload)
   entries.append({'request':request_key,'prefix':raw[:start],'payload':payload_key,'suffix':raw[start+end:]})
  data['records'][key]={'originalGzipSha256':sha(original),'originalGzipBytes':len(original),'rows':entries};originals[key]=original
 packed=gzip.compress(json.dumps(data,separators=(',',':'),ensure_ascii=False).encode(),mtime=0);out.write_bytes(packed)
 reloaded=json.loads(gzip.decompress(packed));validated=[]
 for key,original in originals.items():
  raw=(json.dumps(reconstruct(reloaded,key),indent=2,ensure_ascii=False)+'\n').encode();encoded=gzip.compress(raw,mtime=0);assert encoded==original,key
  validated.append({'record':key,'originalGzipSha256':sha(original),'reconstructedGzipSha256':sha(encoded),'exact':True})
 result={'date':'2026-10-16','format':data['format'],'compactSha256':sha(packed),'compactBytes':len(packed),'originalBytes':sum(len(v) for v in originals.values()),'recordCount':len(validated),'uniquePayloadCount':len(data['payloads']),'allOriginalGzipBytesExactlyReconstructed':True,'validated':validated}
 (ROOT/'archive-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='validated'}))
if __name__=='__main__':main()
