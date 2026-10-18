import type { App } from "../app";
import type { HeroRebirth, PersistentHero, Lineage } from "../engine/types";
import { h, replace, spanOf } from "./dom";
import { openWindow } from "./sheet";
import { lastingChoices } from "./hero-progression";
import "../hero-life.css";

export type HeroLifeMode = "hero" | "recovery" | "rebirth";
const STATE: Record<PersistentHero["state"], string> = {
  ready: /* copy:label */ "Ready",
  away: /* copy:label */ "Delving",
  reincarnating: /* copy:label */ "Cloning",
  // (Cut264: an old save's `recovering` is the same clone)
  recovering: /* copy:label */ "Cloning",
};
const BONUS: Record<string, string> = {
  health: /* copy:label */ "HP bonus",
  damage: /* copy:label */ "Damage bonus",
  armour: /* copy:label */ "Armour bonus",
};
let lifePanels = 0;
const actorKey = (hero: PersistentHero): string => JSON.stringify([hero.id, hero.incarnation]);

/** Embeddable owned controller; root can place it in a Hero tab without another sheet. */
export function heroLifePanel(
  app: App,
  mode: HeroLifeMode = "hero",
  options: { onCancel?: () => void; embedded?: boolean } = {},
) {
  const engine = app.engine;
  const nameId = `hero-name-${++lifePanels}`;
  const el = h("div", { class: "sheet-body hero-life-panel" });
  const feedback = h("p", {
    class: "hero-life-feedback",
    role: "status",
    "aria-live": "polite",
    tabindex: -1,
  });
  let owner = "";
  let fingerprint = "";
  let disposed = false;
  let initialized = false;
  let busy = false;
  let draft: string | undefined;
  let dirty = false;
  let reviewed: { owner: string; preview: HeroRebirth } | null = null;
  const current = (): PersistentHero | undefined =>
    app.engine === engine ? app.lineage.persistent_hero : undefined;
  const same = (key: string): boolean => !disposed && !!current() && actorKey(current()!) === key;
  const focus = (key?: string): void => {
    const candidate = [...el.querySelectorAll<HTMLElement>("[data-life-focus]")].find(
      (node) =>
        node.dataset.lifeFocus === key &&
        node.getClientRects().length > 0 &&
        !((node instanceof HTMLButtonElement || node instanceof HTMLInputElement) && node.disabled),
    );
    (candidate ?? feedback).focus({ preventScroll: true });
  };
  async function mutate(
    key: string,
    operation: () => Promise<Lineage>,
    success: string,
    focusKey?: string,
    clearName = false,
  ): Promise<void> {
    if (busy || !same(key)) return;
    busy = true;
    el.setAttribute("aria-busy", "true");
    for (const node of el.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button"))
      node.disabled = true;
    let reason = /* copy:callout */ "Action refused";
    const ok = await app.mutate(async () => {
      if (!same(key)) throw Error(/* copy:none */ "Hero changed");
      try {
        return await operation();
      } catch (error) {
        reason = error instanceof Error ? error.message : reason;
        throw error;
      }
    });
    busy = false;
    el.removeAttribute("aria-busy");
    if (disposed) return;
    if (ok) {
      reviewed = null;
      if (clearName) {
        dirty = false;
        draft = undefined;
      }
    }
    refresh(true);
    if (same(key)) {
      feedback.textContent = ok ? success : reason;
      focus(focusKey);
    }
    // A successful Rebirth intentionally changes incarnation; its new state remains visible.
    else if (ok && current()) {
      feedback.textContent = success;
      focus();
    }
  }
  const route = async (tab: "loadouts" | "class" | "legacy", key: string): Promise<void> => {
    if (!same(key)) return;
    const { openHero } = await import("./town");
    if (same(key)) openHero(app, null, tab);
  };
  function refresh(force = false): void {
    if (disposed) return;
    const hero = current();
    if (!hero) {
      replace(el, h("p", {}, /* copy:callout */ "Hero unavailable"));
      return;
    }
    const key = actorKey(hero),
      L = app.lineage;
    const changedOwner = key !== owner;
    const next = JSON.stringify([
      hero,
      L.bloodline,
      L.legacy_upgrades,
      L.town?.home,
      L.gold,
      mode,
      reviewed?.preview.token,
    ]);
    if (!force && next === fingerprint && !changedOwner) return;
    const active = document.activeElement as HTMLInputElement | HTMLElement | null;
    const focused =
      !changedOwner && active && el.contains(active) ? active.dataset.lifeFocus : undefined;
    const selection =
      active instanceof HTMLInputElement && el.contains(active)
        ? [active.selectionStart, active.selectionEnd]
        : null;
    const scroller = el.closest<HTMLElement>(".bloodline-panel,.game-window,.sheet") ?? el;
    const scroll = changedOwner ? 0 : scroller.scrollTop;
    if (changedOwner) {
      reviewed = null;
      dirty = false;
      draft = undefined;
      feedback.textContent = "";
    }
    owner = key;
    if (!dirty) draft = hero.name;
    if (mode === "rebirth" && !initialized && !reviewed)
      reviewed = { owner: key, preview: structuredClone(hero.rebirth) };
    initialized = true;
    fingerprint = next;
    const atHome = L.town?.home !== false && hero.state !== "away";
    const children: Node[] = [
      h("h2", { class: "hero-life-heading" }, hero.name),
      h(
        "div",
        { class: "hero-life-state", "data-hero-state": hero.state },
        h("b", {}, STATE[hero.state]),
        hero.recovery_s > 0
          ? h(
              "span",
              { class: "num", "data-recovery-seconds": hero.recovery_s },
              spanOf(hero.recovery_s),
            )
          : null,
        hero.need === "rest" && hero.rest_s > 0
          ? h(
              "span",
              { class: "num", "data-rest-seconds": hero.rest_s },
              /* copy:label */ `Rest ${hero.rest_s}s`,
            )
          : null,
        h("small", { class: "num" }, /* copy:label */ `Reclones ${hero.rebirths}`),
      ),
    ];
    // Cut264 §4: the vat's clone — its state, its timer and the gold hurry (Reclone stays below)
    const cloning = hero.state === "reincarnating" || hero.state === "recovering";
    if (cloning && hero.recovery_s > 0) {
      const price = hero.hurry_price;
      const total = Math.max(hero.recovery_total_s ?? 0, hero.recovery_s);
      const done = total > 0 ? Math.round((100 * (total - hero.recovery_s)) / total) : 0;
      children.push(
        h(
          "section",
          { class: "hero-life-section hero-clone", "data-clone": "growing" },
          h("h3", {}, /* copy:label */ "Clone"),
          h(
            "span",
            {
              class: "num hero-clone-timer",
              "data-clone-seconds": hero.recovery_s,
              "data-clone-total": total,
            },
            /* copy:label */ `Cloning ${spanOf(hero.recovery_s)}`,
          ),
          h(
            "span",
            { class: "hero-clone-bar", "aria-hidden": "true" },
            h("i", { style: `width:${done}%` }),
          ),
          price !== undefined
            ? h(
                "button",
                {
                  class: "btn hero-clone-hurry num",
                  "data-life-focus": "hurry",
                  "data-hurry-price": price,
                  disabled: !atHome || !engine.hurryClone || busy || L.gold < price,
                  onclick: () => {
                    if (!same(key) || !engine.hurryClone) return;
                    const live = current()?.hurry_price;
                    if (live === undefined) {
                      refresh(true);
                      return;
                    }
                    void mutate(
                      key,
                      () => engine.hurryClone!(price),
                      /* copy:callout */ "Clone ready",
                      "hurry",
                    );
                  },
                },
                /* copy:button */ `Hurry $${price}`,
              )
            : null,
        ),
      );
    }
    if (mode !== "rebirth") {
      const input = h("input", {
        id: nameId,
        name: "hero-name",
        type: "text",
        maxlength: 64,
        value: draft,
        disabled: !atHome || !engine.renameHero || busy,
        "data-life-focus": "name",
        "aria-label": /* copy:label */ "Hero name",
        oninput: (event) => {
          draft = (event.target as HTMLInputElement).value;
          dirty = true;
        },
      });
      const form = h(
        "form",
        {
          class: "hero-name-form",
          onsubmit: (event) => {
            event.preventDefault();
            if (!same(key) || !engine.renameHero) return;
            const value = input.value.trim();
            if ([...value].length < 1 || [...value].length > 32 || /\p{Cc}/u.test(value)) {
              feedback.textContent = /* copy:callout */ "Invalid name";
              focus("name");
              return;
            }
            void mutate(
              key,
              () => engine.renameHero!(value),
              /* copy:callout */ "Name saved",
              "name",
              true,
            );
          },
        },
        h("label", { for: input.id }, /* copy:label */ "Hero name"),
        input,
        h(
          "button",
          {
            class: "btn",
            type: "submit",
            disabled: !atHome || !engine.renameHero || busy,
            "data-life-focus": "rename",
          },
          /* copy:button */ "Rename",
        ),
      );
      children.push(
        h(
          "section",
          { class: "hero-life-section" },
          form,
          !atHome
            ? h(
                "small",
                {},
                hero.state === "away"
                  ? /* copy:callout */ "Hero away"
                  : /* copy:callout */ "Build a house",
              )
            : null,
        ),
      );
      const services =
        mode === "recovery" ? [hero.device, hero.pool] : [hero.guild, hero.pool, hero.device];
      children.push(
        h(
          "section",
          { class: "hero-life-section" },
          ...services.map((service) =>
            h(
              "div",
              { "data-hero-service": service.id },
              h("h3", {}, service.name),
              h("p", {}, service.body),
            ),
          ),
        ),
      );
      const points = L.bloodline?.points ?? 0;
      // Cut266: inside the Hero Hub the Legacy tree below already offers these ranks, and the tabs are the routes.
      if (!options.embedded)
        children.push(
          h(
            "section",
            { class: "hero-life-section" },
            h("h3", {}, /* copy:label */ "Lasting attributes"),
            h(
              "b",
              { class: "num", "data-life-wallet": points },
              /* copy:label */ `Legacy ${points}`,
            ),
            h(
              "div",
              { class: "hero-life-attributes" },
              ...hero.attributes.map((attribute) => {
                const offer = L.legacy_upgrades?.find((upgrade) => upgrade.id === attribute.id);
                const nextRun = !!offer?.next_run && !!engine.upgradeHeroNext;
                const can = !!offer?.affordable && !!engine.upgradeHero;
                return h(
                  "article",
                  { class: "hero-life-section", "data-life-attribute": attribute.id },
                  h("h3", {}, attribute.name),
                  h("span", { class: "num" }, /* copy:label */ `Rank ${attribute.rank}`),
                  h(
                    "span",
                    { class: "num" },
                    `${BONUS[attribute.id] ?? attribute.name} +${attribute.value}`,
                  ),
                  attribute.next_price === null
                    ? h("small", {}, /* copy:label */ "Complete")
                    : h("span", { class: "num" }, `${attribute.next_price} Legacy`),
                  h(
                    "button",
                    {
                      class: "btn",
                      disabled: (!can && !nextRun) || busy,
                      "data-life-focus": `attribute:${attribute.id}`,
                      onclick: () => {
                        if (!same(key)) return;
                        const actual = app.lineage.legacy_upgrades?.find(
                          (upgrade) => upgrade.id === attribute.id,
                        );
                        if (
                          !actual ||
                          actual.price !== offer?.price ||
                          actual.rank !== offer?.rank
                        ) {
                          feedback.textContent = /* copy:callout */ "Offer changed";
                          refresh(true);
                          return;
                        }
                        if (actual.next_run && engine.upgradeHeroNext)
                          void mutate(
                            key,
                            () => engine.upgradeHeroNext!(attribute.id),
                            /* copy:callout */ "Next delve",
                            `attribute:${attribute.id}`,
                          );
                        else if (actual.affordable && engine.upgradeHero)
                          void mutate(
                            key,
                            () => engine.upgradeHero!(attribute.id),
                            /* copy:callout */ "Attribute trained",
                            `attribute:${attribute.id}`,
                          );
                        else {
                          feedback.textContent =
                            actual.blocked ?? /* copy:callout */ "Offer refused";
                          refresh(true);
                        }
                      },
                    },
                    nextRun ? /* copy:button */ "Next delve" : /* copy:button */ "Train",
                  ),
                  offer?.blocked ? h("small", {}, offer.blocked) : null,
                );
              }),
            ),
          ),
        );
      if (hero.progression)
        children.push(
          lastingChoices(hero.progression, {
            busy,
            inherited: engine.setInheritedTrait
              ? (chip) => {
                  if (
                    !same(key) ||
                    !current()?.progression?.inherited.available ||
                    current()?.progression?.inherited_chosen
                  )
                    return;
                  void mutate(
                    key,
                    () => engine.setInheritedTrait!(chip),
                    /* copy:callout */ "Trait committed",
                    `inherited:${chip}`,
                  );
                }
              : undefined,
            family: engine.setFamilyLean
              ? (id) => {
                  if (
                    !same(key) ||
                    !current()?.progression?.family_contexts.some(
                      (context) => context.id === id && context.available,
                    )
                  )
                    return;
                  void mutate(
                    key,
                    () => engine.setFamilyLean!(id),
                    /* copy:callout */ "Context committed",
                    `family:${id}`,
                  );
                }
              : undefined,
          }),
        );
      if (!options.embedded)
        children.push(
          h(
            "div",
            { class: "hero-life-actions" },
            ...(["loadouts", "class", "legacy"] as const).map((tab) =>
              h(
                "button",
                {
                  class: "btn",
                  "data-life-focus": `route:${tab}`,
                  onclick: () => void route(tab, key),
                },
                tab === "loadouts"
                  ? /* copy:button */ "Loadouts"
                  : tab === "class"
                    ? /* copy:button */ "Class"
                    : /* copy:button */ "Legacy",
              ),
            ),
          ),
        );
    }
    const preview = reviewed?.owner === key ? reviewed.preview : null;
    const unchanged = !!preview && preview.token === hero.rebirth.token;
    children.push(
      h(
        "section",
        { class: "hero-life-section hero-rebirth" },
        h("h3", {}, /* copy:label */ "Reclone"),
        preview
          ? h(
              "div",
              {},
              h("p", { class: "num" }, /* copy:callout */ `${preview.refund} Legacy refunded`),
              h("small", {}, /* copy:callout */ "No Gold fee"),
              preview.points_after !== null
                ? h(
                    "p",
                    { class: "num" },
                    /* copy:callout */ `${preview.points_after} Legacy after`,
                  )
                : null,
              h("h3", {}, /* copy:label */ "Reset"),
              h(
                "ul",
                { class: "hero-life-preview-list" },
                ...preview.resets.map((text) => h("li", {}, text)),
              ),
              h("h3", {}, /* copy:label */ "Retain"),
              h(
                "ul",
                { class: "hero-life-preview-list" },
                ...preview.retains.map((text) => h("li", {}, text)),
              ),
              h("small", {}, /* copy:label */ `Depth ${preview.required_depth}`),
              preview.delves_remaining > 0
                ? h("small", { class: "num" }, `${preview.delves_remaining} delves remaining`)
                : null,
              preview.seconds_remaining > 0
                ? h("small", { class: "num" }, `${preview.seconds_remaining}s remaining`)
                : null,
              preview.blocked ? h("p", {}, preview.blocked) : null,
              !unchanged ? h("p", {}, /* copy:callout */ "Preview changed") : null,
              h(
                "div",
                { class: "hero-life-actions" },
                h(
                  "button",
                  {
                    class: "btn",
                    disabled: busy,
                    "data-life-focus": "review",
                    onclick: () => {
                      if (!same(key)) return;
                      reviewed = { owner: key, preview: structuredClone(current()!.rebirth) };
                      refresh(true);
                    },
                  },
                  /* copy:button */ "Review again",
                ),
                h(
                  "button",
                  {
                    class: "btn",
                    disabled: busy,
                    "data-life-focus": "cancel",
                    onclick: () => {
                      if (options.onCancel) {
                        options.onCancel();
                        return;
                      }
                      reviewed = null;
                      mode = "hero";
                      refresh(true);
                      focus("review");
                    },
                  },
                  /* copy:button */ "Cancel",
                ),
                h(
                  "button",
                  {
                    class: "btn",
                    disabled: !preview.available || !unchanged || !engine.rebirthHero || busy,
                    "data-life-focus": "confirm",
                    onclick: () => {
                      if (!same(key) || !engine.rebirthHero || !preview.available) return;
                      const actual = current()!.rebirth;
                      if (!actual.available || actual.token !== preview.token) {
                        feedback.textContent = /* copy:callout */ "Preview changed";
                        refresh(true);
                        return;
                      }
                      void mutate(
                        key,
                        () => engine.rebirthHero!(preview.token),
                        /* copy:callout */ "Recloned",
                      );
                    },
                  },
                  /* copy:button */ "Confirm reclone",
                ),
              ),
            )
          : h(
              "div",
              {},
              hero.rebirth.blocked ? h("p", {}, hero.rebirth.blocked) : null,
              h(
                "p",
                { class: "num" },
                /* copy:callout */ `${hero.rebirth.refund} Legacy refundable`,
              ),
              h(
                "button",
                {
                  class: "btn",
                  disabled: !engine.rebirthHero || busy,
                  "data-life-focus": "review",
                  onclick: () => {
                    if (!same(key)) return;
                    reviewed = { owner: key, preview: structuredClone(current()!.rebirth) };
                    refresh(true);
                    focus("confirm");
                  },
                },
                /* copy:button */ "Review",
              ),
            ),
      ),
    );
    replace(el, ...children, feedback);
    scroller.scrollTop = scroll;
    if (focused) {
      focus(focused);
      const input = el.querySelector<HTMLInputElement>('[data-life-focus="name"]');
      if (selection && focused === "name" && input)
        input.setSelectionRange(selection[0], selection[1]);
    }
  }
  refresh();
  return {
    el,
    refresh,
    dispose(): void {
      disposed = true;
    },
  };
}

export function openHeroLife(
  app: App,
  anchor?: HTMLElement | null,
  mode: HeroLifeMode = "hero",
): void {
  let panel: ReturnType<typeof heroLifePanel> | undefined;
  let off = (): void => {};
  openWindow(
    (close) => {
      panel = heroLifePanel(app, mode, mode === "rebirth" ? { onCancel: close } : {});
      off = app.onChange(() => panel?.refresh());
      return panel.el;
    },
    {
      anchor,
      material: "bloodlines",
      stay: true,
      onClose: () => {
        off();
        panel?.dispose();
      },
    },
  );
}
