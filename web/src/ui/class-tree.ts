import "../class-tree.css";
import type { App } from "../app";
import type { ClassPathNode, Lineage } from "../engine/types";
import { h } from "./dom";
import { verbIcon, icon } from "./skin";
import { rowLabel } from "./tokens";
import { openWindow } from "./sheet";

const identity = (L: Lineage): string =>
  JSON.stringify([L.selected_bloodline, L.class, L.class_tree, !!L.live, L.town?.home]);
const preview = (node: ClassPathNode): HTMLElement =>
  h(
    "div",
    { class: "class-path-rules" },
    h("b", null, node.effect),
    ...node.tactics.map((row) => h("small", { class: "num" }, rowLabel(row))),
  );

function review(app: App, node: ClassPathNode | null, onChange: () => void): void {
  const L = app.lineage,
    asked = identity(L),
    tree = L.class_tree;
  if (!tree) return;
  openWindow((close) => {
    let busy = false;
    const feedback = h("div", { class: "class-path-feedback", role: "status" });
    const cancel = h(
      "button",
      {
        class: "chip",
        onclick: () => {
          if (!busy) close();
        },
      },
      /* copy:button */ "Cancel",
    );
    const confirm = h(
      "button",
      {
        class: "chip class-path-confirm",
        onclick: () => {
          if (busy || !(node ? app.engine.learnClassSkill : app.engine.resetClassSkills)) return;
          if (identity(app.lineage) !== asked) {
            confirm.disabled = true;
            feedback.textContent = /* copy:callout */ "Review changed";
            return;
          }
          busy = true;
          confirm.disabled = true;
          cancel.disabled = true;
          let reason = /* copy:callout */ "Choice refused";
          void app
            .mutate(
              async () => {
                try {
                  return node
                    ? await app.engine.learnClassSkill!(node.id)
                    : await app.engine.resetClassSkills!();
                } catch (error) {
                  reason = error instanceof Error ? error.message : reason;
                  throw error;
                }
              },
              node ? node.name : /* copy:callout */ "Skills reset",
              true,
            )
            .then((ok) => {
              if (ok) {
                close();
                onChange();
                return;
              }
              busy = false;
              confirm.disabled = false;
              cancel.disabled = false;
              feedback.textContent = reason;
            });
        },
      },
      node ? /* copy:button */ "Learn skill" : /* copy:button */ "Reset skills",
    );
    return h(
      "div",
      { class: "sheet-body class-path-review" },
      h("div", { class: "label" }, /* copy:label */ "Class tree"),
      h("h3", null, node?.name ?? /* copy:label */ "Reset skills"),
      h("small", { class: "num" }, /* copy:label */ `Bloodline ${L.selected_bloodline ?? 1}`),
      node
        ? preview(node)
        : h(
            "div",
            null,
            h("p", null, /* copy:label */ "Skills removed"),
            ...tree.nodes
              .filter((n) => n.owned)
              .map((n) => h("small", { class: "class-reset-skill" }, n.name)),
          ),
      node
        ? h(
            "small",
            { class: "dim" },
            L.packages?.literal
              ? /* copy:label */ "Written rules"
              : /* copy:label */ "Automatic tactic",
          )
        : null,
      node && !L.packages?.literal
        ? h("small", { class: "dim" }, /* copy:label */ "Safety first")
        : null,
      h(
        "p",
        { class: "num" },
        node ? /* copy:label */ "1 pick" : /* copy:label */ `Refund ${tree.spent}`,
        node ? null : " ",
        node ? null : /* copy:label */ "picks",
      ),
      node ? null : h("small", { class: "dim" }, /* copy:label */ "Free reset"),
      h("div", { class: "chips" }, cancel, confirm),
      feedback,
    );
  });
}

