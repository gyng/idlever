//! Wire reads expose permission needs without changing the actual build.
use crate::{engine::Game, hero::Class, packages};

fn needs(g: &Game, id: &str) -> Vec<String> {
    packages::wire(&g.lineage)
        .all
        .into_iter()
        .find(|p| p.id == id)
        .unwrap()
        .variant_needs
}

#[test]
fn explicit_throw_variant_names_missing_permission_without_blocking_other_variants() {
    let mut g = Game::new_literal(1);
    g.lineage.class = Class::Fighter;
    g.lineage.unlocks.remove("throw");
    let before = g.save();
    assert_eq!(needs(&g, "gas_step"), vec!["", "Learn Throw"]);
    for p in packages::wire(&g.lineage).all {
        if p.id != "gas_step" {
            assert!(p.variant_needs.is_empty(), "{}", p.id);
        }
        for hint in p.variant_needs {
            assert!(hint.split_whitespace().count() <= 3);
        }
    }
    assert_eq!(before, g.save());
}

#[test]
fn natural_or_purchased_throw_permission_removes_the_missing_dependency() {
    let mut g = Game::new_literal(1);
    g.lineage.class = Class::Rogue;
    g.lineage.unlocks.remove("throw");
    assert!(needs(&g, "gas_step").is_empty());
    g.lineage.class = Class::Fighter;
    g.lineage.unlocks.insert("throw".into());
    let before = g.save();
    assert!(needs(&g, "gas_step").is_empty());
    assert_eq!(before, g.save());
}
