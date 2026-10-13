# Cut207 — home label spacing and current scaling check

Owner reports overlapping labels in the warm-lantern checkpoint. Inspect the
actual current UI, preserve scene geometry and art, and reserve visible space
for building help, construction labels and resource/worker markers.

- At320/400/1440, actual visible help labels do not overlap one another, the
  construction tag or resource markers. Keep44px help actions and screen bounds.
- Preserve real building/help/construct/hero actions and marker meaning.
- Use the earned Cut203 town from real delves; distinguish additional controlled
  all-built coverage. Check fresh House/locked Forge/ready later construction.
- Capture a new night milestone on the private GPU display and a Canvas fallback.
- Independently check current home/menu scaling at normal and200% text. Prior
  Cut204 cached comparison is historical; report remaining menu-family scope.
- Keep the full queue visible. This does not deliver its remaining journal,
  persistent-hero, pet/class, live-view or progression work.

## Label implementation

Help labels reserve actual badge/construction/pill bounds and other scene
action centers. Their own building body remains a valid position, retaining
the association between name and building. A construction tag has stable
max-content width with a town-width cap, avoiding its earlier left-edge clip.
The header's first-time concept caption takes normal flow space instead of
floating over the next stat row.

The first geometry record passed its label-only gate but exposed a clipped
locked-Forge construction tag; the strengthened gate includes tags. Twelve
actual cases include fresh ready House, locked Forge, earned kit town, and the
exact all-building earned town used in the reported Cut202 screenshot, at
320/400/1440. Additional full-building help/build/hover actions are controlled
fixtures, not earned progression. No Gold or discovery is granted to either
earned save. Normal label geometry and private-GPU night captures pass.

One interim capture caught the day-to-night transition and is preserved as
such. The final night condition checks actual night1 and no construction FX.
An unnecessary30-idle-frame wait took105.3s; an input wake-up and actual settled
lighting condition reduced the comparable12-case GPU check to30.2s. No
collision, bounds or44px target requirement was relaxed. The first attempted
dev wake-up called an unexposed poke method; the supported pointer input fixes
that test error, whose original log is retained.

Current200% text/home-chrome scaling proof and final-source acceptance follow
the separate current-scaling lane. Its first fresh pass found actual narrow
menu and footer/control issues; historical Cut204 acceptance did not cover them.

## Final current-source checks

The current material fixes wrap narrow Forge actions, limit physical frame
padding and keep close targets44px. Home chrome removes negative row margins,
reserves room for the Delve gem, keeps tile icons/targets stable, and raises
Gold/settings targets to44px. The current scaling lane's24 captures cover
Home/Forge/Bloodlines/quest at three widths and normal/200%. Its old Town module
retains a3px Kennel overhang; that is preserved, not relabelled as passing.

Root's fresh final source covers five real states at three widths: ready House,
locked Forge, earned kit town, original screenshot town and earned Quest town.
All15 normal and15 enlarged cases pass actual label/marker/tag intersections,
scene bounds,44px help targets, caption intersections and document overflow.
Root's label-size observer handles text scaling and late fonts without requiring
a viewport resize, and disconnects on disposal. Four affected actual client
groups pass in44.6s; enlarged geometry passes in35.3s. These concurrent elapsed
times are not quiet performance comparisons. Build/lint/types/format/copy pass.
Broader typography and remaining menu families are not certified by this cut.
