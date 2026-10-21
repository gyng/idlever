# Idlever UI audit (2026-10-21, headless, dev build :5219)
Earned save `earned-first-ascension-clear.json` at 1440x900 (`desk/`) and 402x681 (`phone/`); fresh seed 7 (`fresh/`); playtest walk seed 1 phone (`walk/`). Contact sheets: `sheets/`.

## What the hero hub and live view do right
- **One material, built thick.** Dark slate panels with a 2–3px bevelled metal border, an inner highlight line, and corner rivets or skull studs on the console. Every control looks like an object you can press.
- **Chunky filled buttons.** Hub tabs and the HUD tiles (Speed, Town menu, take over) are full-width filled slabs with an inset bevel. The selected state is a thick gold frame plus an underline, not a 1px outline. Sizes are even, in a regular 2–3 column grid.
- **Art carries the hierarchy.** Portrait or medallion (hub portrait, round hp medallion, red gem pause/Descent) first, then a big serif name, then a small meta line. Text is never the only focal point.
- **Icon plus label tiles** with a numeric badge ("8x", "now"). Little loose prose.
- **Live view:** the scene fills the frame, side rails hold big numerals (D1, D2) with labelled stat rows, and carved pillar art fills the empty rail space.
- **Other screens** fall back to thin 1px outline boxes, tiny small-caps labels, small floating buttons and large empty areas. They also switch to cream parchment or curled-scroll materials.

## Screens
**Camp (desk 01, phone 01)**
- Desktop side rails are mostly empty dark space. The hero card text is about 9px (Ranger, L10 MAX). "Run details" floats alone near the bottom.
- Top bar: "LEGACY 428" and the "upgrade tokens" pill are microtext. On phone the last stat is clipped to "D3" (overflow).
- Phone console: 7 icon-only tiles in 2 rows with no labels. Two key-like icons cannot be told apart. The empty 6th and 7th cells make the row ragged. This style is still chunky (good).

**Ending/ascension card (00, 20-bld-mouth, 40/41 send)**
- The framed card over art is good. "Town" is a tiny orphan button under the stats. "Next descent / Ascension 2" reads as a disabled input field.
- Delve and Next descent from this state just reopen the same card, with no feedback.

**Hero hub (20-bld-tent, 21-hub-*, also opened by the crate and loadout tiles)**
- This is the best sheet, for the reasons above.
- Desktop: the content well is about 170px tall inside a 1440x900 sheet, so the paper doll is cut off.
- Phone: tabs push all content below the fold. The stray "Corin Ash" button under Appearance/Run log is unclear.
- The crate, loadout and tent all open the same hub, which wastes three entry points.

**Tactics (10-tile-packages)**
- "choose tactic" bars are flat full-width rows that look like `<select>` fields.
- The Temperament box text touches the left border (no padding).
- "compare outcomes" is a small floating button.

**Edit/rules pen (10-tile-edit, 30-rules)**
- A ragged column of small chips with mixed widths and arrow glyphs, and no frame rhythm.
- A tooltip covers the content, and the list overflows the viewport bottom.
- Desktop rail header ("SAVED SETUPS", rename/set 2/set 3) is cramped microtext.

**Savings/bank, Forge**
- Web-form look: 1px outlined value box, small buttons, wide empty areas. Forge has a lone "Details" label with dead space below.
- The "Level II / Next III" stat lines are bare text with no structure.

**Guild/workers**
- Three different card styles in one sheet. "promote" is a red pill unlike any other button. The worker roster is a run-on icon list.
- The Orders toggles ("off") use the outline-select style, not the hub's filled style.

**Clone vat (device) and Recovery pool**
- Both open the same sheet, titled with the hero's name and not "Clone vat".
- A "Hero name" rename input sits inside the vat sheet (form element).

**Parchment family (enemy guide, journal/quest board, chronicle, gold ledger, achievements, menu)**
- This is a second visual language: cream paper and thin rules. The menu is three bars on paper.
- The enemy guide's dot matrix and the gold ledger are simple text tables with no icons or totals.
- Chronicle rows are long prose sentences in framed rows, which is dense.
- The ▼ scroll indicator overlaps text ("dep▼th"). Clipped content has no fade.

**Scroll family (unlocks, forecast)**
- A third material (curled scroll). Unlocks mixes grey "owned" chips with priced cards. The "MORE" pill is tiny.
- Forecast bars are clear, but run outcomes and killers are about 9px.

**Settings**
- The most form-like screen: each row is an outlined box with a microtext label left and one small button right.
- The worker toggles wrap unevenly. The last row is cut off.

**Live/watch (fresh/desk-02, walk 03–05)**
- Good, as described above.
- The phone "MILESTONES 0" strip and "take over" tile float in a mostly empty band. The milestone box on the desktop left rail is empty.

**Report and absence report (walk 06, 08)**
- The bevelled stat tiles are chunky and good.
- The "includes" disclosure is a plain white textbox. "WHO DECIDED / TIME" are microtext rows.

**Death (walk 09)**
- The banner art is strong. The console is consistent.

## Chunky vs flat
- **Chunky:** live view, hub, console and top-bar pills, report stat tiles, death, ending card.
- **Flat/web-form:** settings, savings, forge, tactics, guild orders, vat/pool, rules pen.
- **Off-material:** the parchment and scroll sheets.

**Top fixes:**
1. Use one panel material.
2. Make the hub's filled bevel button the only button style.
3. Give stats a structure (tiles or labelled rows).
4. Set a minimum text size of about 11px.
5. Fix sheet heights so they don't clip.
