#!/usr/bin/env python3
"""Independent rational reconstruction of completed planned looks; no simulation."""
import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path
import statistics
import sys

root=Path(sys.argv[2])if len(sys.argv)>2 else Path('docs/evidence/cut312');out=Path(sys.argv[1])if len(sys.argv)>1 else Path('target/cut312/study')
load=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
specraw=(root/'spec.json').read_bytes();spec=json.loads(specraw);specdigest=hashlib.sha256(specraw).hexdigest()
frozen=load(root/'frozen-identity.json')
for p,h in frozen['files'].items():assert sha(Path(p))==h,p
assert len(spec['seeds'])==len(set(spec['seeds']))==32
assert not set(spec['seeds'])&set(spec['excluded']) and all(int(seed)>10000 for seed in spec['seeds'])
coupling=Fraction(32*(10001+len(spec['excluded']))+math.comb(32,2),2**64)
assert coupling<Fraction.from_float(spec['coupling_reserve'])
manifest=load(out/'manifest.json');assert manifest['identity']['specSha256']==specdigest
for name,h in manifest['identity']['code'].items():assert sha(Path(name))==h,name
roles={role:{}for role in spec['runtimes']}
receipts=[]
for p in sorted((out/'packets').glob('*.receipt.json')):
 r=load(p);role=r['role'];assert r['nativeExit']==0
 assert (r['start'],r['end'])in[(0,32)]
 assert r['mode']==spec['runtimes'][role]['mode']
 assert r['runtimeSha256']==spec['runtimes'][role]['sha256'] and r['specSha256']==specdigest
 packet=out/'packets'/r['packet'];assert sha(packet)==r['packetSha256'];native=load(packet)
 seeds=spec['seeds'][r['start']:r['end']]
 expectedkeys=[hashlib.sha256((r['runtimeSha256']+'\0'+r['mode']+'\0'+seed+'\0'+specdigest).encode()).hexdigest()for seed in seeds]
 assert r['jobKeys']==expectedkeys
 assert native['kind']=='dayplayer-stat-probe' and native['schema']==1
 assert native['request']=={'seeds':sorted(seeds,key=int),'bots':['PICKED','TUNED'],'days':14,'until_depth':33,'checkins_per_day':3}
 assert native['pen_policy']==r['mode']
 assert native['balance']==spec['expected_balance']
 assert native['milestones']==[8,13,18,23,28,29,33]
 assert len(native['records'])==len(seeds)*2
 for record in native['records']:
  seed=record['seed'];bot=record['bot'];assert seed in seeds and bot in ['PICKED','TUNED']
  assert str(record['seed_out']['seed'])==seed,'raw integer identity lost'
  key=(seed,bot);assert key not in roles[role];roles[role][key]=record
 receipts.append(r)

def arrival(role,seed,bot,depth):
 r=roles[role][seed,bot];h=r['seed_out']['hours'][[8,13,18,23,28,29,33].index(depth)]
 return (Fraction(h if h is not None else spec['cap_hours']),h is None)

def close(value,wanted):
 if wanted in (math.inf,-math.inf):assert value==('Infinity'if wanted>0 else'-Infinity')
 else:assert abs(Fraction(str(value))-wanted)<Fraction(1,10**12),(value,wanted)

