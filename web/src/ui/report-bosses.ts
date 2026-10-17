import type { Lineage, ReturnReport } from "../engine/types";
import { enemyHost } from "./enemy-tips";
import { h } from "./dom";
import { unitLabel } from "./unit-icon";

export const bossName = (kind: string): string =>
  kind.replace(/_/g, " ").replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** First victories are reported deltas, never today's slain walls or selection. */
/** `watch`: blind 5331f40 — a boss slain while away offers his kill as a replay (`▶ watch kill`); null where no held run reached him. */
/** Cut262 (owner: "boss portraits in killed is very confusing"): one row per boss, never one per hero — the portrait wears a victory
 *  mark, the copy says who slew him (`slain by Ash · Thorn`, `×2` for more than one hero) and, apart, what he cost this absence
 *  (`killed 2 heroes`, the report's own deaths to him), so a boss face can no longer read as the hero's killer. */
export function reportBosses(
  r: Pick<ReturnReport, "bests" | "bloodlines"> & Partial<Pick<ReturnReport, "deaths">>,
  lineage?: Lineage,
  watch?: (boss: string) => (() => Promise<boolean>) | null,
): HTMLElement | null {
  const groups = r.bloodlines?.some((s) => s.bests !== undefined)
    ? [...r.bloodlines]
        .sort((a, b) => a.id - b.id)
        .map((s) => ({
          owner: s.id,
          name: s.name,
          bests: s.bests ?? [],
          knowledge: s.boss_knowledge,
        }))
    : [{ owner: undefined, name: undefined, bests: r.bests, knowledge: undefined }];
  const victories = groups.flatMap((s) =>
    [
      ...new Set(
        s.bests.flatMap((best) => {
          const match = /^boss:\s*([a-z][a-z0-9_]*)$/.exec(best);
          return match ? [match[1]!] : [];
        }),
      ),
    ].map((boss) => ({
      boss,
      owner: s.owner,
      name: s.name,
      knowledge: s.knowledge?.find((k) => k.boss === boss),
    })),
  );
  if (!victories.length) return null;
  // one entry per boss, its slayers in slot order
  const bosses = [...new Set(victories.map((v) => v.boss))].map((boss) => {
    const by = victories.filter((v) => v.boss === boss);
    return {
      boss,
      by,
      lost: (r.deaths ?? []).filter((d) => d.cause === boss).reduce((n, d) => n + d.n, 0),
    };
  });
  const selected = lineage?.selected_bloodline ?? 1;
  return h(
    "section",
    { class: "report-bosses" },
    h(
      "b",
      { class: "row-label" },
      bosses.length > 1 ? /* copy:label */ "Bosses slain" : /* copy:label */ "Boss slain",
    ),
    ...bosses.map(({ boss, by, lost }) => {
      const names = by.map((v) => v.name).filter((n): n is string => !!n);
      const slayers = names.length
        ? /* copy:callout */ `slain by ${names.join(" · ")}`
        : /* copy:callout */ "slain";
      const row = unitLabel(
        boss,
        h(
          "span",
          { class: "report-boss-copy" },
          h("b", null, bossName(boss)),
          h(
            "small",
            { class: "report-boss-by" },
            slayers,
            by.length > 1 && names.length < by.length
              ? h("b", { class: "num" }, ` ×${by.length}`)
              : "",
          ),
          lost > 0
            ? h(
                "small",
                { class: "report-boss-lost num down", "data-lost": lost },
                lost === 1
                  ? /* copy:callout */ "killed 1 hero"
                  : /* copy:callout */ `killed ${lost} heroes`,
              )
            : "",
        ),
        { px: 44 },
      );
      row.classList.add("report-boss-row");
      row.dataset.boss = boss;
      row.dataset.slain = String(by.length);
      row.setAttribute("aria-label", `${bossName(boss)} · ${slayers}`);
      const owned = by.filter((v) => v.owner !== undefined);
      if (owned.length) {
        row.dataset.bloodline = String(owned[0]!.owner);
        row.dataset.bloodlines = owned.map((v) => v.owner).join(" ");
      }
      const face = row.querySelector<HTMLElement>(".unit-icon")!;
      face.classList.add("report-boss-face");
      // the victory mark rides the portrait (a frame of its own: the image keeps its 44 px)
      const frame = h(
        "span",
        { class: "report-boss-portrait" },
        h("span", {
          class: "report-boss-mark",
          "aria-hidden": "true",
        }),
      );
      face.replaceWith(frame);
      frame.prepend(face);
      const mine = by.find((v) => v.owner === undefined || v.owner === selected);
      const known = mine?.knowledge ?? by.find((v) => v.knowledge)?.knowledge;
      const host = enemyHost(
        row,
        boss,
        known
          ? {
              facts: known.facts,
              ledger: known.ledger ? [known.ledger] : [],
              walls: known.wall ? [known.wall] : [],
              counters: [],
            }
          : mine
            ? lineage
            : undefined,
        true,
      );
      const go = mine ? watch?.(boss) : null;
      if (!go) return host;
      // the kill's replay beside the row (its own tap: the row's tooltip stays the row's)
      // blind 3ab97ea (B: tapped twice, nothing): a kill no held run shows says so on the button, never an inert tap
      const btn: HTMLButtonElement = h(
        "button",
        {
          class: "chip report-boss-watch game-control",
          "data-boss": boss,
          onclick: (e: Event) => {
            e.stopPropagation();
            btn.disabled = true;
            void go().then((ok) => {
              if (ok) btn.disabled = false;
              else {
                btn.dataset.missing = "1";
                btn.textContent = /* copy:button */ "not held";
              }
            });
          },
        },
        "▶ ",
        /* copy:button */ "watch kill",
      ) as HTMLButtonElement;
      return h("div", { class: "report-boss-line" }, host, btn);
    }),
  );
}
