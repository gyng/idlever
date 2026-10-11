# Cut 176 — name the free Rogue gate

Fresh seed223 QA saw a disabled Rogue with no reason. Rust grants Rogue free
after the first full haul (`meta::gate`: bank once; `engine` records banked
depths only on `ExitTier::Bank`). Free unlocks are omitted from the purchase
catalogue, so the picker has no catalogue reason to render.

While Rogue is unowned and absent from the catalogue, render `first full haul`
as its caption in both class pickers. Keep all availability, ownership,
purchase and class-switch decisions based on existing Rust wire state. This
is only the caption for that existing free gate; no client unlock calculation.

Acceptance: existing class-lock tests retain gate, token-short, available,
owned, viewport and exact-save checks at320/400/1440. Add the omitted-free-entry
case: disabled Rogue has the caption, with no engine-save change. TypeScript
and copy lint pass. No simulation changes or deployment.

Status: TypeScript/copy lint pass. Existing class-locks/class-switch groups pass
2/2 in16.9s at320/400/1440. Evidence docs/evidence/cut176/. Final full acceptance,
new asset freeze and complete player QA remain pending.