looks=[]
for n in spec['looks']:
 path=out/f'look-{n}.json'
 if not path.exists():break
 report=load(path);assert report['n']==n and len(report['claims'])==5
 expectedalpha=(spec['family_alpha']-spec['coupling_reserve'])/5
 assert report['alphaPerClaimLook']==expectedalpha
 assert 5*Fraction.from_float(expectedalpha)+coupling<Fraction(1,20)
 rank=0;count=0
 for j in range((n+1)//2):
  count+=math.comb(n,j)
  if Fraction(count,2**n)>Fraction.from_float(expectedalpha/2):break
  rank=j+1
 statuses=[]
 for config,claim in zip(spec['claims'],report['claims']):
  for k,v in config.items():assert claim[k]==v
  samples=[];censoredcandidate=0;censoredbase=0
  for seed in spec['seeds'][:n]:
   if config['comparison']=='candidate-ratio':
    a,ca=arrival('candidate',seed,'PICKED',33);b,cb=arrival('candidate',seed,'TUNED',33);value=a/b;cc=ca or cb;bc=False
   else:
    a,cc=arrival('candidate',seed,config['bot'],config['depth']);b,bc=arrival('shipping',seed,config['bot'],config['depth']);value=a-b
   samples.append(value);censoredcandidate+=cc;censoredbase+=bc
  assert claim['n']==n and claim['rank']==rank and claim['alpha']==expectedalpha
  assert claim['candidateCensored']==censoredcandidate and claim['baselineCensored']==censoredbase
  assert [s['seed']for s in claim['samples']]==spec['seeds'][:n]
  for recorded,value in zip(claim['samples'],samples):close(recorded['value'],value)
  ordered=sorted(samples);lower=ordered[rank-1]if rank else-math.inf;upper=ordered[n-rank]if rank else math.inf
  close(claim['estimate'],statistics.median(samples));close(claim['lower'],lower);close(claim['upper'],upper)
  threshold=Fraction(str(config['threshold']))
  if config['direction']=='at-most':status='PASS'if upper<=threshold else'FAIL'if lower>threshold else'INCONCLUSIVE'
  else:status='PASS'if lower>=threshold else'FAIL'if upper<threshold else'INCONCLUSIVE'
  assert status==claim['status'];statuses.append(status)
  # Independent exact tail coverage at the chosen rank.
  if rank:assert Fraction(2*sum(math.comb(n,k)for k in range(rank)),2**n)<=Fraction.from_float(expectedalpha)
 d33censored=sum(roles[role][seed,bot]['depth_reached_hours']is None for role in roles for seed in spec['seeds'][:n]for bot in ['PICKED','TUNED'])
 assert d33censored==report['d33Censored']
 hard=[]
 for seed in spec['seeds'][:n]:
  original=lambda record:{k:v for k,v in record.items()if k!='elapsed_seconds'}
  if original(roles['shipping'][seed,'PICKED'])!=original(roles['candidate'][seed,'PICKED']):hard.append({'seed':seed,'kind':'picked-record-parity'})
  for depth in [13,18]:
   if arrival('shipping',seed,'TUNED',depth)[0]!=arrival('candidate',seed,'TUNED',depth)[0]:hard.append({'seed':seed,'kind':'early-tuned-arrival','depth':depth})
  for bot in ['PICKED','TUNED']:
   before=roles['shipping'][seed,bot]['seed_out'];after=roles['candidate'][seed,bot]['seed_out']
   if before['unconserved']!=0 or after['unconserved']!=0:hard.append({'seed':seed,'bot':bot,'kind':'unconserved'})
   if after['king_day']is not None and(before['king_day']is None or after['king_day']<before['king_day']):hard.append({'seed':seed,'bot':bot,'kind':'earlier-observed-king'})
 assert hard==report['hardFailures']
 status='INCONCLUSIVE'
 if 'FAIL'in statuses:status='STATISTICALLY_REJECTED'
 elif all(s=='PASS'for s in statuses):status='HARD_CHECK_FAILED'if hard else'ACCEPTED_BUT_CENSORED'if d33censored else'STATISTICALLY_ACCEPTED'
 assert report['status']==status and not report['defaultAdoption'] and report['canonicalGateStatus']=='NOT_RUN'
 looks.append({'n':n,'status':status,'rank':rank,'censored':d33censored,'claims':statuses})
 if status!='INCONCLUSIVE':break
assert looks,'no completed fixed look to verify'
print(json.dumps({'status':'PASS_INDEPENDENT_RATIONAL_VERIFICATION','looks':looks,'paired_mode_receipts':len(receipts),'default_adoption':False,'scope':'Only fixed-look capped population-median study, no canonical/full/fun acceptance'}))
