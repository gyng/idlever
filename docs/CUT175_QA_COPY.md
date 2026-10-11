# Cut 175 — sheet inspection copies the saved town

Seed149 QA's `sheets` helper inspected the title menu instead of the saved camp.
The helper navigates its copied browser to the original first-visit URL, which
still contains `fresh=1&menu=1`. Those flags override the copied earned save.

Remove only first-visit/reset and simulated-absence flags from the copied
navigation. Preserve the original page/URL and save, engine selection, seed,
clock setting and other relevant parameters. The helper remains a diagnostic
copy; its buffered operation duration never counts as active player time.

Acceptance: a real-WASM town created through New game and Build house at a
first-visit URL is copied as that town, not the title menu; `same_screen` is true
in an intentionally paused stable fixture. The original URL, engine save and
local saved value remain byte-identical. Preserve the original failed QA output.
No player progression, policy or resource grants; no deployment.

Status: real-WASM saved-town diagnostic passes: same screen, original URL and
exact engine/local save unchanged. Evidence docs/evidence/cut175/. Original
failed QA output remains in cut173. The occupied5357 service was untouched;
new41417 browser was closed after the check. No active-time credit implied.
