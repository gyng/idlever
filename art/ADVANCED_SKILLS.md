# Advanced ability paintings

Owner feedback2026-10-16 rejected the flat skill-insignia contact sheets as too
basic for final artwork and requested more personality, citing Warcraft III
icons as a visual reference. Use original dramatic ability paintings: expressive
faces/hands, strong gestures, tangible worn materials, rich brushwork and varied
compositions. Retain Idlever's moonlit palette and inspect actual24/32/48px sizes.
The reference establishes visual character, not copied game assets or abilities.

The30code-native compositions in `web/src/ui/advanced-skill-marks.ts` remain
draft/fallback material. They are not final art and are not in the live registry.
The existing42registered icons are unchanged; visual consistency of the eventual
72node catalogue still needs review. Native12node trees and their30new actual
interactions remain separate required implementation work.

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

Current status:30of30painted candidates exported (1662290bytes); no live
registration. Thirty first-pass masters and five version2 revisions are saved
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
Live registration/fallback/state/accessibility acceptance and cohesion with the
existing42icons remain pending. First3sample typography's mojibake is retained;
the new review includes explicitUTF8. Review findings expire when the selected
paint, export, frames or displayed size changes; don't carry a pass forward.

Use the existing primitive paths when paint is unavailable; a failed image must
never hide a skill or block a purchase. Review again after paint, export, frames,
displayed sizes, canonical IDs, icon state or the native catalogue changes.
