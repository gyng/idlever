# Cut204 material comparison

Implemented three materials and shared scalable type/spacing/control roles using
existing palette, Fira/Grenze and painted pixel bevels. Forge is iron/stone,
Bloodlines ink/gilt, and the actual quest card parchment. No new Journal quests,
progression, rewards, core rules or external library were introduced.

Final browser terminal 0: [candidate-pinned-final.log](candidate-pinned-final.log).
Ten real-menu candidate frames at 400×900 / 1440×900 cover Forge, Bloodline Loadouts,
Class, Legacy and the actual quest card; the required six primary frames are a
subset. Ten matching baseline frames use the same earned save and WASM with only
the foundation stylesheet disabled. Two labeled state-board atlases contain 54
cells (nine states × three materials × two widths). They are design fixtures,
not gameplay or a delivered Journal system. Long-name/large-value stress labels
are fixture data. Real menu data was not granted to create states.

Checks passed: ordinary control targets at least 44 CSS px; actual hover/press
appearance, canceled with Escape before release and 0 Gold spend; visible close
marks; visible keyboard focus and Tab movement; exact doubling of body text;
no document or nested-panel horizontal overflow beyond 1 CSS px at 200% text scale.
Reduced-motion mode was used and optional material motion is suppressed.
[Contrast](contrast.json): 365 actually painted text ranges across menus
and state boards, 0 failures at 4.5:1 for ordinary text and 3:1 for inactive text.
Background captures hide text only, then sample the worst pixel beneath each
text range. This is scoped proof, not complete game accessibility certification
or measurement of every icon, popup, hidden node or every user text length.

## Provenance and limits

WASM 6416437 bytes, SHA256
`00abb85939603828991c8d4f2c148a8b5be84105c8e5791fa3e75fbf2403b292`.
Both phases use save SHA256
`e32309d2b31082d6bf606ef19aac3099d85a90d6a6cc8f0073e6d2c8d72b4eff`.
[Earned actions](earned-quest-actions.json) extend the current Cut201 seed 13 save
through four affordable permanent Forge purchases and an actual 8h/13-delve
absence. The Warlord kill and quest reward are real engine results.

The final comparison uses a historical UI snapshot cached by an isolated no-HMR
server on 5249. Root added StartingKits integration after that server cached its
modules. These frames do **not** certify the current named-kit UI; root's fresh
named-kit/material captures supersede that limitation. Final candidate CSS is
an exact owned-source snapshot injected with the imported stylesheet disabled;
this avoids stale stylesheet transforms while retaining the same cached menus.
[Phase inputs](candidate/inputs.json), [served transformed module responses](candidate/served-modules.json)
and [owned source hashes](source-inputs.json) record those separate facts.
The baseline stylesheet is disabled, so its earlier unused CSS hash is not a
claim of candidate-source equality. WASM and save hashes match between phases.

Raw failed logs remain. They exposed selector specificity suppressing real hover,
a missing packed close image, unreadable Legacy balance, and inner text-scale
overflow. Other interim failures came from decorative ghosts/shared-server HMR
and sampling clipped text. Final probes retain the original contrast/overflow
gates. Actual screenshots wait for decoded fonts/images and ghost removal.
Oxfmt, targeted Oxlint, global copy-lint and TSC passed on final owned sources.
No performance claim, package build, commit or broad-menu adoption was made here.

Reproduce explicitly (diagnostic GPU job, kept outside the automatic client suite):

```sh
IDLEVER_PORT=5249 IDLEVER_FOUNDATIONS_PHASE=candidate IDLEVER_FOUNDATIONS_SAVE=docs/evidence/cut204/earned-quest.json node tools/ui-foundations-check.mjs
python3 tools/ui-foundations-contrast.py
```

Use a fresh no-HMR server for a new current-UI capture; do not relabel this cached
snapshot as newer integration proof. Review the actual material comparison before
expanding the roles to other menus. Saved kits, pet loadouts and a guided Journal
remain separately owned feature work.
