// Presentation only. Every equipment kind and phase comes from the canonical Rust build.
import type { EquipmentBuild, EquipmentSlot } from "../engine/types";
import { h, replace } from "./dom";
import { hasIcon } from "./skin";
export type EquipmentPhase = "actual" | "next";
const NS = "http://www.w3.org/2000/svg";
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
// These are aligned full-canvas layers, never item-icon crops.
type Mount = { x: number; y: number; width: number; height: number };
// Uniform scale/translation from the full-canvas masters; registration varies by item.
const WEARABLES: Record<string, Mount> = {
  crownsplitter: { x: 88.2, y: 29.6, width: 73.5, height: 110 },
  hearthglass: { x: 28.55, y: 15, width: 102.9, height: 154 },
  frostmantle: { x: 38.94, y: 24.75, width: 80.85, height: 121 },
  ironcap: { x: 6.5, y: -7, width: 147, height: 220 },
  hearthglass_hood: { x: 32.13, y: -2, width: 95.55, height: 143 },
  trailboots: { x: 6.5, y: 0, width: 147, height: 220 },
  hearthglass_boots: { x: 24.4, y: 60.2, width: 107.31, height: 160.6 },
};
// Anchor each icon's painted grip, not its padded image rectangle, to the right hand.
const ICON_MOUNTS: Record<string, Mount> = {
  leather: { x: 39.2, y: 34, width: 76.8, height: 76.8 },
  mail: { x: 42.17, y: 28.52, width: 74.88, height: 74.88 },
  plate: { x: 41.2, y: 29, width: 76.8, height: 76.8 },
  scale: { x: 41.28, y: 36.08, width: 84.48, height: 84.48 },
  dagger: { x: 103, y: 40, width: 62, height: 102 },
  sword: { x: 103, y: 40, width: 62, height: 102 },
  axe: { x: 80, y: 48, width: 62, height: 102 },
  bow: { x: 80, y: 59, width: 62, height: 102 },
  spear: { x: 106, y: 38, width: 62, height: 102 },
  mace: { x: 106, y: 38, width: 62, height: 102 },
  long_gun: { x: 96, y: 54, width: 62, height: 102 },
  short_gun: { x: 101, y: 47, width: 62, height: 102 },
};
const BASE_BOX = { x: 6.5, y: 0, width: 147, height: 220 };
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
function layer(row: EquipmentSlot, valid: () => boolean): SVGGElement {
  const node = svg("g", {
    "data-doll-slot": row.slot,
    "data-doll-kind": row.kind ?? "none",
    "data-doll-art": "primitive",
  });
  if (!row.kind) {
    node.setAttribute("data-doll-art", "empty");
    return node;
  }
  const fallback = primitive(row);
  node.append(fallback);
  const bitmap = BITMAPS[row.kind];
  const wearable = WEARABLES[row.kind];
  if (wearable || (bitmap && hasIcon(bitmap))) {
    const box = wearable ?? ICON_MOUNTS[row.kind] ?? { x: 103, y: 40, width: 62, height: 102 };
    mountedImage(
      node,
      fallback,
      wearable ? `ui/equipment/${row.kind}.webp` : `ui/icons/${bitmap}.png`,
      box,
      valid,
    );
  }
  return node;
}
function mountedImage(
  node: SVGGElement,
  fallback: SVGGElement,
  source: string,
  box: { x: number; y: number; width: number; height: number },
  valid: () => boolean,
): void {
  const image = svg("image", { ...box, preserveAspectRatio: /* copy:none */ "xMidYMid meet" });
  image.addEventListener("load", () => {
    if (!valid() || !node.isConnected) return;
    fallback.setAttribute("display", "none");
    node.setAttribute("data-doll-art", "painted");
  });
  image.addEventListener("error", () => {
    if (!valid() || !node.isConnected) return;
    fallback.removeAttribute("display");
    image.remove();
    node.setAttribute("data-doll-art", "primitive");
  });
  image.setAttribute("href", `${import.meta.env.BASE_URL}${source}`);
  node.append(image);
}
/** One static equipped body, not baked class art underneath an incompatible weapon. */
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
  const painting = h("div", { class: "hero-equipment-painting" });
  const buttons = new Map<EquipmentPhase, HTMLButtonElement>();
  const draw = (): void => {
    figure.dataset.hubFigurePhase = phase;
    for (const [key, button] of buttons) button.setAttribute("aria-pressed", String(key === phase));
    const body = svg("svg", {
      viewBox: "0 0 172 220",
      class: "hero-equipment-body",
      "aria-hidden": "true",
    });
    const drawingPhase = phase;
    const frameValid = () => valid() && figure.isConnected && phase === drawingPhase;
    const base = svg("g", {
      "data-doll-base": "neutral",
      "data-doll-look": bodyLook,
      "data-doll-art": "primitive",
    });
    const neutral = svg("g", { "data-doll-base-primitive": bodyLook });
    neutral.append(
      svg("ellipse", { cx: 80, cy: 210, rx: 43, ry: 6, fill: "#0d1019", opacity: 0.6 }),
    );
    neutral.append(
      path(
        /* copy:none */ "M62 124 L77 124 L73 192 L59 192 Z M83 124 L98 124 L102 192 L88 192 Z",
        "#444755",
      ),
    );
    neutral.append(
      path(
        /* copy:none */ "M55 53 L43 65 L33 114 L44 119 L62 75 M105 53 L117 65 L131 114 L120 119 L98 75",
        "#b09d82",
      ),
    );
    neutral.append(path(/* copy:none */ "M60 48 L100 48 L104 126 L56 126 Z", "#66636a"));
    neutral.append(
      svg("ellipse", {
        cx: 80,
        cy: 31,
        rx: 17,
        ry: 22,
        fill: "#b09d82",
        stroke: "#10131d",
        "stroke-width": 2,
      }),
    );
    neutral.append(
      path(/* copy:none */ "M69 30 L74 30 M86 30 L91 30 M77 43 L83 43", "none", {
        stroke: "#4c413d",
      }),
    );
    base.append(neutral);
    mountedImage(base, neutral, `ui/equipment/base-${bodyLook}.webp`, BASE_BOX, frameValid);
    body.append(base);
    const view = build?.[phase];
    // Explicit order: footwear, fitted body, headwear, then held arm.
    for (const slot of ["boots", "armour", "helm", "weapon"] as const) {
      const row = view?.slots.find((s) => s.slot === slot);
      if (row) body.append(layer(row, frameValid));
    }
    replace(painting, body);
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
  figure.append(controls, painting);
  draw();
  return figure;
}
