"""Independent archive, earned-chain, matched-send and next8h accounting checks."""
from pathlib import Path
import hashlib
import json
import tarfile
import tempfile
root=Path('docs/evidence/cut287');manifest=json.loads((root/'manifest.json').read_text());identity=json.loads((root/'identity.json').read_text());selection=json.loads((root/'frozen-selection.json').read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha((root/'capture.tar.xz').read_bytes())==manifest['archive_sha256']
for filename,key in [('frozen-contract.md','contract_sha256'),('frozen-selection.json','selection_sha256'),('trace-harness.rs','harness_sha256'),('absence-harness.rs','absence_harness_sha256')]:assert sha((root/filename).read_bytes())==identity[key]
with tempfile.TemporaryDirectory(prefix='idlever-cut287-verify-') as scratch:
    scratch=Path(scratch);expected={f['path']:f for f in manifest['files']};seen=set()
    with tarfile.open(root/'capture.tar.xz','r|xz') as tar:
        for member in tar:
            name=member.name;assert name in expected and name not in seen
            assert not Path(name).is_absolute() and '..' not in Path(name).parts
            dest=scratch/name;dest.parent.mkdir(parents=True,exist_ok=True);f=expected[name]
            if member.islnk():
                assert member.linkname in seen and member.linkname==f['same_bytes_as']
                assert expected[member.linkname]['sha256']==f['sha256']
                dest.hardlink_to(scratch/member.linkname)
            else:
                assert member.isfile() and 'same_bytes_as' not in f
                data=tar.extractfile(member).read();assert len(data)==f['bytes'] and sha(data)==f['sha256'];dest.write_bytes(data)
            seen.add(name)
    assert seen==set(expected)
    def raw(name):return (scratch/name).read_bytes()
    def load(name):return json.loads(raw(name))
    assert load('selection.json')==selection
    cards={9:['gas_step','pack_break'],14:['boss_focus','corridor_fighting'],19:['reflect_read','corridor_fighting']}
    for p in identity['parents']:
        seed=p['seed'];depth=p['start']
        assert sha(raw(f'prepare-s{seed}-d{depth}-a1/normalized-input.json'))==p['sha256']
        for attempt in [1,2,3]:
            prep=f'prepare-s{seed}-d{depth}-a{attempt}';case=f'trace-s{seed}-d{depth}-a{attempt}-baseline'
            if attempt>1:assert raw(prep+'/normalized-input.json')==raw(f'trace-s{seed}-d{depth}-a{attempt-1}-baseline/after.json')
            assert raw(prep+'/after.json')==raw(case+'/normalized-input.json')
            assert any(i['kind']=='fire' for i in load(prep+'/after.json')['lineage']['supplies'])
    case_names=sorted({f['path'].split('/')[0] for f in manifest['files'] if f['path'].startswith('trace-') and f['path'].endswith('/observer-parity.json')})
    assert len(case_names)==28
    actual_eligibility={}
    for case in case_names:
        assert raw(case+'/after-fine.json')==raw(case+'/after-coarse.json')==raw(case+'/after.json')
        parity=load(case+'/observer-parity.json');assert parity['events'] and parity['save']
        events=load(case+'/events.json');frames=load(case+'/frames.json')
        assert len(events)==parity['event_count']
        assert [e for frame in frames for e in frame['events']]==events
        if case.endswith('-baseline'):
            start=load(case+'/send.json')['run']['start']
            first=[f for f in frames if f['before'] and f['before']['depth']==start]
            gas_seen=any(m['kind'] in ['bloat','bloat_mother'] and not m['ally'] and not m['neutral'] for f in first for m in f['before']['monsters'])
            categories={9:['gas','pack'],14:['drain','summoner'],19:['reflection','support']}[start]
            found={}
            for frame in first:
                b=frame['before'];alive=[m for m in b['monsters'] if m['hp']>0 and not m['ally'] and not m['neutral']]
                kinds={m['kind'] for m in alive}
                near={m['id'] for m in alive if m['kind'] in ['jackal','ghoul'] and abs(m['pos']['x']-b['hero']['x'])<=6 and abs(m['pos']['y']-b['hero']['y'])<=6}
                for e in frame['events']:
                    tests={
                        'gas':(e['k']=='overlay' and e.get('ov')=='gas' and bool(kinds & {'bloat','bloat_mother'})) or (e['k']=='hurt' and e.get('id')==1 and e.get('cause')=='gas' and e.get('dmg',0)>0 and gas_seen),
                        'pack':len(near)>=2 and e['k']=='attack' and e.get('src') in near,
                        'drain':e['k']=='max_hp' and e.get('cause')=='drain' and e.get('delta',0)<0,
                        'summoner':'goblin_conjurer' in kinds and e['k']=='spawn' and e.get('e',{}).get('kind')=='spectral_blade',
                        'reflection':e['k']=='attack' and e.get('dst')==1 and e.get('verb')=='reflect',
                        'support':'smith' in kinds and e['k']=='callout' and e.get('text')=='armours'}
                    for category in categories:
                        if tests[category]:found.setdefault(category,{'turn':e.get('t'),'event':e})
            actual_eligibility[case]=found
    assert len(selection['candidates'])==18
    assert len(actual_eligibility)==18
    for candidate in selection['candidates']:assert actual_eligibility[candidate['case']]==candidate['eligible']
    for category,n in selection['counts'].items():assert sum(category in found for found in actual_eligibility.values())==n
    assert len(selection['selected'])==5 and selection['missing']==['reflection']
    used=set();matched=0;absences=0
    for c in selection['selected']:
        assert c['case'] not in used;used.add(c['case'])
        eligible=[x for x in selection['candidates'] if x['start']==c['start'] and c['category'] in x['eligible'] and (x['case']==c['case'] or x['case'] not in used)]
        assert eligible[0]['case']==c['case']
        parent=load(c['case']+'/normalized-input.json');base=load(c['case']+'/send.json')['run']
        assert sha(raw(c['case']+'/normalized-input.json'))==c['parent_sha256']
        prefix=c['case'].removesuffix('-baseline');common_away=None
        quote=c['eligible'][c['category']]['event']
        assert any(quote in f['events'] for f in load(c['case']+'/frames.json') if f['before'] and f['before']['depth']==c['start'])
        for card in ['baseline',*cards[c['start']]]:
            case=prefix+'-'+card
            assert load(case+'/normalized-input.json')==parent
            sent=load(case+'/send.json')['run'];chosen=load(case+'/choice-parent.json')
            for key in ['gold','marks','clock_s','rng','bloodline','party','kennel','seed']:assert chosen['lineage'][key]==parent['lineage'][key]
            for key in ['hero','floor','monsters','rng','seed','id','route']:assert base.get(key)==sent.get(key),(case,key)
            assert any(i['kind']=='fire' for i in sent['hero']['inv'])
            matched+=1
            away=case.replace('trace-','absence-',1);common=load(away+'/common-away-parent.json')
            assert load(away+'/normalized-input.json')==parent
            assert load(away+'/actions.json')==[{'command':'set_worker','id':'scout','on':True}]
            if common_away is None:common_away=common
            assert common_away==common
            choice=load(away+'/choice-parent.json');after=load(away+'/after.json');report=load(away+'/report.json')
            for key in ['gold','marks','clock_s','rng','bloodline','party','kennel','seed']:assert choice['lineage'][key]==common['lineage'][key]
            if card!='baseline':assert choice['lineage']['pkg']['tactics'][0]==card
            assert report['elapsed_s']==28800
            assert after['lineage']['clock_s']-common['lineage']['clock_s']==28800
            assert after['lineage']['gold']-common['lineage']['gold']==report['gold']['net']==report['gold']['ledger']['net']
            assert report['gold']['ledger']['earned']-report['gold']['ledger']['spent']==report['gold']['net']
            absences+=1
print(json.dumps({'archive_integrity':'PASS','files':len(manifest['files']),'earned_baseline_chain_departures':18,
    'complete_observer_event_save_parity':28,'selected_same_parent_same_send_cases':matched,
    'exact_send_inventory_matches':matched,'actual_8h_accounting_checks':absences,
    'selected_scene_categories':[c['category'] for c in selection['selected']],
    'missing':['reflection'],'six_counter_superiority':'NOT_ESTABLISHED'},indent=2))
