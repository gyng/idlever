#!/usr/bin/env python3
"""Synthetic CLI tests only. No native gameplay/confirmation observations."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

source=json.loads(Path('docs/evidence/cut300/spec.json').read_text())
with tempfile.TemporaryDirectory(prefix='idlever-cut300-fixture-')as temp:
 root=Path(temp);spec=copy.deepcopy(source);spec['seeds']=[str(2**63+i)for i in range(32)]
 for role in ('shipping','candidate'):
  path=root/role
  path.write_text('''#!/usr/bin/env python3
import json,sys
from pathlib import Path
args=dict(zip(sys.argv[1::2],sys.argv[2::2]));role=Path(__file__).name
seeds=args['--seeds'].split(',');bots=args['--bots'].split(',')
rows=[]
for seed in seeds:
 for bot in bots:
  h=32 if role=='candidate'and bot=='TUNED'else48
  rows.append({'seed':seed,'bot':bot,'stop_reason':'depth','effective_checkins_per_day':3,'observed_hours':h,'best_depth':33,'depth_reached_hours':h,'seed_out':{'seed':int(seed),'hours':[8,8,16,24,32,32,h]}})
  print('stat_probe fixture completed',file=sys.stderr)
packet={'schema':1,'kind':'dayplayer-stat-probe','request':{'seeds':seeds,'bots':bots,'days':int(args['--days']),'until_depth':int(args['--until-depth']),'checkins_per_day':int(args['--checkins'])},'balance':BALANCE,'milestones':[8,13,18,23,28,29,33],'records':rows}
with open(args['--out'],'x')as f:json.dump(packet,f)
with (Path(__file__).parent/'calls.jsonl').open('a')as f:f.write(json.dumps({'role':role,'seeds':seeds})+'\\n')
'''.replace("else48","else 48").replace('BALANCE',repr(spec['expected_balance'])))
  path.chmod(0o700);spec['runtimes'][role]={'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 specfile=root/'spec.json';specfile.write_text(json.dumps(spec));out=root/'study'
 command=['python3','docs/evidence/cut300/collect.py',str(out),str(specfile)]
 result=subprocess.run(command,capture_output=True,text=True);assert result.returncode==0,result.stdout+result.stderr
 report=json.loads((out/'look-16.json').read_text());assert report['status']=='STATISTICALLY_ACCEPTED'
 assert not (out/'look-32.json').exists()
 assert len((root/'calls.jsonl').read_text().splitlines())==2
 result=subprocess.run(command,capture_output=True,text=True);assert result.returncode==0,result.stdout+result.stderr
 assert len((root/'calls.jsonl').read_text().splitlines())==2,'resume reran a completed packet'
 saved=(out/'look-16.json').read_text();bad=json.loads(saved);bad['status']='STATISTICALLY_REJECTED';(out/'look-16.json').write_text(json.dumps(bad))
 result=subprocess.run(command,capture_output=True,text=True);assert result.returncode!=0,'trusted a modified cached verdict'
 (out/'look-16.json').write_text(saved)
 p=root/'candidate';p.write_text(p.read_text()+'\n# changed executable\n')
 result=subprocess.run(command,capture_output=True,text=True);assert result.returncode!=0,'trusted changed runtime identity'
 assert len((root/'calls.jsonl').read_text().splitlines())==2
 print(json.dumps({'status':'PASS_SYNTHETIC_ONLY','checks':['paired runtime dispatch','lossless high-u64 packets','fixed-look stop','completed-batch resume','tampered-verdict rejection','changed-runtime rejection'],'native_gameplay_observations':0}))
