# Cut294 — Watch selects the actual weapon's painted hero variant

Owner backlog R4; current Cut293 supplies14 real earned runs. Snapshot.hero.weapon
already names the actual run weapon. Cut267 packed18 variant paintings, but
ReplayState ignores weapon and both backends draw class/look only.

## Contract frozen before implementation

1. Freeze one real landed, nonfatal hero attack per Cut293 branch (14 total),
   preferring cleave on authored Fighter and bolt on authored Caster. Target must
   survive through capture tick event.t+2. Keep exact selected floor/events and
   source replay hashes; no edited snapshots, live enemies, item grants or reruns.
2. Before edit reproduce wrong entity kinds for the six alternate weapon/class
   combinations in both production GL and Canvas. Save primary phone402×681
   viewport captures and actual chosen kinds; no claim based only on sprite names.
3. Renderer reads Snapshot.hero.weapon on load/reset/seek, chooses existing
   hero_<class>_<look>_<weapon> ONLY for Cut267's six supported combinations.
   No weapon/old snapshot/unsupported combination preserves existing behavior.
   Missing variant art falls back to class+look, then class primitive; neither
   backend may require art to run. No game state, art pixels or simulation change.
4. Actual GL/Canvas matching after captures:14 moments×phone402×681/desktop1440×900
   ×two backends =56. Correct entity kind14/14 per matrix, loaded existing variant
   on supported choices, visible hero, unchanged floor/events,0 page errors.
   Check all18 look/weapon ids resolve actual atlas frames, class/look fallback
   when variant missing, class primitive when all art absent, plus legacy/no-
   weapon behavior. Controlled fallback fixtures are labelled, not earned play.
5. View the affected weapon captures and representative authored class moments;
   record dated observations with actual viewport, text scale, GPU/capture kind,
   build/save/action identities and confidence. No actual Watch DOM/full UI,
   player feedback, unique class identity, build superiority or fun inference
   from standalone production viewers. Current R4 evidence remains scoped.
6. Relevant renderer/looks tests, types/lint/format/copy and web build pass.
   Context loss/restoration retains the same selected variant in production GL.
   Source, atlas bytes and selected inputs stay frozen during each capture pass.
   No WASM repack/settlement or balance run for this client presentation change.

Held W2/recovery/Guide gap4 and no automatic deployment remain unchanged.
