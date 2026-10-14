//! Read-only equipment and configured-departure projection, using the real actor builder.
use crate::{hero::Hero, item::Item, Game};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct EquipmentSlot {
    pub slot: String,
    pub kind: Option<String>,
    pub label: String,
    pub origin: String,
    pub damage: [i32; 2],
    pub defence: i32,
    pub speed: i32,
    pub ranged: bool,
    pub legendary: bool,
    pub effect: Option<String>,
    pub tradeoff: Option<String>,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct EquipmentStats {
    pub hp: i32,
    pub max_hp: i32,
    pub damage: [i32; 2],
    pub defence: i32,
    pub speed: i32,
    pub level: u32,
    pub class: String,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct EquipmentView {
    pub label: String,
    pub note: String,
    pub slots: Vec<EquipmentSlot>,
    pub stats: EquipmentStats,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct EquipmentBuild {
    pub actual: EquipmentView,
    pub next: EquipmentView,
    /// Current equipment differs from configured equipment; transient buffs are not a queued choice.
    pub queued: bool,
}
fn slot(g: &Game, name: &str, item: Option<&Item>, next: bool) -> EquipmentSlot {
    let origin = if !next {
        if item.is_some() {
            "equipped"
        } else {
            "empty"
        }
    } else if name == "weapon" {
        if g.lineage
            .starting_config
            .as_ref()
            .and_then(|c| c.weapon.as_deref())
            == item.map(|i| i.kind.as_str())
        {
            "chosen"
        } else {
            "class"
        }
    } else {
        crate::armour_sets::resolve(
            &g.lineage,
            match name {
                "helm" => crate::armour_sets::Slot::Helm,
                "boots" => crate::armour_sets::Slot::Boots,
                _ => crate::armour_sets::Slot::Armour,
            },
        )
        .1
    };
    let legendary = item.and_then(|i| crate::legendary::definition(&i.kind));
    let damage = if name == "weapon" {
        item.map_or([0, 0], |i| {
            let (a, b) = i.atk();
            [a, b]
        })
    } else {
        [0, 0]
    };
    EquipmentSlot {
        slot: name.into(),
        kind: item.map(|i| i.kind.clone()),
        label: item.map_or_else(|| "None".into(), |i| crate::item::kind_name(&i.kind)),
        origin: origin.into(),
        damage,
        defence: if name == "weapon" {
            0
        } else {
            item.map_or(0, Item::def_bonus)
        },
        speed: item.map_or(0, |i| {
            if name == "armour" && crate::kit::is_kit_id(i.id) {
                0
            } else {
                i.def().speed
            }
        }),
        ranged: item.is_some_and(|i| i.def().ranged),
        legendary: legendary.is_some(),
        effect: legendary.map(|d| d.effect.into()),
        tradeoff: legendary.map(|d| d.tradeoff.into()),
    }
}
fn view(g: &Game, h: &Hero, next: bool) -> EquipmentView {
    let (a, b) = h.atk();
    EquipmentView {label:if next{"Next delve"}else if g.run.is_some(){"Current"}else{"Ready build"}.into(),
        note:if next{"Configured departure. Workers and future finds can change preparation; conditional gifts activate during the delve."}else{"Current totals include active effects."}.into(),
        slots:vec![slot(g,"weapon",h.weapon.as_ref(),next),slot(g,"helm",h.helm.as_ref(),next),slot(g,"armour",h.armour.as_ref(),next),slot(g,"boots",h.boots.as_ref(),next)],
        stats:EquipmentStats{hp:h.hp,max_hp:h.max_hp,damage:[a,b],defence:h.def(),speed:h.speed(),level:h.level,class:h.class.name().into()}}
}
pub fn equipment(g: &Game) -> EquipmentBuild {
    // A home actor is already paid and refitted by the public configuration
    // doors. Sending reuses it, including its consumed ration and toll.
    let next = if let Some(run) = g.run.as_ref().filter(|_| !crate::persistent::away(g)) {
        view(g, &run.hero, true)
    } else {
        // The isolated sim suppresses purchases and uses canonical preparation.
        let mut preview = g.sim_clone();
        preview.run = None;
        preview.pending_exit = None;
        preview.start_run(Some(0x220));
        view(
            g,
            &preview.run.as_ref().expect("configured actor").hero,
            true,
        )
    };
    let actual = g
        .run
        .as_ref()
        .map(|r| view(g, &r.hero, false))
        .unwrap_or_else(|| {
            let mut ready = next.clone();
            ready.label = "Ready build".into();
            ready.note = "Prepared configuration.".into();
            ready
        });
    let queued = crate::persistent::away(g)
        && actual.slots.iter().zip(&next.slots).any(|(a, b)| {
            a.kind != b.kind || a.damage != b.damage || a.defence != b.defence || a.speed != b.speed
        });
    EquipmentBuild {
        actual,
        next,
        queued,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{kit::StartingConfig, wire::ForgeRow};
    #[test]
    fn away_actual_gear_and_stats_stay_frozen_while_next_is_canonical() {
        let mut g = Game::new_resident(220);
        g.lineage.forge.insert("axe".into(), ForgeRow::at(5));
        g.try_send().unwrap();
        g.step(1);
        let actor = g.run.clone();
        let floor = g.floor_start.clone();
        let sent = g.sent_state.clone();
        crate::kit::set_starting(
            &mut g,
            Some(StartingConfig {
                weapon: Some("axe".into()),
                ..Default::default()
            }),
        )
        .unwrap();
        assert_eq!(g.run, actor);
        let before = g.save();
        let b = g.lineage().starting_kits.equipment.unwrap();
        assert_eq!(b.actual.slots[0].kind.as_deref(), Some("sword"));
        assert_eq!(b.next.slots[0].kind.as_deref(), Some("axe"));
        assert!(b.queued);
        let hero = &g.run.as_ref().unwrap().hero;
        assert_eq!(b.actual.stats.damage, [hero.atk().0, hero.atk().1]);
        assert_eq!(
            (
                b.actual.stats.hp,
                b.actual.stats.max_hp,
                b.actual.stats.defence,
                b.actual.stats.speed
            ),
            (hero.hp, hero.max_hp, hero.def(), hero.speed())
        );
        assert_eq!(g.lineage().starting_kits.actual_weapon, "sword");
        assert_eq!(g.save(), before);
        assert_eq!(g.run, actor);
        assert_eq!(g.floor_start, floor);
        assert_eq!(g.sent_state, sent);
        assert_eq!(equipment(&Game::load(&g.save()).unwrap()), b);
    }
    #[test]
    fn ready_stats_include_real_class_traits_ration_and_do_not_consume_them() {
        let mut g = Game::new_resident(221);
        g.lineage.classes.get_mut("fighter").unwrap().level = 5;
        g.lineage.heirs.blood = Some(crate::traits::Shape::new(
            crate::traits::When::Hurt,
            crate::traits::Gift::Guard,
            crate::traits::Cost::Frail,
        ));
        g.lineage.feats.ration = true;
        let before = g.save();
        let b = equipment(&g);
        assert_eq!(b.actual.stats, b.next.stats);
        assert_eq!(b.actual.slots, b.next.slots);
        assert_eq!(b.next.stats.level, 5);
        assert!(g.lineage.feats.ration);
        assert_eq!(g.save(), before);
        g.try_send().unwrap();
        let actual = view(&g, &g.run.as_ref().unwrap().hero, true);
        assert_eq!(b.next.stats, actual.stats);
        assert_eq!(b.next.slots, actual.slots);
    }
    #[test]
    fn prepared_actor_keeps_paid_ration_in_next_read() {
        let mut g = Game::new_resident(224);
        g.lineage.feats.ration = true;
        g.ensure_run();
        assert!(!g.lineage.feats.ration);
        let actor = g.run.clone();
        let before = g.save();
        let build = equipment(&g);
        assert_eq!(
            build.next.stats,
            view(&g, &actor.as_ref().unwrap().hero, true).stats
        );
        assert_eq!(build.actual.stats, build.next.stats);
        assert_eq!(g.save(), before);
        g.try_send().unwrap();
        assert_eq!(g.run, actor);
    }
    #[test]
    fn live_behaviour_and_frozen_pet_temperament_are_read_truthfully() {
        let mut g = Game::new_resident(225);
        g.lineage.persistent.completed = 12;
        g.lineage.best_depth = 13;
        g.lineage.tree.hired.push(("scout".into(), 0));
        g.lineage.pkg.owned.insert("guarded".into());
        g.lineage.pkg.owned.insert("kite_archers".into());
        let pet = crate::probes::pets_party()[0].clone();
        g.lineage.party.push(pet.clone());
        g.pick_temperament("iron_gut").unwrap();
        g.try_send().unwrap();
        g.step(1);
        let actor = g.run.clone();
        g.set_party(Vec::new()).unwrap();
        g.pick_temperament("unbowed").unwrap();
        g.equip_package("guarded", 0).unwrap();
        g.equip_package("kite_archers", 0).unwrap();
        let before = g.save();
        let l = g.lineage();
        assert!(l.party.is_empty());
        assert_eq!(l.actual_party.len(), 1);
        assert_eq!(l.actual_party[0].id, pet.id);
        let actual = l.actual_packages.unwrap();
        assert_eq!(actual.stance, "guarded");
        assert_eq!(actual.tactics, vec!["kite_archers"]);
        assert_eq!(actual.temperament.as_deref(), Some("iron_gut"));
        assert_eq!(
            g.lineage.persistent.queued_temperament.as_deref(),
            Some("unbowed")
        );
        assert_eq!(g.run, actor);
        assert_eq!(g.save(), before);
        assert_eq!(
            Game::load(&before).unwrap().lineage().actual_party,
            l.actual_party
        );
    }
    #[test]
    fn repeated_reads_report_cost_without_mutating_a_long_save() {
        let mut g = Game::new_resident(226);
        g.lineage.persistent.completed = 132;
        g.try_send().unwrap();
        g.step(1);
        let before = g.save();
        let started = std::time::Instant::now();
        for _ in 0..50 {
            std::hint::black_box(g.lineage());
        }
        eprintln!(
            "canonical lineage read: 50 reads {:?}, saved bytes {}",
            started.elapsed(),
            before.len()
        );
        assert_eq!(g.save(), before);
    }
    #[test]
    fn pinned_empty_and_followed_hybrid_resolve_without_read_mutation() {
        let mut g = Game::new_resident(222);
        g.lineage.town.owned_shapes.extend(
            [
                "hearthglass",
                "hearthglass_hood",
                "hearthglass_boots",
                "ironcap",
            ]
            .map(String::from),
        );
        let config = StartingConfig {
            follow_set: Some("hearthglass".into()),
            pins: Some(crate::armour_sets::Pins {
                helm: Some("none".into()),
                ..Default::default()
            }),
            ..Default::default()
        };
        crate::kit::set_starting(&mut g, Some(config.clone())).unwrap();
        crate::kit::save_starting(&mut g, "Pinned", config, None).unwrap();
        let before = g.save();
        let b = equipment(&g);
        assert!(b.next.slots[1].kind.is_none());
        assert_eq!(b.next.slots[1].origin, "pin");
        assert_eq!(b.next.slots[3].kind.as_deref(), Some("hearthglass_boots"));
        assert_eq!(b.next.slots[3].origin, "follow");
        assert_eq!(b.next.slots.len(), 4);
        assert_eq!(g.save(), before);
    }
}
