import { openSettingsFromHeader } from "./lib/frame.mjs";
// Cut241 actual modal ownership plus explicit interaction fixtures for generic anchored/modeless behavior.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { launchBrowser } from "../../tools/browser.mjs";
const url = (process.env.IDLEVER_TEST_URL ?? "http://127.0.0.1:5382").replace(/\/+$/, "");
const out = process.env.IDLEVER_MENU_OUT ?? "target/client-tests/menu-materials";
mkdirSync(new URL(`../../${out}/`, import.meta.url), { recursive: true });
const raw = gunzipSync(
  readFileSync(new URL("../../docs/evidence/handoff-menus/input.game.json.gz", import.meta.url)),
).toString();
const b = await launchBrowser();
const results = [],
  errors = [];
let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks++;
};
try {
  for (const width of [320, 400, 1440]) {
    const p = await b.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${url}/?fresh=1&seed=1&runs=0`);
    await p.waitForFunction(() => window.__idlever?.booted);
    await p.evaluate(async (raw) => {
      const a = window.__idlever;
      a.runnerOn = false;
      a.lineage = await a.engine.load(raw);
      await a.refresh();
      a.go({ kind: "camp" });
    }, raw);
    const save = () => p.evaluate(() => window.__idlever.engine.save());
    const before = await save();
    const active = () => p.locator(".sheet-wrap:not(.under):not([hidden])").last();
    const settle = async () => {
      await p.waitForFunction(() => !document.querySelector(".sheet-ghost"));
      await p.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );
    };
    await openSettingsFromHeader(p);
    await settle();
    check(
      await active().evaluate((el) => el.contains(document.activeElement)),
      "actual Settings initially owns focus",
    );
    check(
      await p.evaluate(() => document.getElementById("app").inert),
      "full modal makes app inert",
    );
    await p.evaluate(() => {
      const panel = document.querySelector(".sheet-wrap:not(.under) .sheet");
      const xs = [
        ...panel.querySelectorAll("button,input,textarea,select,summary,[tabindex]"),
      ].filter((e) => e.tabIndex >= 0 && !e.matches(":disabled") && e.getClientRects().length);
      xs[0].focus();
    });
    await p.keyboard.press("Shift+Tab");
    check(
      await active().evaluate((el) => el.contains(document.activeElement)),
      "Shift-Tab wraps within actual Settings",
    );
    await p.keyboard.press("Tab");
    check(
      await active().evaluate((el) => el.contains(document.activeElement)),
      "Tab wraps within actual Settings",
    );
    await p.evaluate(() => document.querySelector(".gear").focus());
    check(
      await active().evaluate((el) => el.contains(document.activeElement)),
      "underlying inert controls cannot steal modal focus",
    );
    await p.keyboard.press("Escape");
    await settle();
    check(
      await p.locator(".gear").evaluate((el) => el === document.activeElement),
      "Escape restores actual Settings opener",
    );
    check(
      !(await p.evaluate(() => document.getElementById("app").inert)),
      "last modal releases app inertness",
    );
    await p.locator(".gear").focus();
    await p.keyboard.press("Enter");
    if (await p.locator(".home-menu-panel:visible").count()) {
      await p.locator(".home-menu-settings").focus();
      await p.keyboard.press("Enter");
    }
    await settle();
    check(
      await active().evaluate((el) => el.contains(document.activeElement)),
      "Enter opens the actual Settings action",
    );
    await p.keyboard.press("Space");
    await settle();
    check(
      await p.locator(".gear").evaluate((el) => el === document.activeElement),
      "Space activates Close and restores its opener",
    );

    await p.evaluate(async () => {
      (await import("/src/ui/hero-hub.ts")).openHeroHub(window.__idlever);
    });
    await settle();
    await p.locator('[data-hub-action="appearance"]').click();
    await settle();
    check((await p.locator(".sheet-wrap[hidden]").count()) === 1, "actual child hides its parent");
    check(
      (await active().locator(".sheet").getAttribute("data-material")) === "bloodlines",
      "appearance keeps hero folio material",
    );
    await p.keyboard.press("Escape");
    await settle();
    check(
      await p
        .locator('[data-hub-action="appearance"]')
        .evaluate((el) => el === document.activeElement),
      "nested Escape returns focus to Appearance opener",
    );
    await p.locator('[data-hub-action="appearance"]').click();
    await settle();
    await active().locator(".sheet-back").click();
    await settle();
    check(
      await p
        .locator('[data-hub-action="appearance"]')
        .evaluate((el) => el === document.activeElement),
      "actual Back returns to the parent opener",
    );
    await p.locator('[data-hub-action="appearance"]').click();
    await settle();
    await active().locator(".sheet-x,.close-stud").first().click();
    await settle();
    check((await p.locator(".sheet-wrap").count()) === 0, "child Close dismisses the chain");
    check(
      await p.locator(".gear").evaluate((el) => el === document.activeElement),
      "Close-chain restores the external opener",
    );

    await p.evaluate(async () => {
      (await import("/src/ui/journal-window.ts")).openGlossary(window.__idlever, "forge");
    });
    await settle();
    check(
      await p
        .locator('.journal-term[data-term="forge"]')
        .evaluate((el) => el === document.activeElement),
      "Journal's explicit glossary focus is preserved",
    );
    await p.evaluate(async () => {
      for (let i = 0; i < 100; i++) await window.__idlever.refresh();
    });
    await settle();
    check(
      await p
        .locator('.journal-term[data-term="forge"]')
        .evaluate((el) => el === document.activeElement),
      "100 actual refreshes retain the intended glossary term",
    );
    await p.keyboard.press("Escape");
    await settle();

    // The same public transition used by the actual menu journey must retain both inert owners.
    await openSettingsFromHeader(p);
    await p.locator(".main-menu-button").click();
    await settle();
    check(
      await p.evaluate(() => document.getElementById("app").inert),
      "Settings to main menu retains app inertness",
    );
    await p.getByRole("button", { name: "Settings", exact: true }).click();
    await p.getByRole("button", { name: "Save & data", exact: true }).click();
    await settle();
    check(
      await p.locator(".game-menu").evaluate((el) => el.inert),
      "menu Settings makes the menu inert",
    );
    await p.keyboard.press("Escape");
    await settle();
    check(
      !(await p.locator(".game-menu").evaluate((el) => el.inert)),
      "closing menu Settings releases only its menu owner",
    );
    check(
      await p.evaluate(() => document.getElementById("app").inert),
      "underlying game remains inert while menu open",
    );
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: "Continue", exact: true }).click();
    await settle();
    check(
      !(await p.evaluate(() => document.getElementById("app").inert)),
      "Continue releases main menu inertness",
    );

    // Labelled primitive fixture: disabled and removed actions use the next reachable action.
    await p.evaluate(async () => {
      const { openSheet } = await import("/src/ui/sheet.ts");
      openSheet(() => {
        const box = document.createElement("div");
        for (const name of ["first", "second", "third"]) {
          const button = document.createElement("button");
          button.id = `focus-successor-${name}`;
          button.textContent = name;
          box.append(button);
        }
        return box;
      });
      document.getElementById("focus-successor-first").focus();
      document.getElementById("focus-successor-first").disabled = true;
    });
    await settle();
    check(
      await p.locator("#focus-successor-second").evaluate((el) => el === document.activeElement),
      "disabled focused action moves to its actual successor",
    );
    await p.locator("#focus-successor-second").evaluate((el) => el.remove());
    await settle();
    check(
      await p.locator("#focus-successor-third").evaluate((el) => el === document.activeElement),
      "removed focused action moves to its actual successor",
    );
    await p.keyboard.press("Escape");
    await settle();

    // Design interaction fixture: no gameplay affordance or fabricated progression; exercises the shared primitive.
    await p.evaluate(async () => {
      const { openSheet } = await import("/src/ui/sheet.ts");
      const root = document.createElement("div");
      root.id = "sheet-focus-fixture";
      const one = document.createElement("button");
      one.className = "chip";
      one.textContent = "Fixture one";
      const two = document.createElement("button");
      two.className = "chip";
      two.textContent = "Fixture two";
      const anchor = document.createElement("div");
      anchor.className = "row";
      anchor.append(one, two);
      root.append(anchor);
      document.getElementById("app").append(root);
      root.style.cssText = "position:fixed;top:160px;left:20px;z-index:20";
      window.__sheetFixtureCalls = [];
      const open = (button) => {
        button.focus();
        openSheet(
          () => {
            const x = document.createElement("button");
            x.textContent = "Fixture action";
            return x;
          },
          { anchor },
        );
      };
      one.onclick = () => {
        window.__sheetFixtureCalls.push("one");
        open(one);
      };
      two.onclick = () => {
        window.__sheetFixtureCalls.push("two");
        open(two);
      };
      one.click();
    });
    await settle();
    check(
      !(await p.evaluate(() => document.getElementById("app").inert)),
      "anchored picker preserves underlying pointer route",
    );
    const two = p.locator("#sheet-focus-fixture button").nth(1);
    const r = await two.boundingBox();
    await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    await settle();
    check(
      await p.evaluate(() => window.__sheetFixtureCalls.join(",") === "one,two"),
      "anchored click-through changes to the other row chip",
    );
    await p.keyboard.press("Escape");
    await settle();
    await p.evaluate(async () => {
      const { openSheet } = await import("/src/ui/sheet.ts");
      openSheet(
        () => {
          const x = document.createElement("button");
          x.textContent = "Fixture modeless";
          return x;
        },
        { modeless: true },
      );
      document.querySelector("#sheet-focus-fixture button").focus();
    });
    check(
      await p
        .locator("#sheet-focus-fixture button")
        .first()
        .evaluate((el) => el === document.activeElement),
      "modeless tool allows underlying focus",
    );
    await p.keyboard.press("Escape");
    await settle();
    check(
      await p
        .locator("#sheet-focus-fixture button")
        .first()
        .evaluate((el) => el === document.activeElement),
      "modeless dismissal preserves chosen underlying focus",
    );
    await p.evaluate(async () => {
      const { openSheet, closeAllSheets } = await import("/src/ui/sheet.ts");
      // This case restores the root; the earlier anchored parent has its own valid focus trap.
      closeAllSheets();
      const [one, two] = document.querySelectorAll("#sheet-focus-fixture button");
      window.__sheetBeforeCloseFixture = [...document.querySelectorAll(".sheet-wrap")].map(
        (el) => ({ classes: el.className, hidden: el.hidden, text: el.textContent.slice(0, 100) }),
      );
      one.focus();
      openSheet(() => document.createElement("button"), {
        onClose: () => {
          two.focus();
          window.__sheetCloseFocus = {
            inert: document.getElementById("app").inert,
            focused: document.activeElement === two,
            active: document.activeElement?.outerHTML,
            targetConnected: two.isConnected,
            targetRects: two.getClientRects().length,
            before: window.__sheetBeforeCloseFixture,
            remaining: [...document.querySelectorAll(".sheet-wrap")].map((el) => ({
              classes: el.className,
              hidden: el.hidden,
              text: el.textContent.slice(0, 100),
            })),
          };
        },
      });
    });
    await settle();
    await p.keyboard.press("Escape");
    const restored = await p.evaluate(() => window.__sheetCloseFocus);
    check(
      !restored.inert && restored.focused,
      `onClose can synchronously focus a released control: ${JSON.stringify(restored)}`,
    );
    await settle();
    check(
      await p
        .locator("#sheet-focus-fixture button")
        .nth(1)
        .evaluate((el) => el === document.activeElement),
      "generic restoration preserves the callback's explicit choice",
    );
    await p.locator("#sheet-focus-fixture").evaluate((el) => el.remove());
    for (const [route, material] of [
      ["works", "forge"],
      ["settings", "forge"],
      ["packages", "bloodlines"],
      ["gold", "journal"],
      ["runs", "journal"],
      ["ledger", "journal"],
      ["oaths", "bloodlines"],
    ]) {
      await p.evaluate(async (route) => {
        const a = window.__idlever;
        (await import("/src/ui/sheet.ts")).closeAllSheets();
        if (route === "works") (await import("/src/ui/works.ts")).openWorks(a);
        if (route === "settings") (await import("/src/ui/settings.ts")).openSettings(a);
        if (route === "packages") (await import("/src/ui/packages.ts")).openPackages(a);
        if (route === "gold") (await import("/src/ui/gold.ts")).openGoldSheet(a);
        if (route === "runs") (await import("/src/ui/runs.ts")).openRuns(a);
        if (route === "ledger") (await import("/src/ui/party.ts")).openLedger(a);
        if (route === "oaths")
          (await import("/src/ui/oaths.ts")).openOathBoard(a, document.querySelector(".gear"));
      }, route);
      await settle();
      check(
        (await active().locator(".sheet").getAttribute("data-material")) === material,
        `${route}: actual semantic material`,
      );
      if (route === "works") {
        await active().locator("button.hire-btn").first().focus();
        const node = await p.evaluate(
          () => document.activeElement.closest("[data-node]").dataset.node,
        );
        await p.evaluate(async () => {
          for (let i = 0; i < 100; i++) await window.__idlever.refresh();
        });
        await settle();
        check(
          await p.evaluate(
            (node) => document.activeElement.closest("[data-node]")?.dataset.node === node,
            node,
          ),
          "100 worker refreshes retain the same logical hire action",
        );
      }
      await p.keyboard.press("Escape");
      await settle();
    }
    check(
      (await save()) === before,
      "actual and design-fixture inspections preserve exact save bytes",
    );
    results.push({ width, checks, exactSave: true });
    await p.close();
  }
  check(errors.length === 0, `no page errors: ${errors.join("; ")}`);
  writeFileSync(
    new URL(`../../${out}/results.json`, import.meta.url),
    JSON.stringify({ checks, results, errors }, null, 2),
  );
  console.log(`${checks} menu material/focus checks PASS`);
} catch (e) {
  writeFileSync(
    new URL(`../../${out}/failure.json`, import.meta.url),
    JSON.stringify({ error: String(e.stack), checks, results, errors }, null, 2),
  );
  throw e;
} finally {
  await b.close();
}
