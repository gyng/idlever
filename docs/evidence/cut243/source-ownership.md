# Cut243 checkpoint ownership

Production source owned by this lane:

- web/src/{feats,heroes-compact,return-pick,runs,styles,tasks,town,works}.css
- web/src/ui/{camp,concepts,hero-hub,menu-material,party,patches,preparation,return-pick,skin,town,works}.ts
- web/src/render/town.ts: only `town.next_ready===true` scene reveal condition.

Tests owned by this lane:

- web/tests/{home-building-help,home-residents,cut30town,first-plot,legible,ready-plots,return-pick,wall-preparation}.mjs

Shared-file exclusions until parent Cut244 checkpoint:

- camp.ts `simKey`: retired `loadout`/`keep_pref` removal belongs to Cut244.
- render/town.ts `actualnew_finds` absence field belongs to parent.

Do not stage other dirty source, engine package, ledger/HANDOFF or other cuts.
`checkpoint-evidence-files.txt` lists the curated evidence paths only. Rebuild
curation after any new output or document edits; it performs no Git operations.
All local original JSON/image/failure files remain; gzip JSON copies are lossless.
