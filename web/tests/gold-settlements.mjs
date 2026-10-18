import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { isDeepStrictEqual } from "node:util";
import { launchBrowser } from "../../tools/browser.mjs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(
  read(
    // Current package: Vat-only Cut264 shipping 2026-10-18 (fbf5): Gold/ledger/ExitLine and after-saves unchanged 4/4 against combined2359; real-WASM settlement checks 564/564. Earlier: Combined Cut264/Cut265 shipping 2026-10-18 (2359): Gold/ledger/ExitLine and after-saves unchanged 4/4 against 8adf; real-WASM settlement checks 564/564. Earlier: Merge 2026-10-18 (e85d: Cut273 workplaces): native Gold/ledger/ExitLine, expected and after-saves unchanged 4/4 against 558d. Earlier: Merge 2026-10-18 (558d: Cut270 live decisions, boss chest, flags, milestone log): native Gold/ledger/ExitLine, expected and after-saves unchanged 4/4 against d349. Earlier: Merge 2026-10-18 (d349: names after hire, achievements v2, abstract paper doll): native Gold/ledger/ExitLine, expected and after-saves unchanged 4/4 against 14b5. Earlier: Cut269 achievements v2 2026-10-18 (14b5): native settlement Gold/ledger/ExitLine and expected unchanged 4/4 against ce9d; after-saves regenerated 4/4, only lineage.honours (incl. others[]: v 2, cut ids dropped, causes retired). Earlier: Cut268 integration 2026-10-18 (ce9d: cut267 art, cut266 hero hub, cut262 town UX, cut261 live inventory, cut263 honours); native settlement Gold/ledger/ExitLine unchanged 4/4 against a47a; expected differs only in finds[].worth/fate (three entries with finds); after-saves regenerated 4/4, only finds/inv worth/fate and lineage.honours (incl. others[]). Earlier: cut261 20ee and cut263 f22e (branch repins, superseded by ce9d), cut260 a47a (Cut260 opening follow-up: watched/open-app checkpoint gold paid into the purse as it is secured, absences unchanged; worker rank IV at hire+8 days); native settlement Gold/ledger/ExitLine, expected and after-saves unchanged 4/4. Earlier manifests stay as history: cut264 fbf5, cut265 2359, cut265 8adf, cut276 e85d, cut275 558d, cut274 d349, cut269 14b5, cut268 ce9d, cut260 a47a, cut258 958a (Cut258 opening economy; bank-positive after-save regenerated, lineage.marks/marks_due only), cut258 c6c4 (worker names, display only), cut258 f70f (Scout displayed as Receptionist plus a9541092 pen fallback 8 h; death-secured-lost and multihero-absence after-saves regenerated, reveal_queue/reveal_owed only), cut257 51d0, cut257 51d0, cut257 3451 (first Cut257 repin), cut253 ef4b, runtime ef4b, final 8879, cut249 8879, cut248 c9fa, followup e62c, cut244 97e8, final 87de, settled 6214, cut235 6214, cut233 d161, cut232 0574, cut230 b0d1, cut222 (a2ab), cut226 1b93, fd56, cut227 13e8, cut228 c2f0, cut228 main 8b48, cut225 5844.
    process.env.IDLEVER_GOLD_SETTLEMENT_INPUTS ??
      "docs/evidence/cut279/settlements-inputs-97af.json",
  ),
);
const binary = read("web/src/engine/pkg/idlever_wasm_bg.wasm");
assert.deepEqual({ bytes: binary.length, sha256: hash(binary) }, manifest.wasm);
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8",
  }).trim();
