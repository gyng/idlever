# Cut186 — taller Continue and coherent class controls

The owner reports the Continue control is vertically too short and the chunky
class controls look wrong. Scope: CSS only, preserving existing frames and
fallbacks, all control labels/actions, game progression and saved state.

Primary menu actions use104px height, centered30px text and taller frame ends.
Class choices use full-width64px stone/iron controls,36px class symbols and a
clear gold selected state. Skill/reset/specialization controls share56px height,
16px labels and existing iron/gilt button art. Read-only skill chips stay small.

Checks: existing game-menu/class-locks2/2 and class-styles1/1 at original widths;
private-Xvfb GPU320/400/1440 with actual104/64/56 heights, no overflow/pageerrors,
exact unchanged original earned save. Screenshots wait for decorative image
loading. Copylint passes. Evidence: docs/evidence/cut186/button-ui/.

This scoped success does not clear Cut185's failed full audit, certify shipping
or change the paused fun goal. No deployment or immutable-preview mutation.
