//! Cut 29 §2 (docs/PROGRESSION.md §6, the owner's request): the system curriculum — the camp's
//! systems open one at a time, each on the moment that makes it mean something; no tutorial text
//! (the reveal is the lesson). Core data: which systems a lineage has open (`LineageState::systems`,
//! sticky), each one's trigger, and the ones opened since the camp last looked (the glint). The
//! systems gate the editor's vocabulary and the camp's tiles on the client; a sim replays whatever
//! the set holds, and the bots (`metrics::setup`) open every system (`open_all`) — their play is the
//! same as before. An old save opens what its lineage has already used (`update` reads state).
use crate::engine::LineageState;
use crate::wire::SystemInfo;

/// A system and the moment that opens it (≤ 3 words: the client's glint may name it).
pub struct SystemDef {
    pub id: &'static str,
    pub trigger: &'static str,
}

const fn sys(id: &'static str, trigger: &'static str) -> SystemDef {
    SystemDef { id, trigger }
}

/// A system with a minimum age (Cut233: the hours are `balance` `unlocks.hours`; the pen's group also has the fallback
/// age `unlocks.pen_fallback_h`).
const fn aged(id: &'static str, trigger: &'static str) -> SystemDef {
    SystemDef { id, trigger }
}

impl SystemDef {
    /// Cut 30 (docs/PROGRESSION_V2.md §4): the lineage's age (hours, offline included) the system waits for besides
    /// its trigger (`balance` `unlocks.hours`).
    pub fn min_age_h(&self) -> u32 {
        let h = &crate::balance::get().unlocks.hours;
        match self.id {
            "party" => h.party,
            "kennel" => h.kennel,
            "stances" => h.stances,
            "tactics" => h.tactics,
            "bank" => h.bank,
            "quests" => h.quests,
            "class" => h.class,
            "start" => h.start,
            "tactic2" => h.tactic2,
            "automations" => h.automations,
            id if PEN.contains(&id) => h.pen,
            _ => 0,
        }
    }
    /// The age that opens it without its trigger (0: none) — the pen's group (`balance` `unlocks.pen_fallback_h`).
    pub fn fallback_h(&self) -> u32 {
        if PEN.contains(&self.id) { crate::balance::get().unlocks.pen_fallback_h } else { 0 }
    }
}

/// The curriculum in order. Cut 30 (docs/CUT30.md, Reveal): day 0 is the camp — the send, the shaft's
/// headline; the first gold home brings the blacksmith and the exits; the first find kept the
/// storehouse; the first stray the party, the first tame the kennel; the Warlord met a second stance
/// (the stance panel), slain the tactics, the waystones and the quest board; a purse of a night's net
/// the bank; heir 3 the temperaments (the wake's cards); the Lich met a second tactic slot; the Mother
/// met (or a 3-day stall) **the pen** — the editor, the dial, the marks catalogue, the order, the vs line,
/// the tags, the walls, the divergence scene, the automations, the routes. The oath board is gone (the
/// quest board is its successor); the trait slots wait (not in Cut 30).
pub const SYSTEMS: &[SystemDef] = &[
    sys("send", ""),
    sys("headline", ""),
    sys("death", "first death"),
    // Cut 118 (owner amendment 2): the heir order — a rung that retires picking heirs, lit with the first death
    sys("heirs", "six delves"),
    sys("exits", "first gold home"),
    sys("forge", "four delves"),
    sys("loadout", "first gold home"),
    aged("party", "first stray"),
    aged("kennel", "first tame"),
    aged("stances", "meet Captain"),
    aged("tactics", "slay Warlord"),
    aged("bank", "a night's purse"),
    aged("quests", "slay Warlord"),
    aged("class", "second class"),
    aged("start", "slay Warlord"),
    sys("temperament", "six delves"),
    aged("tactic2", "meet Lich"),
    aged("pen", "meet Mother"),
    aged("edit", "meet Mother"),
    aged("dial", "meet Mother"),
    aged("unlocks", "meet Mother"),
    aged("reorder", "meet Mother"),
    aged("vs", "meet Mother"),
    aged("tags", "meet Mother"),
    aged("walls", "meet Mother"),
    aged("divergence", "meet Mother"),
    aged("route", "meet Mother"),
    aged("automations", "meet Lich"),
    sys("route2", "an oath kept"),
    sys("heir_pick", "an oath kept"),
];

