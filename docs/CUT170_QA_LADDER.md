# Cut 170 — identify the next control gate

Fresh interactive QA on frozen ade4b12 seed223 read the rail's trailing
`meet Captain` as the Pen gate. The Pen tooltip correctly said `meet Mother`.
The rail's condition belongs to its first dark rung, Tactics, but its placement
after Pen made that relationship unclear.

Render the next rung's name with its existing Rust-supplied condition on a
separate centered line: `tactics · meet Captain`. Preserve every rung, unlock
rule, lit state, tooltip and door. This is a presentation correction only.

Acceptance: TypeScript and copy lint have zero failures; existing Cut118 ladder
checks retain all state/tooltip assertions and require the named condition;
the Cut120 orders door remains functional. Capture phone layout with the next
condition clearly separated from Pen. Complete acceptance and freeze the new
assets before independent ratings. Current QA continues on unchanged ade4b12;
its findings and original assets remain preserved. No deployment.

Status: implementation, TypeScript, copy lint and both existing browser groups
pass (4 ladder plus31 Cut120 checks,32.9s). Original QA screenshot and scoped
checkpoint are preserved in docs/evidence/cut170/. Updated screenshot and build
freeze remain pending; full QA and independent rating remain unverified.
