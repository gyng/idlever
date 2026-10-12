# Original findings — cca75f9 / seed223

## unexplained

- First report / class picker · original report said “1/1 FULL HAUL · no heals · collected” after run1, but the subsequent class picker showed disabled “rogue L1” with “⊘ first full haul” · expected the phrase to have a consistent on-screen meaning, or a more specific unmet milestone · repro seed223: first bank at D3, inspect report, build storehouse, open hero→Change class; first-run-report.excerpt.md and operations158/161. After run3, report again said “1/1 FULL HAUL · hurt · collected” and rogue was available (263). Run2 class state was not inspected. Later availability does not replace the earlier evidence.

## friction

- New bloodline / Scout settings · “Scout sends immediately” / “Scout settings” / “Found”; opening Scout settings, then closing its sheet returned to town and discarded the pending Found confirmation · expected closing settings to return to that confirmation · repro seed223, $470 available, Heroes→New bloodline→Scout settings→close; repeat confirmed via operations331/334/337, original319/322/325. Requires Heroes→New bloodline again before Found (two additional taps).

## defect

None independently confirmed yet.

## misread

None filed yet.

### Appended unexplained candidate — damage HP scope

- Bloodline2 run1 report · “COMPLETED RUNS ·7.8M”, “DEALT0.39 dps ·pets0.05 dps ·205 hp”, “TAKEN0.05 dps ·pets0.04 dps ·25 hp ·19 hits” · expected HP totals to use the same stated scope, or label hero/team separately · repro seed223, found Sable Thorn with earned $250, first automatic D5 bank, keep leather, expand details; unchanged on dealt-label hover (381), decision log (384) and return from log (387). 205/(7.8×60)≈0.438 fits combined hero+pet DPS;25/(7.8×60)≈0.053 fits hero DPS and36→11 health loss. The screen does not say why the two HP values appear to use different scopes. No assertion about hidden game truth.

### Clarifications preserved

- Repeated “pink jelly fell” followed by another “pink jelly” action was initially ambiguous in the live log. The report explicitly says “summoned jelly fell×2”; this explains two different jellies. Not filed as resurrection or a hero death.
- New-owner header confirms reputation/best are owner-specific as well as Legacy. Shared gold alone moved from220 to391 on Bloodline2’s report. Earlier assumptions about a global reputation/best were corrected by visible evidence, not a source read.

### Appended defect candidate — companion card inert

- Companions · enabled button “MENDERSkul L1 /1 heir /splitter /21/21 ·2/2” accepted taps but changed no visible screen or copy and gave no lock explanation · expected the enabled card to respond with a detail/action, or communicate that it has no available action · repro seed223, Bloodline2, earned kennel, open companions, tap visible button.comp-main; operations415 and445. Accessible-label check418 showed enabled:false is not set (disabled:false), title empty, aria/description absent. Separate “Skul rules” button does open the working editor (421). No claim about the hidden handler's intended function.

### Visible clarifications appended during late cold phase

- Bloodline1 detail switched the active owner and exposed separate balances: Legacy11 and◆17, later Legacy12 and◆19. The class/style tokens are a different resource from hero Legacy.
- Bloodline1 run log listed6 completed payouts124+107+267+255+50+41=$844, matching its displayed owner run total. Background runs5/6 were “went home,” earlier1–4 “collected.”
- Full Steady preset rows explain bank/return choice: “hp<25% ·depth≥7→bank,” “hp<25%→return,” and “lacks heal ·hp<40%→bank.” This supplies visible context for those different exit labels.
- Hero preset viewer says “Read only /Custom rules /·after Bloat Mother.” This was a hero rule-entry inspection, not a completed hero field edit. Actual written edits remain the two companion Skul changes.
- Unfiled forecast-title candidate: after selecting Guarded, tactics title still said “floor7 25%” (505), while current extracted camp forecast said50%. Closing/reopening tactics refreshed title to “floor7 50%” (511), with same Guarded L1, gold605, Legacy13,◆19, XP89/240. Original state retained; trigger has not yet been repeated, so not promoted to a filed lapse.