// Cut 30 (PROGRESSION_V2 §4): the pen waits for the Mother met, and opens at 5 days whatever the climb
// (`balance` `unlocks.pen_fallback_h`, 120). Cut 110 (owner 2026-10-08, cohort ad71e72: the pen never opened in a
// session, expression 0.3 on both cards): no age on top of the Mother — she is the late beat (D13, a band boss); was
// 72 h (`unlocks.hours.pen`, 0).

/// The systems open on day 0.
pub const DAY0: [&str; 2] = ["send", "headline"];

/// The systems the pen brings (the Mother met, a 3-day stall, an old save's set).
pub const PEN: [&str; 10] = ["pen", "edit", "dial", "unlocks", "reorder", "vs", "tags", "walls", "divergence", "route"];

/// Whether `id`'s trigger has happened for this lineage (read off its state; `plateau` is kept for the
/// caller's signature — the order and the vs line come with the pen now).
fn triggered(l: &LineageState, id: &str, plateau: bool) -> bool {
    let _ = plateau;
    let warlord_met = crate::meta::bosses_met(l) >= 1 || l.pkg.meets.contains_key("goblin_warlord");
    let pen = l.pkg.pen_open || l.pkg.literal;
    match id {
        "send" | "headline" => true,
        "death" => !l.graveyard.is_empty() || l.heir > 1,
        "heirs" => crate::packages::temperament_open(l),
        "forge" => crate::town::built(l,"blacksmith") || crate::town::build_ready(l,"blacksmith"),
        "exits" | "loadout" => l.gold_ledger.iter().any(|x| x.delta > 0 && crate::engine::is_exit_why(&x.why)) || !l.banked_depths.is_empty() || crate::town::built(l, "blacksmith"),
        "party" => l.facts.contains("stray") || l.all_companions().next().is_some(),
        "kennel" => crate::town::built(l, "kennel"),
        "stances" => warlord_met || l.facts.contains("foe:goblin_captain"),
        "tactics" | "start" | "quests" => l.kills.contains("goblin_warlord") || !l.waystones.is_empty() && crate::engine::reach(l.best_depth) >= 9,
        "bank" => crate::town::built(l, "bank"),
        "temperament" => crate::packages::temperament_open(l),
        "pen" | "edit" | "dial" | "unlocks" | "reorder" | "vs" | "tags" | "walls" | "divergence" | "route" => pen || crate::packages::mother_met(l),
        "tactic2" => crate::packages::tactic_slots(l) >= 2,
        "class" => ["ranger", "caster"].iter().any(|c| l.unlocks.contains(*c)) || l.classes.iter().any(|(k, c)| k != "fighter" && (c.xp > 0 || c.level > 1)),
        "automations" => pen && crate::meta::bosses_met(l) >= 3,
        "route2" => l.unlocks.contains("route2"),
        "heir_pick" => l.unlocks.contains("heir_pick"),
        _ => false,
    }
}

/// Open every system whose trigger has happened; the ids opened now (in curriculum order), also
/// queued on `systems_new` for the camp's glint.
pub fn update(l: &mut LineageState, plateau: bool) -> Vec<String> {
    update_news(l, plateau, &mut None)
}

/// `update` under a run report's news budget (Cut232, `news`): `Some(n)` — at most `n` more reveals this report
/// (each one spends one; `Some(0)` holds every gated reveal for a later report); `None` — no budget beyond the
/// one-a-report `reveal_left`.
pub fn update_news(l: &mut LineageState, plateau: bool, news: &mut Option<u32>) -> Vec<String> {
    // (a harness's lineage opens on the trigger alone, as before Cut 30)
    let gate = !l.pkg.literal;
    update_inner(l, plateau, gate, news, false)
}

/// `update_news` at the end of a report the player looks at (a watched run's, an absence's last): a reveal this
/// report holds is owed (`LineageState::reveal_owed`) — it opens at the next quiet report without waiting for the
/// one-a-report budget again, so a busy session never leaves a backlog trailing the absences a reveal a day.
pub fn update_report_end(l: &mut LineageState, plateau: bool, news: &mut Option<u32>) -> Vec<String> {
    let gate = !l.pkg.literal;
    update_inner(l, plateau, gate, news, true)
}

