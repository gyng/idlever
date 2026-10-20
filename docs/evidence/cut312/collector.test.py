#!/usr/bin/env python3
"""Synthetic peer only: paired mode identity, sealed collection, exact resume."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parent
claims = [dict(id=f'{bot}-{depth}', bot=bot, depth=depth, comparison='difference',
               estimand='median', direction='at-most', threshold=0)
          for bot, depth in [('PICKED', 23), ('PICKED', 33), ('TUNED', 23), ('TUNED', 33)]]
claims.append(dict(id='pen', comparison='candidate-ratio', estimand='median', direction='at-least', threshold=1.15))
with tempfile.TemporaryDirectory(prefix='idlever-cut312-collector-test-') as td:
    td = Path(td)
    peer = td / 'peer'
    peer.write_text('''#!/usr/bin/env python3
import json,os,sys
from pathlib import Path
a=dict(zip(sys.argv[1::2],sys.argv[2::2]));mode=os.environ['IDLEVER_PEN_POLICY']
assert mode in ['original','lich-boss-only']
assert not any(k.startswith('DP_')or k.startswith('IDLEVER_')and k!='IDLEVER_PEN_POLICY'for k in os.environ)
seeds=sorted(a['--seeds'].split(','),key=int);rows=[]
for seed in seeds:
 for bot in ['PICKED','TUNED']:
  h=32 if mode=='lich-boss-only'and bot=='TUNED'else 48
  rows.append(dict(seed=seed,bot=bot,stop_reason='depth',completed_days=h//24,campaign_complete=False,effective_checkins_per_day=3,observed_hours=h,best_depth=33,depth_reached_hours=h,elapsed_seconds=1,seed_out=dict(seed=int(seed),hours=[min(v,h)for v in [8,8,16,24,32,40,48]],unconserved=0,king_day=None,sends=1)))
  print('stat_probe synthetic complete',file=sys.stderr)
packet=dict(schema=1,kind='dayplayer-stat-probe',pen_policy=mode,milestones=[8,13,18,23,28,29,33],request=dict(seeds=seeds,bots=['PICKED','TUNED'],days=14,until_depth=33,checkins_per_day=3),balance=dict(synthetic=True),records=rows)
Path(a['--out']).write_text(json.dumps(packet))
with open(os.environ['FAKE_LOG_PATH'],'a')as f:f.write(mode+'\\n')
''')
    peer.chmod(0o755)
    digest = hashlib.sha256(peer.read_bytes()).hexdigest()
    spec = dict(looks=[32], seeds=[str(17000000000000000000+i) for i in range(32)], excluded=[],
                probe=dict(bots=['PICKED','TUNED'],days=14,until_depth=33,checkins_per_day=3),
                threads_per_runtime=8, expected_balance=dict(synthetic=True), cap_hours=344,
                family_alpha=0.05,coupling_reserve=2**-38,claims=claims,
                runtimes={role:dict(path=str(peer),sha256=digest,mode=mode)
                          for role,mode in [('shipping','original'),('candidate','lich-boss-only')]})
    spec_path = td / 'spec.json'
    spec_path.write_text(json.dumps(spec))
    calls = td / 'calls'
    env = dict(os.environ, IDLEVER_PEN_POLICY='poison', IDLEVER_BALANCE_JSON='poison', DP_OFF='poison', FAKE_LOG_PATH=str(calls))
    out = td / 'study'
    command = ['python3', str(root/'collect.py'), str(out), str(spec_path)]
    first = subprocess.run(command, env=env, capture_output=True, text=True)
    assert first.returncode == 0, (first.stdout, first.stderr)
    assert json.loads((out/'look-32.json').read_text())['status'] == 'STATISTICALLY_ACCEPTED'
    (td/'frozen-identity.json').write_text(json.dumps(dict(files={str(spec_path):hashlib.sha256(spec_path.read_bytes()).hexdigest()})))
    rational = subprocess.run(['python3', str(root/'verify.py'), str(out), str(td)], capture_output=True, text=True)
    assert rational.returncode == 0, (rational.stdout, rational.stderr)
    assert json.loads(rational.stdout)['status'] == 'PASS_INDEPENDENT_RATIONAL_VERIFICATION'
    assert len(calls.read_text().splitlines()) == 2
    manifest = json.loads((out/'manifest.json').read_text())
    assert not set(manifest['jobs']['shipping']) & set(manifest['jobs']['candidate'])
    second = subprocess.run(command, env=env, capture_output=True, text=True)
    assert second.returncode == 0, (second.stdout, second.stderr)
    assert len(calls.read_text().splitlines()) == 2, 'exact resume must make no native calls'
    receipt = out/'packets/0-32-shipping.receipt.json'
    value = json.loads(receipt.read_text())
    value['mode'] = 'lich-boss-only'
    receipt.write_text(json.dumps(value))
    refused = subprocess.run(command, env=env, capture_output=True, text=True)
    assert refused.returncode != 0 and len(calls.read_text().splitlines()) == 2
    print(json.dumps(dict(status='PASS_SYNTHETIC_ONLY', native_calls=2,
                         exact_resume_calls=0, wrong_mode_receipt_refused=True,
                         independent_rational_verifier_checked=True,
                         inherited_policy_and_balance_flags_cleared=True)))
