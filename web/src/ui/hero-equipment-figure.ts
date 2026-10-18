// Presentation only. Every equipment kind and phase comes from the canonical Rust build.
// Cut271 (owner 2026-10-18, "More abstract"): an equipment diagram — framed slot tiles around a plain
// code-drawn silhouette, joined by leader lines. No painted body and no per-piece mounting transforms.
import type { EquipmentBuild, EquipmentSlot } from "../engine/types";
import { h, replace } from "./dom";
import { hasIcon } from "./skin";
import { detailHost } from "./tips";
export type EquipmentPhase = "actual" | "next";
type Slot = EquipmentSlot["slot"];
const NS = "http://www.w3.org/2000/svg";
const SLOTS: Slot[] = ["helm", "weapon", "armour", "boots"];
/* copy:label */ const SLOT_NAMES: Record<Slot, string> = {
  weapon: "Weapon",
  helm: "Helm",
  armour: "Body",
  boots: "Boots",
};
const BITMAPS: Record<string, string> = {
  dagger: "it_dagger",
  sword: "it_sword",
  axe: "it_axe",
  bow: "it_bow",
  spear: "it_spear",
  mace: "it_mace",
  long_gun: "it_long_gun",
  short_gun: "it_short_gun",
  leather: "it_leather",
  mail: "it_mail",
  plate: "it_plate",
  scale: "it_scale",
};
// The painted 1024×1536 registration masters (exported 384×576) have no item icon: a tile shows the
// piece's own visible area, a square around its alpha bounds from art/equipment.json. A view box, not a mount.
const WEARABLES: Record<string, [number, number, number, number]> = {
  crownsplitter: [318, 249, 997, 1245],
  hearthglass: [210, 259, 815, 966],
  frostmantle: [95, 219, 946, 1205],
  ironcap: [385, 55, 630, 352],
  hearthglass_hood: [304, 13, 722, 494],
  trailboots: [164, 1174, 881, 1470],
  hearthglass_boots: [108, 1047, 955, 1433],
};
const cropBox = ([x0, y0, x1, y1]: [number, number, number, number]): string => {
  const side = Math.max(x1 - x0, y1 - y0) * 1.08;
  return [(x0 + x1 - side) / 2, (y0 + y1 - side) / 2, side, side]
    .map((v) => v.toFixed(1))
    .join(" ");
};
// Primitive fallbacks are drawn in one 172×220 body space; each tile views its slot's region.
const PRIMITIVE_BOX: Record<Slot, string> = {
  helm: "52 0 56 48",
  weapon: "96 15 70 128",
  armour: "34 40 92 100",
  boots: "36 170 90 46",
};
// The diagram's body space (100×200, drawn 8 × 16 diagram units): where each leader line meets the body,
// and the height (in units from the stage top) of the slot tile it starts from (hero-hub.css --doll-y).
const REGIONS: Record<Slot, { side: "start" | "end"; y: number; to: [number, number] }> = {
  helm: { side: "start", y: 3.5, to: [39, 22] },
  weapon: { side: "start", y: 11, to: [19, 120] },
  armour: { side: "end", y: 5, to: [60, 64] },
  boots: { side: "end", y: 12.5, to: [59, 188] },
};
const UNIT_TO_BODY = 200 / 16;
function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}
const path = (d: string, fill: string, extra: Record<string, string | number> = {}) =>
  svg("path", {
    d,
    fill,
    stroke: "#10131d",
    "stroke-width": 2,
    "stroke-linejoin": "round",
    ...extra,
  });
