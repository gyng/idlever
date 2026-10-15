//! Actual next-absence choice comparisons from a saved multihero Session.
use idlever_core::bloodlines::Session;
use std::time::Instant;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().collect();
    if !(5..=6).contains(&args.len()) {
        return Err("choice_check SAVE HOURS CHOICES OUTPUT (CHOICES=id:slot,id:slot; optional UPGRADES=health,armour,damage,all)".into());
    }
    idlever_core::balance::configure_from_env()?;
    idlever_core::chronicle::use_shipping_words();
    idlever_core::forecast::set_parallel_sims(false);
    let source = Session::load(&std::fs::read_to_string(&args[1])?)?;
    let hours: u64 = args[2].parse()?;
    let seconds = hours
        .checked_mul(3600)
        .filter(|_| (1..=336).contains(&hours))
        .ok_or("invalid hours")?;
    let mut choices = Vec::new();
    for value in args[3].split(',') {
        let (id, slot) = value.rsplit_once(':').ok_or("choice must be id:slot")?;
        let slot: usize = slot.parse()?;
        if choices.contains(&(id.to_string(), slot)) {
            return Err("duplicate choice".into());
        }
        // Validate all requested choices against untouched state before work.
        let mut candidate = source.clone();
        candidate.equip_package(id, slot)?;
        choices.push((id.to_string(), slot));
    }
    let paths = args.get(5).map(|s| s.split(',').collect::<Vec<_>>()).unwrap_or_default();
    let mut prepared = vec![(None, source.clone(), 0)];
    for (i, path) in paths.iter().enumerate() {
        if paths[..i].contains(path) { return Err("duplicate upgrade path".into()); }
        let (game, spent) = upgrade_path(&source, path)?;
        prepared.push((Some(*path), game, spent));
    }
    // Validate the entire cross-product before playing any case.
    for (_, game, _) in &prepared {
        for (id, slot) in &choices {
            let mut candidate = game.clone();
            candidate.equip_package(id, *slot)?;
        }
    }
    let mut cases = Vec::new();
    for (path, prepared_game, spent) in prepared {
        for choice in std::iter::once(None).chain(choices.iter().map(Some)) {
            let mut game = prepared_game.clone();
            if let Some((id, slot)) = choice { game.equip_package(id, *slot)?; }
            let start = Instant::now();
            let report = game.run_offline_mode(seconds, false, true);
            let elapsed = start.elapsed().as_secs_f64();
            let mut case = serde_json::json!({
                "choice": choice.map(|(id, slot)| serde_json::json!({"id": id, "slot": slot})),
                "seconds": elapsed, "report": report, "save": game.save()
            });
            if let Some(path) = path {
                case["upgrade"] = serde_json::json!({"path":path,"spent":spent,
                    "before":source.lineage.bloodline,"after":prepared_game.lineage.bloodline});
            }
            cases.push(case);
        }
    }
    let output = serde_json::json!({"version":if args.len()==5 {1} else {2},"selected":source.selected,"hours":hours,"slots":source.others.len()+1,"cases":cases});
    std::fs::write(&args[4], serde_json::to_vec(&output)?)?;
    Ok(())
}

