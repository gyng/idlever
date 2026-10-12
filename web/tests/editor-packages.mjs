import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const source = readFileSync(
  new URL("./fixtures/earned-first-ascension-clear.json", import.meta.url),
  "utf8",
);
const dir = process.env.EDITOR_EVIDENCE,
  baseline = process.env.EDITOR_BASELINE === "1",
  results = [],
  errors = [];
if (dir) mkdirSync(dir, { recursive: true });
const browser = await launchBrowser(),
  check = (ok, message) => {
    if (!ok) throw Error(message);
  };
const geometry = (page) =>
  page.evaluate(() => {
    const editor = document.querySelector(".camp .editor"),
      rows = [...editor.querySelector(".rows").children],
      end = window.__riddle.penEnd();
    const shown = (r) => r.getBoundingClientRect().height > 0;
    return {
      end,
      total: rows.length,
      authored: rows.slice(0, end).filter(shown).length,
      packages: rows.slice(end).filter(shown).length,
      height: editor.querySelector(".rows").getBoundingClientRect().height,
      indices: rows.map((r) => r.dataset.i),
      overflow: document.documentElement.scrollWidth > innerWidth,
      rules: JSON.stringify(window.__riddle.rules),
      disclosure: editor.querySelector(".package-rows-toggle")?.textContent,
    };
  });
