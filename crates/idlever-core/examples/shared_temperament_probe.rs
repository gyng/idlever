//! Public paid-three-resident regression for personal temperament and shared orders.
use idlever_core::bloodlines::Session;
use std::{fs, path::PathBuf};
fn main() {
    let input = PathBuf::from(std::env::args().nth(1).expect("input"));
    let output = PathBuf::from(std::env::args().nth(2).expect("out"));
    let mut s = Session::load(&fs::read_to_string(input).unwrap()).unwrap();
    assert_eq!(s.others.len(), 2);
    let mut o = s.lineage.standing_orders();
    o.temperament = Some("variety".into());
    o.shared = Some(vec!["temperament".into()]);
    s.set_orders(&o).unwrap();
    assert!(s
        .others
        .values()
        .all(|g| g.lineage.orders.temperament == "variety"
            && g.lineage.orders.shared.contains("temperament")));
    let before = s.others.clone();
    s.pick_temperament("skittish").unwrap();
    assert_eq!(s.lineage.orders.temperament, "keep");
    assert!(
        !s.lineage.orders.shared.contains("temperament"),
        "manual personal choice unlinks shared automation"
    );
    for (id, g) in &s.others {
        assert_eq!(g.lineage.orders.temperament, "variety");
        assert!(!g.lineage.orders.shared.contains("temperament"));
        let mut expected = before[id].clone();
        expected.lineage.orders.shared.remove("temperament");
        assert_eq!(*g, expected, "no other policy/build/actor/counter changes");
    }
    fs::write(output, s.save()).unwrap();
    println!("actual public paid-three-resident personal Keep/unlink PASS");
}
