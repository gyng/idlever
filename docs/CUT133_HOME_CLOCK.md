# Cut 133 — home lighting follows the local wall clock

Owner request: sync home graphics and lighting to wall-clock time. The existing
renderer already reads local hours/minutes every frame. Preserve that schedule:
dawn5–7, daylight7–17, dusk17–21, night21–5. Sample one Date with fractional
seconds so the gradual lighting transitions remain continuous at minute changes.
Game/offline elapsed time, progression and rewards stay in Rust.

Acceptance:

- Controlled browser wall-clock checks, without setHour overrides, prove actual
  renderer night values at local noon, dusk, night and dawn in Asia/Singapore
  and America/New_York. The same UTC instant produces the appropriate local
  lighting in each zone.
- GL and forced Canvas2D fallback follow the local clock; darkness refreshes
  after a simulated document-visibility suspension and resumption.
- These presentation changes retain an exact core save and do not repaint
  unchanged terrain for time-of-day changes. No page errors.
- TypeScript/copy/build and complete settled client suite pass before ratings.
  Landscape visual review belongs to Cut132; diagnostic clock overrides are
  never described as natural-time play or scored experience.
