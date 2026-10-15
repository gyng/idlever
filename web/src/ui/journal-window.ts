import type { App } from "../app";
import type { JournalAction } from "../engine/types";
import { createJournal, glossaryEntries, journalActionAllowed, revealTerm } from "./journal";
import type { Term } from "./concepts";
import { h } from "./dom";
import { openWindow } from "./sheet";

/** A journal routes existing actions; Rust remains the authority on readiness. */
export function openJournal(
  app: App,
  route: (target: string) => boolean | Promise<boolean>,
  anchor?: HTMLElement | null,
  focusTerm?: Term,
): void {
  const owner = app.engine;
  let off = (): void => {};
  let panel: ReturnType<typeof createJournal> | null = null;
  const read = () => {
    const journal = app.lineage.journal;
    if (app.engine !== owner || !journal) throw Error(/* copy:none */ "missing journal snapshot");
    return {
      identity: JSON.stringify([journal.seed, journal.bloodline_id, journal.heir]),
      journal,
    };
  };
  openWindow(
    () => {
      if (!app.lineage.journal) {
        // the glossary is the viewer's own: it stands even without the core's journal
        const body = h(
          "div",
          { class: "sheet-body journal-panel" },
          h("h2", { class: "journal-heading" }, /* copy:label */ "Glossary"),
          ...glossaryEntries(),
        );
        if (focusTerm) requestAnimationFrame(() => revealTerm(body, focusTerm));
        return body;
      }
      panel = createJournal({
        read,
        focusTerm,
        action: async (action: JournalAction, entryId: string) => {
          if (app.engine !== owner) return false;
          const current = read()
            .journal.chapters.flatMap((chapter) => chapter.entries)
            .find((entry) => entry.id === entryId);
          if (
            !current ||
            !journalActionAllowed(current) ||
            !current.action ||
            current.action.kind !== action.kind ||
            current.action.target !== action.target
          )
            return false;
          if (action.kind === "build_town")
            return owner.buildTown ? app.mutate(() => owner.buildTown!(action.target)) : false;
          if (action.kind === "hire")
            return owner.hire ? app.mutate(() => owner.hire!(action.target)) : false;
          return route(action.kind === "delve" ? "delve" : action.target);
        },
        swapQuest: async () =>
          app.engine === owner && !!owner.swapQuest ? app.mutate(() => owner.swapQuest!()) : false,
      });
      off = app.onChange(() => {
        void panel?.refresh();
      });
      void panel.refresh();
      return panel.el;
    },
    {
      anchor,
      material: "journal",
      stay: true,
      onClose: () => {
        off();
        panel?.dispose();
      },
    },
  );
}

/** Cut234: a plate's head off the camp — the journal on that term's glossary entry; journal actions
 *  route nowhere here (the camp's own opener routes them). */
export function openGlossary(app: App, t: Term): void {
  openJournal(app, () => false, null, t);
}