/// The next system to come (the first closed one in order, the queue's head first).
pub fn next(l: &LineageState) -> Option<crate::wire::RevealNext> {
    let s = SYSTEMS.iter().find(|s| l.reveal_queue.first().map_or(!l.systems.contains(s.id), |q| q == s.id))?;
    let t = triggered(l, s.id, false);
    let age = l.age_h();
    let wait = if t { s.min_age_h().saturating_sub(age) } else if s.fallback_h() > 0 { s.fallback_h().saturating_sub(age) } else { 0 };
    Some(crate::wire::RevealNext { id: s.id.into(), trigger: s.trigger.into(), triggered: t, wait_h: wait })
}

/// Whether `s` is ready now: its trigger and its age, or its fallback age.
fn ready(l: &LineageState, s: &SystemDef, plateau: bool, gate: bool) -> bool {
    if !gate {
        return triggered(l, s.id, plateau);
    }
    // (a pen already open — an old save's — brings its group whatever the age)
    if l.pkg.pen_open && PEN.contains(&s.id) {
        return true;
    }
    let age = l.age_h();
    (triggered(l, s.id, plateau) && age >= s.min_age_h()) || (s.fallback_h() > 0 && age >= s.fallback_h())
}

/// Journal explanations share the actual milestone/age gate and do not open it.
pub fn journal_gate(l: &LineageState, id: &str) -> Option<(bool, u32, u32, bool)> {
    let s = SYSTEMS.iter().find(|s| s.id == id)?;
    Some((triggered(l, id, false), if l.pkg.literal { 0 } else { s.min_age_h() },
        if l.pkg.literal { 0 } else { s.fallback_h() }, ready(l, s, false, !l.pkg.literal)))
}

/// Read-only explanation for the pen; shares the actual trigger and readiness checks.
pub fn pen_needs(l: &LineageState) -> Vec<String> {
    if l.pkg.pen_open || l.pkg.literal {
        return Vec::new();
    }
    let s = SYSTEMS.iter().find(|s| s.id == "pen").expect("pen system");
    if ready(l, s, false, true) {
        return vec!["Upcoming reports".into()];
    }
    let mut needs = Vec::new();
    if !triggered(l, s.id, false) {
        needs.push("Meet Bloat Mother".into());
    }
    if l.age_h() < s.min_age_h() {
        needs.push(format!("{}h elapsed", s.min_age_h()));
    }
    needs.push(format!("or {}h elapsed", s.fallback_h()));
    needs
}

/// Blind 1fb7786: a system of the pen's group whose trigger (the Mother met) has come — it opens outside the
/// one-a-report budget (the 5-day fallback alone still waits its turn in the queue).
pub fn pen_due(l: &LineageState, id: &str) -> bool {
    PEN.contains(&id) && triggered(l, id, false)
}

/// `update`, the age gates and the reveal budget on (`gate`) or off (an old save's upgrade, a harness).
/// Cut 30 (PROGRESSION_V2 §4): at most `LineageState::reveal_left` new systems a report — a unit is the
/// run of systems that share a trigger (the blacksmith's three, the pen's group) — the rest wait in
/// `reveal_queue` in curriculum order.
pub fn update_with(l: &mut LineageState, plateau: bool, gate: bool) -> Vec<String> {
    update_inner(l, plateau, gate, &mut None, false)
}

