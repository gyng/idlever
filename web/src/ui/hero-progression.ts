import type { App } from "../app";
import type { BuildProgression, TraitCard } from "../engine/types";
import { h } from "./dom";
import { packageIcon } from "./skin";
import { TEMPERAMENT_WORD } from "./orders";
import "../hero-progression.css";

/** Survivor gates and choices are canonical Rust snapshots. */
export function temperamentPanel(app: App, changed?: () => void): HTMLElement | null {
  const hero = app.lineage.persistent_hero;
  const progression = hero?.progression;
  if (!hero || !progression) return null;
  const engine = app.engine;
  const owner = JSON.stringify([app.lineage.selected_bloodline, hero.id, hero.incarnation]);
  const section = h("section", { class: "hero-build-section", "data-build-temperament": "1" });
  const feedback = h("p", { role: "status", class: "hero-build-feedback" });
  let busy = false;
  const current = (): boolean =>
    section.isConnected &&
    app.engine === engine &&
    owner ===
      JSON.stringify([
        app.lineage.selected_bloodline,
        app.lineage.persistent_hero?.id,
        app.lineage.persistent_hero?.incarnation,
      ]);
  const packages = app.lineage.packages?.all ?? [];
  const name = (id: string | null): string =>
    id ? (packages.find((p) => p.id === id)?.name ?? id) : /* copy:label */ "None";
  const choose = (id: string | null): void => {
    if (busy || !current() || !app.lineage.persistent_hero?.progression?.temperament.available)
      return;
    busy = true;
    section.setAttribute("aria-busy", "true");
    void app
      .mutate(
        async () => {
          if (!current()) throw Error(/* copy:none */ "Hero changed");
          if (id === null) return engine.unequipPackage!("temperament");
          return engine.pickTemperament ? engine.pickTemperament(id) : engine.equipPackage!(id, 0);
        },
        /* copy:callout */ "Temperament changed",
        true,
      )
      .then((ok) => {
        busy = false;
        section.removeAttribute("aria-busy");
        if (current())
          feedback.textContent = ok
            ? /* copy:callout */ "Next delve"
            : /* copy:callout */ "Choice refused";
        changed?.();
      });
  };
  section.append(
    h("h3", {}, /* copy:label */ "Temperament"),
    h(
      "div",
      { class: "hero-build-status" },
      h(
        "span",
        { "data-temperament-phase": "actual" },
        /* copy:label */ "Actual",
        " · ",
        name(progression.actual_temperament),
      ),
      h(
        "span",
        { "data-temperament-phase": "next" },
        /* copy:label */ "Next delve",
        " · ",
        name(progression.next_temperament),
      ),
    ),
    h(
      "small",
      { "data-progression-gate": "temperament" },
      progression.temperament.blocked ?? progression.temperament.label,
    ),
  );
  if (progression.temperament.available)
    section.append(
      h("p", {}, /* copy:diary_line */ "Free to change. Applies next delve."),
      app.lineage.orders?.temperament
        ? h(
            "small",
            { "data-temperament-order-current": app.lineage.orders.temperament },
            /* copy:label */ "Order",
            " · ",
            TEMPERAMENT_WORD[app.lineage.orders.temperament] ?? app.lineage.orders.temperament,
          )
        : "",
      h(
        "p",
        { "data-temperament-manual-hint": "1" },
        /* copy:diary_line */ "Manual choices use Keep selected.",
      ),
      app.lineage.orders?.shared?.includes("temperament")
        ? h(
            "small",
            { "data-temperament-shared-hint": "1" },
            /* copy:diary_line */ "Sharing stops. Other heroes retain their orders.",
          )
        : "",
      h(
        "div",
        { class: "hero-build-choices" },
        ...progression.temperament_choices.map((id) => {
          const p = packages.find((p) => p.id === id);
          return h(
            "button",
            {
              class: `btn hero-temperament${id === progression.next_temperament ? " on" : ""}`,
              "data-temperament-choice": id,
              "data-pkg": id,
              "data-action": `temperament:${id}`,
              "aria-pressed": String(id === progression.next_temperament),
              disabled: !engine.pickTemperament && !engine.equipPackage,
              onclick: () => choose(id),
            },
            packageIcon(id),
            h("b", {}, p?.name ?? id),
            p?.description ? h("small", {}, p.description) : null,
          );
        }),
        h(
          "button",
          {
            class: `btn${progression.next_temperament === null ? " on" : ""}`,
            "data-temperament-choice": "none",
            "data-action": "temperament:none",
            "aria-pressed": String(progression.next_temperament === null),
            disabled: !engine.unequipPackage,
            onclick: () => choose(null),
          },
          /* copy:button */ "None",
        ),
      ),
    );
  section.append(feedback);
  return section;
}

