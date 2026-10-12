from pathlib import Path
import hashlib,zlib,json,os,datetime,shutil
root=Path('/home/g/p/riddle');git=root/'.git';out=root/'scratchpad/cut179/restart-recovery';expected=(git/'refs/heads/main').read_text().strip()
empty={p.parent.name+p.name:p for d in (git/'objects').iterdir() if d.is_dir() and len(d.name)==2 for p in d.iterdir() if p.is_file() and p.stat().st_size==0}
objects={};paths={};tree={}
def obj(kind,data):
 raw=kind.encode()+b' '+str(len(data)).encode()+b'\0'+data;key=hashlib.sha1(raw).hexdigest();objects[key]=raw;return key
for line in (root/'scratchpad/cut179/index-after-restart.bin').read_bytes().split(b'\0'):
 if not line:continue
 info,name=line.split(b'\t',1);mode,key,stage=info.decode().split();assert stage=='0';path=os.fsdecode(name)
 if key in empty:
  p=root/path;data=os.fsencode(os.readlink(p)) if mode=='120000' else p.read_bytes();assert obj('blob',data)==key,('Worktree no longer has exact missing blob',path);paths[key]=path
 parent=tree
 for part in path.split('/')[:-1]:parent=parent.setdefault(part,{})
 parent[path.split('/')[-1]]=(mode,key)
def build(node):
 entries=[]
 for name,value in node.items():
  directory=isinstance(value,dict);mode,key=('40000',build(value)) if directory else value
  entries.append((os.fsencode(name)+(b'/' if directory else b''),mode.encode()+b' '+os.fsencode(name)+b'\0'+bytes.fromhex(key)))
 return obj('tree',b''.join(raw for _,raw in sorted(entries)))
root_tree=build(tree);msg=(git/'COMMIT_EDITMSG').read_bytes();assert msg.endswith(b'\n')
when=int((git/'refs/heads/main').stat().st_mtime);found=None
for stamp in range(when-3,when+4):
 data=(f'tree {root_tree}\nparent b60d282a675ad6044b002996d5f057344a38c0f4\nauthor Ng Guoyou <gyng@users.noreply.github.com> {stamp} +0800\ncommitter Ng Guoyou <gyng@users.noreply.github.com> {stamp} +0800\n\n').encode()+msg
 key=obj('commit',data)
 if key==expected:found=stamp;break
assert found is not None,'Exact missing commit hash could not be reconstructed; no Git objects written'
assert set(empty)<=set(objects),('Missing objects unavailable from exact index/worktree',set(empty)-set(objects))
report={'scope':'Exact cryptographic reconstruction of20 empty Git objects after runtime restart; no worktree,index,refs or history rewrite','head':expected,'tree':root_tree,'commitTimestamp':found,'emptyObjects':sorted(empty),'blobPaths':paths,'all20ExactHashesVerified':True,'written':False}
(out/'dry-run.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'head':expected,'tree':root_tree,'objects':len(empty),'allExactHashesVerified':True,'written':False}))
if '--write' in __import__('sys').argv:
 backup=out/'original-git-metadata';backup.mkdir(exist_ok=False)
 for rel in ['HEAD','refs/heads/main','COMMIT_EDITMSG','index','logs/HEAD','logs/refs/heads/main']:
  p=git/rel
  if p.exists():target=backup/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
 for key,p in empty.items():
  target=backup/'empty-objects'/key;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
  assert p.stat().st_size==0 and hashlib.sha1(objects[key]).hexdigest()==key
  tmp=p.with_name(p.name+'.recovery');fd=os.open(tmp,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o444)
  with os.fdopen(fd,'wb') as f:f.write(zlib.compress(objects[key]));f.flush();os.fsync(f.fileno())
  os.replace(tmp,p)
 report['written']=True;(out/'restoration.json').write_text(json.dumps(report,indent=2)+'\n');print('Restored exactly20 hash-verified objects; HEAD/index/worktree unchanged')
