# Journal core evidence

Journal reads use existing construction, worker, system-age, class and quest
rules. They do not grant resources, draw RNG, claim a reward or change a save.
Five initial semantic tests cover fresh/manual/away/refusal states, actual
worker prices, independent age/milestone requirements, all four real quest
reward effects, and two-bloodline whole/sliced/reloaded8h Journal parity.

The pre-Cut210 final workspace audit passes853 tests,0 failures,6 existing
ignored tests in73.96seconds; Clippy passes. Its logs and source hashes remain
separate from the newer automatic-cache runtime. Earlier test/probe failures
record incorrect Porter readiness assumptions; the runtime follows the actual
lit worker instead of granting a worker or inventing another haul.

Current earned inputs are in `earned-final/`. Each `.game.json.gz` is the exact
Game save, compressed without normalization. Read with Node `gunzipSync` and
pass its text to Session/engine `load`. The tar archive preserves all27 raw
files; every archived file was read back and SHA256 checked.

Both seeds1/13 start fresh, build the house, complete three actual manual
delves, hire the genuinely ready free Porter, then hire the Scout with earned
Gold. Fresh, house, manual1–3, Porter-hired and Scout-ready saves are supplied.
The modeled first-session times through Scout hire are453.325 and459seconds:
actual ticks/10 at4×,25seconds per camp,5seconds per House/Porter/Scout action.
This is the existing dayplayer chore model, not a measured human playtest.

Each then plays six actual8h absences with optional affordable permanent forge
upgrades and ready manual construction. No Gold, facts, discoveries or kills
are granted. Both have active row quests at3×8h and earned completed row
quests at4×8h; active companion-slot quests remain at6×8h. Exact goals,
progress, reward meaning and observations are in `earned-journal.json`.

The immediate-cache timing deliberately changes later combat/progression:
final48h best depths are23/19, versus14/19 in the earlier grace-timed probe.
These are two diagnostic seeds with engagement, not balance acceptance or a
fun verdict. The older raw saves remain in `earned-before-cut210.tar.gz`.

Cut210 supersedes the initial “First loot choice” guidance: no cage discovery,
task, preference editor or chooser remains. Captive encounters remain distinct.
