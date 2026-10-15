# Private harness checkpoint scope

Read-only review on the frozen249 runtime. The current routine-full launcher
already requests --resume. Its private dayplayer_checkpoint/mod.rs serializer
also explicitly records/restores last_visible in run_extra/restore_run, including
live Run, history, floor_start and death t10/floor. It stores the ordinary derived
Game alongside those extra runtime fields. Cut249 therefore duplicates the same
ordered IDs in that internal format; restore writes back the identical vector.
No custom checkpoint adapter mutation is needed. Its identity includes the exact
executable/parameters/environment, so old executable checkpoints cannot be used
silently on the successor. The live targeted pacing launch uses completed job
caches but did not opt into internal --resume; it remains healthy/detached.

Ordinary player saves intentionally omit DeathRec.floor (engine.rs2944–2948);
Cut249 does not change that old behavior or claim to restore that omitted parent
field. The ordinary saved DeathRec Run scope is t10. Game.run/history/floor_start
and saved Capsule.game Run values use the corrected field serializer. The load-
path audit's general phrase “DeathRec snapshots” refers to serialized t10, not
a claim about the intentionally omitted floor parent.

This review makes no claim about all other skipped fields. In particular,
acting_row is an independent unreproduced concern from the parent audit.
