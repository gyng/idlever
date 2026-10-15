import type { Journal, JournalAction, JournalEntry } from "../engine/types";
import { h, replace } from "./dom";
import { questBar, rewardPicture } from "./quest";
import { TIP, termIcon, termTitle, type Term } from "./concepts";
import { glossaryTerms } from "./tips";
import "../journal.css";

export type JournalSnapshot = { identity: string; journal: Journal };
export type JournalOptions = {
  read: () => JournalSnapshot | Promise<JournalSnapshot>;
  action: (action: JournalAction, entryId: string) => Promise<boolean>;
  swapQuest?: () => Promise<boolean>;
  /** Cut234: a plate's head opened the journal on this term's glossary entry. */
  focusTerm?: Term;
};

/** Cut234 (package report #4): the glossary — every term this viewer has met, its plate's gloss,
 *  in title order. Per viewer (the tips' memory); the save never holds it. */
export function glossaryEntries(terms: Term[] = glossaryTerms()): HTMLElement[] {
  return terms
    .map((t) => ({ t, title: termTitle(t) }))
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(({ t, title }) =>
      h(
        "article",
        {
          class: "journal-term",
          id: `glossary-${t}`,
          "data-term": t,
          tabindex: -1,
        },
        h("strong", {}, termIcon(t) ?? "", title),
        h("p", {}, TIP[t]),
      ),
    );
}
/** Opens the glossary fold, scrolls the term's entry into view and focuses it (a brief gilt rim). */
export function revealTerm(root: HTMLElement, t: Term): boolean {
  const entry = root.querySelector<HTMLElement>(`.journal-term[data-term="${t}"]`);
  if (!entry) return false;
  for (let d = entry.closest("details"); d; d = d.parentElement?.closest("details") ?? null)
    d.open = true;
  entry.scrollIntoView({ block: "center" });
  entry.focus({ preventScroll: true });
  entry.classList.add("journal-term-hit");
  return true;
}

/** Completed milestones may still open an earned system; completion never repeats a purchase. */
export const journalActionAllowed = (entry: JournalEntry): boolean =>
  !!entry.action?.enabled && (entry.state !== "complete" || entry.action.kind === "open");

