# Consecutive chore fixture

The prior complete headless run failed at pick up ×3 despite isolation. That failure is preserved at ../headless12-run/. The fixture appended one chore per engine batch, allowing intervening combat/floor messages to end the streak. Production coalescing deliberately ends on such messages or a floor change.

The fixture now supplies eight consecutive pick-up events in each controlled batch, matching its intended repeated-chore case. The minimum four, maximum one plain line and twelve-second timeout remain unchanged. Other core/watch cases remain intact. The full group passes all43 checks in40.2seconds; this focused result does not replace the required complete current audit. No game code changed.
