import json,hashlib,sys,datetime
from pathlib import Path
p=Path('docs/evidence/handoff-menus/hero-hub-diagnostic/final-identity.json')
files=['web/tests/hero-hub.mjs','web/tests/menu-materials.mjs','web/src/ui/sheet.ts','web/src/ui/sheet-focus.ts','web/src/ui/hero-hub.ts','web/src/hero-hub.css','web/src/ui-foundations.css','docs/evidence/handoff-menus/hero-hub-current-inputs.json','web/src/engine/pkg/idlever_wasm_bg.wasm']
now={f:hashlib.sha256(Path(f).read_bytes()).hexdigest() for f in files}
if sys.argv[1]=='before':d={'scope':'Full8 current Hero Hub fixtures, unchanged state/paid/refund/identity/save assertions plus explicit legacy recovery migration. Fresh5385 no-HMR server, all source frozen. No owned native/GPU work; ambient load must be recorded separately. Functional verification, no quiet/performance claim.','startedAt':datetime.datetime.now(datetime.UTC).isoformat(),'url':'http://127.0.0.1:5385/','sourceBefore':now}
else:d=json.loads(p.read_text());d.update(finishedAt=datetime.datetime.now(datetime.UTC).isoformat(),sourceAfter=now,sourceUnchanged=now==d['sourceBefore'],exitCode=int(sys.argv[2]))
p.write_text(json.dumps(d,indent=2)+'\n')
