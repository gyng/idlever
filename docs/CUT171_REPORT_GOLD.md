# Cut 171 — separate spending from lost carry

Fresh seed149 transcript QA on frozen ade4b12 reconciled the eight-hour wallet
but found `earned $2970 − spent $687` alongside a `lost −$687` term and no
purchase. Rust's reconciled ledger intentionally totals every negative term,
including lost carry, in its wire field `spent`. Calling that entire total
spending makes a death look like a purchase.

Render the existing signed `lost` term separately in the report equation and
gold tooltip. The spending label covers the remaining negative total. Preserve
the exact Rust totals, every ledger term, gross earned value, purse change and
legacy-save fallback. No resources, unlocks, simulation or wire values change.

Acceptance: the existing Cut117 gold fixture must still reconcile exactly to
−$6789, with $2659 earned, $6828 spent and $2620 lost, and all five signed terms
present. Its old-save fixture remains unchanged. TypeScript and copy lint have
zero failures. Original QA evidence remains unchanged. Rebuild and freeze only
after the complete QA lapse list is resolved or individually justified; no fun
score or deployment is implied by this correction.

Status: TypeScript/copy lint and existing Cut117 gold, report-reading and
numbers-agree checks pass (3/3 groups5.3s). Exact terms and legacy fallback
remain checked. Evidence docs/evidence/cut171/. Full acceptance, remaining QA
and a new immutable build are pending.
