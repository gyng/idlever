# Cut158 — same-camp armourer horizon audit

Prospective read-only diagnostic, 2026-10-11. No balance or bot-policy edits.
Cut156's original two-seed automation row remains failed: D18 48/48h and
mean best27.96vs28.14. Its seed1 workers reach D33 on day10, manual on day8;
seed2 both reach it on day10. Earlier three same-camp24h armourer pairs helped,
so the worker-off campaign's higher mean alone does not prove bad equipment.

Load the three preserved earned early camps (AWAY seed1/day2 and seed2/day1,
day2) from Cut153. Extend the existing actual public armourer on/off clone
comparison to72h. Keep original loadout, rules, supplies, other workers,
balance and source bytes; add no manual purchases. Automatic worker actions
remain enabled in their existing order. No grants; public set_worker only pauses an already
hired armourer in the diagnostic branch. A separate Send clone records the
first equipment without adding a send to either actual absence.

Record complete reports and before/after saved states, achieved depth, deaths,
net gold and worn equipment. Repeat any pair exhibiting a negative depth
difference exactly before pursuing an equipment hypothesis. A repeatable
negative pair is a diagnostic, not a game fix or an acceptance replacement.
If no negative pair appears, retain that result and investigate another cause.

Follow-up added before implementation: seed2/day2's72h negative pair repeats
byte-identically (D24 enabled vs D26 paused). Audit whether the actual next
send's equipment is represented by `forecast::sim_game`: use the production
simulation helper and its exact seed formula, versus public start_run on a
separate real clone with that seed. Record both heroes/loadouts and before/
after saves; source unchanged. Use all three original camps plus their enabled
72h outcomes. This is an equipment fidelity probe, not proof that a specific
package recommendation or forecast outcome is wrong. No shipping fix yet.

Original gates, seeds and actor policies stay unchanged and unadopted. Final
full native/client acceptance, immutable release freeze and two fresh complete
independent blind ratings remain required for >=80. No deployment.

Verified results: all three72h jobs exited0. Enabled vs paused depth28/27,
21/19,24/26; deaths24/13,20/11,18/14. The negative third pair's complete
output repeated byte-identically SHA29480989f1b5876e9110c08862115ec8cc55f5e4f7f87869de629475e710d8ae.
All original source hashes unchanged. Both first-send heroes match within
each pair, so this is a longer-horizon divergence, not a different first kit.

Six actual/production forecast helper next-send audits exited0, with exact
same seed formula and unchanged starting stone in each comparison. Original
three camps match. Their three enabled72h outcomes have empty selected
loadouts: actual sends equip stored axe+2/axe+1/axe+1; simulations equip
forged sword+2/sword/sword+2. The real at_send armourer pack is skipped by
sim_game's sim clone. This is demonstrated equipment mismatch, not proof that
it caused the negative depth pair or the original automation bar failure.

Both diagnostic examples build; focused example clippyPASS. No game/browser
source or evaluation harness changed. No full native/client acceptance or
score claim. Next prospective implementation should represent the existing
armourer choice in camp forecasts, preserving real worker selection/payments,
historical replay context, cache invalidation and manual/paused choices. Verify
actual/preview equipment, source byte immutability and legal package forecast
outcomes before running original unchanged-bar diagnostics. Do not turn this
finding into a blanket permission for simulated worker training or purchases.
