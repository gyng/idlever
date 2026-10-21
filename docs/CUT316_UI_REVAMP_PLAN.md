# Cut316 — UI revamp: audit and plan

2026-10-21. Owner: "I like the hub and live view game views. Everything else is
kind of ass. I want to retain the chunky game-like UI with frames/borders.
Audit/plan for UI refresh/revamp. We had a design system? Doesn't seem to be
working that great... redo/readopt design system?"

This is a plan for the owner to approve, not an implementation. Captures from
2026-10-21 (headless, real WASM; earned first-ascension save plus a fresh seed)
are listed in §5.

## 1. Audit — why the design system isn't working

There is one on paper: Cut200 research, Cut204 `ui-foundations.css` (the `--ui-*`
tokens and the forge, bloodlines and journal materials) and the Cut241 menu
materials. It was layered on top of the existing UI and never adopted.

- **Not adopted.** Only 8 of 46 CSS files use `--ui-*` (213 uses, 89 of them in
  ui-foundations itself). The older CSS (19k lines) is untouched. 1,112 hex
  literals (539 distinct) against 213 `--ui-*` uses. 518 `font-size`
  declarations, 25 of them through a variable; 24 distinct literal sizes from
  8px to 48px. 5,099 px literals.
- **Competing tokens.** `--tap` (29 uses) vs `--ui-target` (3).
  `--control-size` vs `--ui-control`. `--acc` / `--dim` (228 uses) vs `--ui-*`.
  Nothing says which is canonical.
- **No component ownership.** `.btn` is defined in 6 files, `.chip` in 15,
  `.sheet` in 15 (256 hits), `.game-window` in 8. `chrome.css` restyles
  styles.css's buttons, and ui-foundations restyles chrome's.
- **Specificity wars.** 190 `html body …` selectors (85 in ui-foundations). The
  Cut58 policy "material selectors must beat older component borders" made
  escalation the method. Import order in `main.ts` decides who wins.
- **Three frame mechanisms.**
  1. Painted 9-slice `border-image` (`web/public/ui/frames`, `skin.ts`).
  2. CSS bevel fallbacks.
  3. Material windows that set `border-image: none` and replace the art with a
     solid border. The newest layer switches off the painted frames.
- **Six container types.** `openSheet`, `openWindow` (most files import it *as*
  `openSheet`), camp `.panel[data-panel]`, the standalone `game-menu` dialog,
  full screens (`main.*.frame`), and inline overlays (tasks, tips, run clear,
  decide).
- **One CSS file per cut.** 46 files, 22,313 lines: styles.css 7,876, runs 2,012,
  juice 1,313, chrome 1,194, cut30 906…
- **No enforcement.** No style lint and no token check. The browser checks
  (`ui-foundations-check`, `menu-materials`, `chunky-controls`) test focus and
  geometry, not consistency. Every feature cut adds a CSS file with literal
  colours.

### What the hub and live view do right

The owner's two keepers share one visual grammar. Everything else breaks it.

| Hub / live view | The rest |
| --- | --- |
| One dark slate material, thick bevelled metal border, inner highlight, corner studs | Mixed materials: dark slate, cream parchment (journal, chronicle, gold ledger, achievements, menu), curled scroll (unlocks, forecast) |
| Filled, inset-bevelled slab buttons in an even 2–3 column grid; selected = thick gold frame | Small floating outline buttons, `name on` toggle chips (settings), select-box-like bars (tactics) |
| Art leads: portrait or medallion → big serif name → small meta line | Small-caps labels around 9px, text-first rows, long empty bands |
| Icon + label tiles with numeric badges, little prose | Prose blocks and form inputs (rename field, white `includes` textbox) |
| Live view: the scene fills the frame; rails carry big numerals over carved pillar art | Desktop side rails mostly empty; ~9px hero-card text |

### Concrete defects (fix in passing)

- Phone top bar clips `best D34` to `D3`.
- The phone console has 7 unlabelled icons, two of them identical keys.
- The desktop hub's content well is about 170px tall, so the gear figure is cut
  off. On phone the hub tabs push all content below the fold.
- The ▼ scroll marker overlaps text (`dep▼th`). The Temperament box text touches
  its border.
- The crate, Loadouts and tent all open the same hub. The quest board opens the
  Journal. Pool and Vat open one sheet titled with the hero's name.
- Rules/pen on phone: ragged chip column, a tooltip covers it, overflow.
  Several desktop-only controls (Rules, hero details, Chronicle, hero jump)
  have no phone route.

## 2. Recommendation — redo the system, extracted from the hub and live view

Don't readopt Cut204 as written. Its tokens are reasonable, but it is a layer
on top, it turns off the painted frames, and it rests on three materials when
the owner's taste is one. Build a **small owned kit** whose look is taken from
the hub and live view, migrate every screen onto it, and delete the old CSS as
each screen moves. Keep vanilla TS + `h()`; no framework change.

### 2.1 Visual direction (one sentence each)

