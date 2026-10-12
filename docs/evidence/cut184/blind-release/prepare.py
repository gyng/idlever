from pathlib import Path
import json,hashlib,datetime,shutil
root=Path('/home/g/p/riddle'); out=root/'scratchpad/cut184'; old=root/'scratchpad/cut179/blind-launch-preparation'
build='8c17acb4e15ea6c8aa757c3600929f2116245631'
card=json.loads((root/'eval/calibration/loop-hero.d34605e.reanchor.json').read_text())
card['calibration']={'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'candidate':build,'priorCard':'eval/calibration/loop-hero.d34605e.reanchor.json','priorCardSha256':hashlib.sha256((root/'eval/calibration/loop-hero.d34605e.reanchor.json').read_bytes()).hexdigest(),'source':'https://store.steampowered.com/app/1282730/Loop_Hero/','basis':'Reconsidered all sixteen archived anchors in this sitting. Official feature description reread: class/deck selection, terrain and enemy placement, on-loop equipment, camp reinforcement and guardian bosses support the existing mechanics judgments. Awards unchanged. Feel, repetition, synergy opacity and later grind remain knowledge-based judgments. No fresh direct play.','limitations':'Knowledge-based calibration only; official feature evidence does not establish empirical subjective fun or award Riddle axes.','samePresetPriorScore':74,'reanchorScore':74,'driftPoints':0}
(root/'eval/calibration/loop-hero.8c17acb.reanchor.json').write_text(json.dumps(card,indent=2)+'\n')
for label,seed,driver,gateway in [('a',137,41427,41428),('b',211,41429,41430)]:
 d=out/label;d.mkdir(exist_ok=True)
 neutral=Path('/tmp/riddle-8c17acb-blind-'+label);neutral.mkdir(exist_ok=False)
 manifest=json.loads((old/label/'reference-manifest.unreleased.json').read_text())
 for rec in manifest:
  content=(Path('/tmp/riddle-b60d282-blind-'+label)/rec['path']).read_bytes()
  assert len(content)==rec['bytes'] and hashlib.sha256(content).hexdigest()==rec['sha256']
  (neutral/rec['path']).write_bytes(content)
 (d/'reference-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 config=json.loads((old/label/'gateway-config.unreleased.json').read_text())
 config['ledger']=str(d/'operations.jsonl')
 config['allowedUrls']=[url.replace(':41271/',':41273/') for url in config['allowedUrls']]
 config['reloadUrl']=config['reloadUrl'].replace(':41271/',':41273/')
 (d/'gateway-config.json').write_text(json.dumps(config,indent=2)+'\n')
 brief=(old/label/'participant-brief.unreleased.txt').read_text().replace('b60d282a675ad6044b002996d5f057344a38c0f4',build).replace(':41271/',':41273/')
 (d/'participant-brief.txt').write_text(brief)
 argv=json.loads((old/label/'cli-argv.unreleased.json').read_text())
 argv=[arg.replace('/tmp/riddle-b60d282-blind-'+label,str(neutral)) for arg in argv]
 (d/'cli-argv.json').write_text(json.dumps(argv,indent=2)+'\n')
print('Prepared both neutral directories; exact four reference hashes match. No players launched.')
