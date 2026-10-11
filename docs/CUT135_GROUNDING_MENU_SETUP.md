# Cut135 — grounding test enters through the title menu

The complete d34605e client run failed157/158 in1432.7s. Sole failure: hero-grounding line16 waits for engine startup on a plain fresh URL. Cut130 intentionally shows the title and defers the engine until New game. Unchanged serialized reproduction failed0/1 in31.3s at the same line; existing menu81 checks passed in the original whole run.

Update only test setup to click the public New game button before awaiting boot. Keep both400/1440 viewports, overlap limits, z ordering, hero presence, foe count and no-error assertions unchanged. No app/renderer/asset/WASM changes. Gates: corrected grounding plus menu checks pass; a new complete158-group acceptance must pass before blind release. Preserve both original failures.

The first separate production startup diagnostic incorrectly waited on window.__riddle without dev=1, where the debug object is intentionally absent. Its timeout is diagnostic error, not evidence of product startup failure. Corrected diagnostic enables inspection without bypassing the first-visit title.

Corrected scoped checks PASS2/2 in16.6s: grounding both widths, menus81 checks. Production diagnostic title/no-engine→New game/real-WASM/camp PASS. Original whole and unchanged serialized failures retained. New complete158-group run pending.
