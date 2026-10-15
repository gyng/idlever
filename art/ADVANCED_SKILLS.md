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

Current status:8of30painted candidates saved/exported. Three cross-class samples
were viewed at actual24/32/48/96px frames in
`docs/evidence/cut253/painted-samples/first/`. At24px the broad material/action
masses read; faces and secondary effects need larger sizes and labels. This is
engineering art review, not independent recognition, final approval or gameplay
proof. Remaining Fighter additions need small-size review;22masters and live
registration/fallback/state/accessibility acceptance remain pending.

Use the existing primitive paths when paint is unavailable; a failed image must
never hide a skill or block a purchase. Review again after paint, export, frames,
displayed sizes, canonical IDs, icon state or the native catalogue changes.