try {
  for (const width of [400, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?dev=1&fresh=1&runs=0&seed=144`);
    await page.waitForFunction(() => window.__riddle?.booted, null, { timeout: 90000 });
    const imported = await page.evaluate(async (source) => {
      const a = window.__riddle;
      if (a.kind !== "wasm") return false;
      const ok = await a.importSave(
        JSON.stringify({
          v: 2,
          engine: source,
          loadout: JSON.parse(source).loadout,
          last_seen: Date.now(),
          runs: 0,
        }),
      );
      a.editing = true;
      a.go({ kind: "camp", afterClear: true });
      return ok;
    }, source);
    check(imported, "real WASM imported earned-clear diagnostic");
    await page.locator(".camp .editor .rows-foot button").click();
    await page.waitForFunction(
      () => window.__riddle.penEnd() === 1 && document.querySelector(".camp .editor .row.fresh"),
    );
    const collapsed = await geometry(page);
    results.push({ width, collapsed });
    if (dir) {
      writeFileSync(`${dir}/geometry.json`, JSON.stringify(results, null, 2));
      await page.screenshot({ path: `${dir}/${width}-authored.png` });
    }
    if (baseline) {
      await page.close();
      continue;
    }
    check(
      collapsed.authored === 1 && collapsed.packages === 0 && !collapsed.overflow,
      `${width}: only authored rule visible`,
    );
    const toggle = page.locator(".camp .editor .package-rows-toggle");
    const addRect = await page.locator(".camp .editor .rows-foot button").boundingBox(),
      toggleRect = await toggle.boundingBox();
    check(
      [addRect, toggleRect].every((r) => r.width >= 44 && r.height >= 44),
      `${width}: add/disclosure touch targets`,
    );
    check(
      (await toggle.getAttribute("aria-expanded")) === "false",
      `${width}: disclosure collapsed`,
    );
    check(
      collapsed.disclosure.includes(String(collapsed.total - collapsed.end)),
      `${width}: exact package count`,
    );
    await toggle.click();
    const expanded = await geometry(page);
    results.at(-1).expanded = expanded;
    check(
      expanded.packages === expanded.total - expanded.end &&
        expanded.rules === collapsed.rules &&
        JSON.stringify(expanded.indices) === JSON.stringify(collapsed.indices),
      `${width}: disclosure preserves all rule indices/order`,
    );
    check(collapsed.height <= expanded.height * 0.5, `${width}: authored list at least50% shorter`);
    if (dir) {
      writeFileSync(`${dir}/geometry.json`, JSON.stringify(results, null, 2));
      await page.screenshot({ path: `${dir}/${width}-packages.png` });
    }
    check(
      await page.locator('.camp .editor .rows > .row[data-i="1"] .step.up').isDisabled(),
      `${width}: tactic card remains non-promotable`,
    );
    await page.locator(".camp .editor .rows > .row .step.up:enabled").first().click();
    await page.waitForFunction(() => window.__riddle.penEnd() === 2);
    check(
      await page.evaluate(
        async () =>
          JSON.stringify(
            (await window.__riddle.engine.lineage()).sets[window.__riddle.lineage.active_set].rows,
          ) === JSON.stringify(window.__riddle.rules.rows),
      ),
      `${width}: promotion survives core adoption`,
    );
    await toggle.click();
    check(
      (await geometry(page)).authored === 2 && (await geometry(page)).packages === 0,
      `${width}: collapse preserves promoted rule`,
    );
    await page.locator(".camp .editor .rows-foot button").click();
    await page.waitForFunction(() => window.__riddle.penEnd() === 3);
    check(
      await page.evaluate(() => document.activeElement?.matches(".row.fresh .chip.verb")),
      `${width}: add focuses visible fresh rule`,
    );
    // Exercise disclosure persistence, package highlights and non-package/empty editors with real compiled wire data.
    const detail = await page.evaluate(async () => {
      const { renderEditor, heroBinding } = await import("/src/ui/editor.ts"),
        a = window.__riddle,
        bind = heroBinding(a),
        checks = [];
      const verify = (ok, msg) => {
        if (!ok) throw Error(msg);
        checks.push(msg);
      };
      const full = renderEditor(bind, a.penEnd());
      document.body.append(full.el);
      verify(
        full.el.querySelector(".package-rows-toggle").getAttribute("aria-expanded") === "true",
        "highlight reveals package",
      );
      full.el.querySelector(".package-rows-toggle").click();
      full.refresh();
      verify(
        full.el.querySelector(".package-rows-toggle").getAttribute("aria-expanded") === "false",
        "closed state survives refresh",
      );
      full.reveal(a.penEnd());
      verify(
        !full.el.querySelector(`[data-i="${a.penEnd()}"]`).hidden,
        "explicit reveal opens target",
      );
      full.el.remove();
      let compact = true,
        tablets;
      tablets = renderEditor(bind, undefined, {
        compact: () => compact,
        onTablet: (i) => {
          compact = false;
          tablets.reveal(i);
        },
      });
      document.body.append(tablets.el);
      tablets.el.querySelector(`[data-i="${a.penEnd()}"]`).click();
      document.querySelector(".sheet .why-edit")?.click();
      verify(
        !tablets.el.classList.contains("compact") &&
          !tablets.el.querySelector(`[data-i="${a.penEnd()}"]`).hidden,
        "compact package tablet opens full target",
      );
      tablets.el.remove();
      const rows = a.rules.rows.slice(a.penEnd()),
        flat = { rules: () => ({ rows }), vocab: () => a.vocab, changed() {} };
      for (const binding of [
        flat,
        { ...flat, penEnd: () => 0 },
        { ...flat, penEnd: () => rows.length },
      ]) {
        const e = renderEditor(binding);
        document.body.append(e.el);
        verify(
          [...e.el.querySelector(".rows").children].every((r) => !r.hidden),
          "legacy/companion/empty rows visible",
        );
        e.el.remove();
      }
      return checks;
    });
    results.at(-1).detail = detail;
    // Real pointer drag over a clone of the current wire rows: hidden package rectangles must not count as destinations.
    const dragBefore = await page.evaluate(async () => {
      const { renderEditor, heroBinding } = await import("/src/ui/editor.ts"),
        a = window.__riddle,
        set = structuredClone(a.rules);
      window.__editorDrag = { set, changes: 0, original: JSON.stringify(a.rules) };
      const e = renderEditor({
        ...heroBinding(a),
        rules: () => set,
        penEnd: () => 3,
        canReorder: () => true,
        changed: () => window.__editorDrag.changes++,
      });
      e.el.classList.add("editor-drag-probe");
      Object.assign(e.el.style, {
        position: "fixed",
        left: "20px",
        top: "20px",
        width: `${Math.min(innerWidth - 40, 500)}px`,
        height: "700px",
        overflow: "auto",
        zIndex: "10000",
        background: "#13121b",
      });
      document.body.append(e.el);
      return JSON.stringify(set.rows[0]);
    });
    const grip = await page.locator('.editor-drag-probe .row[data-i="0"] .grip').boundingBox();
    const target = await page.locator('.editor-drag-probe .row[data-i="1"]').boundingBox();
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + 20, target.y + target.height / 2 + 4, { steps: 8 });
    await page.mouse.up();
    const drag = await page.evaluate(() => ({
      changes: window.__editorDrag.changes,
      row: JSON.stringify(window.__editorDrag.set.rows[1]),
      truthUnchanged: JSON.stringify(window.__riddle.rules) === window.__editorDrag.original,
    }));
    check(
      drag.changes === 1 && drag.row === dragBefore && drag.truthUnchanged,
      `${width}: pointer drag ignores hidden package rectangles`,
    );
    results.at(-1).drag = drag;
    await page.evaluate(() => {
      document.querySelector(".editor-drag-probe").remove();
      delete window.__editorDrag;
    });
    if (dir) writeFileSync(`${dir}/geometry.json`, JSON.stringify(results, null, 2));
    await page.close();
    console.log(width, "authored/package disclosure/add/promotion/highlight/binding checks PASS");
  }
  check(!errors.length, errors.join("\n"));
} finally {
  await browser.close();
}
