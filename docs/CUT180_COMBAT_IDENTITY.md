# Cut 180 — retain known actors in combat history

Fresh Cut179 QA observed repeated `Foe` attacks in its third run, preserved in
`scratchpad/qa_cut179_interactive/ui-85.json`. The watch remembers identities
from the initial send snapshot, but the log only consults identities copied
from spawn events and subsequent batch-end snapshots. An initially known actor
can die before that first snapshot and lose its label in the log.

Retain the known name or kind for that actor when capturing each delayed log
batch. Unknown actors must still read Foe. Do not infer identity from damage,
change combat truth, or change the frozen build under the active QA player.

Gates:

1. Extend the existing combat-identity fixture with an initially named actor
   killed before the first batch-end snapshot. Its attack and death must retain
   that name at400 and1440px. The strengthened check fails before the fix.
2. The entire combat-identity group passes after the fix, including delayed
   naming, genuine unknown actors, duplicate-damage handling and bounded rows.
3. Types, copy lint and complete client acceptance pass before adopting a new
   frozen build. Rust and shipping WASM stay unchanged.
4. Preserve the complete Cut179 QA attempt and findings. Resolve its remaining
   observations before releasing two new independent complete blind ratings.
   No deployment; no shortened rating horizon or substituted score evidence.
