# Advanced ability paintings

Owner feedback2026-10-16 rejected the flat skill-insignia contact sheets as too
basic for final artwork and requested more personality, citing Warcraft III
icons as a visual reference. Use original dramatic ability paintings: expressive
faces/hands, strong gestures, tangible worn materials, rich brushwork and varied
compositions. Retain Idlever's moonlit palette and inspect actual24/32/48px sizes.
The reference establishes visual character, not copied game assets or abilities.

The30code-native compositions in `web/src/ui/advanced-skill-marks.ts` remain
primitive fallback material. The client now registers all72primitive compositions
with72painted candidate overlays. The first30overlay phase retained42plain
original nodes; Cut254 replaces those too. The overlays are candidates, not final
art approval. Native12node trees and30new actual interactions have scoped native
checks; earned/pacing/final acceptance remain separate.

Original painted masters are `art/generated/skill_<class>_<node>_v1.png` with
exact built-in imagegen prompts in `art/prompts/skill_<class>_<node>_v1.txt`.
Keep masters untouched and preserve rejected versions. These icons intentionally
have opaque painted backgrounds; the interface owns their frame and locked/
available/learned treatment. Each painting should communicate the ability's
gesture without trying to diagram every number or condition.

Run `python3 art/export_advanced_skills.py --partial` for draft review. The script
preserves the full square, exports192×192lossless RGB WebP to
`web/public/ui/skills/`, and writes `art/advanced-skills.json` with original/prompt/
export hashes and the exact missing inventory. Without `--partial` it refuses
an incomplete30master set. Export completion is not live integration acceptance.
All skill names, ownership, costs, prerequisites, state and effects remain Rust
truth; new art must not imply that unimplemented skills are already available.

Current status:30of30advanced painted candidates exported (1662290bytes), with
client registration in progress. Thirty first-pass masters and five version2 revisions are saved
with exact prompts and built-in provenance. The revised Patient Ambush and four
Ranger compositions use broader visible paint and square framing. Four rejected
non-square Ranger originals remain untouched; the exporter refuses non-square
selected sources rather than stretching or silently cropping them. Selected
versions are explicit in the exporter and manifest.

All30were inspected at actual24/32/48/96image pixels in
`docs/evidence/cut253/painted-samples/all-thirty/` (150sized image cells including
one128px overview, DPR1). The version2 Patient Ambush is the stronger style
reference: angular expressive face, visible brushwork, blue-violet/crimson
contrast. Many version1 paintings remain too realistic/detailed; Gunner values
are especially dark at24px, Caster compositions need more separation and Ranger
Split Mark/Moving Line retain excess scenery. Continue that targeted polish
before final acceptance. Larger broad action masses read better at48px; this
is engineering observation, not independent recognition or gameplay proof.
Scoped client registration/fallback/state/accessibility checks now pass648cells,
72distinct primitive paths,270painted cells and30blocked-image fallbacks with
served painting hashes and exact unchanged save (cut253/icons72-v5). This is
controlled catalogue review, not earned advanced progression. Cohesion with the
existing42icons remains pending. First3sample typography's mojibake is retained;
the new review includes explicitUTF8. Review findings expire when the selected
paint, export, frames or displayed size changes; don't carry a pass forward.

Cut254 now supplies all42original-node paintings, with two targetedV2revisions
(Boss guard's tall shield/mace and Ambusher's vertical strike). All44new masters
and exact built-in prompts are saved; rejectedV1s remain. The complete72candidate
library exports4193234bytes,0missing/invalid; art/class-skills.json pins all
216source/prompt/export hashes. The generated active registry now includes72.
The normal advanced-only exporter cannot downgrade this complete registry.

Current ef4b client proof passes648state/size cells with72unique primitive
compositions,648painted cells,72actual blocked-image fallbacks, served hashes,
accessible names and exact unchanged save. Watch Recovery attribution also passes.
Full-set/per-class/primary402×681captures are in cut254/full72-states; desktop
is labelled a scroll inventory, per-class boards are component captures.

This is candidate integration, not final art acceptance. Root and independent
engineering review agree that dark Rogue/advanced Caster/Gunner paintings and
repeated Engineer compositions need targeted work. The early42symbol/30painting
style gap is removed, but variation and tiny-size clarity are still incomplete.
Read cut254/independent-review/observations-2026-10-16.md before choosing revisions;
its exact identity and shelf-life limits apply. No player recognition or fun
claim follows from the inventory, hashes or rendering checks.
