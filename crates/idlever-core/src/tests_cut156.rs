//! Cut156 explicit storage fixtures: preserve choices, worker access and absence truth.
use crate::{tree, Game};




fn worker_fixture() -> Game {
    let mut g = Game::new(156); g.build_town("house").unwrap();
    g.lineage.gold_move(2000, "test income");
    g.lineage.next_vault_id = 100_100;
    assert!(g.build_town("storehouse").is_err());
    tree::grant(&mut g.lineage, &["quartermaster", "porter", "scout", "apprentice"]);
    g
}



#[test]
fn retired_storage_workers_never_reappear_from_manual_acts_or_age() {
    let mut g = worker_fixture();
    for chore in ["keep", "wear"] { for _ in 0..3 { tree::did(&mut g.lineage, chore); } }
    g.lineage.clock_s = 72 * 3600;
    for id in ["keeper", "armourer"] {
        assert!(tree::def(id).is_none());
        assert_eq!(tree::count(&g.lineage, id), 0);
        assert!(g.hire(id).is_err());
    }
    let wire = g.lineage();
    assert!(wire.tree.unwrap().nodes.iter().all(|n| !matches!(n.id.as_str(), "keeper" | "armourer")));
    assert!(!wire.town.buildings.iter().any(|b| b.id == "storehouse"));
}
#[test]
fn current_preparation_preserves_one_and_three_hero_eight_hour_absences() {
    use crate::bloodlines::Session;
    for slots in [1, 3] {
        let mut source = Session::new(156); source.active = worker_fixture();
        if slots == 3 { source.add_bloodline().unwrap(); source.add_bloodline().unwrap(); }
        let saved = source.save(); let source = Session::load(&saved).unwrap();
        let mut whole = source.clone(); let expected = whole.run_offline_mode(8*3600, false, true);
        assert!(expected.runs > 0);
        for reload in [false, true] {
            let mut sliced = source.clone(); let mut left = 8*3600; let mut i = 0;
            let widths = [1, 719, 3600];
            let report = loop {
                let seconds = left.min(widths[i%widths.len()]); let last = seconds == left;
                let report = sliced.run_offline_slice(seconds, last);
                if last { break report; }
                left -= seconds; i += 1;
                if reload { sliced = Session::load(&sliced.save()).unwrap(); }
            };
            assert_eq!(report, expected, "whole report: slots{slots},reload{reload}");
            assert!(serde_json::to_value(&sliced).unwrap() == serde_json::to_value(&whole).unwrap(), "every save/replay field: slots{slots},reload{reload}");
        }
    }
}

// Cut244 replaces inaccessible-empty-storage checks with actual serialized boundary checks.
#[test]
fn current_saves_and_lineage_wire_have_no_retired_storage_choices() {
    let mut session = crate::bloodlines::Session::new(244);
    session.build_town("house").unwrap();
    session.try_send().unwrap();
    let saved: serde_json::Value = serde_json::from_str(&session.save()).unwrap();
    for key in ["loadout", "pending_exit"] { assert!(saved.get(key).is_none(), "retired Game field {key}"); }
    for key in ["vault", "keep_pref", "insured"] { assert!(saved["lineage"].get(key).is_none(), "retired lineage field {key}"); }
    for key in ["worn", "sends"] { assert!(saved["lineage"]["tree"].get(key).is_none(), "retired worker field {key}"); }
    assert!(saved["lineage"]["orders"].get("insure").is_none());
    let wire = serde_json::to_value(session.lineage()).unwrap();
    for key in ["vault", "keep_pref", "keep_auto", "insured", "selected_loadout", "keep_salvaged"] { assert!(wire.get(key).is_none(), "retired wire field {key}"); }
    for key in ["keep", "insure"] { assert!(wire["orders"].get(key).is_none(), "retired order {key}"); }
    assert!(!crate::tree::SHAREABLE.contains(&"insure"));
    assert!(wire.get("vault_pref").is_some(), "dungeon cage preference remains current");
    assert!(saved["lineage"].get("next_vault_id").is_some(), "prepared supply allocator remains current");
}
