# Cut292 — show missing Throw dependency before selecting wade in

Owner: continue backlog; follows earned Cut290 and diagnostic Cut291.

## Contract

1. Rust package wire reports `variant_needs`, indexed like `variants`, only when
   at least one variant has an unmet ability dependency. Gas-step wade-in's
   explicit Throw row reports `Learn Throw` when neither natural class permission
   at current class level nor general Throw unlock exists. Step-away has no such
   requirement: its card has separate internal behavior. Never imply the entire
   tactic is disabled, never disable selection, and never grant an ability.
2. Derive dependencies from actual leading/ordinary variant rows rather than a
   second package-id list in TypeScript. This change covers explicit Throw only;
   do not pretend it certifies item stock, range, row ordering or every ability.
3. Render Rust's hint beside the corresponding variant on the existing package
   screen, visible on phone402×681 and desktop1440×900. Clear it after a real
   public Throw purchase; preserve selected variant and free equip behavior.
4. Controlled core tests cover Fighter locked, Fighter globally unlocked, natural
   Rogue and other variants, and prove repeated wire reads leave whole save
   unchanged. Earned locked/purchased Cut291 inputs demonstrate actual wire values
   with complete save unchanged after reading. Current Node/public-WASM shows
   same values after rebuild, plus whole native/WASM save parity.
5. Relevant client/type/lint/copy/format and Rust tests/Clippy, native settlement
   repin, scoped browser proof, screenshots + dated observation record. Numeric
   bars:0 wrong variant hints,0 automatic purchases,0 save changes from wire reads,
   hint≤3words,0 horizontal overflow in primary phone/desktop captures. Any
   unmet browser/visual/settlement requirement remains explicitly unfinished.

No policy/economy/stock/permission changes; no population balance, six-counter,
full/exhaustive/fun or deployment inference. Held W2/recovery and Guide gap4 stay.
