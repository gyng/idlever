# R3 review — independent verification note (2026-10-16)

`docs/evidence/mechanics/r3-biome-review-2026-10-16.md` (agent review, source-cited)
is planning input. Its §2.6 "decorative / dead / unreachable" table is the part that
would justify code changes, so three of its rows were checked here directly.

## Checked

1. **`meta.rs` "four mastery cards"** — confirmed: the comment said four while
   `MASTERY_CARDS` has five (`meta.rs:182-184`). Fixed (one-word comment change; no
   behaviour).
2. **"`stair_dance` / `last_stand` are absent from `packages::PACKAGES` → cannot be
   worn in a tactic slot"** — **the consequence is wrong.** Both ids are in
   `TACTIC_CARDS` (`meta.rs:183`), which is what makes a card equippable
   (`is_card`: `meta.rs:301`, `TACTIC_CARDS || TIER2_CARDS || MASTERY_CARDS`;
   `meta.rs:681`, `:954`, `:1055`, `tokens.rs:170`). They are not in `PACKAGES`
   because cards and packages are different lists — the review's own parenthetical
   ("pen/card rows only") contradicts its conclusion. No defect here.
3. **`("pack","lone")` "can never fire against the hero"** — the mechanism is right
   and **by design**: `is_lone` returns false when the position is the hero's own
   tile (`turn.rs:1662-1664`), and `counter_damage` asks it only for the attacker's
   target (`turn.rs:1682`). The pair can still fire for a `pack`-tagged attacker
   against a lone *non-hero* target, so this is an intent question (should a pack
   gain +50 % on the hero?), not a patchable bug. Do not change it without that
   decision.

## Not verified (the remaining §2.6 rows)

`alarm` fact with no consumer, the `heavy` tag's missing AI branch, `mirror_shade`'s
cosmetic `mirror` tag, `Pending::Call` having no `ai.rs` setter, `Pending::Flip`
learning two tags at once, the phantom `skeleton_sentinel` name, `caustic`/`burn`
naming, and the chasm's lack of fall logic are **as-reported** — verify each against
the cited lines before acting. The review's §5 pair proposal also states up front that
none of its six historical checkpoints can be re-run (their Cut162 records carry
`package_levels_at_send: null`), so each pair needs a **new earned send** that
re-encounters the scene; that is a measurement cost the owner should price before the
work is scheduled.
