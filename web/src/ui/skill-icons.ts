import "../skill-icons.css";
import { h } from "./dom";

// Broad BONE relic silhouettes, INK cuts and restrained MIST accents. Each
// composition describes a real class policy; labels always come from the wire.
type Mark = { d: string; tone?: "ink" | "mist"; line?: boolean };
const shield = /* copy:none */ "M7 5L16 2L25 5V15Q24 24 16 29Q8 24 7 15Z";
const dagger = /* copy:none */ "M24 3L23 13L13 23L9 19L19 9ZM7 18L14 25L11 28L4 21Z";
const arrow = /* copy:none */ "M5 25L22 8M15 7L26 4L25 15M5 19L11 25";
const bow = /* copy:none */ "M8 3Q28 16 8 29L13 16Z";
const crown = /* copy:none */ "M6 9L5 3L11 7L16 2L21 7L27 3L26 9Z";
const bolt = /* copy:none */ "M18 2L7 18H15L12 30L26 12H18Z";
const gun = /* copy:none */ "M4 11H28V16H16L12 27H6L9 16H4Z";
const eye = /* copy:none */ "M3 16Q16 3 29 16Q16 29 3 16ZM12 16A4 4 0 1 0 20 16A4 4 0 1 0 12 16";
const smoke = /* copy:none */ "M4 25Q-1 20 6 17Q2 9 10 10Q11 2 17 7Q25 4 25 13Q33 15 27 21L28 25Z";
const marks = (...paths: string[]): Mark[] => paths.map((d) => ({ d }));
const line = (d: string, tone?: "ink" | "mist"): Mark => ({ d, line: true, tone });
const art: Record<string, Mark[]> = {
  fighter_warden: [{ d: shield }, line(/* copy:none */ "M16 8V22M10 15H22", "ink")],
  fighter_recovery: [
    { d: /* copy:none */ "M5 9L13 6L20 9V17Q19 24 13 28Q6 24 5 17Z" },
    { d: /* copy:none */ "M23 3V8H28V13H23V18H18V13H13V8H18V3Z", tone: "mist" },
  ],
  fighter_boss_guard: [
    { d: /* copy:none */ "M7 12L16 10L25 12V19Q23 26 16 29Q9 26 7 19Z" },
    { d: crown, tone: "mist" },
    line(/* copy:none */ "M11 18H21", "ink"),
  ],
  fighter_reaver: [
    { d: /* copy:none */ "M21 2L26 6L13 22L8 18ZM5 17L16 26L13 29L2 20Z" },
    line(/* copy:none */ "M3 10Q10 5 14 6", "mist"),
  ],
  fighter_crowd_breaker: [
    { d: /* copy:none */ "M14 3H19V17L24 12L28 16L17 28L5 17L9 13L14 18Z" },
    line(/* copy:none */ "M3 6L6 10M29 5L26 9", "mist"),
  ],
  fighter_boss_breaker: [
    { d: /* copy:none */ "M14 10H19V26H14Z" },
    { d: /* copy:none */ "M4 12L7 4L12 8L16 2L20 8L25 4L28 12L22 16L18 13L15 17L10 13L7 16Z" },
    line(/* copy:none */ "M19 6L15 11L19 14", "ink"),
  ],
  rogue_stalker: [{ d: eye }, { d: /* copy:none */ "M22 2L23 10L12 29L8 27L16 8Z", tone: "mist" }],
  rogue_ambusher: [{ d: dagger }, line(/* copy:none */ "M2 10L8 12M6 3L10 8M29 21L25 19", "mist")],
  rogue_boss_stalker: [
    { d: /* copy:none */ "M3 20Q16 8 29 20Q16 30 3 20ZM13 20A3 3 0 1 0 19 20A3 3 0 1 0 13 20" },
    { d: crown, tone: "mist" },
  ],
  rogue_shade: [
    { d: /* copy:none */ "M7 27Q3 17 8 9Q16-2 24 9Q29 17 25 27L21 23L16 28L11 23Z" },
    { d: /* copy:none */ "M11 13L16 9L21 13L20 19H12Z", tone: "ink" },
  ],
  rogue_escape_artist: [
    { d: smoke, tone: "mist" },
    { d: /* copy:none */ "M5 23L15 11L19 14L10 24L20 23L20 28L5 29Z" },
  ],
  rogue_counter_ambush: [
    { d: /* copy:none */ "M8 2L9 12L24 27L28 23L14 8ZM25 2L24 12L9 27L5 23L19 8Z" },
    line(/* copy:none */ "M3 17Q1 5 11 3M29 16Q32 28 21 29", "mist"),
  ],
  ranger_hunter: [{ d: bow }, line(arrow, "mist")],
  ranger_boss_hunter: [
    { d: /* copy:none */ "M11 11Q26 19 11 30L15 20Z" },
    { d: crown, tone: "mist" },
    line(/* copy:none */ "M4 25L25 13M20 13H26V19"),
  ],
  ranger_finisher: [
    { d: /* copy:none */ "M3 22L12 9L17 12L8 26ZM12 17L22 4L27 7L18 21Z" },
    line(/* copy:none */ "M22 23L28 27M28 21L22 29", "mist"),
  ],
  ranger_barrage: [
    line(
      /* copy:none */ "M3 27L12 7M8 8L14 3L15 11M12 29L21 9M17 10L23 5L24 13M21 29L28 15M24 15L30 11L30 18",
    ),
  ],
  ranger_crossfire: [
    line(/* copy:none */ "M3 26L26 3M20 3H27V10M5 3L28 26M21 26H29V18"),
    { d: /* copy:none */ "M12 13L16 10L20 13L20 19L16 22L12 19Z", tone: "mist" },
  ],
  ranger_marked_barrage: [
    line(/* copy:none */ "M4 29L11 14M8 15L13 11L14 18M12 30L21 16M17 17L23 13L24 20M23 29L28 21"),
    { d: /* copy:none */ "M16 2L22 5L19 10H13L10 5Z", tone: "mist" },
  ],
  caster_channeler: [
    { d: /* copy:none */ "M5 28L8 29L21 8L18 6Z" },
    { d: /* copy:none */ "M20 2L27 8L23 15L16 9Z", tone: "mist" },
    line(/* copy:none */ "M21 5V10", "ink"),
  ],
  caster_boss_channel: [
    { d: /* copy:none */ "M14 11H18V29H14Z" },
    { d: crown, tone: "mist" },
    { d: /* copy:none */ "M10 17L13 14L18 14L22 18L18 22H13Z" },
    line(/* copy:none */ "M16 15V20", "ink"),
  ],
  caster_storm: [
    { d: bolt },
    line(/* copy:none */ "M3 6L8 9M27 3L24 7M4 25L9 23M28 24L24 22", "mist"),
  ],
  caster_guardian: [{ d: shield, tone: "mist" }, { d: /* copy:none */ "M16 8L20 14L16 23L12 14Z" }],
  caster_frost_guard: [
    { d: /* copy:none */ "M6 7L16 3L26 7V18L16 29L6 18Z" },
    line(/* copy:none */ "M16 8V24M9 12L23 20M23 12L9 20", "ink"),
  ],
  caster_nova_guard: [
    {
      d: /* copy:none */ "M16 2L19 9L26 5L23 13L30 16L23 20L27 27L19 24L16 31L12 24L5 27L9 20L2 16L9 13L5 5L12 9Z",
      tone: "mist",
    },
    { d: /* copy:none */ "M12 11L20 11V18L16 23L12 18Z" },
  ],
  gunner_marksman: [{ d: gun }, line(/* copy:none */ "M18 3V8M15 5H21", "mist")],
  gunner_boss_marksman: [
    { d: /* copy:none */ "M3 16H28V21H16L13 30H7L10 21H3Z" },
    { d: crown, tone: "mist" },
  ],
  gunner_quick_loader: [
    { d: /* copy:none */ "M9 8H15V26H9ZM19 8H25V26H19Z" },
    line(/* copy:none */ "M4 15V8L9 3M28 18V25L23 30", "mist"),
  ],
  gunner_breacher: [
    { d: /* copy:none */ "M4 4L26 20L23 25L13 18L7 28L2 25L8 15L1 10Z" },
    line(/* copy:none */ "M28 6L25 10M21 3L21 8M31 14L26 14", "mist"),
  ],
  gunner_smoke_screen: [
    { d: smoke, tone: "mist" },
    { d: /* copy:none */ "M9 12H20V17H15L13 25H8L11 17H9Z" },
  ],
  gunner_close_loader: [
    { d: /* copy:none */ "M4 3H10V19H4ZM16 14H29V19H23L20 29H14L17 19H16Z" },
    line(/* copy:none */ "M13 4L23 6L22 10", "mist"),
  ],
  // Cut225 earned classes: the Clown's bell, curtain and masks; the Engineer's gears, sentries and masts.
  clown_bellkeeper: [
    { d: /* copy:none */ "M16 3Q9 3 9 13V20L5 25H27L23 20V13Q23 3 16 3Z" },
    line(/* copy:none */ "M10 19H22", "ink"),
    { d: /* copy:none */ "M13.5 28A2.5 2.5 0 1 0 18.5 28A2.5 2.5 0 1 0 13.5 28", tone: "mist" },
    line(/* copy:none */ "M3 8Q0 13 3 18M29 8Q32 13 29 18", "mist"),
  ],
  clown_false_exit: [
    { d: /* copy:none */ "M4 30V12Q4 2 16 2Q28 2 28 12V30ZM9 30V13Q9 7 16 7Q23 7 23 13V30Z" },
    { d: /* copy:none */ "M9 13Q9 7 16 7Q13 15 18 30H9Z", tone: "mist" },
    line(/* copy:none */ "M10 20L14 19", "ink"),
  ],
  clown_ringmaster: [
    { d: /* copy:none */ "M9 22L10 5H22L23 22Z" },
    { d: /* copy:none */ "M2 23Q16 19 30 23Q16 28 2 23Z" },
    line(/* copy:none */ "M10 17H22", "ink"),
    { d: /* copy:none */ "M27 2L28 5L31 6L28 7L27 10L26 7L23 6L26 5Z", tone: "mist" },
  ],
  clown_turncoat: [
    {
      d: /* copy:none */ "M4 9Q16 3 28 9Q28 22 16 27Q4 22 4 9ZM8.5 12L11.5 9L14.5 12L11.5 15Z",
    },
    { d: /* copy:none */ "M16 5Q22 5.5 28 9Q28 22 16 27Z", tone: "ink" },
    { d: /* copy:none */ "M17.5 12L20.5 9L23.5 12L20.5 15Z", tone: "mist" },
  ],
  clown_cruel_joke: [
    { d: /* copy:none */ "M15.5 13.5L18.5 16.5L6 27L2 30L5 26Z", tone: "mist" },
    line(/* copy:none */ "M12.5 15.5L16.5 19.5", "ink"),
    {
      d: /* copy:none */ "M21 3Q25 3 24 7Q29 7 28 11Q29 15 25 15Q25 19 21 18Q17 19 17 15Q13 15 14 11Q13 7 18 7Q17 3 21 3ZM19 11A2 2 0 1 0 23 11A2 2 0 1 0 19 11",
    },
  ],
  clown_last_laugh: [
    {
      d: /* copy:none */ "M5 8Q16 2 27 8Q29 20 16 29Q3 20 5 8ZM8.5 13Q11.5 8 14.5 13Q11.5 11.5 8.5 13ZM17.5 13Q20.5 8 23.5 13Q20.5 11.5 17.5 13ZM11 20Q16 26 21 20Q16 23 11 20Z",
    },
    { d: /* copy:none */ "M9.5 14Q11.5 17 9.5 18.5Q7.5 17 9.5 14Z", tone: "mist" },
  ],
  engineer_watchmaker: [
    {
      d: /* copy:none */ "M26.7 13.6L29.9 14.1L29.9 17.9L26.7 18.4L25.3 21.9L27.2 24.4L24.4 27.2L21.9 25.3L18.4 26.7L17.9 29.9L14.1 29.9L13.6 26.7L10.1 25.3L7.6 27.2L4.8 24.4L6.7 21.9L5.3 18.4L2.1 17.9L2.1 14.1L5.3 13.6L6.7 10.1L4.8 7.6L7.6 4.8L10.1 6.7L13.6 5.3L14.1 2.1L17.9 2.1L18.4 5.3L21.9 6.7L24.4 4.8L27.2 7.6L25.3 10.1ZM9.5 16A6.5 6.5 0 1 0 22.5 16A6.5 6.5 0 1 0 9.5 16",
    },
    line(/* copy:none */ "M16 11V16L19.5 18", "mist"),
  ],
  engineer_bastion: [
    { d: /* copy:none */ "M7 5H19Q22 5 22 8V13H7Z" },
    { d: /* copy:none */ "M22 7H29V10H22Z", tone: "mist" },
    line(/* copy:none */ "M14 13L8 23M14 13L21 23M14 13V23"),
    { d: /* copy:none */ "M3 23H29V30H3Z", tone: "mist" },
    line(/* copy:none */ "M3 26.5H29M10 23V26.5M21 23V26.5M15.5 26.5V30", "ink"),
  ],
  engineer_artificer: [
    {
      d: /* copy:none */ "M21.8 17.1L24.4 17.4L24.4 20.6L21.8 20.9L20.6 23.9L22.2 25.9L19.9 28.2L17.9 26.6L14.9 27.8L14.6 30.4L11.4 30.4L11.1 27.8L8.1 26.6L6.1 28.2L3.8 25.9L5.4 23.9L4.2 20.9L1.6 20.6L1.6 17.4L4.2 17.1L5.4 14.1L3.8 12.1L6.1 9.8L8.1 11.4L11.1 10.2L11.4 7.6L14.6 7.6L14.9 10.2L17.9 11.4L19.9 9.8L22.2 12.1L20.6 14.1ZM9.5 19A3.5 3.5 0 1 0 16.5 19A3.5 3.5 0 1 0 9.5 19",
    },
    { d: /* copy:none */ "M25 1L18 12H23L20 21L29 9H24Z", tone: "mist" },
  ],
  engineer_surveyor: [
    line(/* copy:none */ "M13 11L7 29M13 11L19 29M13 11V28"),
    { d: /* copy:none */ "M4 9L19 4L20.5 8.5L5.5 13.5Z" },
    line(/* copy:none */ "M23 13Q27 18 23 23M26 9Q31 18 26 27", "mist"),
  ],
  engineer_mobile_works: [
    { d: /* copy:none */ "M8 6H18Q20 6 20 8V17H8Z" },
    { d: /* copy:none */ "M20 9H28V12H20Z", tone: "mist" },
    { d: /* copy:none */ "M5 17H24V21H5Z" },
    {
      d: /* copy:none */ "M6 25A3.5 3.5 0 1 0 13 25A3.5 3.5 0 1 0 6 25M16 25A3.5 3.5 0 1 0 23 25A3.5 3.5 0 1 0 16 25",
      tone: "mist",
    },
    line(/* copy:none */ "M1 9H5M1 13H5", "mist"),
  ],
  engineer_relay: [
    { d: /* copy:none */ "M11 30L16 9L21 30Z" },
    line(/* copy:none */ "M13.5 25L18 17M18.5 25L14 17", "ink"),
    { d: /* copy:none */ "M13 7A3 3 0 1 0 19 7A3 3 0 1 0 13 7", tone: "mist" },
    line(/* copy:none */ "M9 3Q6 7 9 11M23 3Q26 7 23 11M5 1Q1 7 5 13M27 1Q31 7 27 13", "mist"),
  ],
};
export const SKILL_ICON_IDS = Object.freeze(Object.keys(art));
const fallback: Mark[] = marks(/* copy:none */ "M16 3L20 11L29 16L20 21L16 29L12 21L3 16L12 11Z");
export type SkillIconNode = { id: string; name: string; owned?: boolean; available?: boolean };
export function classSkillIcon(
  node: SkillIconNode,
  options: { size?: 24 | 32 | 48; decorative?: boolean } = {},
): HTMLElement {
  const state = node.owned ? "learned" : node.available ? "available" : "locked";
  const el = h("span", {
    class: "skill-icon",
    "data-skill-icon": node.id,
    "data-state": state,
    "data-size": options.size ?? 32,
    "data-fallback": !art[node.id] ? "true" : undefined,
    role: options.decorative ? undefined : "img",
    "aria-label": options.decorative ? undefined : node.name,
    "aria-hidden": options.decorative ? "true" : undefined,
  });
  const ns = "http://www.w3.org/2000/svg",
    svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("aria-hidden", "true");
  for (const mark of art[node.id] ?? fallback) {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", mark.d);
    path.setAttribute(
      "class",
      `skill-mark${mark.tone ? ` ${mark.tone}` : ""}${mark.line ? " line" : ""}`,
    );
    path.setAttribute("fill-rule", "evenodd");
    svg.append(path);
  }
  el.append(svg);
  return el;
}
