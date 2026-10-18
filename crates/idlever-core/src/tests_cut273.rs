//! Cut273 (docs/CUT273_WORKPLACES.md): every worker comes from building or levelling his workplace — exactly the hire.
use crate::engine::Game;
use crate::town::{self, WORKPLACES};
use crate::tree;

fn level(g: &Game, id: &str) -> u32 {
    town::workplace_level(&g.lineage, id)
}

#[test]
fn every_worker_has_one_workplace_and_names_fit() {
    for n in tree::NODES {
        let w = town::workplace_of(n.id).unwrap_or_else(|| panic!("{} has a workplace", n.id));
        assert_eq!(WORKPLACES.iter().filter(|x| x.staff.contains(&n.id)).count(), 1);
        assert!(w.name.split_whitespace().count() <= 2, "{}", w.name);
    }
    let lv = |id| town::workplace_of(id).and_then(|w| w.level_of(id)).unwrap();
    assert_eq!((lv("scout"), lv("guide"), lv("porter"), lv("drillmaster")), (1, 2, 1, 1));
    assert_eq!((lv("apprentice"), lv("clerk"), lv("kennel_hand"), lv("kennel_keeper"), lv("herald")), (2, 2, 2, 3, 2));
}

#[test]
fn building_is_the_hire_same_price_same_gate_same_bytes() {
    let mut a = Game::new(273);
    a.build_town("house").unwrap();
    a.lineage.gold = 500;
    let mut b = a.clone();
    assert_eq!(tree::lit(&a.lineage).map(|n| n.id), Some("scout"));
    // a place with nothing lit is refused, the save untouched
    let before = a.save();
    assert!(a.build_workplace("haul_chest").is_err());
    assert!(a.build_workplace("nowhere").is_err());
    assert_eq!(before, a.save());
    assert_eq!(a.build_workplace("guild").unwrap(), "scout");
    b.hire("scout").unwrap();
    assert_eq!(a.save(), b.save(), "building the Guildhouse is the Receptionist's hire, byte for byte");
    assert_eq!(level(&a, "guild"), 1);
    assert!(tree::auto_send(&a.lineage));
    assert!(a.build_workplace("guild").is_err(), "the Guide is not lit");
}

#[test]
fn levels_follow_the_staff_and_the_crate_comes_with_the_house() {
    let mut g = Game::new(274);
    assert_eq!(level(&g, "crate"), 0, "no House, no crate");
    g.build_town("house").unwrap();
    assert_eq!(level(&g, "crate"), 1);
    assert_eq!((level(&g, "guild"), level(&g, "kennel"), level(&g, "blacksmith"), level(&g, "board")), (0, 0, 0, 0));
    g.lineage.town.built.push(("kennel".into(), 0));
    assert_eq!(level(&g, "kennel"), 1);
    tree::grant(&mut g.lineage, &["kennel_hand"]);
    assert_eq!(level(&g, "kennel"), 2);
    tree::grant(&mut g.lineage, &["kennel_keeper"]);
    assert_eq!(level(&g, "kennel"), 3);
    tree::grant(&mut g.lineage, &["guide"]);
    assert_eq!(level(&g, "guild"), 2, "the Guide is the Guildhouse's second level");
    let w = town::workplaces_wire(&g.lineage);
    let k = w.iter().find(|x| x.id == "kennel").unwrap();
    assert_eq!((k.level, k.max, k.staff.len()), (3, 3, 2));
}

#[test]
fn old_saves_load_with_their_workplaces_standing_nothing_charged() {
    // a late save: all ten hired, the kennel's level 1 missing (an odd legacy state)
    let mut g = Game::new(275);
    g.build_town("house").unwrap();
    let ids: Vec<&str> = tree::NODES.iter().map(|n| n.id).collect();
    tree::grant(&mut g.lineage, &ids);
    g.lineage.town.built.push(("blacksmith".into(), 0));
    g.lineage.town.built.push(("bank".into(), 0));
    g.lineage.gold = 1234;
    let (gold, ledger, hired) = (g.lineage.gold, g.lineage.tree.ledger, g.lineage.tree.hired.clone());
    let back = crate::save::load(&g.save()).unwrap();
    assert!(town::built(&back.lineage, "kennel"), "the keeper's kennel stands");
    assert_eq!((back.lineage.gold, back.lineage.tree.ledger, back.lineage.tree.hired.clone()), (gold, ledger, hired));
    for (id, want) in [("crate", 1), ("haul_chest", 1), ("guild", 2), ("blacksmith", 2), ("bank", 2), ("drill_tent", 1), ("kennel", 3)] {
        assert_eq!(level(&back, id), want, "{id}");
    }
    // save → load → save is stable
    let again = crate::save::load(&back.save()).unwrap();
    assert_eq!(again.save(), back.save());
    // a Cut258 save (scout and porter hired): the Guildhouse and the Haul chest stand, nothing else moves
    let mut c = Game::new(276);
    c.build_town("house").unwrap();
    tree::grant(&mut c.lineage, &["porter", "scout"]);
    let s = c.save();
    let back = crate::save::load(&s).unwrap();
    assert_eq!((level(&back, "guild"), level(&back, "haul_chest"), level(&back, "kennel")), (1, 1, 0));
    assert_eq!(back.lineage.town.built, c.lineage.town.built);
}
