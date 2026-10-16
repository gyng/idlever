import pathlib,tarfile,gzip,hashlib,json,io
p=pathlib.Path(__file__).resolve().parent;dirs=['attempt-1','attempt-2','attempt-3','font-supplement-1','locate-diagnostic-1','locate-diagnostic-2','cross-owner-locate-1','source-epochs'];files=sorted(q for d in dirs for q in(p/d).rglob('*')if q.is_file());dest=p/'parking-raw.tar.gz';rows=[];sha=lambda b:hashlib.sha256(b).hexdigest()
with dest.open('wb')as raw,gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0,compresslevel=6)as gz,tarfile.open(fileobj=gz,mode='w|',format=tarfile.PAX_FORMAT)as tar:
 for q in files:
  b=q.read_bytes();name=str(q.relative_to(p));rows.append({'path':name,'bytes':len(b),'sha256':sha(b)});t=tar.gettarinfo(str(q),arcname=name);t.mtime=t.uid=t.gid=0;t.uname=t.gname='';tar.addfile(t,io.BytesIO(b))
by={x['path']:x for x in rows};seen=set()
with tarfile.open(dest,'r:gz')as tar:
 for t in tar:
  b=tar.extractfile(t).read();assert sha(b)==by[t.name]['sha256']and len(b)==by[t.name]['bytes'];seen.add(t.name)
assert seen==by.keys()
o={'archive':dest.name,'sha256':sha(dest.read_bytes()),'bytes':dest.stat().st_size,'raw_bytes':sum(x['bytes']for x in rows),'all_extracted_members_exact':True,'raw_retained':True,'members':rows};(p/'parking-raw-inventory.json').write_text(json.dumps(o,indent=2)+'\n');print(len(rows),o['raw_bytes'],o['bytes'])
