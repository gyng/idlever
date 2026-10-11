import json, pathlib, hashlib, datetime, collections
OUT=pathlib.Path('eval/cohorts/d34605e-diagnostic'); out={'scope':'locked raw cards and archived public-operation interval audit, no raw mutations','raters':{}}
def stamp(s):
 if s.endswith(' UTC'):return datetime.datetime.strptime(s,'%Y-%m-%d %H:%M:%S UTC').replace(tzinfo=datetime.timezone.utc)
 return datetime.datetime.fromisoformat(s.replace('Z','+00:00'))
def iv(x):return stamp(x.get('start',x.get('startUtc'))),stamp(x.get('end',x.get('endUtc')))
def duration(x):a,b=iv(x);return (b-a).total_seconds()
def overlap(x,y):a,b=iv(x);c,d=iv(y);return max(0,(min(b,d)-max(a,c)).total_seconds())
manifest={}
for who in 'ab':
 root=pathlib.Path(f'scratchpad/d34605e-blind-{who}');card=json.loads((pathlib.Path('eval/cards')/f'd34605e.blind-{who}.json').read_text());h=card['horizon']
 for p in root.rglob('*'):
  if p.is_file():manifest[str(p)]={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}
 ops=[json.loads(p.read_text()) for p in (root/'relay').glob('*.json')]
 for ln in (root/'operations.jsonl').read_text().splitlines():
  try:ops.append(json.loads(ln))
  except json.JSONDecodeError:pass
 credited=h['activeIntervals'] if who=='a' else [x for p in h['activePhases'] for x in p['creditedIntervals']]
 credited=sorted(credited,key=lambda x:iv(x)[0]);issues=[]
 for x in credited:
  if duration(x)<=0:issues.append('nonpositive credit')
 for x,y in zip(credited,credited[1:]):
  if overlap(x,y)>0:issues.append('overlapping credits')
 collisions=[]
 for op in ops:
  for x in credited:
   n=overlap(x,op)
   if n>0.001:collisions.append({'creditStart':x['start'],'opStart':op.get('startUtc',op.get('start')),'seconds':n,'op':op.get('cmd',op.get('op'))})
 phases=collections.defaultdict(float)
 if who=='a':
  for x in credited:phases[x['phase']]+=duration(x)
  claimed=h['phaseActiveMinutes']
  excluded=h['excludedIntervals']
 else:
  for name,p in zip(['cold','return20m','return4h','return8h'],h['activePhases']):phases[name]=sum(duration(x) for x in p['creditedIntervals'])
  claimed={name:p['activeMinutes'] for name,p in zip(['cold','return20m','return4h','return8h'],h['activePhases'])}
  excluded=[x for p in h['activePhases'] for x in p['excludedIntervals']]
 excludedCollision=sum(overlap(x,y) for x in credited for y in excluded)
 mins={k:v/60 for k,v in phases.items()};requirements={'cold':40,'return20m':5,'return4h':5,'return8h':20}
 criterion=json.loads((root/'criterion-before-axes.json').read_text());probes=json.loads((root/'human-probes-before-awards.json').read_text())
 probevalues=probes.get('probes',probes);cp=criterion.get('criterion',criterion)
 criterionmatch=all(cp.get(k)==v for k,v in card['criterion'].items())
 probematch=all(probevalues.get(k)==v for k,v in card['humanProbes'].items())
 for f in ['criterion-before-axes.json','human-probes-before-awards.json','operations.jsonl']:
  (OUT/'evidence'/f'{who}-{f}').write_bytes((root/f).read_bytes())
 out['raters'][who]={'calculatedPhaseMinutes':mins,'claimedPhaseMinutes':claimed,'arithmeticMatches':all(abs(mins[k]-v)<1e-6 for k,v in claimed.items()),'calculatedTotalMinutes':sum(phases.values())/60,'phaseRequirementsMet':{k:mins[k]>=v for k,v in requirements.items()},'creditCount':len(credited),'archivedOperationCountIncludingDuplicates':len(ops),'intervalIssues':issues,'creditedOverlapWithExcludedSeconds':excludedCollision,'creditedOverlapWithArchivedOperations':collisions,'criterionArchiveMatches':criterionmatch,'probeArchiveMatches':probematch,'axes16':len(card['axes'])==16,'everyAxisHasQuotedProbe':all('“' in x or "'" in x or '"' in x for x in card['humanProbes'].values()),'unmeasuredCapsRemainNA':all(a['bot']=='na' for a in card['axes']),'audioUnassessed':card.get('audio'),'delayedRecallEmpty':card['criterion']['delayedRecall']=='','blindnessViolations':card['blindnessViolations']}
(OUT/'evidence-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'interval-audit.json').write_text(json.dumps(out,indent=2)+'\n')
for who,r in out['raters'].items():print(who,{k:v for k,v in r.items() if k not in ['audioUnassessed','blindnessViolations','creditedOverlapWithArchivedOperations']},'operationOverlapCount',len(r['creditedOverlapWithArchivedOperations']))