const out = process.env.IDLEVER_GOLD_SETTLEMENT_OUT;
if (out) mkdirSync(out, { recursive: true });
const result = { checks: 0, cases: [], packages: [], errors: [] };
function differingPaths(actual, expected, path = "$", output = []) {
  if (isDeepStrictEqual(actual, expected)) return output;
  if (actual && expected && typeof actual === "object" && typeof expected === "object") {
    for (const key of new Set([...Object.keys(actual), ...Object.keys(expected)]))
      differingPaths(actual[key], expected[key], `${path}.${key}`, output);
  } else output.push({ path, actual, expected });
  return output;
}
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const packets = [];
  page.on("response", (response) => {
    if (response.url().includes("idlever_wasm_bg.wasm"))
      packets.push(response.body().then((bytes) => ({ bytes: bytes.length, sha256: hash(bytes) })));
  });
  page.on("pageerror", (error) => result.errors.push(error.message));
  await page.goto(`${url}?fresh=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  assert.equal(await page.evaluate(() => window.__idlever.kind), "wasm");
  await page.evaluate(() => {
    window.__goldSettlementProof = [];
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement) || !node.classList.contains("coin-flight")) continue;
          window.__goldSettlementProof.push({
            delta: Number(node.dataset.goldDelta),
            why: node.dataset.goldReason,
            bloodlineId: Number(node.dataset.goldBloodline),
          });
        }
    }).observe(document.body, { childList: true });
  });
  const painted = () =>
    page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  const particles = () => page.evaluate(() => window.__goldSettlementProof);
  for (const width of [320, 400, 1440])
    for (const scale of [1, 2]) {
      await page.setViewportSize({ width, height: 900 });
      for (const entry of manifest.entries) {
        const compressed = read(entry.home);
        const raw = gunzipSync(compressed).toString();
        assert.equal(hash(compressed), entry.homeSha256);
        assert.equal(hash(raw), entry.homeRawSha256);
        assert.equal(
          await page.evaluate(
            (raw) =>
              window.__idlever.importSave(
                JSON.stringify({ engine: raw, loadout: [], runs: 0, last_seen: Date.now() }),
              ),
            raw,
          ),
          true,
        );
        await page.evaluate(async (scale) => {
          document.documentElement.style.fontSize = `${16 * scale}px`;
          document.documentElement.dataset.juice = "on";
          (await import("/src/render/fxpref.ts")).setEffectsLevel("full");
          window.__goldSettlementProof = [];
        }, scale);
        await painted();
        assert.deepEqual(await particles(), [], "import is silent");
        const before = await page.evaluate(async () => ({
          gold: window.__idlever.lineage.gold,
          owner: window.__idlever.lineage.selected_bloodline ?? 1,
          save: await window.__idlever.engine.save(),
        }));
        assert.equal(before.gold, entry.expected.goldBefore);
        assert.equal(before.owner, entry.activeBloodline);
        const transaction = await page.evaluate(async (operations) => {
          const app = window.__idlever;
          const responses = [];
          for (const operation of operations)
            responses.push(await app.engine[operation.method](...operation.args));
          const coreSave = await app.engine.save();
          await app.refresh(true);
          return {
            gold: app.lineage.gold,
            ledger: app.lineage.gold_ledger,
            save: await app.engine.save(),
            coreSave,
            responses,
          };
        }, entry.operations);
        assert.equal(transaction.gold, entry.expected.goldAfter);
        assert.deepEqual(transaction.ledger, entry.expected.ledgerAfter);
        const nativeAfter = gunzipSync(read(entry.afterHome)).toString();
        assert.equal(hash(nativeAfter), entry.afterRawSha256);
        const diff = differingPaths(JSON.parse(transaction.save), JSON.parse(nativeAfter));
        if (diff.length && out)
          writeFileSync(
            `${out}/failure.json`,
            JSON.stringify(
              {
                id: entry.id,
                width,
                scale,
                nativeHash: hash(nativeAfter),
                coreHash: hash(transaction.coreSave),
                refreshedHash: hash(transaction.save),
                coreDiff: differingPaths(JSON.parse(transaction.coreSave), JSON.parse(nativeAfter)),
                diff,
              },
              null,
              2,
            ),
          );
        assert.equal(
          diff.length,
          0,
          `${entry.id}/${width}/${scale}: actual WASM settlement matches native replay`,
        );
        await painted();
        const coins = await particles();
        assert.ok(coins.length > 0 && coins.length <= 48);
        const key = (row) =>
          JSON.stringify([row.bloodlineId ?? row.bloodline_id ?? 1, row.why, Math.sign(row.delta)]);
        const expected = new Map();
        for (const row of entry.expected.newLedger)
          if (row.delta !== 0) expected.set(key(row), (expected.get(key(row)) ?? 0) + row.delta);
        const shown = new Map();
        for (const coin of coins) {
          assert.notEqual(coin.delta, 0, "lost-only receipts create no particles");
          assert.equal(
            coin.delta,
            expected.get(key(coin)),
            "each particle names a real owner and credited receipt",
          );
          shown.set(key(coin), coin.delta);
        }
        assert.deepEqual([...shown.entries()].sort(), [...expected.entries()].sort());
        assert.equal(
          [...shown.values()].reduce((sum, value) => sum + value, 0),
          transaction.gold - before.gold,
        );
        await page.evaluate(async () => {
          window.__goldSettlementProof = [];
          await window.__idlever.refresh(true);
        });
        await painted();
        assert.deepEqual(await particles(), [], "repeated read cannot replay settlement");
        assert.equal(await page.evaluate(() => window.__idlever.engine.save()), transaction.save);
        result.cases.push({
          id: entry.id,
          width,
          scale,
          goldBefore: before.gold,
          goldAfter: transaction.gold,
          receipts: entry.expected.newLedger,
          coins,
          exactNativeReplay: true,
        });
        result.checks += 14 + coins.length * 2;
      }
    }
  result.packages = await Promise.all(packets);
  assert.ok(result.packages.length);
  for (const packet of result.packages) assert.deepEqual(packet, manifest.wasm);
  assert.deepEqual(result.errors, []);
  result.result = "PASS";
  if (out) writeFileSync(`${out}/results.json`, JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      result: result.result,
      checks: result.checks,
      cases: result.cases.length,
      packages: result.packages,
    }),
  );
} finally {
  await browser.close();
}
