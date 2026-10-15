//! Selected advanced paths. State is bounded on the played actor and absent for old masks.
use crate::{
    engine::{Ctx, Run, HERO_ID},
    hero::Class,
    wire::{Ev, FiredSkill},
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Effect {
    BashCooldown,
    VanishCooldown,
    ShadowstepCooldown,
    DoubleShotCooldown,
    WardCooldown,
    NovaCooldown,
    BlinkCooldown,
    FastReloadCooldown,
    MeleeBlock,
    Damage,
    Range,
    Mark,
    Slow,
    Ward,
    Vanish,
    Chamber,
    AimSettle,
    Energy,
}
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    Armed,
    Consumed,
    Applied,
}
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum Combo {
    Oathguard,
    SiegeRhythm,
    Holdfast,
    Afterimage,
    VeiledRoute,
    CorridorVolley,
    MovingLine,
    StormCell,
    ChamberChain,
    LongWatch,
    BreachRoute,
    SmokeWalk,
    Ghostwalk,
    SilentFinish,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Charge {
    pub expires_t: u32,
    pub remaining: u8,
    pub source: u64,
    pub target: Option<u32>,
}
impl Charge {
    pub fn active(&self, now: u32) -> bool {
        self.remaining > 0 && now <= self.expires_t
    }
}
#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct State {
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    pub charges: BTreeMap<Combo, Charge>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_block_t: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub execution_t: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ward: Option<WardCast>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reload: Option<ReloadCast>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aim: Option<AimCast>,
    #[serde(skip_serializing_if = "zero")]
    pub pending_energy: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pending_source: Option<u64>,
    #[serde(skip_serializing_if = "zero")]
    pub pending_settle: u16,
}
fn zero(value: &u16) -> bool {
    *value == 0
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct WardCast {
    pub source: u64,
    pub absorbed: u32,
    pub shatter_used: bool,
    pub last_wall_used: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct ReloadCast {
    pub source: u64,
    pub item: u32,
    pub fast: bool,
    pub energy_debit: u32,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AimCast {
    pub source: u64,
    pub item: u32,
    pub target: u32,
    pub shortened: bool,
    pub recovered: bool,
}
/// Per-target original slow application, never a global marker that can leak between foes.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct SlowCast {
    pub source: u64,
    pub chilling_used: bool,
    pub conduct_used: bool,
}

pub fn enabled(run: &Run) -> bool {
    matches!(
        run.hero.class,
        Class::Fighter | Class::Rogue | Class::Ranger | Class::Caster | Class::Gunner
    ) && run.hero.class_skills & 0xfc0 != 0
}
pub fn has(run: &Run, class: Class, bit: u32) -> bool {
    run.hero.skill(class, bit) != 0
}
pub fn source(run: &Run) -> u64 {
    ((run.turn as u64) << 32) | run.actions as u64
}
pub struct ReceiptTarget {
    pub target: Option<u32>,
    pub expires_t: Option<u32>,
}
pub struct ChargeWindow {
    pub count: u8,
    pub ticks: u32,
}
pub fn receipt(
    run: &Run,
    cx: &mut Ctx,
    bit: u32,
    phase: Phase,
    effect: Effect,
    amount: i32,
    at: ReceiptTarget,
) {
    let ReceiptTarget { target, expires_t } = at;
    // Build authored identity once. A receipt clones only its actual two
    // strings, never twelve policy definitions and their tactic rows.
    static SKILLS: std::sync::OnceLock<Vec<(Class, Vec<FiredSkill>)>> = std::sync::OnceLock::new();
    let skills = SKILLS.get_or_init(|| {
        Class::EVERY
            .into_iter()
            .map(|class| {
                let skills = crate::class_tree::catalogue(class)
                    .into_iter()
                    .map(|node| FiredSkill {
                        id: format!("path:{}", node.id),
                        name: node.name,
                    })
                    .collect();
                (class, skills)
            })
            .collect()
    });
    let Some(skill) = skills
        .iter()
        .find(|(class, _)| *class == run.hero.class)
        .and_then(|(_, skills)| skills.get(bit as usize))
    else {
        return;
    };
    cx.events.push(Ev::ClassInteraction {
        t: run.turn,
        src: HERO_ID,
        dst: target,
        skill: Box::new(skill.clone()),
        phase,
        effect,
        amount,
        expires_t,
    });
}
pub fn charge(run: &Run, combo: Combo) -> Option<&Charge> {
    if !enabled(run) {
        return None;
    }
    run.hero
        .advanced
        .as_deref()?
        .charges
        .get(&combo)
        .filter(|c| c.active(run.turn))
}
pub fn arm(
    run: &mut Run,
    cx: &mut Ctx,
    combo: Combo,
    bit: u32,
    effect: Effect,
    window: ChargeWindow,
    target: Option<u32>,
) -> bool {
    let ChargeWindow { count, ticks } = window;
    if !enabled(run) || count == 0 {
        return false;
    }
    let count = count.min(2);
    // A repeated trigger cannot refill a spent charge or refresh an unexpired window.
    if run
        .hero
        .advanced
        .as_deref()
        .and_then(|s| s.charges.get(&combo))
        .is_some_and(|c| run.turn <= c.expires_t)
    {
        return false;
    }
    let expires_t = run.turn.saturating_add(ticks);
    let source = source(run);
    run.hero
        .advanced
        .get_or_insert_with(Default::default)
        .charges
        .insert(
            combo,
            Charge {
                expires_t,
                remaining: count,
                source,
                target,
            },
        );
    receipt(
        run,
        cx,
        bit,
        Phase::Armed,
        effect,
        count as i32,
        ReceiptTarget {
            target,
            expires_t: Some(expires_t),
        },
    );
    true
}
pub fn consume(
    run: &mut Run,
    cx: &mut Ctx,
    combo: Combo,
    bit: u32,
    effect: Effect,
) -> Option<Charge> {
    consume_at(run, cx, combo, bit, effect, None)
}
pub fn consume_at(
    run: &mut Run,
    cx: &mut Ctx,
    combo: Combo,
    bit: u32,
    effect: Effect,
    target: Option<u32>,
) -> Option<Charge> {
    if !has(run, run.hero.class, bit) {
        return None;
    }
    let c = charge(run, combo)?.clone();
    run.hero
        .advanced
        .as_deref_mut()?
        .charges
        .get_mut(&combo)?
        .remaining -= 1;
    receipt(
        run,
        cx,
        bit,
        Phase::Consumed,
        effect,
        1,
        ReceiptTarget {
            target,
            expires_t: Some(c.expires_t),
        },
    );
    Some(c)
}

/// Reduce an actual remaining cooldown, emitting only the applied delta.
pub fn cooldown(
    run: &mut Run,
    cx: &mut Ctx,
    bit: u32,
    effect: Effect,
    limit: i32,
    target: Option<u32>,
) -> i32 {
    let value = match effect {
        Effect::BashCooldown => &mut run.hero.bash_cd,
        Effect::VanishCooldown => &mut run.hero.vanish_cd,
        Effect::DoubleShotCooldown => &mut run.hero.double_cd,
        Effect::WardCooldown => &mut run.hero.ward_cd,
        Effect::NovaCooldown => &mut run.hero.nova_cd,
        Effect::BlinkCooldown => &mut run.hero.blink_cd,
        _ => return 0,
    };
    let amount = (*value).max(0).min(limit.max(0));
    *value -= amount;
    if amount > 0 {
        receipt(
            run,
            cx,
            bit,
            Phase::Applied,
            effect,
            amount,
            ReceiptTarget {
                target,
                expires_t: None,
            },
        );
    }
    amount
}
/// Pending refunds are recorded only by successful verbs and redeemed by the
/// scheduler after the real action debit. A bit cannot be queued twice.
pub fn queue_energy(run: &mut Run, bit: u32) {
    if enabled(run) {
        let source = source(run);
        let state = run.hero.advanced.get_or_insert_with(Default::default);
        if state.pending_source != Some(source) {
            state.pending_energy = 0;
        }
        state.pending_source = Some(source);
        state.pending_energy |= 1u16 << bit;
    }
}
pub fn after_action(run: &mut Run, cx: &mut Ctx, debit: i32) {
    let source = source(run);
    let pending = run
        .hero
        .advanced
        .as_deref_mut()
        .map(|s| {
            let bits = std::mem::take(&mut s.pending_energy);
            if s.pending_source.take() == Some(source) {
                bits
            } else {
                0
            }
        })
        .unwrap_or(0);
    if let Some(reload) = run
        .hero
        .advanced
        .as_deref_mut()
        .and_then(|s| s.reload.as_mut())
        .filter(|r| r.source == source)
    {
        reload.energy_debit = debit.max(0) as u32;
    }
    // All concurrent refunds share this action's debit, never manufacture an
    // extra action or refund a helper call that had no scheduler commitment.
    let mut remaining = debit.max(0).min((99 - run.hero.energy).max(0));
    for bit in 6..12 {
        if pending & (1 << bit) != 0 {
            let add = (debit.max(0) / 2).min(remaining);
            remaining -= add;
            if add > 0 {
                run.hero.energy = run.hero.energy.saturating_add(add);
                receipt(
                    run,
                    cx,
                    bit,
                    Phase::Applied,
                    Effect::Energy,
                    add,
                    ReceiptTarget {
                        target: None,
                        expires_t: None,
                    },
                );
            }
        }
    }
    let settle = run
        .hero
        .advanced
        .as_deref_mut()
        .map(|s| std::mem::take(&mut s.pending_settle))
        .unwrap_or(0);
    let current_aim = run
        .hero
        .advanced
        .as_deref()
        .and_then(|s| s.aim.as_ref())
        .filter(|a| a.source == source)
        .is_some_and(|a| {
            run.gun_skills
                .as_ref()
                .and_then(|s| s.aim)
                .is_some_and(|actual| actual.item == a.item && actual.target == a.target)
        });
    if current_aim {
        for bit in [7, 10] {
            if settle & (1 << bit) != 0 {
                remaining -= shorten_aim(run, cx, bit, remaining);
            }
        }
    }
}

pub fn trap_triggered(run: &mut Run, cx: &mut Ctx, mi: usize) {
    if run.monsters[mi].marked <= 0 {
        return;
    }
    let id = run.monsters[mi].id;
    if has(run, Class::Ranger, 6) {
        let before = run.monsters[mi].marked;
        run.monsters[mi].marked = before.saturating_add(10).min(50).max(before);
        let add = run.monsters[mi].marked - before;
        if add > 0 {
            receipt(
                run,
                cx,
                6,
                Phase::Applied,
                Effect::Mark,
                add,
                ReceiptTarget {
                    target: Some(id),
                    expires_t: None,
                },
            );
        }
    }
    if has(run, Class::Ranger, 10) {
        cooldown(run, cx, 10, Effect::DoubleShotCooldown, 20, Some(id));
    }
}

/// A fresh slow application belongs to this target and cast. Copied slow has
/// no marker, preventing Conduct from recursively propagating its own copy.
pub fn slowed(run: &mut Run, cx: &mut Ctx, mi: usize) {
    if has(run, Class::Caster, 6) || has(run, Class::Caster, 10) {
        let source = source(run);
        run.monsters[mi].advanced_slow = Some(SlowCast {
            source,
            chilling_used: false,
            conduct_used: false,
        });
    }
    if has(run, Class::Caster, 8) && run.hero.ward_t > 0 {
        let before = run.monsters[mi].slow_t;
        run.monsters[mi].slow_t = before.saturating_add(10).min(50).max(before);
        let add = run.monsters[mi].slow_t - before;
        if add > 0 {
            receipt(
                run,
                cx,
                8,
                Phase::Applied,
                Effect::Slow,
                add,
                ReceiptTarget {
                    target: Some(run.monsters[mi].id),
                    expires_t: None,
                },
            );
        }
    }
}

pub fn bolt_hit(run: &mut Run, cx: &mut Ctx, mi: usize) {
    if !has(run, Class::Caster, 6) || !run.monsters[mi].is_boss() || run.monsters[mi].slow_t <= 0 {
        return;
    }
    let Some(marker) = run.monsters[mi].advanced_slow.as_mut() else {
        return;
    };
    if !marker.chilling_used {
        marker.chilling_used = true;
        let id = run.monsters[mi].id;
        cooldown(run, cx, 6, Effect::WardCooldown, 10, Some(id));
    }
    if !has(run, Class::Caster, 10) {
        return;
    }
    let Some(marker) = run.monsters[mi].advanced_slow.as_ref() else {
        return;
    };
    if marker.conduct_used {
        return;
    }
    let p = run.monsters[mi].pos;
    let Some(other) = (0..run.monsters.len()).filter(|&i| i != mi).find(|&i| {
        let m = &run.monsters[i];
        m.hp > 0
            && m.hostile()
            && m.pos.adjacent(p)
            && run.floor.map.is_visible(m.pos)
            && run.floor.map.los(run.hero.pos, m.pos)
            && m.slow_t < run.monsters[mi].slow_t.min(10)
    }) else {
        return;
    };
    run.monsters[mi]
        .advanced_slow
        .as_mut()
        .unwrap()
        .conduct_used = true;
    let before = run.monsters[other].slow_t;
    run.monsters[other].slow_t = run.monsters[mi].slow_t.min(10);
    // A copied effect is not an original cast, even if it replaces an expired marker.
    run.monsters[other].advanced_slow = None;
    receipt(
        run,
        cx,
        10,
        Phase::Applied,
        Effect::Slow,
        run.monsters[other].slow_t - before,
        ReceiptTarget {
            target: Some(run.monsters[other].id),
            expires_t: None,
        },
    );
}

#[derive(Clone, Copy)]
pub struct MeleeGuard {
    pub prevented: i32,
    pub ward: i32,
    pub attacker: u32,
    pub melee: bool,
}
/// Called only after the pet-interception gate (or a fully blunted zero hit).
pub fn observed_guard(run: &mut Run, cx: &mut Ctx, guard: MeleeGuard) {
    if guard.melee && guard.prevented > 0 && has(run, Class::Fighter, 6) {
        run.hero
            .advanced
            .get_or_insert_with(Default::default)
            .last_block_t = Some(run.turn);
    }
    if guard.ward > 0 && has(run, Class::Caster, 11) {
        if let Some(ward) = run
            .hero
            .advanced
            .as_deref_mut()
            .and_then(|s| s.ward.as_mut())
            .filter(|w| !w.last_wall_used)
        {
            ward.absorbed = ward.absorbed.saturating_add(guard.ward as u32);
            if ward.absorbed >= 4 {
                ward.last_wall_used = true;
                cooldown(run, cx, 11, Effect::BlinkCooldown, 20, Some(guard.attacker));
            }
        }
    }
}
/// Extra guard charges reduce actual remaining damage; a zero hit or an
/// interception cannot spend a charge or claim a hypothetical reduction.
pub fn block_damage(run: &mut Run, cx: &mut Ctx, mut damage: i32, attacker: u32) -> i32 {
    for (combo, bit) in [(Combo::Oathguard, 7), (Combo::Holdfast, 10)] {
        if damage > 0
            && consume_at(run, cx, combo, bit, Effect::MeleeBlock, Some(attacker)).is_some()
        {
            let amount = damage.min(2);
            damage -= amount;
            receipt(
                run,
                cx,
                bit,
                Phase::Applied,
                Effect::MeleeBlock,
                amount,
                ReceiptTarget {
                    target: Some(attacker),
                    expires_t: None,
                },
            );
            if has(run, Class::Fighter, 6) {
                run.hero
                    .advanced
                    .get_or_insert_with(Default::default)
                    .last_block_t = Some(run.turn);
            }
        }
    }
    damage
}

pub fn reload_started(run: &mut Run, item: u32, fast: bool) {
    if has(run, Class::Gunner, 7) || has(run, Class::Gunner, 8) {
        let source = source(run);
        run.hero
            .advanced
            .get_or_insert_with(Default::default)
            .reload = Some(ReloadCast {
            source,
            item,
            fast,
            energy_debit: 0,
        });
    }
}
pub fn reload_completed(run: &mut Run, cx: &mut Ctx, item: u32, still_owned: bool) {
    let Some(reload) = run
        .hero
        .advanced
        .as_deref_mut()
        .and_then(|s| s.reload.take())
        .filter(|r| r.item == item)
    else {
        return;
    };
    // A stolen/dropped physical gun finishing its clock cannot benefit its
    // former owner. Completion remains physical and happens normally.
    if !still_owned {
        return;
    }
    if reload.fast && has(run, Class::Gunner, 7) {
        arm(
            run,
            cx,
            Combo::ChamberChain,
            7,
            Effect::AimSettle,
            ChargeWindow {
                count: 1,
                ticks: 10,
            },
            None,
        );
    }
    if has(run, Class::Gunner, 8) && consume(run, cx, Combo::SmokeWalk, 8, Effect::Energy).is_some()
    {
        let add = (reload.energy_debit / 2).min(i32::MAX as u32) as i32;
        if add > 0 {
            run.hero.energy = run.hero.energy.saturating_add(add);
            receipt(
                run,
                cx,
                8,
                Phase::Applied,
                Effect::Energy,
                add,
                ReceiptTarget {
                    target: None,
                    expires_t: None,
                },
            );
        }
    }
}

pub fn aimed(run: &mut Run, cx: &mut Ctx, item: u32, target: u32) {
    if !enabled(run) {
        return;
    }
    let source = source(run);
    run.hero.advanced.get_or_insert_with(Default::default).aim = Some(AimCast {
        source,
        item,
        target,
        shortened: false,
        recovered: false,
    });
    for (combo, bit) in [(Combo::ChamberChain, 7), (Combo::LongWatch, 10)] {
        if consume_at(run, cx, combo, bit, Effect::AimSettle, Some(target)).is_some() {
            run.hero.advanced.as_deref_mut().unwrap().pending_settle |= 1 << bit;
        }
    }
}

/// Predict only the energy clock that actually gates the next hero action.
/// Speed's sole timed component is speed_t; statuses expire after this tick,
/// while fractional pace uses the following absolute tick coordinates.
fn future_energy(run: &Run, ticks: u32) -> i32 {
    let base = run.hero.speed() - if run.hero.speed_t > 0 { 5 } else { 0 };
    let mut energy = run.hero.energy;
    for k in 1..=ticks {
        let Some(at) = run.turn.checked_add(k) else {
            return i32::MIN;
        };
        energy = energy
            .saturating_add(
                base + if i64::from(run.hero.speed_t) > i64::from(k) {
                    5
                } else {
                    0
                },
            )
            .saturating_add(crate::kit::pace_energy(run.hero.pace, at));
    }
    energy
}
fn shorten_aim(run: &mut Run, cx: &mut Ctx, bit: u32, debit: i32) -> i32 {
    if debit <= 0 || run.hero.energy >= 100 {
        return 0;
    }
    let Some(first) = (1..=1000).find(|&k| future_energy(run, k) >= 100) else {
        return 0;
    };
    if first <= 1 {
        return 0;
    }
    let add = (100 - future_energy(run, first - 1)).max(0);
    if add == 0 || add > debit || run.hero.energy.saturating_add(add) >= 100 {
        return 0;
    }
    run.hero.energy += add;
    if let Some(aim) = run
        .hero
        .advanced
        .as_deref_mut()
        .and_then(|s| s.aim.as_mut())
    {
        aim.shortened = true;
    }
    receipt(
        run,
        cx,
        bit,
        Phase::Applied,
        Effect::AimSettle,
        1,
        ReceiptTarget {
            target: None,
            expires_t: None,
        },
    );
    add
}

pub fn gun_hit(run: &mut Run, cx: &mut Ctx, mi: usize, prepared: bool, burst: bool, killed: bool) {
    let target = run.monsters[mi].id;
    if prepared
        && run.monsters[mi].is_boss()
        && run.floor.map.is_visible(run.monsters[mi].pos)
        && has(run, Class::Gunner, 6)
    {
        let item = run.hero.weapon.as_ref().map(|w| w.id);
        let eligible = run
            .hero
            .advanced
            .as_deref()
            .and_then(|s| s.aim.as_ref())
            .is_some_and(|a| Some(a.item) == item && a.target == target && !a.recovered);
        if eligible {
            run.hero
                .advanced
                .as_deref_mut()
                .unwrap()
                .aim
                .as_mut()
                .unwrap()
                .recovered = true;
            if let Some(w) = run.hero.weapon.as_mut() {
                if let (Some(profile), Some(chambers)) =
                    (crate::firearm::Profile::of(&w.kind), w.firearm.as_mut())
                {
                    if chambers.loaded < profile.capacity {
                        chambers.loaded += 1;
                        receipt(
                            run,
                            cx,
                            6,
                            Phase::Applied,
                            Effect::Chamber,
                            1,
                            ReceiptTarget {
                                target: Some(target),
                                expires_t: None,
                            },
                        );
                    }
                }
            }
        }
    }
    if killed
        && prepared
        && has(run, Class::Gunner, 10)
        && run
            .hero
            .advanced
            .as_deref()
            .and_then(|s| s.aim.as_ref())
            .is_some_and(|a| a.target == target && a.shortened)
    {
        arm(
            run,
            cx,
            Combo::LongWatch,
            10,
            Effect::AimSettle,
            ChargeWindow {
                count: 1,
                ticks: 10,
            },
            Some(target),
        );
    }
    if killed && burst && run.monsters[mi].pos.adjacent(run.hero.pos) {
        if has(run, Class::Gunner, 9) {
            let amount = run
                .gun_skills
                .as_ref()
                .map(|s| s.fast_ready.saturating_sub(run.turn).min(10))
                .unwrap_or(0);
            if amount > 0 {
                run.gun_skills.as_mut().unwrap().fast_ready -= amount;
                receipt(
                    run,
                    cx,
                    9,
                    Phase::Applied,
                    Effect::FastReloadCooldown,
                    amount as i32,
                    ReceiptTarget {
                        target: Some(target),
                        expires_t: None,
                    },
                );
            }
        }
        if has(run, Class::Gunner, 11) {
            arm(
                run,
                cx,
                Combo::BreachRoute,
                11,
                Effect::Energy,
                ChargeWindow {
                    count: 1,
                    ticks: 10,
                },
                Some(target),
            );
        }
    }
}
