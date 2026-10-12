from pathlib import Path
import json,hashlib,sys
root=Path('/home/g/p/riddle');path=root/'scratchpad/cut185/client-input-guard.json'
if sys.argv[1]=='record':
 paths={r['path'] for r in json.loads((root/'scratchpad/cut183/candidate-input-guard.json').read_text())}
 paths.update(['crates/riddle-core/src/class_tree.rs','crates/riddle-core/src/class_tree_tests.rs','crates/riddle-core/src/class_skill_effect_tests.rs','web/src/ui/class-tree.ts','web/src/class-tree.css','web/tests/class-tree.mjs'])
 rows=[{'path':p,'sha256':hashlib.sha256((root/p).read_bytes()).hexdigest()} for p in sorted(paths)]
 path.write_text(json.dumps(rows,indent=2)+'\n');print('Recorded',len(rows),'inputs')
else:
 rows=json.loads(path.read_text());changed=[r['path'] for r in rows if hashlib.sha256((root/r['path']).read_bytes()).hexdigest()!=r['sha256']]
 print(json.dumps({'files':len(rows),'changed':changed}));assert not changed
