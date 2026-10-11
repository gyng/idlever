# ade4b12 transcript-first QA

Build `ade4b127b78bb75cbc088c9e35d607f1618c7696`, frozen URL `http://127.0.0.1:40483/`. Seed149, dedicated headless400×800 driver5351, same save throughout. No scores. This is QA, not a blind rating or completed independent rating horizon.

Exposure: the supplied operating manual described game systems, invariants, repository layout and intended design. I did not open HANDOFF, PLAN, CUT documents, research, implementation, cards or other QA reports. I read the transcript brief, rating protocol and idle human-probe material. Driver harness code and read-only DOM markup/geometry were used to identify available controls; no game internals, grants, hidden navigation or forced clicks were used.

All ten `.txt` dumps in `scratchpad/cut169/qa-walk` were read in numerical order before live decisions. PNG08/09/10 were inspected once each when layout and numeric comparison mattered. The original walk files were not changed. Live evidence is in `scratchpad/qa-ade4-transcript/`: `operation-index.txt` numbers the retained97 operation responses; `operations.jsonl` retains the concatenated original JSON responses; `third.json`, `return-pair.json`, `return-initial.json`, `forge-after.json`, `camp-final.txt`, `guarded-sheet.json` and `ledger.md` add specific evidence.

## defect

- **live · return gold detail** · “earned $2970 − spent $687 = purse +$2283,” followed by “lost · −$687” and “$687 not kept” · expected spending to mean purchases, and unkept carry to have its own label; the visible receipt ledger has no $687 purchase · seed149, OP080–082, after the only8h absence. The wallet arithmetic reconciles; the description of the subtraction does not. A later actual forge purchase separately says “−$135 · forge.”

## misread

- **transcript + live · gold earned** · dump10 says “+$1698 GOLD EARNED” alongside wallet “$1594”; live says “+$2970 GOLD EARNED” alongside “$2454” · I initially expected earned gold to be the wallet increase, then the detail panel explained gross carry versus actual proceeds · seed149, dump10; OP080–082. Resolved in live detail: prior wallet171 + collected1923 + salvage304 + recovered56 =2454. The main summary requires opening details to distinguish these amounts.
- **live · town dungeon** · “dungeon / hauls 1/3” · I expected a dungeon information panel and instead started my second run · seed149, OP015, after first return and free forge construction. This was a real accidental send; I watched its eventual death rather than undoing or manufacturing state. The separate “send” control had led me to read the dungeon hotspot as navigation.

## unexplained

- **transcript + live · combat log** · “Foe → Quill Ash · −1 hp,” alongside named rat/monkey events · expected the trace to name which foe made the attack · seed149, dumps04–06; reproduced in the first live run and again as “Rook Ash → Foe” in `third.json`. I cannot identify every generic Foe from the log alone. Unknown visibility may be intentional; no implementation inference is made.
- **transcript, not confirmed live · hired Scout counter** · dump09 still says “scout / sends him each rest · 1/3 sends,” while the gem says “SEND / auto” · expected the hired worker's prerequisite display to be completed or replaced · seed149, dump09. My live earned hire showed “SCOUT HIRED,” “Departs20m” and auto, but did not reproduce the original old1/3 bubble. Different town construction and supply decisions mean this is unresolved transcript evidence, not a confirmed live defect.
- **live · death explanation** · “goblin archer · D5 · hero at1/36 hp,” “Steady · bank at25% · default,” then the opened verdict only repeats the cause and “Next run / level · Steady L2” · expected a visible sequence explaining why banking failed to save him · seed149, OP039–043. I could name the killer and accept the offered level lever, but could not reconstruct the decisive rule sequence from this screen. No written patch was offered here.
- **live · return ownership/scope** · “While away8h” and, under HEROES, “Zeleth brought $14” · expected an away gain or a nearby indication that this receipt predates the absence · seed149, OP080–084. The gold ledger places “+$14 fetched by Zeleth” below the third manual run and below “−$113 hire scout”; it was already in the pre-away wallet. “Includes before away” appears much later under completed-run statistics. I initially tried to add14 to the away purse and then excluded it after reading the receipts.
- **live · set find** · “sleeper's candle · set piece +13 · +2 Legacy” · expected a named quantity for +13 · seed149, `return-pair.json` and its once-inspected settled screenshot. Legacy is named; +13 is not. I did not establish its meaning through a set-log drilldown, so this remains a local copy/explanation gap rather than a claimed numerical failure.

## friction