function trait(card: TraitCard, phase: string): HTMLElement {
  return h(
    "article",
    { class: "hero-trait-card", "data-lasting-trait": phase, "data-chip": card.chip },
    h("h4", {}, card.head),
    h(
      "small",
      { "data-trait-learned": String(card.learned) },
      card.learned ? /* copy:label */ "Observed" : /* copy:label */ "Unobserved",
    ),
    h("p", {}, card.formula),
    h("small", { "data-trait-condition": "1" }, card.condition_effect),
    h("small", { "data-trait-gift": "1" }, card.gift_effect),
    card.cost_effect ? h("small", { "data-trait-cost": "1" }, card.cost_effect) : null,
  );
}

function familyDescription(context: BuildProgression["family_contexts"][number]): HTMLElement {
  return h(
    "div",
    { "data-family-descriptors": context.id },
    h("p", {}, context.effect),
    h(
      "small",
      { "data-trait-learned": String(context.learned) },
      context.learned ? /* copy:label */ "Observed" : /* copy:label */ "Unobserved",
    ),
    h("small", { "data-trait-condition": "1" }, context.condition_effect),
    h("small", { "data-trait-gift": "1" }, context.gift_effect),
    h("small", { "data-trait-cost": "1" }, context.cost_effect),
  );
}

export function lastingChoices(
  progression: BuildProgression,
  actions: {
    busy: boolean;
    inherited?: (chip: string) => void;
    family?: (id: string) => void;
  },
): HTMLElement {
  const inherited = h(
    "section",
    { class: "hero-build-section", "data-build-inherited": "1" },
    h("h3", {}, /* copy:label */ "Lasting trait"),
    h(
      "small",
      { "data-progression-gate": "inherited" },
      progression.inherited.blocked ?? progression.inherited.label,
    ),
  );
  inherited.append(
    h("b", {}, /* copy:label */ "Actual"),
    progression.actual_inherited
      ? trait(progression.actual_inherited, "actual")
      : h("p", { "data-lasting-trait": "actual-none" }, /* copy:label */ "None"),
  );
  if (progression.inherited_chosen)
    inherited.append(
      h("b", { "data-lasting-next-label": "1" }, /* copy:label */ "Next delve"),
      trait(progression.inherited_chosen, "chosen"),
      h("small", {}, progression.commitment_blocked ?? /* copy:label */ "Reclone resets"),
    );
  else if (progression.inherited.available)
    inherited.append(
      h("p", {}, /* copy:diary_line */ "Optional. This choice lasts until a reclone."),
      h(
        "div",
        { class: "hero-build-choices" },
        ...progression.inherited_offer.map((card) => {
          const el = trait(card, "offer");
          el.append(
            h(
              "button",
              {
                class: "btn",
                disabled: actions.busy || !actions.inherited,
                "data-inherited-choice": card.chip,
                "data-life-focus": `inherited:${card.chip}`,
                onclick: () => actions.inherited?.(card.chip),
              },
              /* copy:button */ "Commit",
            ),
          );
          return el;
        }),
      ),
    );
  const family = h(
    "section",
    { class: "hero-build-section", "data-build-family": "1" },
    h("h3", {}, /* copy:label */ "Family context"),
    h(
      "small",
      { "data-progression-gate": "family" },
      progression.family.blocked ?? progression.family.label,
    ),
  );
  const contextName = (id: string | null): string =>
    id
      ? (progression.family_contexts.find((context) => context.id === id)?.label ?? id)
      : /* copy:label */ "None";
  family.append(
    h(
      "div",
      { class: "hero-build-status" },
      h(
        "span",
        { "data-family-phase": "actual" },
        /* copy:label */ "Actual",
        " · ",
        contextName(progression.actual_family),
      ),
      h(
        "span",
        { "data-family-phase": "next" },
        /* copy:label */ "Next delve",
        " · ",
        contextName(progression.family_chosen),
      ),
    ),
  );
  if (progression.family_chosen) {
    const context = progression.family_contexts.find((c) => c.id === progression.family_chosen);
    family.append(
      h(
        "b",
        { "data-family-chosen": progression.family_chosen },
        context?.label ?? progression.family_chosen,
      ),
      context ? familyDescription(context) : "",
      h("small", {}, /* copy:label */ "Reclone resets"),
    );
  } else if (progression.family.available)
    family.append(
      h("p", {}, /* copy:diary_line */ "Optional. The gift and cost stay fixed."),
      h(
        "div",
        { class: "hero-build-choices" },
        ...progression.family_contexts.map((context) =>
          h(
            "article",
            { class: "hero-trait-card" },
            h("h4", {}, context.label),
            familyDescription(context),
            context.blocked ? h("small", {}, context.blocked) : null,
            h(
              "button",
              {
                class: "btn",
                disabled: actions.busy || !actions.family || !context.available,
                "data-family-choice": context.id,
                "data-life-focus": `family:${context.id}`,
                onclick: () => actions.family?.(context.id),
              },
              /* copy:button */ "Commit",
            ),
          ),
        ),
      ),
    );
  return h("div", { class: "hero-lasting-choices" }, inherited, family);
}
