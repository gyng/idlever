"""Independent raw archive/public preparation/observer/outcome reconstruction."""
from pathlib import Path
import hashlib
import json
import subprocess
import tarfile
import tempfile
r=Path('docs/evidence/cut290');m=json.loads((r/'manifest.json').read_text());identity=json.loads((r/'identity.json').read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha((r/'capture.tar.zst').read_bytes())==m['archive_sha256']
for file,key in [('harness.rs','harness_sha256'),('purchase-harness.rs','purchase_harness_sha256'),('frozen-contract.md','contract_sha256'),('followup-contract.md','followup_contract_sha256'),('throw-followup-contract.md','throw_followup_contract_sha256')]:assert sha((r/file).read_bytes())==identity[key]
with tempfile.TemporaryDirectory(prefix='idlever-cut290-verify-') as scratch:
    scratch=Path(scratch);expected={f['path']:f for f in m['files']};seen=set()
    process=subprocess.Popen(['zstd','-q','-dc','--long=27',str(r/'capture.tar.zst')],stdout=subprocess.PIPE)
    try:
        with tarfile.open(fileobj=process.stdout,mode='r|') as tar:
            for member in tar:
                assert member.name in expected and member.name not in seen and not Path(member.name).is_absolute() and '..' not in Path(member.name).parts
                dest=scratch/member.name;dest.parent.mkdir(parents=True,exist_ok=True);f=expected[member.name]
                if member.islnk():
                    assert member.linkname in seen and f['same_bytes_as']==member.linkname and expected[member.linkname]['sha256']==f['sha256'];dest.hardlink_to(scratch/member.linkname)
                else:
                    assert member.isfile();data=tar.extractfile(member).read();assert len(data)==f['bytes'] and sha(data)==f['sha256'];dest.write_bytes(data)
                seen.add(member.name)
    finally:process.stdout.close();code=process.wait()
    assert code==0 and seen==set(expected)
    def raw(name):return (scratch/name).read_bytes()
    def load(name):return json.loads(raw(name))
    def invariant(before,after,keys):
        for key in keys:assert before['lineage'][key]==after['lineage'][key],key
    unchanged=['gold','marks','clock_s','rng','bloodline','party','kennel','seed','kit','forge']
    def measured(case):
        events=load(case+'/events.json');frames=load(case+'/frames.json');parity=load(case+'/observer-parity.json')
        assert parity=={'events':True,'save':True,'event_count':len(events)}
        assert [e for f in frames for e in f['events']]==events
        assert raw(case+'/after.json')==raw(case+'/after-fine.json')==raw(case+'/after-coarse.json')
        es=[e for f in frames if f['before'] and f['before']['depth']==9 for e in f['events']]
        return {'hurt':sum(e.get('dmg',0) for e in es if e['k']=='hurt' and e.get('id')==1),
            'gas':sum(e.get('dmg',0) for e in es if e['k']=='hurt' and e.get('id')==1 and e.get('cause')=='gas'),
            'tick':max(e['t'] for e in es),'fires':sum(e['k']=='use' and 'fire' in e.get('item','') for e in es)}
    results={c['case']:c for c in load('results.json')['cases']};assert len(results)==24
    n=0;actual=[];scene_world={}
    for scene in ['gas','pack']:
        for weapon in ['sword','bow']:
            for fire in [1,3]:
                label=f'{scene}-{weapon}-fire{fire}';prep='loadout-'+label;before=load(prep+'/normalized-input.json');after=load(prep+'/after.json');config=load(label+'-config.json')
                assert sha(raw(prep+'/normalized-input.json'))==identity['parents'][scene]['sha256']
                invariant(before,after,unchanged)
                assert after['lineage']['starting_config']==config
                assert 40<=after['lineage']['pkg']['runs']['gas_step']<120
                assert load(prep+'/actions.json')==[{'command':'set_starting','config':config,'gold_spent':0}]
                offer=next(x for x in load(prep+'/offers-before.json')['weapons'] if x['kind']==weapon)
                assert offer['available'] and offer['compatible']
                assert [i['kind'] for i in after['lineage']['supplies']]==config['supplies']
                reference=None
                for policy in ['baseline','gas0','gas1']:
                    case='trace-'+label+'-'+policy;sent=load(case+'/send.json');chosen=load(case+'/choice-parent.json');run=sent['run']
                    assert load(case+'/normalized-input.json')==after
                    invariant(after,chosen,unchanged)
                    if policy!='baseline':
                        assert chosen['lineage']['pkg']['tactics'][0]=='gas_step'
                        assert chosen['lineage']['pkg'].get('variants',{}).get('gas_step',0)==int(policy[-1])
                    current={k:run.get(k) for k in ['hero','floor','monsters','rng','seed','id','route']}
                    if reference is None:reference=current
                    assert reference==current
                    world={k:run.get(k) for k in ['floor','monsters','rng','seed','id','route']}
                    if scene not in scene_world:scene_world[scene]=world
                    assert scene_world[scene]==world
                    assert run['hero']['weapon']['kind']==weapon
                    assert [i['kind'] for i in run['hero']['inv']]==config['supplies']
                    assert len({i['id'] for i in run['hero']['inv']})==len(run['hero']['inv'])
                    values=measured(case);report=results[case]
                    assert (values['hurt'],values['gas'],values['tick'],values['fires'])==(report['first_floor_hurt'],report['first_floor_gas_hurt'],report['last_initial_floor_event_tick'],report['first_floor_fire_use_count'])
                    assert report['cut289_damage_target_only']==(values['hurt']<=9 and values['gas']<=3)
                    actual.append((weapon,report['cut289_damage_target_only']));n+=1
    assert n==24 and all(ok for weapon,ok in actual if weapon=='bow')
    absences=0
    for scene in ['gas','pack']:
        for weapon in ['sword','bow']:
            parent=load(f'loadout-{scene}-{weapon}-fire1/after.json');common=None
            for policy in ['baseline','gas0']:
                case=f'absence-{scene}-{weapon}-fire1-{policy}';current=load(case+'/common-away-parent.json');chosen=load(case+'/choice-parent.json');after=load(case+'/after.json');report=load(case+'/report.json')
                assert load(case+'/normalized-input.json')==parent
                if common is None:common=current
                assert common==current
                assert load(case+'/actions.json')==[{'command':'set_worker','id':'scout','on':True}]
                invariant(common,chosen,unchanged)
                assert report['elapsed_s']==after['lineage']['clock_s']-common['lineage']['clock_s']==28800
                assert after['lineage']['gold']-common['lineage']['gold']==report['gold']['net']==report['gold']['ledger']['net']
                assert report['gold']['ledger']['earned']-report['gold']['ledger']['spent']==report['gold']['net']
                absences+=1
    throw_results={(c['scene'],c['policy']):c for c in load('throw-results.json')};assert len(throw_results)==4
    for scene in ['gas','pack']:
        purchase='purchase-'+scene+'-throw';before=load(purchase+'/normalized-input.json');after=load(purchase+'/after.json');receipt=load(purchase+'/purchase.json')
        assert before==load(f'loadout-{scene}-sword-fire3/after.json')
        assert receipt=={'ok':True,'id':'throw','marks_spent':3,'gold_spent':0}
        offer=next(x for x in load(purchase+'/offers-before.json') if x['id']=='throw');assert offer['cost']==3 and offer['available'] and not offer['owned']
        assert 'throw' not in before['lineage']['unlocks'] and 'throw' in after['lineage']['unlocks']
        assert after['lineage']['marks']==before['lineage']['marks']-3
        invariant(before,after,[k for k in unchanged if k!='marks'])
        reference=None
        for policy in ['baseline','gas1']:
            case=f'trace-throw-{scene}-sword-fire3-{policy}';assert load(case+'/normalized-input.json')==after
            run=load(case+'/send.json')['run'];current={k:run.get(k) for k in ['hero','floor','monsters','rng','seed','id','route']}
            if reference is None:reference=current
            assert reference==current
            values=measured(case);report=throw_results[scene,policy]
            assert (values['hurt'],values['gas'],values['tick'],values['fires'])==(report['hurt'],report['gas_hurt'],report['last_floor_tick'],report['fire_use_count'])
            if policy=='gas1':assert values['fires']==3
            n+=1
    assert n==28 and absences==8
print(json.dumps({'integrity':'PASS','raw_files':len(m['files']),'grid_cases':24,'extra_paid_throw_cases':4,'public_loadouts':8,'public_throw_purchases':2,'throw_marks_each':3,
    'same_initial_world_and_hero_cases':28,'full_event_and_terminal_save_observer_pairs':28,'actual8h_accounting_checks':8,
    'bow_damage_only_target_cases':12,'old_AI_candidate_still':'REJECTED','core_changes':'NONE','population_or_full_gate_claim':'NONE'},indent=2))
