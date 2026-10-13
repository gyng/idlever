import type { Lineage } from "../engine/types";
import { h, replace } from "./dom";
import "../depth-map.css";
export type DepthLandmark = { depth: number; kind: "boss"; id: string; label: string };
export type DepthMark = {
  id?: string;
  depth: number;
  kind: "boss" | "waystone" | "fork" | "bounty" | "start" | "record";
  label: string;
  detail?: string;
};
export type DepthMapData = { depth: number; biome: string; markers: DepthMark[] };
/** Uses public, already-known metadata; no client boss/depth table. */
export function knownDepthMarks(
  L: Lineage & { depth_landmarks?: DepthLandmark[] },
  start: number,
): DepthMark[] {
  const marks: DepthMark[] = [
    { depth: start, kind: "start", label: "Start" },
    { depth: L.best_depth, kind: "record", label: "Record" },
  ];
  for (const d of L.waystones ?? []) marks.push({ depth: d, kind: "waystone", label: "Waystone" });
  for (const f of L.forks ?? [])
    marks.push({ depth: f.depth, kind: "fork", label: "Fork", detail: f.taken });
  if (L.bounty)
    marks.push({ depth: L.bounty.depth, kind: "bounty", label: "Bounty", detail: L.bounty.needs });
  for (const b of L.depth_landmarks ?? [])
    marks.push({ depth: b.depth, kind: "boss", id: b.id, label: b.label });
  return marks
    .filter((m) => Number.isInteger(m.depth) && m.depth > 0)
    .sort((a, b) => a.depth - b.depth);
}
const icons: Record<DepthMark["kind"], string> = {
  boss: "◆",
  waystone: "◇",
  fork: "⑂",
  bounty: "✦",
  start: "⌂",
  record: "─",
};
/** Root supplies the released replay HUD depth, never the engine-ahead snapshot. */
export function createDepthMap() {
  const current = h("strong", { class: "depth-map-current num" }),
    lane = h("small", { class: "depth-map-lane" });
  const rail = h("span", { class: "depth-map-rail", "aria-hidden": "true" });
  const summary = h(
    "summary",
    { "aria-label": /* copy:callout */ "Depth map" },
    current,
    lane,
    rail,
  );
  const selected = h("p", { class: "depth-map-inspection", "aria-live": "polite" });
  const list = h("div", { class: "depth-map-list" });
  const el = h(
    "details",
    { class: "watch-depth-map" },
    summary,
    h(
      "div",
      { class: "depth-map-details" },
      h("b", {}, /* copy:callout */ "Known depths"),
      list,
      selected,
    ),
  );
  let key = "",
    markerKey = "";
  const escape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && el.open) {
      el.open = false;
      summary.focus();
      e.stopPropagation();
    }
  };
  el.addEventListener("keydown", escape);
  return {
    el,
    update(data: DepthMapData) {
      const next = JSON.stringify(data);
      if (next === key) return;
      key = next;
      current.textContent = `D${data.depth}`;
      lane.textContent = data.biome.replaceAll("_", " ");
      summary.setAttribute(
        "aria-label",
        /* copy:none */ `Depth map: D${data.depth}, ${lane.textContent}`,
      );
      const extent = Math.max(data.depth, 1, ...data.markers.map((m) => m.depth));
      const groups = new Map<number, DepthMark[]>();
      for (const m of data.markers) {
        const at = groups.get(m.depth) ?? [];
        at.push(m);
        groups.set(m.depth, at);
      }
      // A physical shaft keeps true depth spacing; dense labels yield to
      // nearby boss/goal marks. Every known stop remains in the inspection list.
      const priority = (ms: DepthMark[]) =>
        Math.min(
          ...ms.map(
            (m) => ({ boss: 0, bounty: 1, fork: 2, waystone: 2, start: 3, record: 4 })[m.kind],
          ),
        );
      const selectedDepths: number[] = [];
      const positions: number[] = [];
      for (const [d] of [...groups].sort(
        (a, b) =>
          priority(a[1]) - priority(b[1]) ||
          Math.abs(a[0] - data.depth) - Math.abs(b[0] - data.depth),
      )) {
        const position = ((d - 1) / Math.max(1, extent - 1)) * 138;
        if (positions.some((p) => Math.abs(p - position) < 32)) continue;
        positions.push(position);
        selectedDepths.push(d);
      }
      const ticks = [...groups]
        .filter(([d]) => selectedDepths.includes(d))
        .map(([depth, marks]) => {
          const m =
            marks.find((x) => x.kind === "boss") ??
            marks.find((x) => x.kind === "fork") ??
            marks[0]!;
          return h(
            "i",
            {
              class: `depth-map-notch depth-map-${m.kind}`,
              style: `--at:${((depth - 1) / Math.max(1, extent - 1)) * 100}`,
              title: marks.map((x) => `D${depth} ${x.label}`).join(" · "),
            },
            h("span", {}, icons[m.kind]),
            h("small", { class: "num" }, `D${depth}`),
          );
        });
      replace(
        rail,
        ...ticks,
        h(
          "i",
          {
            class: "depth-map-position",
            style: `--at:${((data.depth - 1) / Math.max(1, extent - 1)) * 100}`,
          },
          "●",
        ),
      );
      const nextMarkers = JSON.stringify(data.markers);
      if (nextMarkers === markerKey) return;
      markerKey = nextMarkers;
      const rows = data.markers.map((m) => {
        const row = h(
          "button",
          {
            type: "button",
            class: `depth-map-stop depth-map-${m.kind}`,
            "aria-label": `D${m.depth} ${m.label}${m.detail ? ", " + m.detail : ""}`,
          },
          h("span", { "aria-hidden": "true" }, icons[m.kind]),
          h("b", { class: "num" }, `D${m.depth}`),
          h("span", {}, m.label),
        );
        row.onclick = () => {
          selected.textContent = `D${m.depth} · ${m.label}${m.detail ? " · " + m.detail : ""}`;
        };
        return row;
      });
      replace(list, ...rows);
      selected.textContent = "";
    },
    dispose() {
      el.removeEventListener("keydown", escape);
      el.remove();
    },
  };
}
