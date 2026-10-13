# Cut210 — remove the cage choice

Owner asks whether the cage helps the game or distracts from it, and authorizes
removal if it distracts. The mid-run three-way gear picker competes with
pre-run builds and automatic loot. Remove that player-facing system.

The existing `vault` encounter becomes an ordinary loot cache. Keep its floor
generation, three internal item rolls and existing preference selection, so
the same generated offer yields the same one item without another RNG draw.
Standing on the cache immediately takes the existing preference's item. There
is no choice sheet, manual override, grace period, pause or preference editor.
The unselected items remain unavailable, matching the old one-item reward.

Immediate equipment/currency timing can change combat after that encounter.
This deliberately supersedes the old50-tick timing and does not promise
bit-identical historical combat tapes. Do not change loot weights, item rolls,
value, forge discovery, one-time conversion or captive encounters.

Keep private `vault_pref` and pending-choice saved fields for deterministic
disposition. A loaded pending choice resolves by its saved preference on the
next actual tick, before another hero action. Snapshot choice data is always
absent. Obsolete manual `choose` rejects without overriding the preference.
No compatibility aliases are required; raw historical evidence stays immutable.

Journal removes cage discovery/task copy. New room/open/pickup/report text
says cache or ordinary loot, without three-item/choice instructions. The
separate captive encounter remains intact.

Numeric checks: three authored items still yield exactly one selected item;
mail raw30 gives7 carried coins/remainder2 and alive Return credits7 once;
saved pending potion selection raw12 gives3 coins on its next tick; repeated
ticks/reads/reload cannot pay twice. Watch/offline select the same category,
opening/selection consumes no new RNG, and no choice/callout is emitted.
Assert full-pack disposition and unknown-name privacy. Preserve native80byte
event bound. Amend only superseded chooser/timer/copy expectations; retain
unchanged accounting, replay determinism and captive tests.

Current Cut208 Journal foundation remains in scope. Its UI/browser acceptance
will use the merged final runtime; earlier native/evidence checkpoints remain
labelled as earlier source. No pacing delay, new fee or reward grant is added.