/// Prepare an independent legal path; the source remains untouched even on refusal.
fn upgrade_path(source: &Session, path: &str) -> Result<(Session, u32), String> {
    let ids: Vec<&str> = match path {
        "all" => idlever_core::legacy::IDS.to_vec(),
        id if idlever_core::legacy::IDS.contains(&id) => vec![id],
        _ => return Err(format!("unknown upgrade path {path}")),
    };
    let mut game = source.clone();
    let mut spent = 0;
    for id in ids {
        loop {
            let offer = idlever_core::legacy::offers(&game.lineage, game.run.is_some())
                .into_iter().find(|u| u.id == id).ok_or("missing upgrade offer")?;
            if offer.rank >= offer.cap { break; }
            game.upgrade_hero(id).map_err(|e| format!("{path}: {e}"))?;
            spent += offer.price;
        }
    }
    Ok((game, spent))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn town(points: u32) -> Session {
        let mut s = Session::new(1);
        s.active = idlever_core::Game::new_resident(1);
        s.lineage.bloodline.as_mut().unwrap().points = points;
        s
    }
    fn root_cost() -> u32 { idlever_core::legacy::root_prices().iter().sum() }

    #[test]
    fn real_costs_partial_and_complete_paths() {
        let root = root_cost();
        assert_eq!(idlever_core::legacy::CAP, 8);
        assert_eq!(root, 20_265, "current shipping curve's full root cost");
        let all_cost = root * idlever_core::legacy::IDS.len() as u32;
        assert_eq!(all_cost, 60_795, "all three roots must be funded independently");
        let source = town(all_cost); let before = source.save();
        let (all, spent) = upgrade_path(&source, "all").unwrap();
        assert_eq!(spent, 60_795);
        assert_eq!(all.lineage.gold, source.lineage.gold);
        let inherited = all.lineage.bloodline.as_ref().unwrap();
        assert_eq!(inherited.points, 0);
        assert_eq!(inherited.spent, spent);
        for id in idlever_core::legacy::IDS { assert_eq!(inherited.upgrades[id], idlever_core::legacy::CAP); }
        for path in ["all", "health"] {
            let (same, spent) = upgrade_path(&all, path).unwrap();
            assert_eq!(spent, 0);
            assert_eq!(same.save(), all.save(), "already capped paths are unchanged controls");
        }
        assert_eq!(source.save(), before);

        // Start from two genuine purchases, not an invented cheaper price or cap.
        let mut partial = town(root);
        partial.upgrade_hero("damage").unwrap();
        partial.upgrade_hero("damage").unwrap();
        assert_eq!(partial.lineage.bloodline.as_ref().unwrap().upgrades["damage"], 2);
        assert_eq!(partial.lineage.bloodline.as_ref().unwrap().points, 20_210);
        assert_eq!(partial.lineage.bloodline.as_ref().unwrap().spent, 55);
        let before = partial.save();
        let (finished, spent) = upgrade_path(&partial, "damage").unwrap();
        assert_eq!(spent, 20_210);
        assert_eq!(spent, idlever_core::legacy::root_prices()[2..].iter().sum::<u32>());
        let inherited = finished.lineage.bloodline.as_ref().unwrap();
        assert_eq!(inherited.upgrades["damage"], idlever_core::legacy::CAP);
        assert_eq!(inherited.points, 0);
        assert_eq!(inherited.spent, root);
        assert_eq!(finished.lineage.gold, partial.lineage.gold);
        assert_eq!(partial.save(), before);
    }

    #[test]
    fn refused_paths_do_not_mutate_source() {
        for points in [17, root_cost() - 1] {
            let s = town(points); let before = s.save();
            assert_eq!(upgrade_path(&s, "health").unwrap_err(), "health: More Legacy needed");
            assert_eq!(s.save(), before, "even a partly prepared clone is discarded on full-path refusal");
            assert_eq!(s.lineage.bloodline.as_ref().unwrap().spent, 0);
        }
        let s = town(root_cost()); let before = s.save();
        assert_eq!(upgrade_path(&s, "unknown").unwrap_err(), "unknown upgrade path unknown");
        assert_eq!(s.save(), before);
        // Enough for each individual root but one point short of all: preparation must reject the entire path.
        let s = town(root_cost() * idlever_core::legacy::IDS.len() as u32 - 1); let before = s.save();
        assert_eq!(upgrade_path(&s, "all").unwrap_err(), "all: More Legacy needed");
        assert_eq!(s.save(), before);

        let mut s = town(root_cost() * idlever_core::legacy::IDS.len() as u32);
        s.send();
        assert!(idlever_core::legacy::away(&s.active), "the funded refusal exercises a real away hero");
        let before = s.save();
        assert_eq!(upgrade_path(&s, "all").unwrap_err(), "all: hero away");
        assert_eq!(s.save(), before);
    }

    #[test]
    fn only_selected_bloodline_spends() {
        let root = root_cost();
        let mut s = town(root); let mut other = idlever_core::Game::new_resident(2);
        other.lineage.bloodline_id = 2;
        other.lineage.bloodline.as_mut().unwrap().points = root + 7;
        s.others.insert(2, other); s.next_id = 3;
        let before = s.others[&2].save(); let source = s.save();
        let (changed, spent) = upgrade_path(&s, "armour").unwrap();
        assert_eq!(spent, 20_265);
        assert_eq!(changed.selected, 1);
        assert_eq!(changed.others[&2].save(), before);
        assert_eq!(changed.lineage.gold, s.lineage.gold);
        assert_eq!(changed.lineage.bloodline.as_ref().unwrap().points, 0);
        assert_eq!(changed.lineage.bloodline.as_ref().unwrap().spent, root);
        assert_eq!(changed.lineage.bloodline.as_ref().unwrap().upgrades["armour"], idlever_core::legacy::CAP);
        assert_eq!(s.save(), source);

        s.select_bloodline(2).unwrap(); let before = s.others[&1].save(); let source = s.save();
        let (changed, spent) = upgrade_path(&s, "health").unwrap();
        assert_eq!(spent, 20_265);
        assert_eq!(changed.selected, 2);
        assert_eq!(changed.others[&1].save(), before);
        assert_eq!(changed.lineage.gold, s.lineage.gold);
        assert_eq!(changed.lineage.bloodline.as_ref().unwrap().points, 7);
        assert_eq!(changed.lineage.bloodline.as_ref().unwrap().spent, root);
        assert_eq!(changed.lineage.bloodline.as_ref().unwrap().upgrades["health"], idlever_core::legacy::CAP);
        assert_eq!(s.save(), source);
    }
}