function primitive(row: EquipmentSlot): SVGGElement {
  const g = svg("g", { "data-doll-primitive": row.kind ?? "none" });
  const kind = row.kind;
  if (!kind) return g;
  if (row.slot === "helm") {
    if (kind === "hearthglass_hood") {
      g.append(
        path(
          /* copy:none */ "M59 42 Q49 8 80 7 Q111 8 101 42 L94 34 Q99 16 80 16 Q61 16 66 34 Z",
          "#547d78",
        ),
      );
      g.append(path(/* copy:none */ "M64 17 L80 10 L96 17", "none", { stroke: "#d2ad65" }));
    } else {
      g.append(
        path(
          /* copy:none */ "M59 30 Q59 9 80 9 Q101 9 101 30 L97 36 L94 25 L66 25 L63 36 Z",
          "#8d9ba9",
        ),
      );
      g.append(path(/* copy:none */ "M62 25 L98 25 M80 11 L80 25", "none", { stroke: "#d4d5cd" }));
    }
  } else if (row.slot === "boots") {
    const colour = kind === "hearthglass_boots" ? "#557d78" : "#70533e";
    g.append(
      path(/* copy:none */ "M49 179 L66 179 L66 202 L62 212 L40 212 L40 202 L49 195 Z", colour),
    );
    g.append(
      path(/* copy:none */ "M94 179 L111 179 L111 195 L122 202 L122 212 L97 212 L94 202 Z", colour),
    );
    if (kind === "hearthglass_boots")
      g.append(
        path(/* copy:none */ "M50 185 L65 185 M95 185 L110 185", "none", { stroke: "#d2ad65" }),
      );
  } else if (row.slot === "armour") {
    const colour =
      kind === "hearthglass"
        ? "#547d78"
        : kind === "frostmantle"
          ? "#a4bfc8"
          : kind === "leather"
            ? "#70533e"
            : "#8895a0";
    if (kind === "frostmantle")
      g.append(path(/* copy:none */ "M54 48 L106 48 L119 137 L41 137 Z", "#526878"));
    g.append(
      path(
        /* copy:none */ "M57 49 L69 45 L91 45 L103 49 L111 72 L101 78 L100 126 L60 126 L59 78 L49 72 Z",
        colour,
      ),
    );
    g.append(
      path(/* copy:none */ "M80 54 L80 119 M63 88 L97 88", "none", {
        stroke: kind === "hearthglass" ? "#d2ad65" : "#d2d2c6",
      }),
    );
    if (kind === "hearthglass")
      g.append(
        path(
          /* copy:none */ "M64 60 L74 60 L74 79 L64 79 Z M86 60 L96 60 L96 79 L86 79 Z",
          "#b7cbc1",
        ),
      );
  } else if (row.slot === "weapon") {
    if (kind === "bow") {
      g.append(
        path(/* copy:none */ "M126 45 Q166 89 126 135 M126 45 L139 90 L126 135", "none", {
          stroke: "#bb8d55",
          "stroke-width": 4,
        }),
      );
    } else if (kind === "long_gun" || kind === "short_gun") {
      const tip = kind === "long_gun" ? 39 : 65;
      g.append(path(/* copy:none */ `M116 120 L124 124 L151 ${tip + 8} L143 ${tip} Z`, "#737d89"));
      g.append(path(/* copy:none */ "M114 119 L123 124 L117 140 L108 135 Z", "#70533e"));
    } else if (kind === "crownsplitter") {
      g.append(
        path(/* copy:none */ "M118 123 L111 119 L139 47 L156 37 L153 76 L141 74 Z", "#bbc2c4"),
      );
      g.append(
        path(/* copy:none */ "M107 120 L124 127 M111 129 L107 140", "none", {
          stroke: "#c09c58",
          "stroke-width": 5,
        }),
      );
    } else if (kind === "axe") {
      g.append(
        path(/* copy:none */ "M115 137 L145 50", "none", { stroke: "#957149", "stroke-width": 6 }),
      );
      g.append(path(/* copy:none */ "M139 52 L158 47 L159 73 L132 75 Z", "#acb5be"));
    } else if (kind === "mace") {
      g.append(
        path(/* copy:none */ "M114 137 L142 65", "none", { stroke: "#957149", "stroke-width": 6 }),
      );
      g.append(
        path(/* copy:none */ "M131 58 L140 47 L153 54 L155 69 L143 78 L131 72 Z", "#acb5be"),
      );
    } else {
      const tip = kind === "dagger" ? 78 : kind === "spear" ? 19 : 42;
      g.append(path(/* copy:none */ `M116 122 L111 117 L145 ${tip} L147 ${tip + 12} Z`, "#c2cbd1"));
      g.append(
        path(/* copy:none */ "M108 117 L123 124 M114 126 L110 138", "none", {
          stroke: "#bf9c58",
          "stroke-width": 4,
        }),
      );
    }
  }
  return g;
}
/** The plain body: a quiet silhouette, with only the cosmetic look's outline (hair, ears and tail). */
function silhouette(look: string): SVGGElement {
  const g = svg("g", {
    "data-doll-base": "neutral",
    "data-doll-look": look,
    "data-doll-art": "primitive",
    fill: "#3b3a4c",
    stroke: "#7d7690",
    "stroke-width": 1.5,
    "stroke-linejoin": "round",
  });
  const shape = (d: string) => svg("path", { d });
  if (look === "cat")
    g.append(
      shape(
        /* copy:none */ "M64 112 Q86 118 84 146 Q82 164 92 170 Q78 170 76 150 Q76 126 62 120 Z",
      ),
    );
  if (look === "female")
    g.append(shape(/* copy:none */ "M36 24 Q36 6 50 6 Q64 6 64 24 L66 48 L34 48 Z"));
  g.append(svg("ellipse", { cx: 50, cy: 200 - 6, rx: 30, ry: 4, fill: "#0d1019", stroke: "none" }));
  g.append(svg("circle", { cx: 50, cy: 24, r: 14 }));
  if (look === "cat")
    g.append(shape(/* copy:none */ "M38 16 L36 2 L46 11 Z M62 16 L64 2 L54 11 Z"));
  g.append(
    shape(
      /* copy:none */ "M44 37 L56 37 L57 42 L70 46 Q78 49 79 60 L84 112 Q84 120 79 120 L76 116 L70 70 L68 104 L66 118 L64 188 L54 190 L51 118 L49 118 L46 190 L36 188 L34 118 L32 104 L30 70 L24 116 L21 120 Q16 120 16 112 L21 60 Q22 49 30 46 L43 42 Z",
    ),
  );
  return g;
}
const shortName = (label: string): string => label.split(/\s+/).slice(0, 3).join(" ");
const phaseName = (phase: EquipmentPhase): string =>
  phase === "actual" ? /* copy:label */ "Actual" : /* copy:label */ "Next delve";
