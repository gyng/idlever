# Native advanced paths — implementation notes2026-10-16

Source work only while the exclusive R6 GPU lane is held; no compilation,
execution, package or measured-pass claim. Full30interaction/five-class scope
is retained. Root owns client/wire presentation and painted icons.

The authored catalogue appends each class's six advanced IDs at bits6–11;
Clown/Engineer remain six nodes. `cut253_catalogue` exports actual authored
Rust definitions, explicitly controlled catalogue data rather than earned
state. It is prepared but has not yet been compiled/run. Current8879 contains
no advanced implementation and must not be claimed to return72nodes.

Rally refinement: a qualifying block is a **landed, adjacent, non-ranged enemy
melee attack against the actual hero that prevents positive raw damage through
the existing mitigation/guard pipeline**. A miss, hazard, ranged blow or ally/
pet interception does not qualify. No standalone block verb is invented.
The latest actual block tick permits a successful second wind within10ticks
(inclusive deadline) to reduce remaining bash cooldown by at most20 once for
that wind. Actual reduction, not nominal20, is the receipt amount. This source
interpretation is accepted by root and requires paired actual-action tests.

No-advanced actors preserve old bits/compiled rows and allocate no new combo
state or RNG draws. Clown/Engineer already have3tiers: their existing authored
child-before-root compilation order must also stay exact when no advanced node
is selected. More-specific descendant-first ordering applies when advanced
nodes are selected. Recursive qualification rejects stored child IDs whose
parent/grandparent is absent or unqualified.

Actual actor IDs remain engine::HERO_ID=1; the briefly suggested0was checked
against engine.rs and corrected by root. Receipts use canonical actor/target
IDs, never a newly invented hero identity.

Source audit correction: old Rogue Shadowstep has no cooldown. Root explicitly
rejected adding a selected-path cooldown just to manufacture a benefit. The
accepted interactions preserve that existing timing: Afterimage's successful
ambush arms a ten-tick legal Shadowstep that reduces actual remaining **Vanish**
cooldown by at most20; Ghostwalk's smoke→Shadowstep arms one actual Backstab
+2 applied damage within10ticks; Silent Finish's below25%-HP successful ambush
arms one legal Shadowstep returning50% of its actual debit within10ticks.
Combined returns share the real action debit and cannot make another same-tick
action eligible. No healing, invisibility refresh or new cooldown is introduced.
Patient Ambush reports only actual retained pre-attack Vanish, capped at3ticks.

Guard bookkeeping happens after the pet-interception gate. Fully blunted landed
hits can qualify; misses, ranged blows and intercepted blows cannot qualify
Rally. Last Wall separately records an actual ward contribution against ranged
or melee damage from its original cast. Its threshold is consumed once even if
Blink currently has zero remaining cooldown (there is no delayed free reduction).

The one-tick Gunner settling benefit uses the actual following energy clock,
including absolute fractional-pace phase and speed status expiration. It is
applied after the real action debit, only if that refund demonstrably moves the
next eligibility boundary one tick earlier while retaining at least one future
tick. It does not reduce a fabricated Aim timer or skip ammunition/LOS checks.
Reload completion benefits require the exact physical gun still owned by this
actor; a stolen or dropped gun still completes physically without gifting the
old owner an interaction. These are authored mechanisms, not measured passes.
