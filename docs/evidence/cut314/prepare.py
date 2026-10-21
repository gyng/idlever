#!/usr/bin/env python3
"""Exact-anchor isolation of paid utilities plus shared API, never shipping edits."""
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

r = Path('docs/evidence/cut314')
dest = Path(tempfile.mkdtemp(prefix='idlever-cut314-current-'))
for name in ['Cargo.toml','Cargo.lock']:
    shutil.copy2(name,dest/name)
shutil.copytree('crates',dest/'crates')
(dest/'tuning').mkdir()
shutil.copy2('tuning/balance.json',dest/'tuning/balance.json')
baseline = {str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('crates').rglob('*')
            if p.is_file() and p.suffix in ('.rs','.json','.toml')}
baseline.update({p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in ['Cargo.toml','Cargo.lock','tuning/balance.json']})
(r/'base-source.json').write_text(json.dumps(baseline,indent=2,sort_keys=True)+'\n')

def change(name,old,new):
    p=dest/'crates/idlever-core/src'/name
    text=p.read_text()
    assert text.count(old)==1,(name,old,text.count(old))
    p.write_text(text.replace(old,new))

change('lib.rs','pub mod town;','pub mod town;\npub mod cut306_upgrades;')
change('town.rs','pub struct Town {','''pub struct Town {
    #[serde(default, skip_serializing_if="std::collections::BTreeMap::is_empty")]
    pub levels: std::collections::BTreeMap<String, u32>,''')
change('town.rs','(bank_nights() * l.last_night_net','(crate::cut306_upgrades::bank_nights(l) * l.last_night_net')
change('town.rs','crate::tree::bonus_rank(l, "clerk") as i32;','crate::tree::bonus_rank(l, "clerk") as i32 + crate::cut306_upgrades::bank_bonus_permille(l);')
change('persistent.rs','recover_for(l, recovery_ticks(depth));','recover_for(l, crate::cut306_upgrades::recovery_ticks(l, depth));')
change('persistent.rs','Some(p.min(i32::MAX as u64) as i32)','Some(crate::cut306_upgrades::hurry_price(l, p.min(i32::MAX as u64) as i32))')
change('engine.rs','return crate::persistent::recovery_ticks(self.run.as_ref().map_or(self.lineage.best_depth, |r| r.max_depth)) as u32;','return crate::cut306_upgrades::recovery_ticks(&self.lineage, self.run.as_ref().map_or(self.lineage.best_depth, |r| r.max_depth)) as u32;')
change('engine.rs','let rest = if tier == ExitTier::Death { crate::persistent::recovery_ticks(run.max_depth) as u32 }','let rest = if tier == ExitTier::Death { crate::cut306_upgrades::recovery_ticks(&self.lineage, run.max_depth) as u32 }')
change('engine.rs','"supply wish", "hurry clone"].iter()','"supply wish", "hurry clone", "upgrade "].iter()')
change('engine.rs','    } else if why.starts_with("hire ") {\n        "hires"','    } else if why.starts_with("upgrade ") {\n        "town"\n    } else if why.starts_with("hire ") {\n        "hires"')
module=Path('docs/evidence/cut307/upgrades.rs').read_text()
old='''pub fn offers(l: &LineageState) -> Vec<Offer> {
    ["bank", "device"]'''
new='''pub fn offers(l: &LineageState) -> Vec<Offer> {
    offers_for(l, l.best_depth, crate::persistent::service_availability(l, false)[2])
}
pub fn offers_for(l: &LineageState, depth: u32, device: bool) -> Vec<Offer> {
    if !l.town.home.unwrap_or(true) { return Vec::new(); }
    ["bank", "device"]'''
assert module.count(old)==1
module=module.replace(old,new).replace('crate::persistent::service_availability(l, false)[2]\n            };','device\n            };').replace('ready: l.best_depth >= gate,','ready: depth >= gate,')
module+='''
#[derive(Debug, Clone, Serialize)]
pub struct SessionOffer {
    pub offer: Offer,
    pub purse: i32,
    pub savings: i32,
    pub withdrawal: i32,
    pub affordable_with_savings: bool,
    pub home: bool,
}
#[derive(Debug, Clone, Serialize)]
pub struct Purchase {
    pub payer: u32,
    pub id: String,
    pub level: u32,
    pub price: i32,
    pub withdrawal: i32,
    pub gold_after: i32,
    pub purse_after: i32,
    pub savings_after: i32,
}
'''
(dest/'crates/idlever-core/src/cut306_upgrades.rs').write_text(module)
p=dest/'crates/idlever-core/src/bloodlines.rs'
p.write_text(p.read_text()+'\n'+(r/'session-api.rs').read_text())
shutil.copy2(r/'shared-api-probe.rs', dest/'crates/idlever-core/examples/shared_upgrade_probe.rs')
shutil.copy2('docs/evidence/cut307/budget.json', dest/'crates/idlever-core/examples/cut314-budget.json')
Path('target/cut314').mkdir(parents=True, exist_ok=True)
Path('target/cut314/source-path.txt').write_text(str(dest)+'\n')
for name in json.loads((r/'test-fixtures.json').read_text()):
    target = dest/name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(name,target)
print(dest)
