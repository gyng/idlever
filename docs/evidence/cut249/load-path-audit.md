# Cut249 semantic visibility load-path audit

Read-only source before mutation,2026-10-16. `engine.rs` Run.last_visible is
currently serde(skip); `facts.rs` on_vision consumes its ordered previous IDs
before replacing them with current live visible IDs. It logs a lost ID only if
the monster still exists, has HP>0 and is hostile. Duplicate keys replace the
previous entry; sim contexts skip provenance logging. The initial MAX sentinel
forces the first vision pass; its nonexistent monster cannot create a sighting.

Run is nested in Game.run, Game.history[*][0], Game.floor_start[0], DeathRec
snapshots and replay Capsule.game (itself a complete Game). All use derived Run
serde. Capsules have custom envelope serializers but delegate nested Game/Run
to their actual serializers, including live and held-kill capsules. Session::load
calls Game::load for active and every other resident; Game::load delegates to
save::load and never restores last_visible. Therefore a field-level persistence
fix applies uniformly without separate Session/capsule adapters or wire fields.

Newly persisted paths will be inventoried recursively on complete old/current
public outputs. An allowed path must terminate exactly in /last_visible; its
value must be the unmodified ordered u32 ID vector. No provenance/trace field
is allowed to differ in uninterrupted current output vs archived c9fa output.
New checkpoint roundtrip must preserve complete saves with no normalization.

Legacy absent fields default to an empty vector as they did previously. No
attempt guesses previous visibility from current/deserialized monsters. That
legacy behavior can omit a sight loss on the first subsequent pass; the narrow
fix guarantees persistence for newly emitted saves. Explicit fixture labels
will distinguish old earned input from new saved checkpoints.

Actual paid c9fa public red differs at7201 only in provenance history; final
save differences are300 structural diff entries caused by one missing element
at /prov, /last_exit/trace/provenance, /deaths/133/death/trace/provenance and
/batch/exits/0/trace/provenance. This is not300 independent events. Final reports
also differ. Raw failure and full diff remain in Cut248.

Adjacent acting_row (serde(skip), legacy default0 vs normal−1) is a separate
unreproduced suspicion from root review, not fixed or claimed covered here.
No broad claims about all skipped fields are made.
