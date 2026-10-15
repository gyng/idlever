import "../class-tree.css";
import type { App } from "../app";
import type { ClassPathNode, Lineage } from "../engine/types";
import { h } from "./dom";
import { classSkillIcon } from "./skill-icons";
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
      h(
        "h3",
        null,
        node ? classSkillIcon(node, { size: 32, decorative: true }) : null,
        node?.name ?? /* copy:label */ "Reset skills",
      ),
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

function classTreeSoon(first: ClassPathNode): HTMLElement {
  return h(
    "section",
    { class: "class-tree-soon num" },
    h("b", null, /* copy:label */ "Class skills"),
    h("small", null, /* copy:label */ `L${first.required_level} · D${first.required_depth}`),
  );
}

/** Before any skill can be taken (L1, nothing spent), the truthful first milestone (Cut197 §4). */
export function renderClassTreeMilestone(app: App): HTMLElement | null {
  const t = app.lineage.class_tree,
    first = t?.nodes.find((n) => n.parent === null);
  return t && first && t.spent === 0 ? classTreeSoon(first) : null;
}

/** Class levels fund cumulative skills; reveal only learned nodes and the next frontier. */
export function renderClassTree(
  app: App,
  onChange: () => void,
  open = new Set<string>(),
  options: { inspectAway?: boolean } = {},
): HTMLElement | null {
  const L = app.lineage,
    t = L.class_tree,
    away = L.town?.home === false;
  if (!t || (away && !options.inspectAway)) return null;
  const childrenByParent = new Map<string | null, ClassPathNode[]>();
  for (const node of t.nodes) {
    const siblings = childrenByParent.get(node.parent) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parent, siblings);
  }
  const roots = childrenByParent.get(null) ?? [],
    first = roots[0];
  if (!first || (t.level < 2 && t.spent === 0)) return null;
  if (t.level < first.required_level && t.spent === 0) return classTreeSoon(first);
  const owned = new Set(t.nodes.filter((n) => n.owned).map((n) => n.id));
  const card = (node: ClassPathNode): HTMLElement => {
    return h(
      "section",
      {
        class: `class-path-node${node.owned ? " chosen" : ""}${!node.available && !node.owned ? " locked" : ""}`,
        "data-class-path": node.id,
      },
      h(
        "div",
        { class: "class-path-heading" },
        classSkillIcon(node, { size: 24, decorative: true }),
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
              disabled: away || !node.available || !app.engine.learnClassSkill,
              onclick: () => {
                if (!away) review(app, node, onChange);
              },
            },
            /* copy:button */ "Learn skill",
          ),
    );
  };
  const fullCard = (node: ClassPathNode): HTMLElement =>
    h(
      "div",
      {
        class: `class-tree-map-node${node.parent === null ? "" : " class-tree-future"}${node.owned ? " chosen" : ""}`,
        "data-class-map-node": node.id,
      },
      h("b", null, classSkillIcon(node, { size: 24, decorative: true }), node.name),
      h("small", null, /* copy:label */ `L${node.required_level} · D${node.required_depth}`),
      node.owned
        ? h("small", { class: "class-path-owned" }, /* copy:label */ "Learned")
        : node.available
          ? h("small", null, /* copy:label */ "Available")
          : node.blocked
            ? h("small", { class: "class-path-blocked dim" }, node.blocked)
            : null,
    );
  const branch = (
    node: ClassPathNode,
    fullView: boolean,
    ancestors = new Set<string>(),
  ): HTMLElement => {
    const path = new Set(ancestors).add(node.id);
    const children = (childrenByParent.get(node.id) ?? []).filter((child) => !path.has(child.id));
    const shown = fullView
      ? children
      : children.filter(
          (child) => child.owned || (owned.has(node.id) && child.required_level <= t.level + 1),
        );
    const future = fullView
      ? undefined
      : children.find((child) => !child.owned && !shown.includes(child));
    return h(
      "div",
      {
        class: "class-tree-branch",
        "data-class-tree-branch": node.id,
      },
      fullView ? fullCard(node) : card(node),
      shown.length
        ? h(
            "div",
            { class: "class-tree-children", "data-class-tree-parent": node.id },
            ...shown.map((child) =>
              h(
                "div",
                {
                  class: "class-tree-edge",
                  "data-class-tree-edge-parent": node.id,
                  "data-class-tree-edge-child": child.id,
                },
                branch(child, fullView, path),
              ),
            ),
          )
        : null,
      !fullView && owned.has(node.id) && future
        ? h(
            "small",
            { class: "class-tree-next num" },
            /* copy:callout */ `Next L${future.required_level} · D${future.required_depth}`,
          )
        : null,
    );
  };
  const branches = roots.map((root) => branch(root, false));
  const full = h(
    "details",
    { class: "class-tree-map", open: open.has("map"), "data-class-tree-fold": "map" },
    h("summary", null, /* copy:button */ "Full tree"),
    h("div", { class: "class-tree-fork" }, ...roots.map((root) => branch(root, true))),
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
            disabled: away || !t.reset_available || !app.engine.resetClassSkills,
            onclick: () => {
              if (!away) review(app, null, onChange);
            },
          },
          /* copy:button */ "Reset skills",
        )
      : null,
  );
}
