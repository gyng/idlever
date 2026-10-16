# First blind fun card for the harness era: `e33d50b` by `blind-a`, triaged (2026-10-16)

Card: `eval/cards/e33d50b.blind-a.json` (sha256 `562c3e15…`), collected through
`tools/fun-eval.mjs` from the packet at
`scratchpad/fun-eval/e33d50b/packets/blind-a/`. Build identity is the rater's own claim
and matches the frozen one: commit `e33d50bee593…`, wasm `51d041d0…`, dist manifest
`4b5f19dc…`, seed 829, phone 400×800 @ dpr 3, headed on the GPU via `tools/driver.mjs`
port 37429. ~45 active minutes (cold 25, then 6/6/8), **1 of 3** deaths read, 0
checkpoints resumed — the card says so rather than implying the full horizon.

`eval/score.sh` → **65.7** (`promising`), gates flagged: *tension*, *attribution*. One
card is not a verdict (`eval/RATING.md`: α ≥ 0.67 tentative, ≥ 0.80 decision, two raters
on the same immutable build), and the rater knew the goal because the briefed
`docs/FUN_EVAL_IDLE.md` states the fun ≥ 80 goal (see `docs/FUN_EVAL_HARNESS.md` §8).

A rater cannot read the code, so the coordinator checks each finding against it. Three of
the four headline claims are design, not defects:

| The card says | Checked against the code | Reading |
|---|---|---|
| "the configuration layer is read-only for the first ~50 minutes: `Read only / Custom rules · after Bloat Mother`, `section.editor` at `display:none`" | `web/src/ui/camp.ts:750` — `editor.el.hidden = !pen`; the pen is gated on a fact and `AGENTS.md` states the design: "late on open the pen to write your own rows" | **By design.** Real feedback is *pacing*, not a bug: the game's own verb arrives late and the game does not say when |
| "the `+1 rule slot ⊸ fill rules ◆3 or $350` shop sits inside a hidden `panel-store` with no control that opens it" | `camp.ts:419` — `panel-store` is the **parking lot** for *closed* panels ("a closed panel's content waits in the DOM, unrendered… not in the page's text either"); `PANELS` is `{forecast, loadout, unlocks, party}` and each has a visible control (`togglePanel(...)`, e.g. `camp.ts:848/897`) | **Misreading of the parking lot.** There is no store/rules panel to be orphaned |
| "the 20 m and 4 h absences return one three-way pick and nothing else, while the 8 h returns a whole night" | `AGENTS.md`: before the scout is hired an absence finishes at most the run in flight | **By design**, but the *report* for short absences is thin — legitimate feedback about the idle feel |
| "`Guild reception`, `Recovery pool`, `Build forge` are unlabelled patches of the painting" | UI lane; corroborated independently by `eval/package/idlever.51d041d0.rater-PackageRater.json`, which measured the Behaviour panel's label column clipping (`clientWidth 38` vs `scrollWidth 44` at 14.875 px) | **Genuinely open**, owned by the UI lane (Codex/Claude), not a core defect |

What the card is actually worth: a first instrument-verified fun reading for this build
with its limits declared, plus one pacing finding (the late pen) and one presentation
finding (unlabelled painted controls) already in the UI owner's hands. It does **not**
establish fun ≥ 80, does not close the requirement, and does not replace the second rater
α needs.
