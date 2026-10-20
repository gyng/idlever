# Cut293 — current earned class/loadout comparisons

Exactly14 new departures: ten original Cut246 baseline loadouts plus four
Fighter/Caster authored branches. Five classes branch from one earned camp,
with actual levels8/1/1/1/1; this is not five new-player progression cohorts.
Original common parents retain prior6/8/8-mark class purchases and shared200-Gold
short-gun purchase. No grants, refunds, edited saves or new gameplay defaults.

Four authored branches actually fire the intended verbs. Fighter takes three
public tree picks, spending6→3 class points,0 Gold/marks/time/RNG. Caster writes
ward/bolt rows through the already open pen; actual public set_rules also clears
its old stall tally and earns pen_row honour. These side effects are retained,
not normalized away. Only the chosen policy changes before weapon forks.

Tradeoffs from these exact saves, not a universal strength ranking:

- Fighter sword baseline banksD22/$828; authored diesD28/$0. Crownsplitter both
  dieD28; authored47059ticks versus baseline52108, with hurt972 versus917.
- Authored Caster on either weapon fires213 bolt rows and10 wards, returnsD8
  with$145,84 hurt,11798ticks. Baselines dieD13/$0. Both authored complete combat
  event streams are identical and use no weapon attacks: the magic policy is
  demonstrated; a combat benefit from swapping those two weapons is unproved.
- Ranger sword banksD23/$856 versus bowD13/$254 here. Rogue both dieD13 and
  Gunner both dieD18. All losses, time, hurt and Gold remain in results.json/md.

`Ladder rows / attacks` counts observed verbs that belong to that class's ladder;
this is NOT proof of unique class identity. Ranger shooting is also a normal
bow attack for other classes. Requested rows, actual row fires, attack counts
and passive effects are distinct. The four authored branches prove their actual
class verbs; six baseline branches still show no ladder verbs in these channels.
Quoted real events are in actual-event-quotes.json; raw streams are archived.

Two initial Gunner preparations used the wrong general kit API and were refused
before any send. Same two declared choices then succeeded through public firearm
choice,0 additional cost. Original refusals and the API correction are retained;
other12 captures are unchanged. Initial helper compile/type errors are retained,
corrected final helper build and warnings-denied example Clippy pass.

Original binary is retained locally as target/cut293/probe-original; its hash is
pinned in identity.json. The original helper source snapshot was reconstructed
from recorded edits after capture, explicitly labelled; it was not pre-pinned.
The corrected helper snapshot adds the firearm API and one offer receipt, with
no core change. Both native hashes and current core tree are recorded. Frozen
experiment preceded capture; api-correction.md records the command correction.

Independent verification: `python3 docs/evidence/cut293/verify.py` (Python3,zstd).
It checks archive hashes/all364 receipts, source input hashes, seven matched
initial world pairs, public offers/costs/policy changes,14 whole-event/terminal-
save observer pairs,14 complete report/save8h repeats and14 exact Gold ledgers.
All actual8h runs reconcile28800s and contain exactly one departure (Scout off).
Public replay has the same ticks and all pre-exit events14/14, but its smaller
exit payload and omitted settlement events mean whole-stream equality is false;
no normalization is used to claim otherwise. Full watched1/100tick streams are
exact. Archive1518902 compressed bytes /173418963 logical raw bytes;0.502s here
is compression timing only, not a tuning/campaign speedup benchmark.

No current Watch GL/Canvas acceptance, broad balance, R3, exhaustive or independent
fun claim. No engine/WASM/default, held W2/recovery/Guide gap4 or deployment change.
Next review the actual captured class/weapon moments in Watch; retain the
spell-policy/weapon limitation rather than assuming generic class dispatch broke.