/** The tile's art: a primitive drawing, replaced by the item icon or the piece's painted area once it loads. */
function tileArt(row: EquipmentSlot, valid: () => boolean, node: HTMLElement): HTMLElement {
  const tile = h("span", { class: "hero-equipment-tile", "data-doll-tile": row.slot });
  if (!row.kind) {
    node.dataset.dollArt = "empty";
    return tile;
  }
  const fallback = svg("svg", {
    viewBox: PRIMITIVE_BOX[row.slot],
    class: "hero-equipment-primitive",
    "aria-hidden": "true",
  });
  fallback.append(primitive(row));
  tile.append(fallback);
  const bounds = WEARABLES[row.kind],
    bitmap = BITMAPS[row.kind];
  if (!bounds && !(bitmap && hasIcon(bitmap))) return tile;
  const loaded = (): void => {
    if (!valid() || !node.isConnected) return;
    fallback.setAttribute("display", "none");
    node.dataset.dollArt = "painted";
  };
  const failed = (art: Element): void => {
    if (!valid() || !node.isConnected) return;
    fallback.removeAttribute("display");
    art.remove();
    node.dataset.dollArt = "primitive";
  };
  if (bounds) {
    const art = svg("svg", {
      viewBox: cropBox(bounds),
      class: "hero-equipment-art",
      "aria-hidden": "true",
    });
    const image = svg("image", { x: 0, y: 0, width: 1024, height: 1536 });
    image.addEventListener("load", loaded);
    image.addEventListener("error", () => failed(art));
    image.setAttribute("href", `${import.meta.env.BASE_URL}ui/equipment/${row.kind}.webp`);
    art.append(image);
    tile.append(art);
  } else {
    const art = h("img", {
      class: "hero-equipment-art",
      alt: "",
      draggable: "false",
      "aria-hidden": "true",
    }) as HTMLImageElement;
    art.addEventListener("load", loaded);
    art.addEventListener("error", () => failed(art));
    art.src = `${import.meta.env.BASE_URL}ui/icons/${bitmap}.png`;
    tile.append(art);
  }
  return tile;
}
function tipBody(row: EquipmentSlot, phase: EquipmentPhase, other: EquipmentSlot | undefined) {
  return (): Node[] => [
    h(
      "div",
      { class: "kw-tip-head" },
      h("b", null, row.kind ? row.label : /* copy:label */ "Empty"),
    ),
    h("div", {}, h("small", { class: "num" }, `${SLOT_NAMES[row.slot]} · ${phaseName(phase)}`)),
    ...(row.origin ? [h("div", {}, h("small", { class: "dim" }, row.origin))] : []),
    ...(row.effect ? [h("p", {}, row.effect)] : []),
    ...(row.tradeoff ? [h("p", {}, row.tradeoff)] : []),
    ...(other
      ? [
          h(
            "div",
            { "data-doll-tip-other": "1" },
            `${phaseName(phase === "actual" ? "next" : "actual")} · ${other.kind ? other.label : /* copy:label */ "Empty"}`,
          ),
        ]
      : []),
  ];
}
/** One equipment diagram: the slots of the chosen phase around a plain body, never class art. */
export function equipmentFigure(
  build: EquipmentBuild | undefined,
  initial: EquipmentPhase,
  changed: (phase: EquipmentPhase) => void,
  valid: () => boolean,
  look = "male",
): HTMLElement {
  const figure = h("div", { class: "hero-hub-figure hero-equipment-figure" });
  let phase = initial;
  const bodyLook = look === "female" || look === "cat" ? look : "male";
  figure.dataset.dollLook = bodyLook;
  const controls = h("div", {
    class: "hero-equipment-phases",
    role: "group",
    "aria-label": /* copy:label */ "Equipment view",
  });
  const stage = h("div", { class: "hero-equipment-stage" });
  const buttons = new Map<EquipmentPhase, HTMLButtonElement>();
  // A slot changes when Next delve wears different gear; a new origin alone (equipped → chosen) is no change.
  const differs = (slot: Slot): boolean => {
    const a = build?.actual.slots.find((s) => s.slot === slot),
      n = build?.next.slots.find((s) => s.slot === slot);
    return !!a && !!n && (a.kind !== n.kind || a.label !== n.label);
  };
  const draw = (): void => {
    figure.dataset.hubFigurePhase = phase;
    for (const [key, button] of buttons) button.setAttribute("aria-pressed", String(key === phase));
    const drawingPhase = phase;
    const frameValid = () => valid() && figure.isConnected && phase === drawingPhase;
    const body = svg("svg", {
      viewBox: "0 0 100 200",
      class: "hero-equipment-body",
      "aria-hidden": "true",
    });
    body.append(silhouette(bodyLook));
    const view = build?.[phase];
    const nodes: HTMLElement[] = [];
    for (const slot of SLOTS) {
      const row = view?.slots.find((s) => s.slot === slot);
      const region = REGIONS[slot],
        change = differs(slot);
      const [tx, ty] = region.to,
        sx = region.side === "start" ? 0 : 100,
        sy = region.y * UNIT_TO_BODY;
      body.append(
        svg("path", {
          d: /* copy:none */ `M${sx} ${sy} L${tx} ${ty}`,
          class: "hero-equipment-leader",
          "data-doll-leader": slot,
          "data-doll-change": change ? "1" : "0",
          fill: "none",
        }),
        svg("circle", {
          cx: tx,
          cy: ty,
          r: 2.2,
          class: "hero-equipment-joint",
          "data-doll-change": change ? "1" : "0",
        }),
      );
      if (!row) continue;
      const node = h("div", {
        class: "hero-equipment-slot",
        "data-doll-slot": slot,
        "data-doll-kind": row.kind ?? "none",
        "data-doll-art": "primitive",
        "data-doll-side": region.side,
        "data-doll-change": change ? "1" : "0",
      });
      const other = change
        ? build?.[phase === "actual" ? "next" : "actual"].slots.find((s) => s.slot === slot)
        : undefined;
      const tile = tileArt(row, frameValid, node);
      tile.setAttribute(
        "aria-label",
        `${SLOT_NAMES[slot]} · ${row.kind ? row.label : /* copy:label */ "Empty"}`,
      );
      detailHost(tile, tipBody(row, phase, other));
      node.append(
        h(
          "span",
          { class: "hero-equipment-card" },
          tile,
          h(
            "span",
            { class: `hero-equipment-name${row.kind ? "" : " is-empty"}` },
            row.kind ? shortName(row.label) : /* copy:label */ "empty",
          ),
        ),
        h("span", { class: "hero-equipment-lead", "aria-hidden": "true" }),
      );
      nodes.push(node);
    }
    replace(stage, body, ...nodes);
  };
  for (const [key, label] of [
    ["actual", /* copy:button */ "Actual"],
    ["next", /* copy:button */ "Next delve"],
  ] as const) {
    const button = h(
      "button",
      {
        class: "btn",
        "data-doll-phase": key,
        disabled: !build,
        onclick: () => {
          if (!valid() || !figure.isConnected) return;
          phase = key;
          changed(key);
          draw();
        },
      },
      label,
    );
    buttons.set(key, button);
    controls.append(button);
  }
  figure.append(controls, stage);
  draw();
  return figure;
}
