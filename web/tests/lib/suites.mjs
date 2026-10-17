export const EXHAUSTIVE_ONLY = Object.freeze([
  "autodismiss",
  "blind-77030eb",
  "chain",
  "clarity:card",
  "clarity:deep",
  "clarity:hold",
  "cut115",
  "cut117",
  "cut118",
  "cut118b",
  "cut119",
  "cut120",
  "cut121",
  "cut13",
  "cut16",
  "cut20",
  "cut21",
  "cut22",
  "cut23",
  "cut24",
  "cut25",
  "cut27",
  "cut28w",
  "cut30",
  "cut30town",
  "cut305",
  "fights",
  "layout",
  "legible",
  "looks",
  "qa21",
  "qa778",
  "qa9",
  "qa92",
  "qaAA",
  "qaAC",
  "qaj",
  "routine-keep",
  "runclear",
  "tips",
  "ui:cut18",
  "ui:cut19",
  "ui:keep",
  "ui:qa",
  "ui:stall",
]);
import { UI_PARTS } from "./ui-parts.mjs";
// Routine coverage prioritizes complete journeys and prior costly failures.
// Tests and assertion limits are shared with the full suite, never relaxed.
export const PARTS = Object.freeze({
  ui: UI_PARTS.map((part) => `ui:${part}`),
  clarity: ["core,watch", "hold", "card", "paint", "deep"].map((part) => `clarity:${part}`),
});
export const SMOKE_AREAS = Object.freeze({
  "boot, menu and saves": ["game-menu", "debug-export", "glossary", "menu-materials", "honours"],
  "town and automation": ["first-plot", "town-save", "worker-purchases", "worker-first-act"],
  "multiple heroes": ["bloodline-founding", "bloodline-training"],
  "packages, pen and forecasts": [
    "package-selection",
    "package-paired",
    "pen-edit",
    "forecast-requests",
    "clarity:paint",
    "survivor-builds",
    "hero-hub",
  ],
  "combat, watch and recovery": [
    "fights:break",
    "watch-console",
    "watch-live-edge",
    "depth-rail",
    "watch-log",
    "ctxloss",
  ],
  "gold, supplies and gear": [
    "checkpoint-gold",
    "exit-keep-close",
    "report-supply-limit",
    "forge-requests",
  ],
  "death and advice": ["death-actions", "death-fix-discovery", "king-advice-scope"],
  "reports and accounting": ["report-reading", "report-class-xp", "numbers-agree"],
  "classes and endgame": [
    "class-switch",
    "gunner-observer",
    "legacy-wire",
    "numbered-descents",
    "post-clear-town",
  ],
  "responsive UI and town lighting": ["screens", "ui:frame", "town-clock"],
});
export const SMOKE = Object.freeze([...new Set(Object.values(SMOKE_AREAS).flat())]);
export const expand = (name) => PARTS[name] ?? [name];
export function selectSuite(args, all) {
  let smoke = false,
    full = false,
    exhaustive = false,
    list = false,
    report = null;
  const requested = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") continue; // pnpm forwards its argument separator
    if (arg === "--smoke") smoke = true;
    else if (arg === "--full") full = true;
    else if (arg === "--exhaustive") exhaustive = true;
    else if (arg === "--list") list = true;
    else if (arg === "--report") {
      if (!args[i + 1] || args[i + 1].startsWith("--"))
        throw Error("--report requires an output path");
      report = args[++i];
    } else if (arg.startsWith("--")) throw Error(`Unknown suite option: ${arg}`);
    else requested.push(arg);
  }
  if ([smoke, full, exhaustive].filter(Boolean).length > 1)
    throw Error("Choose one of --smoke, --full or --exhaustive");
  const suite = requested.length
    ? "targeted"
    : smoke
      ? "smoke"
      : exhaustive
        ? "exhaustive"
        : "full";
  const names = [
    ...new Set(
      requested.length
        ? requested.flatMap(expand)
        : smoke
          ? SMOKE
          : exhaustive
            ? all
            : all.flatMap((n) =>
                n === "fights"
                  ? ["fights:break"]
                  : n === "cut305"
                    ? ["cut305:sheet,rank"]
                    : EXHAUSTIVE_ONLY.includes(n)
                      ? []
                      : [n],
              ),
    ),
  ];
  const available = new Set(all.map((name) => name.split(":")[0]));
  for (const name of names)
    if (!available.has(name.split(":")[0])) throw Error(`Unknown client group: ${name}`);
  return {
    suite,
    names,
    list,
    report,
    fullCount: all.flatMap((n) =>
      n === "fights"
        ? ["fights:break"]
        : n === "cut305"
          ? ["cut305:sheet,rank"]
          : EXHAUSTIVE_ONLY.includes(n)
            ? []
            : [n],
    ).length,
    exhaustiveCount: all.length,
    omitted: all.filter((n) => !names.includes(n)),
  };
}
