# Cut271 paper doll: observations, 2026-10-18

## Owner direction (not an agent judgement)

- 2026-10-18: the paper doll goes "More abstract". It replaces the painted mounted figure
  with a simpler equipment diagram, slot icons around a plain silhouette, so there is less
  art to maintain.
- 2026-10-16 (still applies): "Paper doll can be more abstract to make it easier."
  Recognisable gear, clear slots and correct Actual/Next matter most.

## Identity

- Source: branch `cut271-paperdoll` from main `4adcb94a`. Fast WASM
  `ce9d5d427bebbf77…` (`tools/wasm.sh`), Vite dev server on :5471.
- Inputs: the Cut220 fixtures `docs/evidence/cut220/actual-next-8879/weapon-bow.session.json.gz`
  (Next delve changes the weapon from sword to bow) and `helm-empty.session.json.gz`
  (Next delve removes the Ironcap). Each look (male, female, cat) is set in the page with
  `app.setLook`. Nothing is written to a fixture.
- Viewports: 402×681 (`phoneReviewViewport`, browser bars visible) and 1440×900, 1×
  text, headless Chromium (SwiftShader). Captures show the visible viewport after the
  Hub's doll section is scrolled to the top (`captureKind: viewport`). This is not a
  Safari check and not a GPU render check.
- Scripts: `capture.mjs before|after` and `tip-probe.mjs` in this directory. The before
  set was taken from clean main source in the same worktree before the change. Each
  directory's `results.json` records the canonical slots per phase, the hub
  width/scrollWidth and the PNG hashes.

## What happened (agent visual review, not player feedback)

- `before/`: painted mounted figure. At 402 it is small, and the slots are named only in
  the cards underneath. The 2026-10-16 fit notes (grip offsets, helm over the eyes) are
  the kind of per-piece tuning this change removes.
- `after/`: a plain code-drawn silhouette sits in the centre. Helm and Weapon tiles are on
  its left and Body and Boots on its right. Thin gilt leader lines run from each tile to
  head, hand, chest and feet. At both sizes, item icons (sword, bow) and the cropped
  painted wearables (Ironcap, Hearthglass, Hearthglass Boots) read clearly in 44–56 px
  frames.
- Actual/Next: the toggle is unchanged. In `weapon-bow-*`, only the Weapon slot is
  highlighted (brighter frame, corner diamond, gilt lead) in both views, and the tile
  switches between Sword and Bow. In `helm-empty-*-next`, the Helm tile is a dashed empty
  frame with a quiet italic "empty", also highlighted. A new origin alone (equipped →
  chosen/follow) is not highlighted; the first draft did highlight it, and that was
  rejected as noise. The Actual · Next delve cards under the diagram are unchanged.
- Looks: male is a plain figure; female adds a long-hair outline; cat adds ears and a
  tail. The differences are deliberately small.
- Tooltip (`after/tip-weapon-402-next.png`, `tip-probe.json`): tapping a tile opens the
  shared detail plate with the gear's name, slot · phase, origin and the other phase's
  gear when it changes.
- No horizontal overflow: hub clientWidth equals scrollWidth in every capture (330 at
  402 and 884 at 1440).

Interpretation and confidence: the diagram meets the owner's priorities (recognisable
gear, clear slots, correct Actual/Next) with less art. Confidence is moderate. Only two
fixtures were reviewed, at 1× text, headless; large text uses the two-column fallback,
which the hero-hub group checks for geometry and contrast but no one has reviewed by eye.

## Shelf life

Revalidate after changes to the equipment wire, the Hub gear layout, tooltip plumbing,
icon/wearable exports or viewport policy. Superseded: the painted-fit conclusions in
`docs/evidence/cut220/painted-8879/observations-2026-10-16.md` no longer describe the
runtime figure. That evidence stays as history.
