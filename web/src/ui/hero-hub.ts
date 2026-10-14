import type { App } from "../app";
import { h, replace } from "./dom";
import { heroPresence } from "./hero-presence";
import { renderBloodlineLoadouts } from "./bloodline-loadouts";
import { renderClassTree } from "./class-tree";
import { renderClassStyles, classStyleName } from "./class-styles";
import { heroLifePanel } from "./hero-life";
import { renderLegacy } from "./legacy";
import { renderParty } from "./party";
import { packagesStrip, openPackages } from "./packages";
import { temperamentPanel } from "./hero-progression";
import { openLooks } from "./look";
import { openRuns } from "./runs";
import { openWindow } from "./sheet";
import { icon, portraitSrc } from "./skin";
import { rowLabel } from "./tokens";
import "../hero-hub.css";

export type HeroHubSection = "gear" | "skills" | "behaviour" | "companions" | "attributes";
export type HeroHubHooks = {
  selectResident?: (id: number, section: HeroHubSection) => void;
  changeClass?: (anchor: HTMLElement) => void;
  orders?: (anchor: HTMLElement) => void;
  sectionChanged?: (section: HeroHubSection) => void;
  closed?: () => void;
};
const SECTIONS: HeroHubSection[] = ["gear", "skills", "behaviour", "companions", "attributes"];
/* copy:label */ const NAMES = {
  gear: "Gear",
  skills: "Skills",
  behaviour: "Behaviour",
  companions: "Companions",
  attributes: "Attributes",
};
/* copy:label */ const SLOT_NAMES = {
  weapon: "Weapon",
  helm: "Helm",
  armour: "Body",
  boots: "Boots",
};
let instances = 0;
const contexts = new WeakMap<App, { app: App; valid: () => boolean }>();
/** Existing navigation must leave a controller scope before creating another folio. */
export function heroHubOwner(app: App): App | null {
  const context = contexts.get(app);
  return context ? (context.valid() ? context.app : null) : app;
}

