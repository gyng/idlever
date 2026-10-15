import { stateWidths } from "./lib/viewport-cases.mjs";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
    cwd: new URL("../../", import.meta.url),
    encoding: "utf8",
  }).trim(),
  b = await launchBrowser();
try {
  for (const width of stateWidths([320, 400, 1440])) {
    const p = await b.newPage({ viewport: { width, height: 900 } });
    await p.goto(`${url}?engine=fake&fresh=1&runs=0`);
    await p.waitForFunction(() => window.__idlever?.booted);
    const n = await p.evaluate(async () => {
      const a = window.__idlever;
      let n = 0;
      const check = (ok, message) => {
        if (!ok) throw Error(message);
        n++;
      };
      const r = {
        elapsed_s: 28800,
        runs: 17,
        sampled: false,
        learned: [],
        bests: [],
        found: [],
        deaths: [],
        pending: [],
        marks_earned: 0,
        tamed: [],
        hatched: [],
        lost: [],
        reel: [],
        deepest: 7,
        gold: { home: 986 },
      };
      const first = { id: "porter", n: 974, what: "hauled $974", first: true },
        routine = { id: "armourer", n: 2, what: "wore 2", first: false };
      const go = (workers) =>
        a.go({ kind: "report", report: { ...r, workers, chest: 40 }, absence: true });
      go([routine, first]);
      const visible = document.querySelector(".report-first-workers");
      check(
        visible?.textContent.includes("porter") && visible.textContent.includes("hauled $974"),
        "actual first act visible with exact name/action",
      );
      check(
        !visible.closest("[hidden]") && document.querySelector(".report-details").hidden,
        "first act visible with collapsed Details",
      );
      check(!visible.textContent.includes("armourer"), "routine worker absent from announcement");
      check(
        document.querySelectorAll(".report-sheet [data-worker=porter]").length === 1,
        "first worker never duplicated in Details",
      );
      check(
        document
          .querySelector(".report-details [data-worker=armourer]")
          ?.textContent.includes("wore 2"),
        "routine worker retained in Details",
      );
      check(
        document.querySelector(".report-details [data-worker=chest]")?.textContent.includes("$40"),
        "chest retained in Details",
      );
      check(
        document.querySelectorAll(".report-basics .tile").length === 3,
        "simple result trio retained",
      );
      go([{ ...first, first: false }]);
      check(!document.querySelector(".report-first-workers"), "later act not reannounced");
      go(undefined);
      check(
        !document.querySelector(".report-first-workers"),
        "old wire has no fabricated announcement",
      );
      go([]);
      check(
        !document.querySelector(".report-first-workers"),
        "empty worker record has no announcement",
      );
      go([{ id: "porter", first: true, n: 0, what: "" }]);
      check(
        !document.querySelector(".report-first-workers"),
        "empty first flag has no announcement",
      );
      const { mergeWorkers } = await import("/src/ui/works.ts");
      go(mergeWorkers([first], [{ ...first, n: 26, what: "hauled $26", first: false }]));
      check(
        document.querySelector(".report-first-workers").textContent.includes("hauled $1000"),
        "merged first record uses total action",
      );
      const acts = [
        first,
        ...["apprentice", "clerk", "drillmaster", "kennel_hand"].map((id, i) => ({
          id,
          n: i + 1,
          what: ["+1 step", "banked $2", "+3 levels", "fielded 4"][i],
          first: true,
        })),
      ];
      go(acts);
      check(
        document.querySelectorAll(".report-first-workers .work-act").length === 5,
        "every first worker announced beyond ordinary four-line budget",
      );
      check(
        !document.querySelector(".report-first-workers .dim") &&
          !document.querySelector(".report-details .work-act:not(.chest)"),
        "no first worker truncated or duplicated",
      );
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 300));
      const section = document.querySelector(".report-first-workers").getBoundingClientRect();
      for (const el of document.querySelectorAll(".report-first-workers .work-act")) {
        const rect = el.getBoundingClientRect();
        check(
          rect.left >= section.left - 1 && rect.right <= section.right + 1,
          "worker chip fits parchment",
        );
      }
      check(document.documentElement.scrollWidth <= innerWidth, "no horizontal overflow");
      return n;
    });
    console.log(width, n, "worker first-act checks PASS");
    await p.close();
  }
  // Cut231 §5: live progress toward the next worker on its trigger — the pill, the tracker and the works card draw the wire's own count
  // (`count`/`need`, the core's `progress`) and its time fallback (`eta_h`), on the real engine; a send moves the count.
  for (const width of stateWidths([320, 400, 1440])) {
    const p = await b.newPage({ viewport: { width, height: 900 } });
    await p.goto(`${url}?fresh=1&seed=3&runs=0`);
    await p.waitForFunction(() => window.__idlever?.booted);
    await p.waitForTimeout(300);
    const n = await p.evaluate(async () => {
      const a = window.__idlever;
      let n = 0;
      const check = (ok, message) => {
        if (!ok) throw Error(message);
        n++;
      };
      check(a.kind === "wasm", `real engine (${a.kind})`);
      const W0 = a.lineage.tree,
        node0 = (id) => W0.nodes.find((x) => x.id === id);
      const scout0 = node0("scout"),
        porter0 = node0("porter");
      check(
        W0.next?.kind === "send" &&
          scout0.state === "open" &&
          scout0.progress === `0/${scout0.need}`,
        `fresh wire: a send goal, the scout counting (${JSON.stringify(W0.next)} ${scout0.progress})`,
      );
      const pillEl = document.querySelector(".next-pill");
      check(
        pillEl.querySelector(".pill-prog[data-worker=scout]")?.textContent ===
          ` · scout ${scout0.progress}` && !!pillEl.querySelector(".pill-bar"),
        `send pill carries the scout's wire count: ${pillEl.textContent}`,
      );
      const { choreWord } = await import("/src/ui/works.ts");
      const town = document.querySelector('.task-tracker [data-worker="porter"]');
      check(
        W0.next_worker === "porter" &&
          town?.querySelector(".task-obj")?.textContent ===
            `${porter0.progress} ${choreWord(porter0.chore)}` &&
          town.closest('[data-task-group="town"]') &&
          !!town.querySelector(".task-bar .fill"),
        `tracker's Town line is the next worker's wire count: ${town?.textContent}`,
      );
      // a real send: the scout's count moves on the wire and in the pill
      a.engine.buildTown("house");
      a.engine.send();
      // (the run plays out; home again, the hero waits for the next send)
      let L1 = await a.engine.lineage();
      for (let k = 0; k < 200 && L1.tree.next?.kind !== "send"; k++) {
        a.engine.step(1000);
        L1 = await a.engine.lineage();
      }
      check(L1.tree.next?.kind === "send", `home again: ${JSON.stringify(L1.tree.next)}`);
      const scout1 = L1.tree.nodes.find((x) => x.id === "scout");
      check(scout1.count === (scout0.count ?? 0) + 1, `a send counts (${scout1.progress})`);
      const { nextPill, workerProgress, progressText, etaText } = await import("/src/ui/works.ts");
      const stub = { lineage: L1 },
        pill = nextPill(stub, () => {});
      document.body.append(pill.el);
      check(
        pill.el.querySelector(".pill-prog")?.textContent === ` · scout ${scout1.progress}` &&
          pill.el.querySelector(".pill-bar .fill")?.style.width ===
            `${Math.round((scout1.count / scout1.need) * 100)}%`,
        `pill moves after a send: ${pill.el.textContent} ${pill.el.querySelector(".pill-bar .fill")?.style.width}`,
      );
      pill.el.remove();
      check(
        etaText(30) === "or 30h" &&
          etaText(60) === "or 3d" &&
          etaText(0) === "" &&
          etaText() === "",
        "time fallback words",
      );
      // Cut235: on the real wire a later worker's goal is a feat — its name, met or not, no count
      const app0 = L1.tree.nodes.find((x) => x.id === "apprentice");
      check(
        app0.goal === "feat" &&
          app0.feat === "forged new best" &&
          app0.feat_done === false &&
          app0.count === undefined &&
          app0.need === undefined &&
          app0.fallback_h > 0,
        `real wire: the apprentice's feat (${JSON.stringify(app0)})`,
      );
      // a worker counting with a time fallback (the wire's shape: count/need/progress/eta_h on `next_worker`; a profile whose
      // goal is `count`)
      const L = await a.engine.lineage();
      a.engine.lineage = async () => a.lineage;
      const fixture = (count, eta) => {
        const nodes = L.tree.nodes.map((x) =>
          ["porter", "scout"].includes(x.id)
            ? { ...x, state: "done", progress: undefined }
            : x.id === "apprentice"
              ? {
                  ...x,
                  goal: undefined,
                  feat: undefined,
                  feat_done: undefined,
                  state: count >= 3 ? "lit" : "open",
                  count,
                  need: 3,
                  chore: "forge",
                  progress: `${count}/3`,
                  fallback_h: 30,
                  ...(eta ? { eta_h: eta } : { eta_h: undefined }),
                  trigger: undefined,
                }
              : x,
        );
        a.lineage = {
          ...L,
          live: undefined,
          town: { ...L.town, home: true },
          tree: {
            ...L.tree,
            nodes,
            next_worker: "apprentice",
            lit: count >= 3 ? "apprentice" : undefined,
            lit_rank: undefined,
            waits: false,
            next:
              count >= 3
                ? { kind: "buy", node: "apprentice", text: "apprentice · $30" }
                : {
                    kind: "count",
                    node: "apprentice",
                    text: `apprentice · ${count}/3`,
                    have: count,
                    need: 3,
                  },
          },
        };
        a.go({ kind: "camp" });
        return nodes.find((x) => x.id === "apprentice");
      };
      const ap = fixture(2, 20);
      await new Promise((r) => setTimeout(r, 400));
      const prog = workerProgress(ap);
      check(progressText(prog) === "2/3 steps" && prog.eta === "or 20h", "progress from the wire");
      const pl = document.querySelector(".next-pill");
      check(
        pl.querySelector(".pill-t").textContent === "apprentice · 2/3 steps · or 20h" &&
          pl.querySelector(".pill-bar .fill").style.width === "67%",
        `count pill: chore word, bar and quiet fallback: ${pl.textContent}`,
      );
      const tw = document.querySelector('.task-tracker [data-worker="apprentice"]');
      check(
        tw?.querySelector(".task-obj")?.textContent === "2/3 steps · or 20h" &&
          tw.querySelector(".task-bar .fill").style.width === "67%",
        `tracker line: ${tw?.textContent}`,
      );
      const { openWorks } = await import("/src/ui/works.ts");
      openWorks(a, "apprentice", pl);
      await new Promise((r) => setTimeout(r, 200));
      const card = document.querySelector('.works-sheet .wnode.cur[data-node="apprentice"]');
      check(
        card?.querySelector(".wn-state")?.textContent === "2/3 steps · or 20h",
        `works card: ${card?.querySelector(".wn-state")?.textContent}`,
      );
      const { closeAllSheets } = await import("/src/ui/sheet.ts");
      closeAllSheets();
      fixture(3);
      await new Promise((r) => setTimeout(r, 300));
      check(
        !document.querySelector('.task-tracker [data-worker="apprentice"]') &&
          !document.querySelector(".next-pill .pill-eta"),
        "lit worker: no count line, its price on the pill",
      );
      // Cut235: a feat goal (the core's shape: goal/feat/feat_done, no count/need/progress) — the pill, the tracker and the
      // works card name the feat with its quiet fallback and no bar; met, it wears a check; its hire flips it to the price
      const feat = (state, done, eta) => {
        const nodes = L.tree.nodes.map((x) =>
          ["porter", "scout"].includes(x.id)
            ? { ...x, state: "done", progress: undefined }
            : x.id === "apprentice"
              ? {
                  ...x,
                  state,
                  count: undefined,
                  need: undefined,
                  progress: undefined,
                  chore: "forge",
                  goal: "feat",
                  feat: "forged new best",
                  feat_done: done,
                  fallback_h: 30,
                  ...(eta ? { eta_h: eta } : { eta_h: undefined }),
                  trigger: undefined,
                }
              : x,
        );
        a.lineage = {
          ...L,
          live: undefined,
          town: { ...L.town, home: true },
          tree: {
            ...L.tree,
            nodes,
            next_worker: "apprentice",
            lit: state === "lit" ? "apprentice" : undefined,
            lit_rank: undefined,
            waits: false,
            next:
              state === "lit"
                ? { kind: "buy", node: "apprentice", text: "apprentice · $30" }
                : { kind: "feat", node: "apprentice", text: "apprentice · forged new best" },
          },
        };
        a.go({ kind: "camp" });
      };
      feat("open", false, 20);
      await new Promise((r) => setTimeout(r, 400));
      const fp = document.querySelector(".next-pill");
      check(
        fp.querySelector(".pill-t").textContent === "apprentice · forged new best · or 20h" &&
          !fp.querySelector(".pill-bar") &&
          fp.dataset.kind === "feat" &&
          fp.dataset.featDone === "false",
        `feat pill: the feat, quiet fallback, no bar: ${fp.textContent}`,
      );
      const ft = document.querySelector('.task-tracker [data-worker="apprentice"]');
      check(
        ft?.querySelector(".task-obj")?.textContent === "forged new best · or 20h" &&
          !ft.querySelector(".task-bar") &&
          ft.dataset.featDone === "false",
        `feat tracker line: ${ft?.textContent}`,
      );
      openWorks(a, "apprentice", fp);
      await new Promise((r) => setTimeout(r, 200));
      const fc = document.querySelector('.works-sheet .wnode.cur[data-node="apprentice"]');
      check(
        fc?.querySelector(".wn-state")?.textContent === "forged new best · or 20h" &&
          !fc.querySelector(".wn-bar") &&
          fc.dataset.featDone === "false",
        `feat works card: ${fc?.querySelector(".wn-state")?.textContent}`,
      );
      closeAllSheets();
      // met (ready, offered at the next quiet report): a check, no fallback
      feat("ready", true);
      await new Promise((r) => setTimeout(r, 300));
      const fp2 = document.querySelector(".next-pill");
      const ft2 = document.querySelector('.task-tracker [data-worker="apprentice"]');
      check(
        fp2.querySelector(".pill-t").textContent === "apprentice · ✓ forged new best" &&
          fp2.dataset.featDone === "true" &&
          ft2?.querySelector(".task-obj")?.textContent === "✓ forged new best",
        `feat met: ${fp2.textContent} · ${ft2?.textContent}`,
      );
      // offered: the hire with its price, no feat line
      feat("lit", true);
      await new Promise((r) => setTimeout(r, 300));
      check(
        !document.querySelector('.task-tracker [data-worker="apprentice"]') &&
          document.querySelector(".next-pill").dataset.kind === "buy",
        "feat met and offered: the hire, its price on the pill",
      );
      check(document.documentElement.scrollWidth <= innerWidth, "no horizontal overflow");
      return n;
    });
    console.log(width, n, "next-worker progress checks PASS");
    await p.close();
  }
} finally {
  await b.close();
}
