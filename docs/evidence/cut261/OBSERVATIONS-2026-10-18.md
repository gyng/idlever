# Cut261 observations — 2026-10-18

Owner requests (verbatim):

1. "live view: show inventory list with $ value as well in details or something, tooltips"
2. "convert to gold report confusing, players thought items were persistent. for kept items split them separately. have converted into gold be like a fade/transition between item and gold amount?"

Source: worktree branch `worktree-agent-a5b6d726ca6d0cecd` on base f0e095a2, with the Cut261 diff (see the commit).
The WASM was built by `tools/wasm.sh` (fast) into `web/src/engine/pkg`, which is a real directory. It is served by Vite on
port 5413 from this worktree. All captures are headless Chromium (`tools/browser.mjs` `launchBrowser`, SwiftShader) at text
scale 100%. Each capture is the visible viewport, not a full page.

## Automated measurements

### Live carry detail (`web/tests/live-inventory.mjs`, real WASM)

- Setup: seed 7, fresh lineage. The test builds the house by hand, calls `engine.send()`, then steps the run until the pack holds
  two or more finds. It then holds the snapshot still and taps or clicks the carried `$` purse.
- 402×681 (`phoneReviewViewport()`, touch tap): the plate shows the carried tip, then `violet potion? +$3`,
  `pearly potion? +$2`, `coins & used $7` and `carried $12`. The rows sum to 12, which equals the purse's Carried $12. The
  plate stays inside the viewport (x 8–261). No page errors.
- 1440×900 (mouse click): the same rows and sum. Screenshots: `live-inventory/phone-402x681.png`,
  `live-inventory/desktop-1440x900.png`.
- This seed and turn had no kit, supply or brought items in the pack, so the `kit` / `supply` / `brought` tags are not shown
  in these captures. A core unit test covers them (`live_pack_wire_names_each_finds_pickup_worth_and_never_moves_gold`).

### Report and run-clear card (`web/tests/sold-finds.mjs`, fake engine, crafted ReturnReport)

- The bank exit has 4 finds: axe $22 (masterwork), mail $12, and two heals at $3 each. It also has one first non-legendary
  discovery (an axe pattern).
- Card: `+$22 +$12 +$3 +$3`, each with its silhouette behind it. With `?juice=1` all 4 fades run (`getAnimations`). Under
  `reducedMotion: reduce` none run, so the card shows its rest state at once.
- Report details: `Kept patterns` comes before `Became gold`. The rows read `+$22 axe | +$12 mail | +$6 heal ×2`. A bank
  exit shows no `In bones` section.
- A death exit shows `In bones` and no `Became gold`.
- Neither 402×681 nor 1440×900 has a horizontal page scroll, and no run had page errors.
- Screenshots: `sold-finds/card-*.png` and `sold-finds/report-*.png`, taken with juice on after the fade settles.

### Real-WASM run-clear (`web/tests/runclear.mjs`)

- Seed 2, first send banks D4. The card's words at rest:
  `COLLECTED no heals collected D4 NEW BEST $97 Gold $78 secured +$8 +$8 +$6 +$3 +$3 +$2 +33 xp`. That is 19 words, within
  the ≤ 20 budget. The card no longer names the rarest find, because naming it pushed the count to 21.
- One failure remains, and it was there before this change. The cage/vault probe reads `lineage.vault`, which is no longer on
  the wire (`TypeError … reading 'map'`). This diff does not touch it.

## Agent visual review (limited confidence: headless, no real device)

- Phone carry plate: the plate is compact and quiet. Labels are on the left and `+$N` is on the right in gold, with a dim
  `coins & used` line and a ruled total. It covers part of the map while it is open, as other plates do.
- Card: the coins now lead the finds row and the items are small and faded. In the first capture the light gold on parchment
  was unreadable. The fix uses `--ink-gold` on parchment and keeps the light gold only in the dark tooltip.
- Report: the item names behind `+$N` are faded (opacity 0.72). Light rarity tints such as masterwork `axe` stay low-contrast
  on parchment. This is legible but quiet. Revisit it if a player misses names.

## Interpretation

- The core's `InvItem.worth` (whole coins claimed at pickup) and `InvItem.fate` (`kit` · `supply` · `brought` · `bones`) are
  for presentation only. Gold, RNG and rules are unchanged; see the repin/settle note for settlement evidence.
- What really persists from a run's finds is a shape's pattern (`discoveries`). Instances never go home, and the UI now says
  so: the patterns are `Kept`, and everything else `Became gold`.

## Owner / player feedback

None yet in this note. The two requests above are the input. A real player needs to confirm that the change removes the
"items were persistent" reading.

## Build identity and settlement evidence (final captures, 2026-10-18 ~06:10)

- WASM: fast build, 7000703 bytes, sha256 `20eec60b747c21bc0f2bbfa4fc83981694306e00fc53ec155f860ac14f0972d6`, on base
  f0e095a2 plus this diff. Captures were retaken on this exact package after the last client edit, and both
  `live-inventory.mjs` and `sold-finds.mjs` passed.
- `node tools/repin.mjs --dir docs/evidence/cut261 --settle --regen` produced a new default manifest
  `settlements-inputs-20ee.json`, repinned from `cut258/settlements-inputs-958a.json`.
  - Native settle: Gold, ledger and ExitLine are unchanged on 4/4 entries. The only diffs are the new presentation fields:
    `exitLine.finds[].worth` and `exitLine.finds[].fate`, and in the after-saves the `run_log` / `deaths` finds and
    `last_snapshot.hero.inv[].fate`.
  - `examples/gold_settlement_repin.rs` strips those two fields from the finds before it compares exactly, the same way
    `packages` was already treated.
  - Browser proof: `node tests/run.mjs gold-settlements` PASS, 564 checks / 24 cases on the 20ee package.
- Checks:
  - `cargo test --workspace --profile fast` passed (1061).
  - `cargo clippy --workspace --all-targets -D warnings` is clean.
  - From `tools/verify.sh --quick`: cargo tests, oxfmt, oxlint, tsc and copy-lint pass. Two `tools/fun-eval.test.mjs`
    cases fail on the environment only: they look for `../eval-fun/docs/FRAMEWORK.md` beside the worktree.
