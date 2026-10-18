# Cut269 observations (2026-10-18)

The agent wrote this note; no owner or player feedback was collected in this pass. Revalidate it before relying on it
if the gallery, the copy, the list or the badge art changes.

## Identity

| | |
|---|---|
| Source | branch `cut269-achievements`, rebased on main 4adcb94a |
| Engine | fast WASM 14b5f473… (`tools/wasm.sh`, via `repin.mjs`) |
| Server | Vite dev server on :5451, headless Chromium (SwiftShader) |
| Input | Playwright clicks |
| Save | `docs/evidence/handoff-menus/input.game.json.gz`, migrated on load. Its seen marks were edited, and one secret (`o_gas`) was earned by edit. |
| Viewports | 1440×900 at 1×; 402×681 (`phoneReviewViewport()`) |
| Text scale | default |
| Captures | visible-viewport screenshots from `IDLEVER_ACHIEVEMENTS_SHOTS=… node tests/achievements.mjs` (`shots/`) |

## What happened (automated measurements)

- The client group `achievements` passed 39 checks at both viewports. The `game-menu` group passed 81 checks.
- The fixture migrates to 3 earned achievements (*Warlord Felled*, *Lich Undone*, *Legend Armory*), none toasted.
- With two entries marked unseen, the camp toasts once: `✦ 2 achievements`. A repaint does not repeat it.
- Menu → Achievements opens the gallery in 2 activations. The header reads `3/38`, and `3/38 +1` once the secret is
  earned.
- The gallery groups are Journey, Mastery, Challenges, Builds and Moments. Oddities appears only with an earned secret.
- No `?` appears anywhere, and no unearned secret's id or name is on the wire.
- No horizontal overflow at either viewport.

## Visual review (the agent's)

- **1440** (`gallery-1440.png`):
  - The gallery opens as the journal-material window over the camp, at about 600 px.
  - Earned rows are lit, with a bronze medal and `day 4`. The two new ones carry the fresh tint and a trailing dot.
  - Locked rows are dimmed, with the grey locked medal.
  - Counted rows show `5/6` (waystones) and `0/7` (Every Trade).
  - **Defect:** the group-heading frame rim (`badge_frame_*`) reads as a small dark disc at that size. It works as a
    marker, but the tier colour is hard to see. Confidence medium.
- **402** (`gallery-402*.png`, `toast-402.png`):
  - The window fills the content width and scrolls inside, with the scroll cue `▾` visible.
  - Goals of 5 words fit on one line (`Foundry Master, forge unbought`).
  - The Oddities group shows *Bad Air* with the secret medal and `day 2`.
  - The toast sits centred above the action bar and does not cover the DELVE button.
- **Interpretation.** The quiet presentation holds: one count, no padlocks or percentages, and the goal line works as a
  map of the optional systems. The new Challenges and Mastery goals read as concrete instructions ("Lich with one
  tactic only", "Queen or King, untouched") rather than milestones. Confidence that they communicate the playstyle:
  medium. No human has read them yet.

## Follow-ups

- A larger or brighter frame rim on the group headings, if the tier should read at a glance.
- An owner or player read of the Mastery and Builds goals. No bot exercises them (CUT269 §10).
