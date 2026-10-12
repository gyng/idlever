# Class ability effects

`cargo test -q -p riddle-core --profile fast class_skill_effect_tests` completed with exit 0: five grouped tests passed. Fixtures cover all 30 authored nodes, damage and health thresholds, cumulative stacking, unselected and wrong-class damage exclusion, real healing/status/cooldown/reload actions, hazard exclusion, save/load mask persistence, and unchanged RNG draws across real attacks.

Initial compilation failures are retained. The original real-hit fixture failed because the Warlord shield redirected a backstab into a newly spawned goblin reserve. The diagnostic log confirms the hit was successful and the reserve took damage. The final explicit fixture uses a broken, exposed Warlord to measure improvements to boss hits, preserving the real shield behavior.

Crossfire improves all bow shots by one damage; volley shares the existing `shoot` damage path. This keeps the existing attack verb and replay cadence. Bossguard affects boss melee attacks only; ranged `shoot`/`bolt`, reflection and environmental damage receive no reduction.

No shipping validation or statistical balance certification is claimed by these focused tests.
