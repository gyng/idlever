import sys,json,subprocess,datetime
from pathlib import Path
label=sys.argv[1]; d=Path('/home/g/p/riddle/scratchpad/cut184')/label
argv=json.loads((d/'cli-argv.json').read_text())
(d/'launch.json').write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'argv':argv,'scope':'fresh independent CLI; actual startup audit required before any game interaction'},indent=2)+'\n')
with (d/'player-transcript.jsonl').open('wb') as out, (d/'player-stderr.log').open('wb') as err:
 result=subprocess.run(argv,input=(d/'participant-brief.txt').read_bytes(),stdout=out,stderr=err,cwd='/tmp/riddle-8c17acb-blind-'+label)
(d/'terminal-exit.json').write_text(json.dumps({'exit':result.returncode,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat()})+'\n')
sys.exit(result.returncode)
