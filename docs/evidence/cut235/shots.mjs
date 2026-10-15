// Cut235 evidence: GPU screenshots (private display, never the desktop) of a feat goal at camp — the `next` pill, the
// tracker's worker line and the works card — at 400 and 1440. Undone: the real engine played from a fresh seed (house, sends
// by hand, the chest, the porter and the Scout hired, the Forge built) until the apprentice's feat is the goal. Met: the same
// camp with the apprentice node set to the core's met shape (`feat_done`, state `ready`), as web/tests/worker-first-act.mjs.
//   IDLEVER_PORT=5291 node docs/evidence/cut235/shots.mjs
import { execFileSync } from "node:child_process";
import { launchGpu } from "../../../tools/browser.mjs";
const root = new URL("../../../", import.meta.url);
const out = new URL("./", import.meta.url).pathname;
const url = execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const b = await launchGpu();
const shoot = async (p, tag, width) => {
  await p.screenshot({ path: `${out}feat-${tag}-${width}.png` });
  const pill = await p.$(".next-pill:not([hidden])");
  if (pill) await pill.screenshot({ path: `${out}feat-pill-${tag}-${width}.png` });
  // (the tracker folds at phone width: open it)
  const line = () => p.$('.task-tracker [data-worker="apprentice"]');
  const l0 = await line();
  if (!(l0 && (await l0.isVisible()))) {
    const t = await p.$(".task-tracker summary");
    if (t) await t.click().catch(() => {});
    await p.waitForTimeout(300);
  }
  const l = await line();
  if (l && (await l.isVisible())) {
    await l.screenshot({ path: `${out}feat-tracker-${tag}-${width}.png` });
    await p.screenshot({ path: `${out}feat-${tag}-tracker-open-${width}.png` });
  }
};
try {
  for (const width of [400, 1440]) {
    const p = await b.newPage({ viewport: { width, height: 900 } });
    await p.goto(`${url}?fresh=1&seed=3&runs=0`);
    await p.waitForFunction(() => window.__idlever?.booted);
    await p.waitForTimeout(500);
    const real = await p.evaluate(async () => {
      const a = window.__idlever;
      if (a.kind !== "wasm") throw Error(`real engine (${a.kind})`);
      const e = a.engine;
      e.buildTown("house");
      let L = await e.lineage();
      for (let k = 0; k < 4000; k++) {
        const W = L.tree;
        const ap = W.nodes.find((n) => n.id === "apprentice");
        if (ap.state === "open" && W.next?.kind === "feat") break;
        if (W.lit && W.next?.kind === "buy") e.hire(W.lit);
        else if (W.chest > 0 && W.next?.kind === "chest") e.openChest();
        else {
          try {
            e.buildTown("blacksmith");
          } catch {}
          if (W.waits) e.send();
          e.step(1000);
        }
        L = await e.lineage();
      }
      // (the app's lineage is the engine's, as after any tap)
      a.lineage = L;
      a.go({ kind: "camp" });
      await new Promise((r) => setTimeout(r, 800));
      const ap = L.tree.nodes.find((n) => n.id === "apprentice");
      return { next: L.tree.next, ap: { state: ap.state, goal: ap.goal, feat: ap.feat, done: ap.feat_done, eta: ap.eta_h }, pill: document.querySelector(".next-pill")?.textContent };
    });
    console.log(width, "real", JSON.stringify(real));
    await shoot(p, "undone", width);
    await p.evaluate(async () => {
      const a = window.__idlever;
      const L = await a.engine.lineage();
      a.engine.lineage = async () => a.lineage;
      const nodes = L.tree.nodes.map((x) => (x.id === "apprentice" ? { ...x, state: "ready", feat_done: true, eta_h: undefined } : x));
      a.lineage = { ...L, tree: { ...L.tree, nodes } };
      a.go({ kind: "camp" });
      await new Promise((r) => setTimeout(r, 600));
    });
    await shoot(p, "met", width);
    await p.evaluate(async () => {
      const { openWorks } = await import("/src/ui/works.ts");
      openWorks(window.__idlever, "apprentice", document.querySelector(".next-pill"));
    });
    await p.waitForTimeout(400);
    const card = await p.$('.works-sheet .wnode.cur[data-node="apprentice"]');
    if (card) await card.screenshot({ path: `${out}feat-works-card-met-${width}.png` });
    await p.screenshot({ path: `${out}feat-works-${width}.png` });
    await p.close();
  }
} finally {
  await b.close();
}
