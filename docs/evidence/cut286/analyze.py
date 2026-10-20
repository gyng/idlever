import json,pathlib,collections
root=pathlib.Path('target/cut286');out=[];comparisons=[]
for seed in [1,2]:
 for depth,cards in [(9,['baseline','gas_step','pack_break']),(14,['baseline','boss_focus','corridor_fighting']),(19,['baseline','reflect_read','corridor_fighting'])]:
  sends=[]
  for card in cards:
   p=root/f'trace-s{seed}-d{depth}-{card}';s=json.loads((p/'send.json').read_text());sends.append(s)
   frames=json.loads((p/'frames.json').read_text());c=collections.Counter();examples={};damage=collections.Counter()
   for f in frames:
    b=f['before'];d=(b or {}).get('depth');scope='first' if d==depth else 'later'
    for e in f['events']:
     kind=None
     if e.get('k')=='hurt' and e.get('id')==1:damage[scope+'/'+e.get('cause','unknown')]+=e.get('dmg',0)
     if e.get('k')=='overlay' and e.get('ov')=='gas':kind='gas'
     if e.get('k')=='max_hp' and e.get('cause')=='drain':kind='drain'
     if e.get('k')=='attack' and e.get('verb')=='reflect' and e.get('dst')==1:kind='hero_reflection'
     if e.get('k')=='callout' and e.get('text')=='armours':kind='support'
     if e.get('k')=='spawn' and 'skeleton' in str(e):kind='skeleton_spawn_unattributed'
     if kind:c[scope+'/'+kind]+=1;examples.setdefault(scope+'/'+kind,{'depth':d,'event':e})
   summary=json.loads((p/'summary.json').read_text());out.append({'case':p.name,'start':depth,'counts':dict(c),'examples':examples,'hero_damage':dict(damage),'last_run':summary['last_run']})
  checks={key:all(sends[0]['run'].get(key)==other['run'].get(key) for other in sends[1:]) for key in ['floor','monsters','rng','seed','id','route','hero']}
  comparisons.append({'seed':seed,'start':depth,'identical_send':checks})
(root/'discovery.json').write_text(json.dumps({'cases':out,'comparisons':comparisons},indent=2)+'\n')
for c in out:
 if c['case'].endswith('baseline'):print(c['case'],c['counts'])
print('send comparisons',comparisons)