/** Rust supplies all objectives and rewards. Callbacks route existing real actions. */
export function createJournal(options: JournalOptions) {
  const el = h("div", { class: "sheet-body journal-panel" });
  const status = h("p", {
    class: "journal-status",
    role: "status",
    "aria-live": "polite",
    tabindex: -1,
  });
  let identity: string | undefined;
  let revision = 0;
  let disposed = false;
  let busy = false;
  let fingerprint = "";
  const open = new Map<string, boolean>();
  let focusTerm = options.focusTerm;

  const run = async (
    key: string,
    operation: (snapshot: JournalSnapshot) => Promise<boolean>,
    expected: string | undefined,
  ): Promise<void> => {
    if (busy || disposed) return;
    if (expected !== identity) return;
    busy = true;
    el.setAttribute("aria-busy", "true");
    for (const button of el.querySelectorAll<HTMLButtonElement>("button")) button.disabled = true;
    let ok = false;
    try {
      // Re-read before routing: detached controls cannot target a different hero.
      const before = await options.read();
      if (!disposed && before.identity === expected) ok = await operation(before);
    } catch {
      ok = false;
    } finally {
      busy = false;
      el.removeAttribute("aria-busy");
      await refresh(true);
    }
    if (!disposed && identity === expected) {
      status.textContent = ok ? /* copy:callout */ "Updated" : /* copy:callout */ "Action refused";
      const available = (node: HTMLElement): boolean =>
        node.getClientRects().length > 0 && !(node instanceof HTMLButtonElement && node.disabled);
      const keyed = [...el.querySelectorAll<HTMLElement>("[data-journal-focus]")].find(
        (node) => node.dataset.journalFocus === key && available(node),
      );
      const recommended = [
        ...el.querySelectorAll<HTMLElement>('[data-recommended="true"] button'),
      ].find(available);
      const chapter = [...el.querySelectorAll<HTMLElement>(".journal-chapter > summary")].find(
        available,
      );
      (keyed ?? recommended ?? chapter ?? status).focus({ preventScroll: true });
    }
  };

  const entry = (item: JournalEntry, recommended = false): HTMLElement => {
    const owner = identity;
    const progress = item.progress;
    const action = item.action;
    const card = h(
      "article",
      {
        class: "journal-step",
        "data-entry-id": item.id,
        "data-state": item.state,
        "data-recommended": String(recommended),
      },
      recommended ? h("small", {}, /* copy:label */ "Next") : null,
      h("h3", {}, item.title),
      h("p", {}, item.reason),
      h("p", {}, item.effect),
      progress
        ? h(
            "div",
            {},
            h("progress", {
              max: Math.max(1, progress.required),
              value: progress.current,
              "aria-label": item.title,
            }),
            h(
              "small",
              { class: "num" },
              `${progress.current}/${progress.required} ${progress.unit}`,
            ),
          )
        : null,
      ...item.requirements.map((requirement) => h("small", {}, requirement)),
    );
    if (item.state === "complete") card.append(h("small", {}, /* copy:label */ "Complete"));
    if (action && (item.state !== "complete" || action.kind === "open")) {
      const key = `action:${item.id}`;
      card.append(
        h(
          "div",
          { class: "journal-actions" },
          h(
            "button",
            {
              class: "btn",
              disabled: !action.enabled || busy,
              "data-journal-focus": key,
              onclick: () =>
                void run(
                  key,
                  async (snapshot) => {
                    const current = snapshot.journal.chapters
                      .flatMap((chapter) => chapter.entries)
                      .find((candidate) => candidate.id === item.id);
                    return current?.action && journalActionAllowed(current)
                      ? options.action(current.action, current.id)
                      : false;
                  },
                  owner,
                ),
            },
            action.label,
          ),
        ),
      );
      if (action.blocked) card.append(h("small", {}, action.blocked));
    }
    return card;
  };

  const fold = (id: string, title: string, content: Node[]): HTMLDetailsElement => {
    const details = h(
      "details",
      { class: "journal-chapter", "data-chapter": id, open: open.get(id) ?? false },
      h("summary", { "data-journal-focus": `chapter:${id}` }, title),
      h("div", { class: "journal-entries" }, ...content),
    );
    details.addEventListener("toggle", () => open.set(id, details.open));
    return details;
  };

  async function refresh(force = false): Promise<void> {
    if (disposed) return;
    const ticket = ++revision;
    const snapshot = await options.read();
    if (disposed || ticket !== revision) return;
    const model = snapshot.journal;
    const terms = glossaryTerms();
    const next = JSON.stringify([snapshot, terms]);
    if (!force && next === fingerprint) return;
    const same = identity === snapshot.identity;
    const scrollNode = el.closest<HTMLElement>(".game-window, .sheet") ?? el;
    const scroll = same ? scrollNode.scrollTop : 0;
    const active = document.activeElement as HTMLElement | null;
    const focused = same && active && el.contains(active) ? active.dataset.journalFocus : undefined;
    if (same) {
      for (const details of el.querySelectorAll<HTMLDetailsElement>("details[data-chapter]"))
        open.set(details.dataset.chapter!, details.open);
    }
    if (!same) {
      open.clear();
      status.textContent = "";
    }
    identity = snapshot.identity;
    fingerprint = next;
    const recommended = model.chapters
      .flatMap((chapter) => chapter.entries)
      .find(
        (item) =>
          item.id === model.recommended &&
          (item.state !== "complete" || journalActionAllowed(item)),
      );
    const children: Node[] = [h("h2", { class: "journal-heading" }, /* copy:label */ "Journal")];
    if (recommended) children.push(entry(recommended, true));
    for (const chapter of model.chapters) {
      const remaining = chapter.entries.filter((item) => item.id !== recommended?.id);
      if (!remaining.length) continue;
      const available = remaining.filter((item) => item.state !== "later");
      const later = remaining.filter((item) => item.state === "later");
      children.push(
        fold(chapter.id, chapter.title, [
          ...available.map((item) => entry(item)),
          ...(later.length
            ? [
                fold(
                  `${chapter.id}:later`,
                  /* copy:label */ "Later",
                  later.map((item) => entry(item)),
                ),
              ]
            : []),
        ]),
      );
    }
    const q = model.quest;
    if (q) {
      const quest = h(
        "article",
        { class: `journal-step quest-card${q.done ? " done" : ""}` },
        h("h3", {}, /* copy:label */ "Quest"),
        rewardPicture(q.reward),
        h(
          "div",
          { class: "quest-main" },
          h("b", { class: "quest-goal" }, q.goal),
          h("p", {}, q.body),
          questBar(q),
          h("small", { class: "num" }, `${Math.round((q.done ? 1 : q.progress) * 100)}%`),
        ),
        q.done ? h("small", {}, /* copy:label */ "Complete") : null,
      );
      if (!q.done && options.swapQuest) {
        quest.append(
          h(
            "button",
            {
              class: "btn",
              disabled: !q.swap || busy,
              "data-journal-focus": "quest:swap",
              onclick: () =>
                void run(
                  "quest:swap",
                  async (snapshot) =>
                    snapshot.journal.quest?.swap && !snapshot.journal.quest.done
                      ? options.swapQuest!()
                      : false,
                  snapshot.identity,
                ),
            },
            q.swap ? /* copy:button */ "Swap" : /* copy:callout */ "Swapped today",
          ),
        );
      }
      children.push(quest);
    }
    if (model.discoveries.length)
      children.push(
        fold(
          "discoveries",
          /* copy:label */ "Discoveries",
          model.discoveries.map((item) =>
            h(
              "article",
              { class: "journal-discovery", "data-discovery-id": item.id },
              h("strong", {}, item.title),
              h("p", {}, item.body),
            ),
          ),
        ),
      );
    if (terms.length)
      children.push(fold("glossary", /* copy:label */ "Glossary", glossaryEntries(terms)));
    replace(el, ...children, status);
    scrollNode.scrollTop = scroll;
    if (focusTerm && revealTerm(el, focusTerm)) focusTerm = undefined;
    if (focused)
      [...el.querySelectorAll<HTMLElement>("[data-journal-focus]")]
        .find((node) => node.dataset.journalFocus === focused)
        ?.focus({ preventScroll: true });
  }
  return {
    el,
    refresh,
    dispose(): void {
      disposed = true;
      ++revision;
    },
  };
}
