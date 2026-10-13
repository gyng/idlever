import type { App } from "../app";
import type { JournalAction } from "../engine/types";
import { createJournal, journalActionAllowed } from "./journal";
import { h } from "./dom";
import { openWindow } from "./sheet";

/** A journal routes existing actions; Rust remains the authority on readiness. */
export function openJournal(
  app: App,
  route: (target: string) => boolean | Promise<boolean>,
  anchor?: HTMLElement | null,
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
      if (!app.lineage.journal)
        return h("div", { class: "sheet-body" }, /* copy:callout */ "Journal unavailable");
      panel = createJournal({
        read,
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
