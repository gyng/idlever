# Cut228 — ant farm: the Forge at work, a hero fitted

Owner queue item 14 ("Base as an ant farm / garden"), first delivery: one worker
interaction and one earned hero routine, both driven by real Rust state. Builds on
Cut218 (resident seats, rest/reincarnation phases) and Cut224 (Guild/pool art),
which left open: "Forge current-work animation remains unimplemented: the wire
publishes worker ownership/status but no authoritative present work phase".

## Contract

1. **Authoritative present work, read model only.** Rust publishes
   `Town.forge_work = { step, hero, left_s }`: the newest Forge step a hero's kit
   actually received (a ledger `forge …` debit: a step bought by hand or by the
   Apprentice, a commission, a sidearm) within the last `FORGE_WORK_TICKS` (450
   ticks, 45 s) of *that hero's own clock*, and only while that clock moves
   (resting or delving). Ledger lines carry the paying hero's `total_turns`, so
   each line is aged against its own hero; a waiting hero's clock stands, so a
   stale line never reads as present. Absent otherwise (and absent from JSON, so
   old wires and goldens are unchanged). No field is saved; nothing in a sim,
   bot or rule reads it.
2. **No outcome change.** Proof: IDLE and PICKED dayplayer, 16 seeds × 14 days,
   per-seed job results byte-identical between a pristine binary built before
   any edit and the final binary (Cut225 method: `cmp` of each
   `<key>-<BOT>-s<N>-d14-c3.json` pair, `diff` of the bar table).
3. **Worker interaction.** While `forge_work` lasts, the Forge's smith stands at
   a code-native anvil and strikes (a dip and a hammer laid on the anvil each
   0.8 s stroke) with spark bursts only on real strokes: Full 6, Low 3, none
   under reduced motion or effects Off (a still struck pose instead). A hot bar
   sits on the anvil; its warm light is a night light. The previous ambient
   anvil sparks every ~2 s (guessed work) are removed; chimney smoke stays.
   Without work the smith idles as before. Primitive anvil/hammer are their own
   fallbacks; no new atlas texture, render target or bloom pass; at most three
   added marks at the facility (anvil, hammer, hot bar).
4. **Earned hero routine with a reason.** The hero the step was forged for, if
   at home and neither recovering nor cloning, walks from his wander or his pool
   bench to the anvil, stands facing the smith while the work lasts, then
   returns (to the bench, seated again, or to his wander). A delving hero is
   never shown in town: only `life_state != away` residents are drawn. The
   reason is optional to inspect: the hero's details read `At Forge · <step>`,
   the Forge's details read `Forging <step>` (callout budget ≤ 3 words,
   `tools/copy-lint.mjs`).
5. **No new loop.** No tending, no currency, no timer the player must answer,
   nothing lost by absence; the routine only reflects what the simulation did.

Validation: native fast tests + Clippy; fast WASM and its sha256; a gold-
settlements manifest for the new package if its pinned saves still match;
oxfmt/oxlint/tsc/copy-lint; routine client suite and home/town groups; matched
day/night × 400/1440 private-GPU captures.

## Implementation

- Core: `town::forge_work` / `FORGE_WORK_TICKS` (crates/idlever-core/src/town.rs),
  `wire::ForgeWork` and `TownWire.forge_work` (wire.rs), set in `Game::lineage`
  (engine.rs) for one game and in `Session::lineage` (bloodlines.rs) across every
  hero's own game. Test `forge_work_is_a_read_model_of_a_real_recent_step_on_a_moving_clock`:
  owned Forge alone → none; a real step → `{sword +1, hero 1, 45 s}`; reading
  leaves the save byte-identical; 449 ticks later 1 s left, the 450th ends it; a
  standing clock shows none; idle JSON has no `forge_work` key.
- Client: `ForgeWork` type (web/src/engine/types.ts); `TownState.forge`,
  smith/anvil/sparks, the fitted resident's legs and facing, `stats().forge`
  (web/src/render/town.ts); details lines (web/src/ui/town.ts,
  web/src/ui/building-help.ts).
- Test `web/tests/home-forge-work.mjs` (full suite): 31 checks, Full and reduced
  motion, public actions only, save unchanged by viewing.

## Result

- Invariance: IDLE/PICKED 16 × 14 per-seed results byte-identical, 32/32, bar
  table identical (pre-existing `Scout bought ≤ min 15` FAIL unchanged).
- Native 937 passed / 6 ignored; Clippy clean; fmt/lint/tsc/copy-lint pass.
- WASM c2f0…c104 (6849656 bytes); gold-settlements 564/24 on its new manifest,
  now the default. Routine client groups all pass across a loaded run and reruns
  (no single quiet 38/38 claimed). Three home groups fail identically on the
  pristine client (pre-existing on `ec85d656`).
- Captures: `docs/evidence/cut228/gpu/` (before/forge/reduced × 400/1440 ×
  day/night, with Forge crops). Evidence index: `docs/evidence/cut228/README.md`.

Known limits: at night on a phone the smith and the fitted hero read mostly as
lamp-lit silhouettes; at 400 px the strike is a few pixels. Apprentice purchases
happen at sends (the hero then leaves) or on the hour, so most natural sightings
show the smith alone; a manual Upgrade shows both at once. The scout/porter have
no comparable authoritative phase yet; general ant-farm variety stays open.
