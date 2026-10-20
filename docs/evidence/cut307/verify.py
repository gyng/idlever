#!/usr/bin/env python3
"""Independent receipts, earliest selection, funding, timers and saving audit."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile

r=Path('docs/evidence/cut307')
load=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
pre=load(r/'preflight.json')
for p,h in pre['files'].items():assert sha(Path(p))==h,p
if (r/'identity.json').exists():
    for p,h in load(r/'identity.json')['files'].items():assert sha(Path(p))==h,p

def unpack(archive,out,selected=None):
    proc=subprocess.Popen(['zstd','-dc',str(archive)],stdout=subprocess.PIPE)
    with tarfile.open(fileobj=proc.stdout,mode='r|')as tar:
        for item in tar:
            assert not item.name.startswith('/')and '..'not in Path(item.name).parts
            assert item.isfile()or item.isdir()
            if selected and not selected(item.name):continue
            p=out/item.name
            if item.isdir():p.mkdir(parents=True,exist_ok=True)
            else:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(tar.extractfile(item).read())
    assert proc.wait()==0

def move(g,delta,why,term):
    l=g['lineage'];assert l['tree']['chest']==0
    l['gold']+=delta;l['gold_tally'][term]=l['gold_tally'].get(term,0)+delta
    if not why.startswith('bank '):l['tree']['ledger']+=delta
    line={'t':l['total_turns'],'delta':delta,'why':why};bid=l.get('bloodline_id',1)
    if bid!=1:line['bloodline_id']=bid
    entries=l['gold_ledger']
    if entries and entries[-1]['t']==line['t']and entries[-1]['why']==why and entries[-1].get('bloodline_id',1)==bid:entries[-1]['delta']+=delta
    else:entries.append(line);del entries[:-80]

def paid(before,receipt,after):
    assert receipt['before']==before
    expected=copy.deepcopy(before);l=expected['lineage'];amount=receipt['withdrawal'];offer=receipt['offer'];price=offer['price']
    reserve=3*(100+25*l['best_depth']);assert receipt['reserve']==reserve
    assert amount==max(0,price+reserve-(l['gold']-l['tree']['chest']))
    assert 0<=amount<=l['town']['bank']
    if amount:l['town']['bank']-=amount;move(expected,amount,'bank withdraw','bank')
    assert expected==receipt['after_withdrawal']
    move(expected,-price,f"upgrade {offer['id']} {offer['level']}",'town')
    expected['lineage']['town'].setdefault('levels',{})[offer['id']]=offer['level']
    assert expected==after,'complete legal purchase only'
    assert after['lineage']['gold']>=reserve

def ledger(before,after):
    a,b=after['lineage'],before['lineage'];assert a['gold']+a['town']['bank']==a['tree']['ledger']
    terms={k:a['gold_tally'].get(k,0)-b['gold_tally'].get(k,0)for k in set(a['gold_tally'])|set(b['gold_tally'])}
    interest=a['town']['interest']-b['town']['interest']
    assert a['gold']-b['gold']==sum(terms.values())
    assert a['town']['bank']-b['town']['bank']==interest-terms.get('bank',0)
    assert a['tree']['ledger']-b['tree']['ledger']==interest+sum(v for k,v in terms.items()if k!='bank')

with tempfile.TemporaryDirectory(prefix='idlever-cut307-audit-')as td:
    td=Path(td);out=td/'current';old=td/'old';source=td/'source'
    unpack(r/'source.tar.zst',source)
    for p,h in pre['sources'].items():assert sha(source/p)==h,p
    unpack(r/'capture.tar.zst',out)
    assert {str(p.relative_to(out)):sha(p)for p in out.rglob('*')if p.is_file()}==load(r/'raw-manifest.json')
    unpack(Path('docs/evidence/cut306/capture.tar.zst'),old,lambda s:s.startswith('ordinary/camps/')or s.startswith('prototype/s1-d7/'))
    summary=load(r/'summary.json');scan=load(out/'scan-reference/rows.json');budget=load(out/'scan-budget/rows.json')
    assert len(scan)==len(budget)==42
    for row in scan:
        c=row['context'];p=old/Path(c['input']).relative_to('target/cut306');assert sha(p)==c['sha256'];l=load(p)['lineage']
        assert row['clock_s']==l['clock_s']and row['gold']==l['gold']and row['bank']==l['town']['bank']
        assert row['reserve']==3*(100+25*l['best_depth'])and row['owned']==l['gold']-l['tree']['chest']+l['town']['bank']
        legal=[o['id']for o in row['offers']if o['ready']and row['at_home']and row['owned']>=o['price']+row['reserve']]
        assert legal==row['eligible']
        for o in row['offers']:assert o['price']==3400 and o['gate']==13
    assert load(r/'selection.json')['budget_static_second_affordable_count']==sum(v['owned']>=v['reserve']+43200 for v in budget)
    for c in load(r/'earliest-spec.json')['contexts']:
        id='bank'if c['roles'][-1]=='bank-first'else'device';seed=int(c['label'][1])
        eligible=sorted((v for v in scan if v['context']['seed']==seed and id in v['eligible']),key=lambda v:(v['clock_s'],v['context']['day'],v['context']['checkin']))
        assert c['input']==eligible[0]['context']['input']and c['sha256']==eligible[0]['context']['sha256']
    for id in ('bank','device'):
        a=out/'quote-reference'/id;b=out/'quote-budget'/id
        assert (a/'prepared.json').read_bytes()==(b/'prepared.json').read_bytes()
        assert load(a/'quote.json')['next']['price']==13500 and load(b/'quote.json')['next']['price']==43200
    for role in ('unchanged','unchanged-repeat','bank-first','vat-first'):
        for p in(old/'prototype/s1-d7'/role).iterdir():assert p.read_bytes()==(out/'reference/s1-d7'/role/p.name).read_bytes()
    for c in load(r/'earliest-spec.json')['contexts']:
        parent=out/'earliest'/c['label'];role=c['roles'][-1]
        for p in(parent/'unchanged').iterdir():assert p.read_bytes()==(parent/'unchanged-repeat'/p.name).read_bytes()
        for name in c['roles']:
            d=parent/name;canonical,prepared,after=[load(d/(v+'.json'))for v in('canonical','prepared','after')];result=load(d/'result.json')
            if result['purchase']['status']=='paid':paid(canonical,result['purchase']['receipt'],prepared)
            else:assert canonical==prepared
            ledger(prepared,after);assert result['completed']==len(result['runs'])==after['lineage']['persistent']['completed']-prepared['lineage']['persistent']['completed']
            for death in result['deaths']:
                off=20 if name=='vat-first'and result['purchase']['status']=='paid'else 0
                depth=death['depth'];base=600 if depth<=14 else 12000 if depth>=28 else 600+11400*(depth-14)//14
                assert death['base_ticks']==base and death['actual_ticks']==(base*(100-off)+99)//100
            start=prepared['lineage']['total_turns'];end=start+result['horizon_ticks'];until=prepared['lineage']['persistent']['recovery_until_tick']
            intervals=[(start,until)]if until>start else[];intervals +=[(d['until_tick']-d['actual_ticks'],d['until_tick'])for d in result['deaths']]
            assert sum(max(0,min(b,end)-max(a,start))for a,b in intervals)==result['recovery_spent_ticks']
        a=load(parent/role/'result.json');b=load(parent/'unchanged/result.json');baseline={n['night']:n for n in b['nights']}
        payback=next((n['night']for n in a['nights']if n['night']in baseline and n['interest']-baseline[n['night']]['interest']>=3400),None)
        case=next(v for v in summary['earliest']if v['label']==c['label']);assert case['payback_night']==payback
        passed=a['purchase']['status']=='paid'and(payback is not None if role=='bank-first'else bool(a['deaths']))
        assert case['utility_status']==('PASS'if passed else'FAIL')
    for c in load(r/'saving-spec.json')['contexts']:
        parent=out/'saving'/c['label']
        for p in(parent/'town-first').iterdir():assert p.read_bytes()==(parent/'town-first-repeat'/p.name).read_bytes()
        for role in ('unchanged','town-first','town-first-repeat'):
            d=parent/role;initial=load(d/'canonical.json');expected=copy.deepcopy(initial)
            if role!='unchanged':expected['lineage']['orders']['sink']='ration'
            assert expected==load(d/'prepared.json');result=load(d/'result.json');after=load(d/'after.json');ledger(initial,after)
            purchases=result['purchases'];sequence=[]
            for ci in range(22):
                before=load(d/f'camp-{ci:02}-before.json');expected=copy.deepcopy(before)
                for rec in(p for p in purchases if p['checkin']==ci):
                    paid(expected,rec,rec['after']);expected=rec['after'];sequence.append((rec['id'],rec['offer']['level']))
                    assert rec['offer']['price']==(3400 if len(sequence)<=2 else 43200)
                    assert rec['town_day']==before['lineage']['clock_s']//86400+1
                if len(sequence)==4:expected['lineage']['orders']['sink']=initial['lineage']['orders']['sink']
                assert expected==load(d/f'camp-{ci:02}-after.json')
                if ci<21:ledger(expected,load(d/f'camp-{ci+1:02}-before.json'))
            assert sequence==[('bank',3),('device',2),('device',3),('bank',4)][:len(sequence)]
            assert result['total_spend']==sum(p['offer']['price']for p in purchases)
            assert result['late_spend']==sum(p['offer']['price']for p in purchases if p['town_day']>=3)
            assert result['completed']==sum(q['runs']for q in result['reports'])==after['lineage']['persistent']['completed']-initial['lineage']['persistent']['completed']
            assert after['lineage']['clock_s']-initial['lineage']['clock_s']==7*86400
            assert result['target_pass']==(len(sequence)==4 and result['late_spend']>=86400 and result['sink_restored'])
        case=next(v for v in summary['saving']if v['label']==c['label']);actual=load(parent/'town-first/result.json')
        for k in('target_pass','total_spend','late_spend','all_four_bought','sink_restored','completed','deaths','king_slain'):assert case[k]==actual[k]
    assert summary['shipping_adopted']is False
    print('Independent archived source/earliest selection, reference/repeats, full legal payments/orders, ledgers, timers and saving targets agree.')
