"""Only the new reason/gloss tokens may explain any whole-save/event differences."""
from pathlib import Path
import hashlib
import json
root=Path('target/cut291')
def restore_text(x):
    if isinstance(x,str):return x.replace('not learned','no line').replace('learn Throw first','no clear throw').replace('learn ability first','shot blocked')
    if isinstance(x,list):return [restore_text(v) for v in x]
    if isinstance(x,dict):return {restore_text(k):restore_text(v) for k,v in x.items()}
    return x
results=[]
for scene in ['gas','pack']:
    for permission in ['locked','learned']:
        label=scene+'-'+permission;before=root/('before-'+label);after=root/('after-'+label)
        old=json.loads((before/'after.json').read_bytes());new=json.loads((after/'after.json').read_bytes())
        assert old==restore_text(new),label+' complete save changed beyond permitted reason text'
        old_events=json.loads((before/'events.json').read_bytes());new_events=json.loads((after/'events.json').read_bytes());assert old_events==restore_text(new_events)
        if permission=='learned':
            assert (before/'after.json').read_bytes()==(after/'after.json').read_bytes()
            assert (before/'events.json').read_bytes()==(after/'events.json').read_bytes()
        trace=json.loads((after/'trace.json').read_bytes());reasons=[w['why'] for t in trace for w in (t.get('rows') or [])]
        if label=='gas-locked':assert reasons.count('not learned')==5
        if permission=='learned':assert 'not learned' not in reasons
        results.append({'case':label,'complete_save_equal_after_only_reason_token_normalization':True,'save_bytes_exact':(before/'after.json').read_bytes()==(after/'after.json').read_bytes(),'events_bytes_exact':(before/'events.json').read_bytes()==(after/'events.json').read_bytes(),'learned_bytes_exact_required':permission=='learned','new_learning_reason_count':reasons.count('not learned'),
                        'after_sha256':hashlib.sha256((after/'after.json').read_bytes()).hexdigest()})
(root/'comparison.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))
