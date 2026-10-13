// Dev-only comparison fixture: visual control states, never game progression.
import { h } from "./dom";
import { icon } from "./skin";
export const FOUNDATION_STATES = [
  "default",
  "hover",
  "pressed",
  "selected",
  "focus",
  "disabled",
  "locked",
  "busy",
  "error",
] as const;
export function designSystemBoard(): HTMLElement {
  const board = h("main", { class: "foundation-board" });
  board.append(
    h("h1", null, /* copy:label */ "Idlever controls"),
    h("p", null, /* copy:label */ "Design fixture"),
  );
  for (const material of ["forge", "bloodlines", "journal"]) {
    const section = h(
      "section",
      { class: "ui-material foundation-material", "data-material": material },
      h("h2", null, material),
    );
    for (const state of FOUNDATION_STATES) {
      const unavailable = state === "disabled" || state === "locked";
      const cell = h(
        "article",
        { class: "foundation-cell", "data-cell": `${material}-${state}` },
        h("b", null, state),
      );
      const label =
        state === "locked"
          ? /* copy:button */ "Locked · requirement"
          : state === "busy"
            ? /* copy:button */ "Preparing…"
            : state === "error"
              ? /* copy:button */ "Try again"
              : state === "selected"
                ? /* copy:button */ "✓ Selected"
                : /* copy:button */ "Inspect upgrade";
      const button = h(
        "button",
        {
          class: "ui-action",
          "data-state": state,
          disabled: unavailable,
          "aria-busy": state === "busy" ? "true" : "false",
          "aria-pressed": state === "selected" ? "true" : "false",
        },
        state === "locked" ? icon("lock", "🔒") : null,
        label,
      );
      cell.append(
        button,
        h(
          "small",
          null,
          unavailable
            ? /* copy:callout */ "Requires discovery"
            : state === "error"
              ? /* copy:callout */ "Request failed"
              : state === "busy"
                ? /* copy:callout */ "Request pending"
                : /* copy:tooltip */ "Alistair Moonwake the Unbroken · Gold 1,234,567",
        ),
      );
      section.append(cell);
    }
    board.append(section);
  }
  return board;
}
