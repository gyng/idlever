import pathlib,hashlib,json,tarfile,gzip,io
p=pathlib.Path(__file__).resolve().parent;d=p/'fighter5-continuation';archive=p/'fighter5-continuation.tar.gz';rows=[]
sha=lambda b:hashlib.sha256(b).hexdigest()
with archive.open('wb')as raw,gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0,compresslevel=6)as gz,tarfile.open(fileobj=gz,mode='w|',format=tarfile.PAX_FORMAT)as tar:
 for f in sorted(x for x in d.rglob('*')if x.is_file()):
  b=f.read_bytes();name=str(f.relative_to(p));rows.append({'path':name,'bytes':len(b),'sha256':sha(b)});t=tar.gettarinfo(str(f),arcname=name);t.mtime=t.uid=t.gid=0;t.uname=t.gname='';tar.addfile(t,io.BytesIO(b))
by={x['path']:x for x in rows};seen=set()
with tarfile.open(archive,'r:gz')as tar:
 for t in tar:
  b=tar.extractfile(t).read();assert len(b)==by[t.name]['bytes']and sha(b)==by[t.name]['sha256'];seen.add(t.name)
assert seen==by.keys()
o={'archive':str(archive.relative_to(p)),'sha256':sha(archive.read_bytes()),'bytes':archive.stat().st_size,'raw_bytes':sum(x['bytes']for x in rows),'members':rows,'all_extracted_members_exact':True,'raw_retained':True};(p/'raw-inventory.json').write_text(json.dumps(o,indent=2)+'\n');print(json.dumps({k:o[k]for k in ['archive','bytes','raw_bytes','all_extracted_members_exact']}))
