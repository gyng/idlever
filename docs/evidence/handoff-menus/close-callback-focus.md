# Close callback focus regression and test URL correction

The joint named39 run failed numbered-descents at its unchanged assertion that
Escape restores the Next descent opener. A fresh5382 rerun reproduces it in
numbered-descents-before-focus.log. Shared close() called onClose while the
app was still inert. The existing caller's synchronous next.focus() was ignored;
the generic animation-frame fallback occurred after its expected return.

close() now removes the sheet, restores its parent and releases focus/inert
ownership before invoking onClose. Generic deferred restoration preserves a
valid explicit focus choice made by that callback. No game state changes.
Original numbered-descents passes at320/400/1440 with preview/cancel/locked/
refusal/success/loadout/no-repeat and unchanged save assertions intact.

The new standalone callback fixture initially retained a valid anchored parent
from the earlier nested/modeless cases. Its correct focus trap redirected a
request outside that parent (exact state in root-focus-parent-diagnostic).
The standalone-root case now explicitly closes prior sheets, leaving all
earlier parent/modeless checks intact. root-focus-corrected/results.json
passes118checks: the original112 plus synchronous callback ownership and
post-animation preservation at three widths. Diagnostic failures remain.

The new menu-materials test also appended '/?' to a runner base already ending
in '/'. menu-url-diagnostic.json reproduces boot success at one slash and an
actual History.replaceState SecurityError at '//?fresh', with boot false.
Normalize only this test's trailing base slash; no production bootstrap or
application URL behavior is changed. The passing118-check run uses a trailing
slash base, matching the routine runner.

Final format468files/lint/copy108files2710literals and production-base web build
pass. Bundle-size/ineffective-import warnings remain. The full41-group routine
is in flight on Node22; do not infer whole-client acceptance from targeted checks.
