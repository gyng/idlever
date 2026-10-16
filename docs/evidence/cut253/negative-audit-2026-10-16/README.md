# Cut253 negative coverage matrix

2026-10-16. Read-only assertion audit of the executed28-test phase; no new tests or gameplay. C=covered, P=partial, U=unproved, —=not applicable. Every node separately has a positive enabled/disabled paired output. `matrix.json` gives actual assertions, exact test/hook lines, missing controls and limits.

| Node | Miss | Refusal | No trigger | Expiry | Repeat | Consume |
| --- | --- | --- | --- | --- | --- | --- |
| fighter_rally | U | C | P | U | P | — |
| fighter_oathguard | U | U | U | C | U | P |
| fighter_opening_cut | U | U | U | — | U | — |
| fighter_siege_rhythm | U | U | U | C | U | P |
| fighter_holdfast | U | U | U | C | P | C |
| fighter_execution_arc | U | U | U | P | C | — |
| rogue_afterimage | U | U | U | C | U | P |
| rogue_tell_thief | U | U | P | — | U | — |
| rogue_veiled_route | — | U | U | C | P | P |
| rogue_patient_ambush | C | U | U | U | U | — |
| rogue_ghostwalk | C | U | P | C | C | C |
| rogue_silent_finish | U | U | U | C | P | P |
| ranger_spotter | — | U | U | U | P | C |
| ranger_quiver_thread | U | U | P | — | U | — |
| ranger_corridor_volley | U | U | U | C | P | P |
| ranger_split_mark | U | U | P | U | P | — |
| ranger_patient_snare | — | U | U | U | P | C |
| ranger_moving_line | — | U | C | C | U | P |
| caster_chilling_charge | U | U | U | U | C | C |
| caster_storm_cell | U | U | P | C | C | C |
| caster_ice_lock | — | C | U | U | P | — |
| caster_shatter_ward | — | U | U | U | U | C |
| caster_conduct | U | U | P | U | C | C |
| caster_last_wall | U | U | P | U | C | C |
| gunner_rangefinder | U | C | P | U | P | P |
| gunner_chamber_chain | — | U | P | C | U | P |
| gunner_smoke_walk | — | U | U | C | P | P |
| gunner_cycling_breach | U | U | U | — | U | — |
| gunner_long_watch | U | U | U | C | P | P |
| gunner_breach_route | U | U | U | C | U | P |

All14bounded Combo prefixes have active/deadline/expired whole/sliced/reload coverage. This does not establish all30negative combinations, exact-deadline successful actions, consumed-state reload parity or all receipt targets/absolute expiries. Detailed scope is in the JSON.

No production defect is established by this audit. Missing tests are not automatically bugs. Future test-only work must wait for the earned recorder sourceguard release and compare production identity before/after.
