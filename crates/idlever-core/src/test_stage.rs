//! Controlled pre-built facilities for transaction/combat tests, not earned pacing.
use crate::Game;
pub(crate) fn forge(g:&mut Game){
    if !crate::town::built(&g.lineage,"blacksmith") {g.lineage.town.built.push(("blacksmith".into(),g.lineage.day));}
    g.lineage.kennel_leash();
}
pub(crate) fn traits(l:&mut crate::engine::LineageState,n:u32,d:u32){l.persistent.completed=n;l.best_depth=d;if !crate::tree::hired(l,"scout"){l.tree.hired.push(("scout".into(),0));}}