/** Class levels fund cumulative skills; reveal only learned nodes and the next frontier. */
export function renderClassTree(
  app: App,
  onChange: () => void,
  open = new Set<string>(),
): HTMLElement | null {
  const L = app.lineage,
    t = L.class_tree;
  if (!t || L.town?.home === false) return null;
  const roots = t.nodes.filter((n) => n.parent === null),
    first = roots[0];
  if (!first || (t.level < 2 && t.spent === 0)) return null;
  if (t.level < first.required_level && t.spent === 0)
    return h(
      "section",
      { class: "class-tree-soon num" },
      h("b", null, /* copy:label */ "Class skills"),
      h("small", null, /* copy:label */ `L${first.required_level} · D${first.required_depth}`),
    );
  const owned = new Set(t.nodes.filter((n) => n.owned).map((n) => n.id));
  const card = (node: ClassPathNode): HTMLElement => {
    const verb = node.tactics[0]?.verb.v,
      id = verb ? verbIcon(verb) : undefined;
    return h(
      "section",
      {
        class: `class-path-node${node.owned ? " chosen" : ""}${!node.available && !node.owned ? " locked" : ""}`,
        "data-class-path": node.id,
      },
      h(
        "div",
        { class: "class-path-heading" },
        id ? icon(id) : null,
        h("b", null, node.name),
        node.owned ? h("small", { class: "class-path-owned" }, /* copy:label */ "Learned") : null,
      ),
      node.owned
        ? h(
            "details",
            {
              class: "class-skill-rules",
              open: open.has(node.id),
              "data-class-tree-fold": node.id,
            },
            h("summary", null, /* copy:button */ "Skill rules"),
            preview(node),
          )
        : preview(node),
      node.owned
        ? null
        : h(
            "small",
            { class: "dim num" },
            /* copy:label */ `L${node.required_level} · D${node.required_depth}`,
          ),
      !node.owned && !node.available && node.blocked
        ? h("small", { class: "class-path-blocked dim" }, node.blocked)
        : null,
      node.owned
        ? null
        : h(
            "button",
            {
              class: "chip class-path-choose",
              disabled: !node.available || !app.engine.learnClassSkill,
              onclick: () => review(app, node, onChange),
            },
            /* copy:button */ "Learn skill",
          ),
    );
  };
  const branches = roots.map((root) => {
    const children = t.nodes.filter((n) => n.parent === root.id),
      shown = children.filter(
        (n) => n.owned || (owned.has(root.id) && n.required_level <= t.level + 1),
      );
    const future = children.find((n) => !n.owned && !shown.includes(n));
    return h(
      "div",
      { class: "class-tree-branch" },
      card(root),
      shown.length ? h("div", { class: "class-tree-connector", "aria-hidden": "true" }) : null,
      ...shown.map(card),
      owned.has(root.id) && future
        ? h(
            "small",
            { class: "class-tree-next num" },
            /* copy:callout */ `Next L${future.required_level} · D${future.required_depth}`,
          )
        : null,
    );
  });
  const full = h(
    "details",
    { class: "class-tree-map", open: open.has("map"), "data-class-tree-fold": "map" },
    h("summary", null, /* copy:button */ "Full tree"),
    h(
      "div",
      { class: "class-tree-fork" },
      ...roots.map((root) =>
        h(
          "div",
          { class: "class-tree-branch" },
          h("b", null, root.name),
          ...t.nodes
            .filter((n) => n.parent === root.id)
            .map((n) =>
              h(
                "div",
                { class: "class-tree-future num" },
                h("b", null, n.name),
                h("small", null, /* copy:label */ `L${n.required_level} · D${n.required_depth}`),
              ),
            ),
        ),
      ),
    ),
  );
  const nextNode = t.nodes
    .filter((n) => !n.owned && (n.parent === null || owned.has(n.parent)))
    .sort((a, b) => a.required_level - b.required_level)[0];
  const nextPick = t.points === 0 && t.spent < t.nodes.length ? t.level + 1 : undefined;
  return h(
    "section",
    { class: "class-tree-panel", "data-class-tree": t.class },
    h(
      "div",
      { class: "class-tree-header" },
      h("b", null, /* copy:label */ "Class tree"),
      h(
        "small",
        { class: "num" },
        t.spent === t.nodes.length
          ? /* copy:label */ "Complete"
          : t.points === 1
            ? /* copy:label */ "1 pick"
            : /* copy:label */ `${t.points} picks`,
      ),
    ),
    nextPick
      ? h("small", { class: "class-tree-next num" }, /* copy:callout */ `Next pick L${nextPick}`)
      : nextNode && !nextNode.available && nextNode.required_level > t.level
        ? h(
            "small",
            { class: "class-tree-next num" },
            /* copy:callout */ `Next L${nextNode.required_level} · D${nextNode.required_depth}`,
          )
        : null,
    h("div", { class: "class-tree-current class-tree-fork" }, ...branches),
    full,
    t.spent > 0
      ? h(
          "button",
          {
            class: "chip class-path-remove",
            disabled: !t.reset_available || !app.engine.resetClassSkills,
            onclick: () => review(app, null, onChange),
          },
          /* copy:button */ "Reset skills",
        )
      : null,
  );
}