- **One material:** dark slate (`hub`) with painted metal frames. Parchment
  survives only as *content* inside a frame (the journal page, the death or
  report backdrop), never as a window skin. *(Owner decision D1.)*
- **One frame mechanism:** the packed 9-slice art (`tablet`, `panel`, `tile`,
  `console`, `bar`, `stud`, `seal`, `gem`, plus the unused `plaque_*`), with
  one CSS bevel fallback. Material windows stop setting `border-image: none`.
- **One button:** the hub's filled bevel slab. Variants are size (S/M/L) and
  tone (default, primary gold, danger red), not new shapes. Toggles are the
  same slab with a lit state, never `name on` text chips.
- **Type scale:** five steps, roughly 11 / 13 / 16 / 20 / 28. Grenze for titles
  and numerals, Fira for body. Nothing below 11px.
- **Structure over prose:** stats as tiles or labelled rows, actions as slab
  grids, art first.

### 2.2 The kit (≈ 10 components, one CSS layer each)

`tokens.css` is the only place for colours, spacing, type and radii. Components
are `ui/kit/*.ts` + `kit/*.css`:

| Component | Replaces |
| --- | --- |
| `Frame` (9-slice: tablet / panel / tile / plaque / console) | 3 frame mechanisms |
| `Window` (one modal: centered on desktop, full-height sheet on phone, stacked back, focus trap, Esc) | openSheet / openWindow / camp panel / game-menu dialog |
| `Screen` (the `main.frame` grid: bar · stage · console · rails) | per-screen grids |
| `Slab` (button / toggle / tab) | `.btn` ×6, `.chip` ×15, tab strips |
| `Tabs` (the hub's strip, container-query aware) | ad-hoc tab rows |
| `Tile` (icon + label + badge) | console tiles, building tiles, stat tiles |
| `StatRow` / `StatGrid` (label · big numeral · delta) | text stat lines, bank and ledger lines |
| `Header` (portrait or medallion · title · meta) | per-sheet headings |
| `Section` (framed group with a title plate) | `.hero-life-section`, settings rows, … |
| `Meter` (gauge art: HP, capacity, progress) | 5+ bar implementations |
| `Tip` (existing tips.ts, restyled) | — |

CSS uses **`@layer reset, tokens, kit, screens, overrides`**. Kit rules win by
layer, not specificity, which ends the `html body …` escalation. Legacy CSS
goes into a `legacy` layer below `kit` during migration, so new screens win
without hacks.

### 2.3 Enforcement (the part Cut204 lacked)

- **`tools/style-lint.mjs`** in verify.sh and CI. It allows no hex, rgb or px
  literal for colour, font-size or spacing outside `tokens.css` and
  `kit/*.css`, and no `html body` selectors.
- **A ratchet file** records the current per-file counts. Counts may only fall,
  so legacy files are grandfathered and new code is clean from day one.
- **Kit board.** The existing `design-system-board.ts` becomes the visual source
  of truth: every component × state × 402/1440, captured by a client test
  (`kit-board.mjs`) with pixel and contrast checks. A redesign changes the
  board first.
- **A new feature cut adds no new CSS file.** It composes kit components;
  screen-specific layout goes in `screens/<name>.css` with tokens only.

## 3. Phases

Each phase is its own cut with numeric gates. Every phase keeps all client
journeys green and adds phone + desktop captures.

| Phase | Work | Exit gate |
| --- | --- | --- |
| **A. Foundations** (1 cut) | `tokens.css` from hub / live values; `@layer` wiring; legacy CSS moved into `legacy` layer (no visual change); style-lint + ratchet; kit board skeleton | Pixel-diff of 20 existing captures ≤ tolerance (no unintended change); lint green with ratchet |
| **B. Kit** (1–2 cuts) | The 10 components above, on the board, all states, both widths; fix material windows to use the painted frames | Board: 0 contrast failures, 44px targets, every state captured; owner looks at the board **before** any screen migrates |
| **C. Containers** (1 cut) | One `Window`; port openSheet / openWindow / camp panel / game-menu callers; phone = full-height sheet with sticky header and back | All ~30 window call sites on `Window`; focus / Esc / back tests green; no clipped content at 402×681 (the hub well, the ▼ marker) |
| **D. Screen migration** (3–4 cuts, worst first) | 1) Settings, Bank, Forge, Works, Vat/Pool. 2) Tactics/packages, Rules pen, Unlocks, Forecast. 3) Journal, Chronicle, Gold ledger, Achievements, Menu. 4) Camp chrome (top bar, console labels, side rails), report, death | Per screen: legacy CSS for it deleted, ratchet falls, owner sign-off on before/after captures |
| **E. Polish and queue items** | Queue items 39–42 (scroll zoom, Gold rate indicators, hero hover outline, reactive portrait) and others that are now cheap on the kit (30 hover/pressed/selected, 32 bar sheens, 16/18 bottom/top bars) | Item-specific gates |
| **F. Cleanup** | Remove the `legacy` layer; delete dead CSS files; retire `menu-material.ts` and `chrome.css` duplicates | CSS ≤ 50% of today's 22.3k lines; 0 hex outside tokens / kit; 0 `html body` |

