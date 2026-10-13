# Cut197 — Bloodline management tabs

Owner queue7/26 places Loadouts, Class and Legacy in Bloodlines. This first
checkpoint organizes existing real capabilities without claiming saved starting
kits, new gear ownership or the later persistent-stat/NG+ design.

## Contract

1. One selected-hero header and three accessible tabs: Loadouts, Class, Legacy.
   Exactly one panel is visible. Arrow/Home/End keyboard navigation selects and
   focuses tabs; each has aria-selected/controls and a labelled tabpanel.
2. At320/400/1440px panels fit horizontally. Tab state, keyboard focus and panel
   reading position remain stable through actual hero/live updates (<=2px when
   content above the reading point is unchanged).
3. Loadouts uses Rust catalogue/prepared-item/repeat/slot state. Eligible items
   cost0 to prepare; blocked/full/away state is explicit. Removing or preparing
   an item uses existing mutations; no client-invented prices/ownership/slots.
   No saved-kit capability is invented. Active delve kit is not silently edited.
4. Class and Legacy preserve their existing ownership, parent prerequisites,
   cumulative skills, exclusive Legacy leaves and review safeguards. Early Class
   shows a truthful locked milestone rather than a blank panel.
5. Stale catalogue results do not paint or mutate another bloodline/engine.
   Failed requests expose retry; closing unsubscribes all live listeners.
6. Focused browser assertions exercise real-WASM free prepare/drop/repeat,
   identity, tab keyboard navigation, locked/away states and refresh stability.

## Scope remaining

Named saved starting kits, deeper Forge choices, loadout pet selection and the
hero persistent-stat/rebirth model require further core/UI work. Existing class
skill icons and full parent-edge visual refinement remain in the product queue.

## Evidence

Implemented initial tabs and camp Loadouts routing. Focused headless5/5 groups
pass113.2s: new68 checks across320/400/1440 and unchanged cumulative Class,
Class styles, Legacy and upgrade-feedback groups (explicit tab routing).
Evidence and raw failures: docs/evidence/cut197/. Class/Legacy panel roots and
unchanged content persist physically across updates; current tab/focus/scroll
are retained. TypeScript, copy lint and Oxlint pass.

Settled private-GPU screenshots at400/1440 cover all three tabs on an actual
new real-WASM hero, after fonts/images/window animation complete. Selected
tab/visible panel/no horizontal overflow/no page errors are recorded.
Runtime/test/package SHA256 inputs and screenshot hashes accompany the proof.
No release or full-queue claim.

Final review found a genuine keyboard-focus omission: a focused tabpanel root
was captured but descendant-only restoration moved focus to its tab. The root
now retains exact DOM identity and focus across actual lineage updates. The
focused real-WASM group passes74 checks at320/400/1440 in12.5s. Original68-check
logs, input hashes and screenshots remain historical; panel-focus proof records
the corrected source.
