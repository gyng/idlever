#!/usr/bin/env node
// Rater / QA checkpoints (owner request 2026-10-14: a dead rater resumes instead of restarting).
// Talks to a running tools/driver.mjs; works on shipping/preview builds opened with `?dev=1`
// (window.__idlever), using the same save export/import as Settings → export / import.
//
//   node tools/rater-checkpoint.mjs save    --port 5380 --dir scratchpad/raterA [--minutes 23] [--phase cold|20m|4h|8h]
//                                           [--next "read the D6 death, then edit the hp row"] [--calls 61] [--images 18]
//   node tools/rater-checkpoint.mjs status  --dir scratchpad/raterA
//   node tools/rater-checkpoint.mjs restore --port 5381 --dir scratchpad/raterA --url http://127.0.0.1:5264/
//
// save    flushes the engine, then writes <dir>/checkpoint/save.json (the SaveBlob, importable), rules.json and
//         progress.json (merged with the flags; the previous one is kept as progress.prev.json). Each file is
//         written temp + rename, so a rater killed mid-save leaves the previous checkpoint whole. The partial
//         scorecard (<dir>/checkpoint/scorecard.partial.json) and notes (notes.md) are the rater's own files.
// status  prints progress.json and which checkpoint files exist (what a resumed rater reads first).
// restore opens <url>?dev=1&runs=1 in the new driver and imports save.json through the app's importer. Import runs no
//         catch-up: the real time since the checkpoint is not granted as an absence.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const [cmd, ...argv] = process.argv.slice(2);
const val = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : d;
};
const dir = resolve(val("--dir", ""));
const cp = join(dir, "checkpoint");
const port = val("--port");
const atomic = (path, text) => {
  writeFileSync(`${path}.tmp`, text);
  renameSync(`${path}.tmp`, path);
};
const read = (f) => {
  try {
    return JSON.parse(readFileSync(join(cp, f), "utf8"));
  } catch {
    return null;
  }
};
async function drive(op) {
  const r = await fetch(`http://127.0.0.1:${port}/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(op),
  });
  const j = await r.json();
  if (j.error) throw Error(`driver: ${j.error}`);
  return j;
}
if (!val("--dir")) throw Error("--dir scratchpad/<rater> is required");

if (cmd === "save") {
  if (!port) throw Error("--port (the rater's driver) is required");
  const { value } = await drive({
    op: "js",
    body: `return await page.evaluate(async () => {
      const a = window.__idlever;
      if (!a) throw Error("no window.__idlever: open the game with ?dev=1");
      await a.flush();
      return { save: a.exportSave(), rules: await a.engine.exportRules(), screen: a.screen, url: location.href,
        offlineRunning: !!a.offlineRunning };
    })`,
  });
  const blob = JSON.parse(value.save);
  if (!blob.engine) throw Error("the game has no committed save yet; play to the camp and retry");
  mkdirSync(cp, { recursive: true });
  atomic(join(cp, "save.json"), value.save + "\n");
  atomic(join(cp, "rules.json"), value.rules + "\n");
  const prev = read("progress.json");
  if (prev) copyFileSync(join(cp, "progress.json"), join(cp, "progress.prev.json"));
  const num = (k, d) => (val(k) !== undefined ? Number(val(k)) : d);
  const progress = {
    ...prev,
    updatedAt: new Date().toISOString(),
    checkpoints: (prev?.checkpoints ?? 0) + 1,
    url: value.url,
    screen: value.screen,
    offlineRunningAtSave: value.offlineRunning,
    activeMinutes: num("--minutes", prev?.activeMinutes ?? null),
    phase: val("--phase", prev?.phase ?? null),
    nextStep: val("--next", prev?.nextStep ?? null),
    toolCallsUsed: num("--calls", prev?.toolCallsUsed ?? null),
    imagesUsed: num("--images", prev?.imagesUsed ?? null),
    saveBytes: value.save.length,
  };
  atomic(join(cp, "progress.json"), JSON.stringify(progress, null, 2) + "\n");
  console.log(
    `checkpoint ${progress.checkpoints} → ${cp} (${progress.screen}, ${progress.activeMinutes ?? "?"} min, phase ${progress.phase ?? "?"}${value.offlineRunning ? ", WARNING: catch-up was running; save is the last committed state" : ""})`,
  );
} else if (cmd === "status") {
  const files = [
    "save.json",
    "rules.json",
    "progress.json",
    "scorecard.partial.json",
    "notes.md",
  ].map((f) => `${f}: ${existsSync(join(cp, f)) ? "yes" : "no"}`);
  console.log(JSON.stringify({ checkpoint: cp, progress: read("progress.json"), files }, null, 2));
  if (existsSync(join(dir, "browser-state.json")))
    console.log(
      `driver storage checkpoint also present: ${join(dir, "browser-state.json")} (driver --checkpoint)`,
    );
} else if (cmd === "restore") {
  if (!port) throw Error("--port (the new driver) is required");
  const url = val("--url");
  if (!url) throw Error("--url (the cohort's build URL) is required");
  const save = readFileSync(join(cp, "save.json"), "utf8").trim();
  JSON.parse(save);
  const u = new URL(url);
  u.searchParams.set("dev", "1");
  u.searchParams.set("runs", "1");
  await drive({ op: "goto", url: u.href });
  const { value } = await drive({
    op: "js",
    body: `const save = ${JSON.stringify(save)};
      await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 120000 });
      return await page.evaluate(async (save) => {
        const a = window.__idlever;
        const ok = await a.importSave(save);
        return { ok, screen: a.screen, identical: ok && (await a.engine.save()) === JSON.parse(save).engine };
      }, save);`,
  });
  if (!value.ok) throw Error("import refused by the game");
  if (!value.identical)
    console.log("WARNING: the engine state after import differs from save.json");
  const p = read("progress.json");
  console.log(
    `restored ${join(cp, "save.json")} → ${value.screen}; resume at: ${p?.nextStep ?? "(no next step recorded)"} (${p?.activeMinutes ?? "?"} active min, phase ${p?.phase ?? "?"})`,
  );
} else {
  console.log(
    "usage: node tools/rater-checkpoint.mjs save|status|restore --dir scratchpad/<rater> [--port N] …",
  );
  process.exit(2);
}
