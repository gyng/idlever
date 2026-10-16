"""Lossless per-case archival; hashes every raw member and verifies extracted bytes."""
import pathlib,json,hashlib,tarfile,gzip,time
p=pathlib.Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
terminal=json.loads((p/'terminal.json').read_text());out=p/'raw-archives';out.mkdir(exist_ok=True);items=[]
for name in terminal['cases']:
 d=p/name;files=sorted(x for x in d.rglob('*')if x.is_file());members=[];archive=out/(name+'.tar.gz')
 with archive.open('wb')as raw,gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0,compresslevel=6)as gz,tarfile.open(fileobj=gz,mode='w|',format=tarfile.PAX_FORMAT)as tar:
  for f in files:
   b=f.read_bytes();members.append({'path':str(f.relative_to(p)),'bytes':len(b),'sha256':sha(b)})
   info=tar.gettarinfo(str(f),arcname=str(f.relative_to(p)));info.mtime=0;info.uid=info.gid=0;info.uname=info.gname=''
   import io
   tar.addfile(info,io.BytesIO(b))
 by={x['path']:x for x in members};seen=set()
 with tarfile.open(archive,'r:gz')as tar:
  for f in tar:
   b=tar.extractfile(f).read();assert len(b)==by[f.name]['bytes']and sha(b)==by[f.name]['sha256'];seen.add(f.name)
 assert seen==by.keys()
 items.append({'case':name,'archive':str(archive.relative_to(p)),'bytes':archive.stat().st_size,'sha256':sha(archive.read_bytes()),'extracted_members_exact':True,'members':members})
 (p/'raw-inventory.json').write_text(json.dumps({'complete':False,'archives':items},indent=2)+'\n')
 print(name,len(files),sum(x['bytes']for x in members),archive.stat().st_size,flush=True)
(p/'raw-inventory.json').write_text(json.dumps({'complete':True,'raw_retained':True,'archives':items,'raw_bytes':sum(m['bytes']for a in items for m in a['members']),'archive_bytes':sum(a['bytes']for a in items),'all_extracted_members_exact':True},indent=2)+'\n')