/** Composition only: Rust remains the authority for availability and builds. */
export function heroHubPanel(app: App, initial: HeroHubSection = "gear", hooks: HeroHubHooks = {}) {
  const prefix = `hero-hub-${++instances}`;
  const engine = app.engine;
  const el = h("div", { class: "sheet-body hero-hub", "data-hero-hub": "1" });
  const header = h("header", { class: "hero-hub-header" });
  const tabs = h("div", {
    class: "hero-hub-tabs",
    role: "tablist",
    "aria-label": /* copy:label */ "Hero sections",
  });
  const content = h("div", { class: "hero-hub-content" });
  const buttons = new Map<HeroHubSection, HTMLButtonElement>();
  const panels = new Map<
    HeroHubSection,
    { el: HTMLElement; fingerprint: string; refresh?: () => void; dispose?: () => void }
  >();
  const scroll = new Map<HeroHubSection, number>();
  let selected = initial,
    disposed = false,
    owner = "",
    headerFingerprint = "";
  const identity = (): string =>
    JSON.stringify([
      app.lineage.selected_bloodline,
      app.lineage.persistent_hero?.id,
      app.lineage.persistent_hero?.incarnation,
    ]);
  const current = (): boolean => !disposed && app.engine === engine;

  function scoped(host: HTMLElement): App {
    const asked = identity();
    const valid = (): boolean => current() && asked === identity() && host.isConnected;
    const guardedEngine = new Proxy(engine, {
      get(target, key) {
        const value = Reflect.get(target, key);
        return typeof value === "function"
          ? (...args: unknown[]) => {
              if (!valid()) return Promise.reject(Error(/* copy:none */ "Hero changed"));
              return value.apply(target, args);
            }
          : value;
      },
    });
    const context = new Proxy(app, {
      get(target, key) {
        if (key === "engine") return guardedEngine;
        if (key === "mutate")
          return (...args: Parameters<App["mutate"]>) => {
            if (!valid()) return Promise.resolve(false);
            return app.mutate(
              async () => {
                if (!valid()) throw Error(/* copy:none */ "Hero changed");
                return args[0]();
              },
              args[1],
              args[2],
              args[3],
            );
          };
        const value = Reflect.get(target, key);
        if (["setLook", "setClass", "buy", "selectBloodline", "persist"].includes(String(key)))
          return (...args: unknown[]) =>
            valid()
              ? value.apply(target, args)
              : Promise.resolve(key === "persist" ? undefined : false);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    contexts.set(context, { app, valid });
    return context;
  }

  function gear(host: HTMLElement, context: App): void {
    const kits = app.lineage.starting_kits;
    const figure = h(
      "div",
      { class: "hero-hub-figure", "aria-hidden": "true" },
      h("span", { class: "hero-hub-silhouette" }, icon("hero", "♟")),
    );
    // Full frame, no invented equipment layers; primitive remains if art fails.
    const cls = app.lineage.class.toLowerCase(),
      look = app.lineage.look;
    void fetch(`${import.meta.env.BASE_URL}art/atlas.json`)
      .then((r) => r.json())
      .then(async (atlas) => {
        const atlasImage = new Image();
        atlasImage.src = `${import.meta.env.BASE_URL}art/atlas.png`;
        await atlasImage.decode();
        if (!figure.isConnected || !current()) return;
        const ids = [...(look ? [`hero_${cls}_${look}`] : []), `hero_${cls}`];
        const frame = ids.map((id) => atlas.frames[id]).find(Boolean);
        if (!frame) return;
        const sprite = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        sprite.classList.add("hero-hub-sprite");
        sprite.setAttribute("viewBox", `${frame.x} ${frame.y} ${frame.w} ${frame.h}`);
        sprite.setAttribute("width", String(frame.w));
        sprite.setAttribute("height", String(frame.h));
        const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        image.setAttribute("href", `${import.meta.env.BASE_URL}art/atlas.png`);
        image.setAttribute("width", String(atlas.meta.atlas.w));
        image.setAttribute("height", String(atlas.meta.atlas.h));
        sprite.append(image);
        const scale = 200 / Math.max(frame.w, frame.h);
        Object.assign(sprite.style, {
          width: `${frame.w * scale}px`,
          height: "auto",
        });
        replace(figure, sprite);
      })
      .catch(() => {});
    const equipment = kits?.equipment;
    const doll = h(
      "section",
      { class: "hero-hub-doll", "data-hub-build-readiness": equipment ? "canonical" : "partial" },
      figure,
    );
    for (const slot of ["weapon", "helm", "armour", "boots"] as const) {
      const actual = equipment?.actual.slots.find((row) => row.slot === slot);
      const next = equipment?.next.slots.find((row) => row.slot === slot);
      const shared = !!actual && !!next && JSON.stringify(actual) === JSON.stringify(next);
      const anchor = h(
        "button",
        {
          class: "btn hero-hub-gear-anchor",
          "data-hub-slot": slot,
          "data-hub-slot-state": shared ? "shared" : "split",
          disabled: !kits,
          onclick: () => {
            if (!current() || !host.isConnected) return;
            const detail = host.querySelector<HTMLDetailsElement>(`[data-starting-gear="${slot}"]`);
            if (detail) {
              detail.open = true;
              detail.scrollIntoView({ block: "center" });
              detail.querySelector("summary")?.focus({ preventScroll: true });
            }
          },
        },
        h("b", { class: "hero-hub-slot-name" }, SLOT_NAMES[slot]),
        ...(shared
          ? [
              h(
                "small",
                { "data-hub-slot-shared": "1" },
                h("span", { class: "hero-hub-item" }, actual.label),
                h("strong", {}, /* copy:callout */ "Actual · next delve"),
              ),
            ]
          : (
              [
                ["actual", actual],
                ["next", next],
              ] as const
            ).map(([phase, row]) =>
              h(
                "small",
                {
                  "data-hub-slot-phase": phase,
                },
                h(
                  "strong",
                  {},
                  phase === "actual" ? /* copy:label */ "Actual" : /* copy:label */ "Next delve",
                ),
                h(
                  "span",
                  { class: "hero-hub-phase-value" },
                  h("span", { class: "hero-hub-item" }, row?.label ?? /* copy:label */ "Unknown"),
                  row?.origin ? h("span", { class: "dim hero-hub-origin" }, row.origin) : null,
                ),
              ),
            )),
      );
      doll.append(anchor);
    }
    const effects = h(
      "details",
      { class: "hero-hub-gear-effects", "data-hub-gear-effects": "1" },
      h("summary", {}, /* copy:button */ "Gear effects"),
    );
    if (equipment)
      for (const slot of ["weapon", "helm", "armour", "boots"] as const) {
        const detail = h("article", { "data-hub-slot-read": slot }, h("h4", {}, SLOT_NAMES[slot]));
        for (const phase of ["actual", "next"] as const) {
          const row = equipment[phase].slots.find((item) => item.slot === slot);
          if (row)
            detail.append(
              h(
                "section",
                { "data-hub-slot-detail-phase": phase },
                h(
                  "b",
                  {},
                  phase === "actual" ? /* copy:label */ "Actual" : /* copy:label */ "Next delve",
                ),
                h("p", {}, row.label),
                h("small", {}, row.origin),
                row.effect ? h("p", {}, row.effect) : null,
                row.tradeoff ? h("p", {}, row.tradeoff) : null,
              ),
            );
        }
        effects.append(detail);
      }
    const totals = h("section", { class: "hero-hub-totals", "data-hub-totals": "1" });
    if (equipment)
      for (const phase of ["actual", "next"] as const) {
        const view = equipment[phase],
          stats = view.stats;
        totals.append(
          h(
            "article",
            { "data-hub-build-phase": phase },
            h("h3", {}, view.label),
            h("p", {}, view.note),
            h(
              "dl",
              {},
              h("dt", {}, /* copy:label */ "HP"),
              h("dd", { "data-hub-stat": "hp" }, `${stats.hp} / ${stats.max_hp}`),
              h("dt", {}, /* copy:label */ "Damage"),
              h("dd", { "data-hub-stat": "damage" }, stats.damage.join("–")),
              h("dt", {}, /* copy:label */ "Defence"),
              h("dd", { "data-hub-stat": "defence" }, String(stats.defence)),
              h("dt", {}, /* copy:label */ "Speed"),
              h("dd", { "data-hub-stat": "speed" }, String(stats.speed)),
              h("dt", {}, /* copy:label */ "Class"),
              h("dd", { "data-hub-stat": "class" }, `${stats.class} L${stats.level}`),
            ),
          ),
        );
      }
    const loadouts = renderBloodlineLoadouts(context);
    loadouts.querySelector("[data-build-temperament]")?.remove();
    host.append(doll, effects, totals, loadouts);
  }

  function mount(section: HeroHubSection): void {
    const L = app.lineage;
    const fingerprint = JSON.stringify(
      section === "gear"
        ? [
            owner,
            L.class,
            L.look,
            L.starting_kits,
            L.supplies,
            L.supply_cap,
            L.forge,
            L.town?.home,
            !!L.live,
          ]
        : section === "skills"
          ? [owner, L.class, L.class_tree, L.class_styles, L.town?.home, !!L.live]
          : section === "behaviour"
            ? [
                owner,
                L.packages,
                L.actual_packages,
                L.actual_packages_note,
                L.orders,
                L.persistent_hero?.progression,
              ]
            : section === "companions"
              ? [owner, L.party, L.actual_party, L.kennel, L.eggs, L.pets, L.town?.home, !!L.live]
              : [owner],
    );
    const old = panels.get(section);
    if (old?.fingerprint === fingerprint) {
      old.refresh?.();
      return;
    }
    old?.dispose?.();
    const detailKey = (node: HTMLDetailsElement): string =>
      JSON.stringify([
        node.dataset,
        node.querySelector("summary")?.textContent,
        node.closest("[data-class-path]")?.getAttribute("data-class-path"),
        node.closest("[data-set-family]")?.getAttribute("data-set-family"),
      ]);
    const draftName = old?.el.querySelector<HTMLInputElement>(
      /* copy:none */ 'input[aria-label="Kit name"]',
    );
    const retainedName =
      draftName && draftName.value !== draftName.defaultValue ? draftName.value : undefined;
    const opened = new Set(
      old ? [...old.el.querySelectorAll<HTMLDetailsElement>("details[open]")].map(detailKey) : [],
    );
    const host = h("section", {
      class: "hero-hub-panel",
      role: "tabpanel",
      tabindex: 0,
      id: `${prefix}-${section}-panel`,
      "aria-labelledby": `${prefix}-${section}-tab`,
      "data-hub-panel": section,
    });
    const asked = owner;
    // DOM handler names use the same on-prefix convention as h().
    for (const handler of ["onclick", "oninput", "onchange", "onkeydown"])
      host.addEventListener(
        handler.slice(2),
        (e) => {
          if (!current() || asked !== identity() || !host.isConnected) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }
        },
        true,
      );
    const context = scoped(el);
    let refresh: (() => void) | undefined, dispose: (() => void) | undefined;
    if (section === "gear") gear(host, context);
    else if (section === "skills") {
      host.append(
        h(
          "div",
          { class: "hero-hub-heading" },
          h("h3", {}, L.class),
          h("small", {}, classStyleName(L.class_styles?.selected ?? undefined)),
        ),
        h(
          "button",
          {
            class: "btn",
            disabled: !hooks.changeClass || L.town?.home === false,
            onclick: (e: Event) => {
              if (host.isConnected && current())
                hooks.changeClass?.(e.currentTarget as HTMLElement);
            },
          },
          /* copy:button */ "Change class",
        ),
      );
      const tree = renderClassTree(context, refreshHub, new Set(), { inspectAway: true });
      const styles = renderClassStyles(context, refreshHub, { inspectAway: true });
      host.append(tree ?? h("p", {}, /* copy:label */ "Skills unavailable"));
      if (styles) host.append(styles);
    } else if (section === "behaviour") {
      const actual = L.actual_packages;
      const cards = h(
        "section",
        { class: "hero-hub-actual-build", "data-hub-actual-packages": "1" },
        h("h3", {}, /* copy:label */ "Actual"),
      );
      if (actual)
        for (const [kind, ids] of [
          ["stance", [actual.stance]],
          ["tactic", actual.tactics ?? []],
          ["temperament", actual.temperament ? [actual.temperament] : []],
        ] as const)
          for (const id of ids) {
            const choice = actual.all.find((row) => row.id === id);
            cards.append(
              h(
                "article",
                { "data-hub-actual-package": id, "data-hub-package-kind": kind },
                h("b", {}, choice ? `${choice.name} L${choice.level}` : id),
                choice?.description ? h("p", {}, choice.description) : null,
              ),
            );
          }
      else cards.append(h("p", {}, /* copy:label */ "Unknown"));
      host.append(cards);
      if (L.actual_packages_note)
        host.append(h("p", { "data-hub-behaviour-note": "1" }, L.actual_packages_note));
      const strip = packagesStrip(context);
      const personality = temperamentPanel(context, refreshHub);
      host.append(
        strip.el,
        h(
          "button",
          {
            class: "btn",
            onclick: (e: Event) => {
              if (host.isConnected && current())
                openPackages(context, e.currentTarget as HTMLElement);
            },
          },
          /* copy:button */ "Tactics",
        ),
        h(
          "button",
          {
            class: "btn",
            disabled: !hooks.orders,
            onclick: (e: Event) => {
              if (host.isConnected && current()) hooks.orders?.(e.currentTarget as HTMLElement);
            },
          },
          /* copy:button */ "Orders",
        ),
      );
      if (personality) host.append(personality);
    } else if (section === "companions") {
      const actual = h(
        "section",
        { class: "hero-hub-actual-build", "data-hub-actual-party": "1" },
        h("h3", {}, /* copy:label */ "Actual"),
      );
      if (L.actual_party) {
        if (!L.actual_party.length) actual.append(h("p", {}, /* copy:label */ "None"));
        for (const pet of L.actual_party)
          actual.append(
            h(
              "article",
              { "data-hub-actual-pet": pet.id },
              h("h4", {}, pet.name),
              h("p", {}, `${pet.kind} L${pet.level}`),
              h("small", { "data-hub-pet-hp": "1" }, `${pet.hp} / ${pet.max_hp}`),
              pet.tags.length ? h("p", {}, pet.tags.join(" · ")) : null,
              ...pet.rules.rows.map((row, index) =>
                h("p", { "data-hub-pet-rule": index }, rowLabel(row)),
              ),
            ),
          );
      } else actual.append(h("p", {}, /* copy:label */ "Unknown"));
      host.append(actual);
      if (L.town?.home === false || L.live)
        host.append(h("h3", { "data-hub-future": "companions" }, /* copy:label */ "Next delve"));
      const party = renderParty(context, {
        current: () => current() && asked === identity() && el.isConnected,
      });
      host.append(party.el);
      const progression = L.persistent_hero?.progression;
      if (progression && !progression.leash_available)
        host.append(h("p", { "data-hub-leash-lock": "1" }, progression.leash_blocked));
    } else {
      const life = heroLifePanel(context);
      const legacy = h("div", { class: "hero-hub-legacy" });
      let legacyFingerprint = "";
      refresh = () => {
        life.refresh();
        const next = JSON.stringify([
          app.lineage.bloodline,
          app.lineage.legacy_upgrades,
          app.lineage.legacy_respec,
          app.lineage.town?.home,
        ]);
        if (next !== legacyFingerprint) {
          legacyFingerprint = next;
          replace(legacy, renderLegacy(context, refreshHub));
        }
      };
      dispose = life.dispose;
      host.append(life.el, legacy);
      refresh();
    }
    for (const node of host.querySelectorAll<HTMLElement>("button,input,select,summary,form")) {
      const handler = node.onclick;
      if (handler)
        node.onclick = function (event) {
          if (current() && asked === identity() && host.isConnected)
            return handler.call(this, event);
        };
    }
    if (section === "gear" && retainedName !== undefined) {
      const input = host.querySelector<HTMLInputElement>(
        /* copy:none */ 'input[aria-label="Kit name"]',
      );
      if (input) input.value = retainedName;
    }
    panels.set(section, { el: host, fingerprint, refresh, dispose });
    for (const detail of host.querySelectorAll<HTMLDetailsElement>("details"))
      if (opened.has(detailKey(detail))) detail.open = true;
    if (old) old.el.replaceWith(host);
    else content.append(host);
  }

  function select(section: HeroHubSection): void {
    if (!current()) return;
    const old = panels.get(selected);
    if (old) scroll.set(selected, el.scrollTop);
    if (selected !== section) hooks.sectionChanged?.(section);
    selected = section;
    mount(section);
    for (const [key, panel] of panels) panel.el.hidden = key !== section;
    for (const [key, button] of buttons) {
      button.setAttribute("aria-selected", String(key === section));
      button.tabIndex = key === section ? 0 : -1;
    }
    el.scrollTop = scroll.get(section) ?? 0;
  }
  for (const [index, section] of SECTIONS.entries()) {
    const button = h(
      "button",
      {
        class: "btn hero-hub-tab",
        role: "tab",
        id: `${prefix}-${section}-tab`,
        "aria-controls": `${prefix}-${section}-panel`,
        "data-hub-tab": section,
        onclick: () => select(section),
        onkeydown: (event: Event) => {
          const e = event as KeyboardEvent;
          const next =
            e.key === "ArrowRight"
              ? SECTIONS[(index + 1) % SECTIONS.length]
              : e.key === "ArrowLeft"
                ? SECTIONS[(index + SECTIONS.length - 1) % SECTIONS.length]
                : e.key === "Home"
                  ? SECTIONS[0]
                  : e.key === "End"
                    ? SECTIONS.at(-1)
                    : undefined;
          if (next) {
            e.preventDefault();
            select(next);
            buttons.get(next)?.focus({ preventScroll: true });
          }
        },
      },
      NAMES[section],
    );
    buttons.set(section, button);
    tabs.append(button);
  }
  function refreshHub(): void {
    if (!current()) return;
    const active =
      document.activeElement instanceof HTMLElement && el.contains(document.activeElement)
        ? document.activeElement
        : null;
    const focusKey = active
      ? JSON.stringify([
          active.tagName,
          active.dataset,
          active.textContent,
          active.closest("[data-class-path]")?.getAttribute("data-class-path"),
        ])
      : null;
    const previousOwner = owner;
    if (owner !== identity()) {
      for (const panel of panels.values()) panel.dispose?.();
      panels.clear();
      replace(content);
      scroll.clear();
      owner = identity();
    }
    const L = app.lineage,
      hero = L.persistent_hero,
      slot = L.hero_slots?.find((s) => s.id === L.selected_bloodline);
    const nextHeader = JSON.stringify([
      owner,
      hero?.name,
      hero?.state,
      L.class,
      L.look,
      slot && heroPresence(slot).text,
      L.hero_slots?.map((s) => [s.id, s.hero_name]),
    ]);
    if (nextHeader !== headerFingerprint) {
      headerFingerprint = nextHeader;
      const asked = identity();
      const headerCurrent = (e: Event): boolean =>
        current() && asked === identity() && (e.currentTarget as HTMLElement).isConnected;
      const face = h("span", { class: "hero-hub-face", "aria-hidden": "true" }, icon("hero", "♟"));
      const cls = L.class.toLowerCase();
      const src = [...(L.look ? [`hero_${cls}_${L.look}`] : []), `hero_${cls}`]
        .map(portraitSrc)
        .find(Boolean);
      if (src) {
        const image = new Image();
        image.src = src;
        void image
          .decode()
          .then(() => {
            if (face.isConnected && current() && asked === identity())
              replace(face, h("img", { src, alt: "" }));
          })
          .catch(() => {});
      }
      replace(
        header,
        face,
        h(
          "div",
          { class: "hero-hub-identity" },
          h("h2", {}, hero?.name ?? slot?.hero_name ?? /* copy:label */ "No hero"),
          h("span", {}, L.class),
          h(
            "strong",
            { "data-hub-life-state": hero?.state ?? "none" },
            slot ? heroPresence(slot).text : /* copy:label */ "No hero",
          ),
          h("small", {}, /* copy:label */ `Bloodline ${L.selected_bloodline ?? 1}`),
        ),
        h(
          "div",
          { class: "hero-hub-secondary" },
          h(
            "button",
            {
              class: "btn",
              "data-hub-action": "appearance",
              onclick: (e: Event) => {
                if (headerCurrent(e)) openLooks(scoped(header));
              },
            },
            /* copy:button */ "Appearance",
          ),
          h(
            "button",
            {
              class: "btn",
              "data-hub-action": "runs",
              disabled: !(L.runs ?? []).some((run) => run.id > 0),
              onclick: (e: Event) => {
                if (headerCurrent(e)) openRuns(scoped(header));
              },
            },
            /* copy:button */ "Run log",
          ),
        ),
        h(
          "div",
          { class: "hero-hub-residents", "aria-label": /* copy:label */ "Heroes" },
          ...(L.hero_slots ?? []).map((resident) =>
            h(
              "button",
              {
                class: "btn",
                "data-hub-resident": resident.id,
                "aria-pressed": String(resident.id === L.selected_bloodline),
                disabled: !hooks.selectResident,
                onclick: (e: Event) => {
                  if (headerCurrent(e)) hooks.selectResident?.(resident.id, selected);
                },
              },
              resident.hero_name,
            ),
          ),
        ),
      );
    }
    select(selected);
    if (active && !active.isConnected) {
      const replacement =
        previousOwner === owner
          ? [...el.querySelectorAll<HTMLElement>("button,input,summary,[role='tab']")].find(
              (node) =>
                JSON.stringify([
                  node.tagName,
                  node.dataset,
                  node.textContent,
                  node.closest("[data-class-path]")?.getAttribute("data-class-path"),
                ]) === focusKey,
            )
          : null;
      (replacement && !(replacement as HTMLButtonElement).disabled
        ? replacement
        : buttons.get(selected)
      )?.focus({ preventScroll: true });
    }
  }
  el.append(header, tabs, content);
  refreshHub();
  return {
    el,
    refresh: refreshHub,
    select,
    dispose(): void {
      disposed = true;
      for (const panel of panels.values()) panel.dispose?.();
      panels.clear();
    },
  };
}

export function openHeroHub(
  app: App,
  anchor?: HTMLElement | null,
  initial: HeroHubSection = "gear",
  hooks: HeroHubHooks = {},
): void {
  const root = heroHubOwner(app);
  if (!root) return;
  app = root;
  let panel: ReturnType<typeof heroHubPanel> | undefined;
  let off = (): void => {},
    offLive = (): void => {};
  openWindow(
    () => {
      panel = heroHubPanel(app, initial, hooks);
      off = app.onChange(() => panel?.refresh());
      offLive = app.onLive(() => panel?.refresh());
      return panel.el;
    },
    {
      anchor,
      material: "bloodlines",
      stay: true,
      onClose: () => {
        off();
        offLive();
        panel?.dispose();
        hooks.closed?.();
      },
    },
  );
}
