// A price belongs to the Rust mirror that measured it, and only its active snapshot.
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const browser = await launchBrowser();
try {
  const p = await browser.newPage();
  await p.goto(`${url}?engine=fake&fresh=1&runs=0`);
  await p.waitForFunction(() => window.__idlever?.booted);
  const count = await p.evaluate(async () => {
    const { twoLanes } = await import("/src/engine/lanes.ts");
    let n = 0;
    const check = (x, s) => {
      if (!x) throw Error(s);
      n++;
    };
    const wait = () => new Promise((r) => setTimeout(r, 0));
    let state = "A",
      id = "cadence",
      variant = 0,
      hold = null,
      fail = false,
      calls = 0;
    const price = { depth: 33, past_from: 0, past_to: 0, death_from: 0.9, death_to: 0.5, sims: 8 };
    const fg = {
      save: async () => state,
      load: async (s) => {
        state = s;
      },
      setRules: async (s) => {
        state = s;
      },
      death: async (run) => ({
        run_id: run,
        pick: { kind: "tactic", id, variant, pending: true },
        patches: [],
      }),
      deathDeltas: async () => [],
    };
    const bg = async () => {
      let snapshot,
        measured = false;
      return {
        load: async (s) => {
          snapshot = s;
          measured = false;
        },
        setRules: async (s) => {
          snapshot = s;
          measured = false;
        },
        death: async (run) => ({
          run_id: run,
          pick: {
            kind: "tactic",
            id: "cadence",
            variant: 0,
            ...(measured
              ? { price: { ...price, death_to: snapshot === "A" ? 0.5 : 0.4 } }
              : { pending: true }),
          },
          patches: [],
        }),
        deathDeltas: async () => {
          calls++;
          if (hold) await hold;
          if (fail) throw Error("controlled pricing failure");
          measured = true;
          return [];
        },
      };
    };
    const a = twoLanes(fg, bg, { mirror: true });
    await a.deathDeltas(237);
    let d = await a.death(237);
    check(
      !d.pick.pending && d.pick.price.death_to === 0.5,
      "foreground reads exact measured Rust pick",
    );
    d.pick.price.death_to = 999;
    check(
      (await a.death(237)).pick.price.death_to === 0.5,
      "repeated reads retain independent price",
    );
    check(calls === 1, "repeat reads do not repeat pricing");
    check((await a.death(238)).pick.pending, "unmeasured run has no price");
    id = "gas_step";
    check((await a.death(237)).pick.pending, "changed pick rejects price");
    id = "cadence";
    variant = 1;
    check((await a.death(237)).pick.pending, "changed variant rejects price");
    variant = 0;
    await a.setRules("B");
    check((await a.death(237)).pick.pending, "rule edit invalidates price");
    let release;
    hold = new Promise((r) => {
      release = r;
    });
    const slow = a.deathDeltas(237);
    await wait();
    await a.load("C");
    release();
    await slow;
    hold = null;
    check((await a.death(237)).pick.pending, "mutation during query rejects stale mirror price");
    await a.deathDeltas(237);
    check((await a.death(237)).pick.price.death_to === 0.4, "new snapshot receives its own price");
    fail = true;
    await a.deathDeltas(237).catch(() => {});
    check((await a.death(237)).pick.pending, "failed repeat discards prior price");
    fail = false;
    await a.deathDeltas(237);
    check(!(await a.death(237)).pick.pending, "rejected query can retry");
    for (let run = 1; run <= 5; run++) await a.deathDeltas(run);
    check((await a.death(1)).pick.pending, "retention bounded to four records");
    check(!(await a.death(5)).pick.pending, "newest record retained");
    return n;
  });
  console.log(`death-price-lanes: ${count} snapshot/cache checks PASS`);
} finally {
  await browser.close();
}
