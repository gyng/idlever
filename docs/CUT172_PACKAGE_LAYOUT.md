# Cut 172 — keep the worn style readable

Fresh earned seed223 QA on frozen ade4b12 equipped Guarded and reopened the
style chooser. Its selected card shrank to roughly36 CSS pixels while its
description spilled behind the level and close controls. Preserve the original
styles-reopened and styles-compare screenshots.

Give the selected package card its own row within the existing wrapping slot,
with level and variant controls below. Keep equip, level, compare, variants and
chooser behavior unchanged. Also name the extra-find count in the report:
`set piece +13 finds` rather than an unexplained `set piece +13`.

Acceptance: selected Guarded with an affordable level control occupies its slot
width and contains its description at320,400,1440 CSS pixels. Existing selected
query/slot/stale-result/close checks remain intact. TypeScript/copy lint and
package-selection checks pass. Capture the revised phone layout. No unlock or
simulation changes, state grants to QA, fun certification or deployment.

Status: TypeScript/copy lint pass. Package selection17 checks at each of320,
400,1440 pass; marked fixture screenshots captured and the400px view posted.
Correct Cut118b finds4/4 pass. The mistaken zero-check part and initial old-copy
assertion failure remain preserved and are not acceptance. Evidence
docs/evidence/cut172/. Full QA and new build acceptance/freeze remain pending.