The hub and live view are **reference screens**: in phase D they are ported onto
the kit with the goal of looking *the same* (pixel-diff), which proves the kit
captures what the owner likes.

## 4. Owner decisions before Phase A

**Decided 2026-10-21:** "do your recommendations. redo the ui from scratch if
needed." D1 drop parchment as a window skin; D2 merge duplicate routes; D3 label
the phone console; D4 keep copy budgets; D5 CSS first on existing frame art.

- **D1 Parchment.** Drop parchment as a window skin and keep it only as page
  content (recommended), or keep a journal material.
- **D2 Navigation duplicates.** Crate/Loadouts/tent all open the hub; quest board
  → Journal; Pool = Vat. Merge into one route each (recommended), or give them
  distinct destinations.
- **D3 Phone console.** Labels under the 7 icons (recommended), or fewer tiles
  with a "more" slab.
- **D4 Scope of copy.** Keep the strict copy budgets (≤ 2-word buttons, no
  sentences) as is (recommended); the revamp is visual.
- **D5 Art.** New 9-slice pieces (title plate, section plate, slab states) from
  the art pipeline, or CSS-only on the existing frames first (recommended: CSS
  first, art in phase E).

## 5. Evidence

Captures are in the session scratchpad
(`/tmp/claude-1000/-home-g-p-riddle/adc3767d-9097-47d5-b68f-a6dac394ac7b/scratchpad/ui-audit/`):

- `desk/` (1440×900) and `phone/` (402×681): every building, tile, hub tab, menu
  item and chip.
- `fresh/`: fresh game and live view.
- `walk/`: the playtest loop, including report, absence report and death.
- `sheets/`: contact sheets.
- `AUDIT.md`: per-screen notes.

Contact sheets and `AUDIT.md` are already copied to `docs/evidence/cut316/`; copy the full captures there when the plan is accepted. Counts come
from a read-only scan of `web/src` at `0a45061f` + the Cut315 working tree.

## 6. Progress — 2026-10-21

Delivered, one commit per step, with before/after captures sent to the owner at each checkpoint:

| Phase | Commit | What changed |
| --- | --- | --- |
| A | 60c3c570 | All 46 legacy stylesheets in `@layer legacy` (pixel-identical: ≤ 0.03 % on 54 captures). `ui-kit/tokens.css` (the only colour source), `tools/style-lint.mjs` + `style-ratchet.json` in verify.sh and CI, and review tools `ui-capture.mjs` / `ui-diff.py` / `ui-sheet.py` |
| B/C | 60c3c570 | `ui-kit/kit.css` (window, slab, section, header, stats, rows, tabs, tile, meter) + `kit.ts` builders. Every `openWindow`, sheet and camp panel moves onto the hub's slate, painted tablet frame and slabs. Parchment window skins retired by re-pointing the legacy role variables |
| D1 | 7dd256cc | Settings (three framed groups), Savings (stat tiles, gauge, slabs), building-upgrade rows, Vat/Pool titled by building. Phone windows are full-height sheets |
| D3 | 7c2de692 | Phone console labelled; Tactics gets its own icon; phone top bar fits all stats |
| D | 43206b6b | Hub compacted: actions beside the identity, five tabs in one row (a scrolling strip on phone). Kit targets are fixed 44 CSS px |
| D2 | b81aa106 | Tactics title band, rules-pen rule cards, gold-ledger amounts (were invisible), title case. `ui-capture` reports dark text in any window (none left) |
| D4 | 117f2da9 | Report and every `.parchment` panel on slate; the death banner art stays |
| D4 | 077a5204 | Desktop camp rails show the live view's pillar art; hero card at the kit's floor sizes |

Owner decisions: D1 done (parchment is no longer a window skin), D3 done, D4/D5 held. D2: the
Vat and the Pool now name themselves. The crate, Loadouts and tent open the same hub on different
tabs, and the quest board opens the Journal; these were judged distinct routes rather than
duplicates and left as they are.

Tests updated to the new design (not weakened): `hero-hub` tab geometry, which is now one row at
every width with whole-word labels.

**Pre-existing failures confirmed on earlier commits**, each run without these changes:
- `legible` (fails on 0a45061f)
- `cut23` and `cut24` (exhaustive-only)
- `worker-first-act`, `runsui`, `hero-frame`, `bloodline-tabs` and `hero-upgrade-feedback` (all in
  the alpha.3 audit)

**Still open:**
- Phase F: the legacy CSS itself. The ratchet stands at 1567 colours, 681 font sizes, 194
  `html body` and 10 `!important`. Delete rules as screens are rebuilt; do not add to the layer.
- Works/worker cards (uppercase names in gold boxes).
- The desktop rules-pen rail width.
- Unlock card art.
- A real-art pass on title and section plates (D5).
- Queue items 39–42 on the kit.