fn update_inner(l: &mut LineageState, plateau: bool, gate: bool, news: &mut Option<u32>, owe: bool) -> Vec<String> {
    let mut out = Vec::new();
    let mut queue = Vec::new();
    let mut i = 0;
    while i < SYSTEMS.len() {
        let s = &SYSTEMS[i];
        // the unit: this system and the next ones with its trigger and age
        let mut j = i + 1;
        while j < SYSTEMS.len() && !s.trigger.is_empty() && SYSTEMS[j].trigger == s.trigger && SYSTEMS[j].min_age_h() == s.min_age_h() {
            j += 1;
        }
        let mut unit: Vec<&SystemDef> = SYSTEMS[i..j].iter().filter(|u| !l.systems.contains(u.id) && ready(l, u, plateau, gate)).collect();
        // (Cut232: under a report's news budget one reveal is one trigger — `first gold home` brings the exits and the
        // loadout, `six delves` the heirs and the temperaments, though the curriculum lists them apart)
        if news.is_some() && !unit.is_empty() && !s.trigger.is_empty() {
            unit.extend(SYSTEMS[j..].iter().filter(|u| u.trigger == s.trigger && u.min_age_h() == s.min_age_h() && !l.systems.contains(u.id) && ready(l, u, plateau, gate)));
        }
        // Cut 118 §6: a feat (a trial cleared, a sought boss slain) lights a unit whose trigger has come before its
        // age — the time fallback stands for everyone else
        let mut by_feat = false;
        let quiet = *news != Some(0);
        if unit.is_empty() && gate && quiet && !l.feats.off && l.feats.feats > l.feats.feats_used {
            unit = SYSTEMS[i..j].iter().filter(|u| !l.systems.contains(u.id) && triggered(l, u.id, plateau)).collect();
            by_feat = !unit.is_empty();
        }
        i = j;
        if unit.is_empty() {
            continue;
        }
        // (blind 1fb7786, A: the Mother slain, the pen `locked · Upcoming reports` for the session's last 20 min —
        // owner: the pen opens at the Mother met; its group never waits in the one-a-report queue)
        let free = unit.iter().all(|u| DAY0.contains(&u.id) || pen_due(l, u.id));
        // (Cut232: a report that already brought a decision holds the reveal for a later one — owed: it opens at the
        // next quiet report, inside an absence too, without waiting for the one-a-report budget again)
        let owed = unit.iter().any(|u| l.reveal_owed.contains(u.id));
        if gate && !free && (!quiet || !by_feat && !owed && l.reveal_left == 0) {
            if owe && !quiet && (by_feat || owed || l.reveal_left > 0) {
                l.reveal_owed.insert(unit[0].id.to_string());
            }
            queue.push(unit[0].id.to_string());
            continue;
        }
        if gate && !free && !by_feat && !owed {
            l.reveal_left -= 1;
        }
        for u in &unit {
            l.reveal_owed.remove(u.id);
        }
        if gate && !free {
            if let Some(n) = news.as_mut() {
                *n -= 1;
            }
        }
        if by_feat {
            l.feats.feats_used += 1;
        }
        for u in unit {
            // (Cut 118 §6: what lit it)
            let lit = if by_feat {
                format!("feat: {}", l.feats.last_feat)
            } else if !gate || (triggered(l, u.id, plateau) && l.age_h() >= u.min_age_h()) {
                u.trigger.to_string()
            } else {
                "time".to_string()
            };
            if !lit.is_empty() && !l.feats.off {
                l.feats.lit_by.insert(u.id.to_string(), lit);
            }
            l.systems.insert(u.id.to_string());
            out.push(u.id.to_string());
        }
    }
    l.reveal_queue = queue;
    // the pen's group is the packages' pen
    if l.systems.contains("pen") && !l.pkg.pen_open && !l.pkg.literal {
        l.pkg.pen_open = true;
        crate::packages::recompile(l);
    }
    for id in &out {
        if !DAY0.contains(&id.as_str()) && !l.systems_new.contains(id) {
            l.systems_new.push(id.clone());
        }
    }
    out
}

/// An old save opens what its lineage has used: every triggered system, and the plateau's two (the
/// order and the vs line) once any row of its sets is the player's own.
pub fn upgrade(l: &mut LineageState) {
    let fresh = l.systems.is_empty();
    let edited = l.sets.iter().any(|s| s.rows.iter().any(|r| r.origin.as_deref() != Some("preset")));
    update_with(l, fresh && edited, false);
    // Cut 30: the retired ids (the oath board, the trait slots) close; the pen's group is the old editor
    for gone in ["oaths", "traits", "blood"] {
        l.systems.remove(gone);
    }
    if fresh {
        l.systems_new.clear();
    }
}

/// Every system open (the bots: `metrics::setup`; nothing glints).
pub fn open_all(l: &mut LineageState) {
    for s in SYSTEMS {
        l.systems.insert(s.id.to_string());
    }
    l.systems_new.clear();
}

pub fn is_open(l: &LineageState, id: &str) -> bool {
    l.systems.contains(id)
}

/// The curriculum on the wire: every system in order, open or not, with its trigger; `new` the
/// ones opened since the camp last looked.
pub fn wire(l: &LineageState) -> Vec<SystemInfo> {
    SYSTEMS.iter().map(|s| SystemInfo { id: s.id.into(), open: l.systems.contains(s.id), trigger: s.trigger.into(), new: l.systems_new.iter().any(|x| x == s.id), lit_by: l.feats.lit_by.get(s.id).cloned() }).collect()
}