No independently confirmed game friction filed. Locator failures caused by hidden matching text, overlapping phone panels or the driver's exact-text matching are not counted as game defects. The `sheets` helper's throwaway copy opened the title menu instead of the current camp (`sheets-first.json`), so its result does not certify camp-sheet coverage.

## Capture evidence, separate from game defects

- Original PNG09 displays wallet200; txt09 displays201.
- Original PNG10 displays11 runs, D3, earned166 and wallet201; txt10 displays16 runs, D7, earned1698 and wallet1594. These pairs are sampled at different apparent animation stages and cannot be treated as a simultaneous numeric record. My live return was captured after loading settled and two animation frames; text and PNG both show14 runs/D8/2970/2454. The original mismatch was not reproduced as a stable game inconsistency.

## Coverage and reconciliation

Fresh entry used `?dev=1&runs=1&seed=149&fresh=1&menu=1`, visible New game and free Build house. All later navigation retained `dev=1&runs=1`, omitted fresh/menu/seed and kept the same save. I completed three manual sends; first and third used visible skip controls, second continued while I inspected town. One death was read. Porter was earned and hired free, then Scout was earned and hired for113. Free forge and storehouse construction changed the path from the original walkthrough; the reproduction is not claimed to be an identical control sequence.

Completed own configuration changes: storage preference weapon→armour→none→weapon (OP066–068), cage loot preference weapon→armour (OP078), and later Steady→Guarded through the earned tactics sheet (`guarded-sheet.json`). These are five configuration changes; no tactic selection is counted as a written rule. The death's offered Steady level lever was accepted; no authored patch button was offered.

Purchases: two leashes at30 each, with the supplies panel read. The second purchase looked inert in an immediate response, but the later visible receipt ledger confirms both −30 entries. One leash was dropped and refunded30; the other remained in supplies. Also hired Scout113 after reading its worker sheet, and bought the discounted forge aim offer135 after reading forge choices; the resulting Forge sheet was read. `forge-after.json` shows sword+1 and the next aim/edge prices900. These were earned purchases, not injected state.

Written rules: **four blocked entry attempts, zero actual row entries, zero completed edits**. Before the absence, the transcript text said “PEN / meet Captain”; the four attempts to reach that entry were intercepted by the existing phone town/panel layers. After return the dump says “PEN / meet Mother.” I intended to try a heal threshold, earlier banking, archer targeting and a rest row, but never reached an editable field and never typed them. These cannot certify four hand-edited rows or even four independently exercised row controls. No synthetic unlock was used. This requirement remains unavailable/incomplete in this short earned-state pass.

Eight-hour return, before additional purchases:14 runs;2 full hauls +12 returns =14;0 away deaths; new bestD8. Wallet171→2454:1923 collected +304 salvage +56 recovered =2283 net, and171+2283=2454. Gross2914 carried +56 recovered =2970;2970−687=2283. The687 includes the difference between gross carry and proceeds, net of salvage; it is not supported as purchase spending. Porter hauled2227 =1923+304. Quill's recovered pack56 belongs to deceased heir1; Rook is heir2, both Bloodline1. The pre-away Zeleth receipt14 is excluded from the away delta.

Fighter XP: pre-away L2 XP12/240; +537 gives549, crossing240 leaves309/540 atL3, matching the hero sheet. Legacy12+20=32 for Bloodline1. The visible candle contributes2 Legacy; the return run upgrade-token gain is18, and prior run receipts total9 tokens, yielding27. I observed only this one bloodline; no cross-bloodline ownership test was possible. The later135 forge payment makes the wallet2319 and does not change the completed-absence earnings summary. No worst away death was available; none is invented.

Counts: **defect1; misread2; unexplained5; friction0; capture artifacts2**.

Horizon/budget: first evidence work began around local06:36 (UTC22:36,2026-10-11); live checks ended around local06:49 (UTC22:49). The ledger preserves an initial timezone-label error and explicitly corrects it. Actual active time was not instrumented per action; **approximately9minutes is an uncertain estimate**, excluding identifiable loading, failed locator waits, unattended/buffered watch intervals and report writing. No precise reading intervals or15-minute completion are claimed. This is shorter than the requested approximate15-active-minute target and far short of40+5+5+20. Manual tally before filing: approximately156 nested tool invocations and65 orchestration wrappers;5 images inspected once each. No automatic exact invocation counter was available; the manual tally is uncertain, remains below200 nested invocations, and is not an audited budget certificate. No sound, performance, full client suite, exhaustive balance or blind-rating conclusions are drawn.
