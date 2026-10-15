// Cut253 artwork draft. Not registered in the live catalogue until Rust exposes
// these nodes. Labels, eligibility, effects and state always come from the wire.
// Broad BONE silhouettes and MIST interaction cues use the existing icon CSS.
export type AdvancedSkillMark = {
  d: string;
  tone?: "ink" | "mist";
  line?: boolean;
};
const fill = (d: string, tone?: "ink" | "mist"): AdvancedSkillMark => ({ d, tone });
const line = (d: string, tone?: "ink" | "mist"): AdvancedSkillMark => ({ d, tone, line: true });

export const ADVANCED_SKILL_MARKS: Readonly<Record<string, readonly AdvancedSkillMark[]>> = {
  // Block → recovery → bash tempo.
  fighter_rally: [
    fill(/* copy:none */ "M4 8L12 4L20 8V17Q18 24 12 28Q6 24 4 17Z"),
    line(/* copy:none */ "M12 11V21M7 16H17", "ink"),
    line(/* copy:none */ "M24 26Q32 18 24 10M24 10H29M24 10V5", "mist"),
  ],
  // Boss bash arms one guarded hit.
  fighter_oathguard: [
    fill(/* copy:none */ "M5 14L16 9L27 14V20Q23 27 16 30Q9 27 5 20Z"),
    fill(/* copy:none */ "M7 7L5 2L12 5L16 1L20 5L27 2L25 7Z", "mist"),
    line(/* copy:none */ "M16 16V24", "ink"),
  ],
  // Two cleave targets feed the shield's cooldown.
  fighter_opening_cut: [
    fill(/* copy:none */ "M3 3L7 2L17 20L13 23ZM26 2L30 4L20 23L16 20Z"),
    fill(/* copy:none */ "M9 22L16 19L23 22L21 28L16 31L11 28Z", "mist"),
    line(/* copy:none */ "M2 14L5 20M30 14L27 20", "mist"),
  ],
  fighter_siege_rhythm: [
    fill(/* copy:none */ "M7 7L5 2L12 5L16 1L20 5L27 2L25 7Z", "mist"),
    fill(/* copy:none */ "M19 9L23 12L13 25L9 22ZM6 21L16 28L13 31L3 24Z"),
    fill(/* copy:none */ "M26 19L30 23L26 27L22 23Z", "mist"),
  ],
  // Two separate block charges, not an unconditional armour increase.
  fighter_holdfast: [
    fill(/* copy:none */ "M6 5L16 2L26 5V17Q24 26 16 30Q8 26 6 17Z"),
    line(/* copy:none */ "M11 10V16M21 10V16M11 22H21", "ink"),
    line(/* copy:none */ "M2 18V26M30 18V26", "mist"),
  ],
  fighter_execution_arc: [
    fill(/* copy:none */ "M21 2L27 7L14 21L9 17ZM6 17L18 27L14 31L2 21Z"),
    line(/* copy:none */ "M27 17Q32 27 22 29M22 29L24 24", "mist"),
    fill(/* copy:none */ "M4 5L8 9L4 13L0 9Z", "mist"),
  ],
  rogue_afterimage: [
    fill(/* copy:none */ "M6 4H12V17L8 26H2L5 16Z", "mist"),
    fill(/* copy:none */ "M15 9H21V22L17 31H11L14 21Z"),
    line(/* copy:none */ "M25 3V16M21 7L25 3L29 7", "mist"),
  ],
  rogue_tell_thief: [
    fill(/* copy:none */ "M2 12Q16 0 30 12Q16 24 2 12ZM12 12A4 4 0 1 0 20 12A4 4 0 1 0 12 12"),
    line(/* copy:none */ "M7 25Q16 33 25 25M25 25H19M25 25V19", "mist"),
  ],
  rogue_veiled_route: [
    fill(/* copy:none */ "M3 13Q0 7 7 7Q9 0 16 5Q24 1 25 10L29 14Z", "mist"),
    fill(/* copy:none */ "M10 15H16V24L12 30H5L9 24Z"),
    fill(/* copy:none */ "M24 19L29 24L24 29Z", "mist"),
  ],
  rogue_patient_ambush: [
    fill(/* copy:none */ "M19 2L24 6L14 22L9 19ZM5 18L17 26L13 30L1 22Z"),
    line(/* copy:none */ "M28 12Q34 25 24 29M24 29V23M24 29H30", "mist"),
  ],
  rogue_ghostwalk: [
    fill(/* copy:none */ "M4 10Q1 3 9 4Q14-1 18 5L23 10Z", "mist"),
    fill(/* copy:none */ "M7 12H12V23L8 29H2L6 22ZM21 15H26V25L22 31H16L20 24Z"),
    line(/* copy:none */ "M18 11L25 8L29 11", "mist"),
  ],
  rogue_silent_finish: [
    fill(/* copy:none */ "M7 3H15V11H7Z", "mist"),
    fill(/* copy:none */ "M24 3L28 7L15 22L11 18ZM8 18L19 27L15 31L4 22Z"),
    line(/* copy:none */ "M25 20L29 25L25 30", "mist"),
  ],
  ranger_spotter: [
    fill(/* copy:none */ "M2 22L6 17L10 22L14 17L18 22L22 17L27 22L23 29H6Z"),
    line(/* copy:none */ "M16 2V15M10 8H22", "mist"),
    fill(/* copy:none */ "M12 8L16 4L20 8L16 12Z", "mist"),
  ],
  ranger_quiver_thread: [
    line(/* copy:none */ "M2 16H27M21 10L28 16L21 22"),
    fill(/* copy:none */ "M7 3H14V10H7Z", "mist"),
    line(/* copy:none */ "M5 25H15M9 29H19", "mist"),
  ],
  ranger_corridor_volley: [
    line(/* copy:none */ "M3 4V29M29 4V29"),
    line(/* copy:none */ "M10 27V10M7 13L10 8L13 13M21 27V6M18 9L21 4L24 9", "mist"),
  ],
  ranger_split_mark: [
    fill(/* copy:none */ "M7 2L13 8L7 14L1 8ZM25 18L31 24L25 30L19 24Z"),
    line(/* copy:none */ "M11 13L20 22M16 21L21 22L20 17", "mist"),
    line(/* copy:none */ "M19 2L30 13M25 3H30V8", "mist"),
  ],
  ranger_patient_snare: [
    fill(/* copy:none */ "M3 21L7 16L11 21L15 16L19 21L23 16L28 21L24 29H7Z"),
    line(/* copy:none */ "M8 11L13 4M10 4H14V8M19 11L24 4M21 4H25V8", "mist"),
  ],
  ranger_moving_line: [
    fill(/* copy:none */ "M4 2Q22 11 4 20L9 11Z"),
    fill(/* copy:none */ "M19 17H24V26L20 31H14L18 25Z", "mist"),
    line(/* copy:none */ "M12 12H29M25 8L29 12L25 16", "mist"),
  ],
  caster_chilling_charge: [
    line(/* copy:none */ "M9 2V16M3 6L15 12M15 6L3 12", "mist"),
    fill(/* copy:none */ "M18 13L27 10L30 14V23L23 30L16 23V17Z"),
    line(/* copy:none */ "M22 17V22H26", "ink"),
  ],
  caster_storm_cell: [
    fill(
      /* copy:none */ "M9 1L12 7L18 4L15 11L22 14L15 17L17 24L10 21L5 26L6 18L0 15L6 11L3 5L8 7Z",
      "mist",
    ),
    line(/* copy:none */ "M21 13L27 18L23 23M27 18L30 27"),
  ],
  caster_ice_lock: [
    fill(/* copy:none */ "M5 5L16 2L27 5V17L16 30L5 17Z"),
    line(/* copy:none */ "M16 7V24M9 11L23 20M23 11L9 20", "ink"),
    line(/* copy:none */ "M2 18V25M30 18V25", "mist"),
  ],
  caster_shatter_ward: [
    fill(/* copy:none */ "M5 5L14 2L12 12L17 17L10 27L5 19ZM18 2L27 5V19L18 28L22 17L17 11Z"),
    line(/* copy:none */ "M2 26L7 29M25 28L30 24M28 12H31", "mist"),
  ],
  caster_conduct: [
    line(/* copy:none */ "M8 3V17M2 7L14 13M14 7L2 13", "mist"),
    line(/* copy:none */ "M11 19L21 25M21 18V31M16 21L27 28M27 21L16 28"),
  ],
  caster_last_wall: [
    fill(/* copy:none */ "M4 4L14 1L24 4V17L14 27L4 17Z"),
    line(/* copy:none */ "M9 9H11M17 9H19M9 15H11M17 15H19", "ink"),
    line(/* copy:none */ "M21 21L29 25L21 29", "mist"),
  ],
  gunner_rangefinder: [
    fill(/* copy:none */ "M2 16H25V21H13L10 30H4L7 21H2Z"),
    line(/* copy:none */ "M20 2V12M15 7H25", "mist"),
    fill(/* copy:none */ "M26 22H30V30H26Z", "mist"),
  ],
  gunner_chamber_chain: [
    fill(/* copy:none */ "M3 5L6 2L9 5V20H3ZM12 5L15 2L18 5V20H12Z"),
    line(/* copy:none */ "M24 10V25M20 21L24 25L28 21M21 6H28", "mist"),
  ],
  gunner_smoke_walk: [
    fill(/* copy:none */ "M2 13Q0 6 7 6Q10 0 17 5Q24 2 26 11L29 15Z", "mist"),
    fill(/* copy:none */ "M8 17H18V30H8ZM12 19H14V27H12"),
    line(/* copy:none */ "M23 21L29 25L23 29"),
  ],
  gunner_cycling_breach: [
    fill(/* copy:none */ "M2 8L27 18L25 23L13 18L8 29L2 26L7 15L0 12Z"),
    line(/* copy:none */ "M18 4Q29 1 30 11M30 11L25 8M30 11V5", "mist"),
  ],
  gunner_long_watch: [
    line(/* copy:none */ "M16 3V17M9 10H23"),
    fill(/* copy:none */ "M12 10A4 4 0 1 0 20 10A4 4 0 1 0 12 10", "mist"),
    line(/* copy:none */ "M5 21Q16 33 27 21M27 21V27M27 21H21", "mist"),
  ],
  gunner_breach_route: [
    fill(/* copy:none */ "M2 4L25 12L23 17L12 13L8 23L2 21L6 10L0 8Z"),
    fill(/* copy:none */ "M20 19Q23 13 28 18Q34 22 28 26H20Z", "mist"),
    line(/* copy:none */ "M14 27L20 30L25 28", "mist"),
  ],
};
