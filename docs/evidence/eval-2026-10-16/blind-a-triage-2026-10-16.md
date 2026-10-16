# The first harness cohort (`e33d50b`: `blind-a`, `blind-b`, `blind-c`), triaged (2026-10-16)

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

A fifth gripe checked, because it is the kind of thing that should reach the right lane
with evidence: "the speed tile prints `Normal 4×` and `Fights only 36×` with no
explanation". The tile **is** player-facing (`web/src/ui/watch.ts:715–748`: the `Speed`
tile carries the mode name plus the clock it is playing at, and its `Watch speed` sheet
holds `Normal`/`Fights only`/`Fast`), and the code already carries a note from an earlier
blind pair with the same complaint ("blind c4705f9 (A, B: `fights only` 16× persisted
across runs and both believed they watched at 1×)"). Two independent blind cohorts have
now misread the same tile, so the legibility gap is repeatable, not one rater's mistake —
a UI-lane item (the reason exists only as a `title` tooltip on a hidden span).

What the card is actually worth: a first instrument-verified fun reading for this build
with its limits declared, plus one pacing finding (the late pen) and one presentation
finding (unlabelled painted controls) already in the UI owner's hands. It does **not**
establish fun ≥ 80, and it does not close the requirement on its own — the second card
below lifts the cohort to α 0.700, still short of the 0.80 the protocol wants for a
decision.

## The second card, and the cohort's α

`blind-b` (seed 741, 402×681 measured at 3×, **32** active minutes of the brief's 40, 27 runs,
4 deaths with 3 read, card `eval/cards/e33d50b.blind-b.json` sha256 `7b9e0b5c…`, rule export
`…blind-b.rules.json` `dbdb9d6a…` — 12 rows, 2 of them the rater's own) scored **70.3,
`promising`**. With `blind-a`'s 65.7 the cohort is **mean 68, sd 3.25, α 0.700 — tentative**
(`eval/RATING.md`: α ≥ 0.67 tentative, ≥ 0.80 decision). Read that honestly: a tentative
reading of one build, about twelve points below the fun ≥ 80 goal, and **not** the
decision-grade verdict the requirement asks for.

Its findings corroborate the first card on the three items that matter, from an independent
seed and its own 27-run session:

- the rule editor is unreachable for hours ("Read only · Custom rules · after Bloat Mother";
  the pen opened here only after the 8 h absence, when the Bloat Mother fell) — **two
  independent raters**, so the pacing finding is repeatable rather than one player's
  impatience;
- the speed control again read as unusable ("the watch runs itself (48×→16×→1.5×, Speed chip
  display-only) so no 1×") — the third blind data point on the same tile;
- panels clip and hide ("compare outcomes" cut off at the sheet edge; rules under
  "▸ Packages 10") — corroborating the package rater's measured clipping.

It also named the game's real strength in the same breath: leave him overnight and the
morning report is a scroll (13 runs, graves to dig, two bosses down, a legendary with an
effect and a trade-off); the death screen replays the fight twelve times, calls it "1 in 6",
shows the tick where "bank at 25%" fired too late, and prints two fixes with their costs; the
report even names the decision share ("own rules 1% · defaults 19% · chores 81%").

Both raters declared what they could not assess (audio, bot caps, the package layer, the
desktop view, D14+/crypt/bloodlines) and their real active minutes rather than the brief's —
and both, knowing the goal from the briefed `docs/FUN_EVAL_IDLE.md`, still scored in the
sixties and low seventies, which is the honest direction rather than anchoring up.

## The third card, and what it does to the cohort

`blind-c` (seed 768, 402×681 at dpr 3 — measured and reported, 40 active minutes, 6 runs with
3 watched at 1×, 5 screenshots, 2 own edits + 1 package swap) scored **54.6, `not yet`**, with
**four gates failing** (expression, failure, return, attribution) and `social` weight-0. The
cohort is therefore:

| cards | totals | mean | sd | α | reading |
|---|---|---|---|---|---|
| `blind-a` + `blind-b` | 65.7, 70.3 | 68.0 | 3.25 | **0.700** | tentative |
| + `blind-c` | 65.7, 70.3, 54.6 | **63.53** | 8.07 | **0.421** | **unreliable** |

Adding a third rater made the instrument *less* reliable, and the cards say why: the two
higher raters reached the game's depth (the overnight report, the pen, real absences) and the
third did not reach any of it, so they are partly rating different slices of the game. That is
a finding about the cohort's setup as much as about the build — `eval/RATING.md` publishes
nothing below α 0.67, so **this cohort yields no decision**, and the fun ≥ 80 question is
still unanswered rather than answered low.

`blind-c`'s headline claim — "the rule pen never opened" — is the **designed gate**, and now
with its numbers. The pen's whole group opens on `pen || mother_met(l)`
(`crates/idlever-core/src/systems.rs:124`), i.e. meeting the Bloat Mother; its own age
requirement is `pen: 0` hours and the stall fallback is `pen_fallback_h: 120`
(`balance.rs:288-289`) — five days of lineage age. Its save read
`pkg.pen_open:false / pkg.pen:[] / pkg.custom:[]` after six cold runs, which is exactly right
for that gate: a 40-minute cold session with six runs cannot reach a mid-depth boss and cannot
stall five days. The `blind-b` route (the 8 h absence aged the lineage until Mother fell) and
the `blind-a` route (hours of play) both got there. Two honest readings follow: the design is
deliberate (AGENTS: "late on open the pen"), and **three of three blind raters named it as
their top gripe** — the game's own verb is hours away and the game does not say when.

Its second claim — "closing the tab does nothing; gold stayed $305 across 4 h and 8 h" — is
consistent with the stated design that before the scout is hired an absence finishes at most
the run in flight (`AGENTS.md`) plus the `?dev=1&absent=` parameter doing its job
(`app.ts:896-897`); with no run in flight there is nothing to report. `blind-a` saw the same
cap as "one three-way pick" and `blind-b` got a full night only once its lineage was old
enough — the difference is the lineage's state, not a broken absence.

Its third point is the sharpest for the owner: the build's best line ("WHO DECIDED /
defaults 21% · chores 79%", "TIME / fight 12% travel 88% chores 0%") sits two taps inside the
report's details fold while the surface shows a red gem that says DELVE. That is a
presentation decision, not a defect — and it is the one the cohort agrees on.
