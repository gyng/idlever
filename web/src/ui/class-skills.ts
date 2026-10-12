import { h } from "./dom";
import { icon, verbIcon } from "./skin";
import { verbLabel } from "./tokens";

/** Shared skill rung for both class pickers; art can be absent without hiding the skill. */
export function classSkillChip(v: string, level: number, reached: boolean): HTMLElement {
  const id = verbIcon(v);
  return h(
    "span",
    { class: `chip rung num${reached ? " on" : ""}`, "data-skill": v },
    id ? icon(id) : "",
    `L${level} `,
    verbLabel({ v }),
  );
}

/** Keep the next earned milestone visible without presenting the entire ladder at once. */
export function classSkillLadder(
  verbs: Record<string, string[]>,
  level: number,
  owned: boolean,
): HTMLElement {
  const rungs = Object.entries(verbs)
    .map(([at, skills]) => ({ at: Number(at), skills }))
    .sort((a, b) => a.at - b.at);
  const next = rungs.find((r) => r.at > level)?.at;
  const visible = rungs.filter((r) => r.at <= level || r.at === next);
  const later = rungs.filter((r) => r.at > level && r.at !== next);
  return h(
    "div",
    { class: "class-skill-progress" },
    h(
      "div",
      { class: "chips ladder" },
      ...visible.flatMap((r) =>
        r.skills.map((v) => classSkillChip(v, r.at, r.at <= level && owned)),
      ),
    ),
    later.length
      ? h(
          "details",
          { class: "class-skills-later" },
          h("summary", null, /* copy:button */ "Later skills"),
          h(
            "div",
            { class: "chips ladder" },
            ...later.flatMap((r) => r.skills.map((v) => classSkillChip(v, r.at, false))),
          ),
        )
      : null,
  );
}
