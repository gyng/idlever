// DOM contract only: synthetic wire fixtures do not certify real Rust progression.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], {
    cwd: new URL("../../", import.meta.url),
    encoding: "utf8",
  }).trim();
const browser = await launchBrowser();
let checks = 0;
try {
  for (const width of [320, 400, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(url);
    const result = await page.evaluate(async () => {
      const { createJournal } = await import("/src/ui/journal.ts");
      const { openWindow } = await import("/src/ui/sheet.ts");
      const action = {
        kind: "open",
        target: "loadouts",
        label: "Loadouts",
        enabled: true,
        blocked: null,
      };
      const step = {
        id: "loadouts",
        title: "Choose Loadouts",
        reason: "Prepare unlocked items before the next delve.",
        effect: "Unlocked items remain free to reuse.",
        state: "ready",
        progress: { current: 1, required: 2, unit: "items" },
        requirements: [],
        action,
      };
      let snapshot = {
        identity: "fixture:one",
        journal: {
          recommended: "loadouts",
          chapters: [
            { id: "town", title: "Town", entries: [] },
            {
              id: "builds",
              title: "Builds",
              entries: [
                step,
                {
                  ...step,
                  id: "future",
                  title: "Later Build",
                  state: "later",
                  action: { ...action, enabled: false, blocked: "Reach the required depth" },
                },
              ],
            },
            { id: "delving", title: "Delving", entries: [] },
          ],
          discoveries: [
            {
              id: "cache",
              title: "Loot cache",
              body: "The hero collects loot automatically.",
            },
          ],
          quest: {
            goal: "reach D10",
            reward: "row",
            progress: 0.5,
            done: false,
            swap: true,
            body: "Completing this quest unlocks a policy row. The reward settles automatically.",
          },
        },
      };
      const calls = [];
      let completeHouse = false;
      let resources = 17;
      const journal = createJournal({
        read: () => snapshot,
        action: async (a, id) => {
          calls.push([a.target, id]);
          if (completeHouse && id === "house")
            snapshot = {
              ...snapshot,
              journal: {
                ...snapshot.journal,
                recommended: "delve",
                chapters: [
                  {
                    id: "town",
                    title: "Town",
                    entries: [
                      { ...step, id: "house", title: "House", state: "complete", action: null },
                      {
                        ...step,
                        id: "delve",
                        title: "Delve",
                        action: { ...action, kind: "delve", target: "delve", label: "Delve" },
                      },
                    ],
                  },
                ],
              },
            };
          return true;
        },
        swapQuest: async () => {
          snapshot = {
            ...snapshot,
            journal: {
              ...snapshot.journal,
              quest: { ...snapshot.journal.quest, goal: "slay the Lich", swap: false },
            },
          };
          return true;
        },
      });
      openWindow(() => journal.el, { material: "journal" });
      await journal.refresh();
      window.__journalFixture = {
        journal,
        setIdentity: (id) => {
          snapshot = { ...snapshot, identity: id };
        },
        calls,
      };
      const panel = journal.el;
      const initial = {
        recommended: panel.querySelectorAll('[data-recommended="true"]').length,
        laterFolded: !panel.querySelector('details[data-chapter="builds:later"]').open,
        discoveriesFolded: !panel.querySelector('details[data-chapter="discoveries"]').open,
        claims: [...panel.querySelectorAll("button")].some((b) => /claim/i.test(b.textContent)),
      };
      const chapter = panel.querySelector('details[data-chapter="builds"]');
      chapter.open = true;
      const summary = chapter.querySelector("summary");
      summary.focus();
      const root = panel.closest(".game-window");
      root.scrollTop = 35;
      await journal.refresh(true);
      initial.focusRetained = document.activeElement?.dataset.journalFocus === "chapter:builds";
      initial.chapterRetained = panel.querySelector('details[data-chapter="builds"]').open;
      const old = panel.querySelector('[data-journal-focus="action:loadouts"]');
      snapshot = { ...snapshot, identity: "fixture:two" };
      await journal.refresh();
      old.click();
      await new Promise((r) => setTimeout(r, 30));
      initial.staleCalls = calls.length;
      panel.querySelector('[data-journal-focus="quest:swap"]').click();
      await new Promise((r) => setTimeout(r, 50));
      initial.actualSwapGoal = panel.querySelector(".quest-goal").textContent;
      initial.swapDisabled = panel.querySelector('[data-journal-focus="quest:swap"]').disabled;
      const resourceBefore = resources;
      completeHouse = true;
      snapshot = {
        ...snapshot,
        journal: {
          ...snapshot.journal,
          recommended: "house",
          chapters: [
            { id: "town", title: "Town", entries: [{ ...step, id: "house", title: "House" }] },
          ],
        },
      };
      await journal.refresh();
      const houseButton = panel.querySelector('[data-journal-focus="action:house"]');
      houseButton.focus();
      houseButton.click();
      await new Promise((r) => setTimeout(r, 50));
      initial.completionFocus = document.activeElement?.dataset.journalFocus;
      initial.houseControlGone = !panel.querySelector('[data-journal-focus="action:house"]');
      await journal.refresh(true);
      initial.readResourcesUnchanged = resources === resourceBefore;
      return initial;
    });
    assert.equal(result.recommended, 1);
    assert.equal(result.laterFolded, true);
    assert.equal(result.discoveriesFolded, true);
    assert.equal(result.claims, false);
    assert.equal(result.focusRetained, true);
    assert.equal(result.chapterRetained, true);
    assert.equal(result.staleCalls, 0);
    assert.equal(result.actualSwapGoal, "slay the Lich");
    assert.equal(result.swapDisabled, true);
    assert.equal(result.completionFocus, "action:delve");
    assert.equal(result.houseControlGone, true);
    assert.equal(result.readResourcesUnchanged, true);
    checks += 12;
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        document
          .querySelector(".game-window")
          .getAnimations({ subtree: true })
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    for (const scale of [1, 2]) {
      const bounds = await page.evaluate((scale) => {
        document.documentElement.style.fontSize = `${17 * scale}px`;
        for (const d of document.querySelectorAll(".journal-panel details")) d.open = true;
        const panel = document.querySelector(".journal-panel");
        const controls = [...panel.querySelectorAll("button,summary")]
          .filter((el) => el.getClientRects().length)
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { label: el.textContent, width: r.width, height: r.height };
          });
        return { overflow: panel.scrollWidth - panel.clientWidth, controls };
      }, scale);
      assert.ok(bounds.overflow <= 1, `${width}/${scale} Journal overflow`);
      assert.ok(
        bounds.controls.every((r) => r.width >= 44 && r.height >= 44),
        `${width}/${scale} targets ${JSON.stringify(bounds.controls)}`,
      );
      checks += 2;
    }
    await page.close();
  }
  console.log(
    `journal: ${checks} synthetic DOM-contract checks passed; real progression acceptance remains separate`,
  );
} finally {
  await browser.close();
}
