#!/usr/bin/env node
// The dev save history's command line (docs/ITERATION_SPEED.md §0i): a ring entry seen in the browser → a file the native
// tools read at once (camp-check.mjs, choice-check.mjs, sim_perf, cli), and a save file → a new ring entry.
//
//   node tools/save-history.mjs list   --port 5347                         entries of the driver page's lineage (newest = 0)
//   node tools/save-history.mjs export --port 5347 --index 0 --out S.json  from a running tools/driver.mjs session
//   node tools/save-history.mjs export idlever-history-….json --out S.json a file the panel's `save` button downloaded
//   node tools/save-history.mjs import S.json --port 5347 [--label "bug"]  a save as a new entry (then restore it in the panel)
//
// `export` writes the raw engine save (what Game::load and the native diagnostics read) unless `--blob`, which writes the
// client's localStorage blob (engine + loadout + origins; importable by the panel). It never overwrites a file.
// `import` accepts a raw engine save, a client blob, an idlever-history file or an idlever-debug bundle.
// The driver page must be a dev build (window.__idlever.history); add `?history=1` for automatic capture under automation.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function blobOf(text) {
  const o = JSON.parse(text);
  if (o?.format === "idlever-history") {
    if (o.schema !== 1 || typeof o.entry?.blob?.engine !== "string")
      throw Error("Unsupported history file");
    return { blob: o.entry.blob, meta: { ...o.entry, blob: undefined, key: undefined } };
  }
  if (o?.format === "idlever-debug") {
    if (typeof o.save?.engine !== "string") throw Error("Invalid debug bundle");
    return { blob: o.save, meta: { label: "debug", captured_at: o.captured_at } };
  }
  if (o && typeof o.engine === "string") return { blob: o, meta: {} };
  if (o && typeof o === "object" && !Array.isArray(o))
    return { blob: { v: 2, engine: text, loadout: [], last_seen: Date.now() }, meta: {} };
  throw Error("Unrecognized save file");
}

async function drive(port, js) {
  const r = await fetch(`http://127.0.0.1:${port}/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "eval", js }),
  });
  const out = await r.json();
  if (out.error) throw Error(out.error);
  return out.value;
}
const HAS = `(() => { if (!window.__idlever?.history) throw Error("no window.__idlever.history: a dev build page?"); return window.__idlever.history })()`;

function parse(argv) {
  const o = { cmd: argv[0], files: [] };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (["--port", "--index", "--out", "--label"].includes(a)) {
      if (argv[i + 1] === undefined) throw Error(`missing value for ${a}`);
      o[a.slice(2)] = argv[++i];
    } else if (a === "--blob") o.blob = true;
    else if (a.startsWith("--")) throw Error(`unknown option ${a}`);
    else o.files.push(a);
  }
  return o;
}

async function main(argv) {
  const o = parse(argv);
  const usage =
    "usage: save-history.mjs list --port P | export (--port P --index I | FILE) --out SAVE [--blob] | import FILE --port P [--label L]";
  if (o.cmd === "list") {
    if (!o.port) throw Error(usage);
    const list = await drive(o.port, `${HAS}.list()`);
    for (const [i, e] of list.entries())
      console.log(
        `${i}\t${new Date(e.at).toISOString()}\t${e.label}\t$${e.gold}\tD${e.best}\tseed ${e.seed}\t${(e.bytes / 1024).toFixed(0)}KB`,
      );
    return;
  }
  if (o.cmd === "export") {
    if (!o.out) throw Error(usage);
    let blob, meta;
    if (o.files.length === 1) ({ blob, meta } = blobOf(readFileSync(o.files[0], "utf8")));
    else if (o.port && o.index !== undefined) {
      const i = Number(o.index);
      if (!Number.isSafeInteger(i) || i < 0) throw Error("index must be a non-negative integer");
      const e = await drive(o.port, `${HAS}.entry(${i})`);
      blob = e.blob;
      meta = { ...e, blob: undefined, key: undefined };
    } else throw Error(usage);
    const engine = JSON.parse(blob.engine);
    if (!engine || typeof engine !== "object" || Array.isArray(engine))
      throw Error("Invalid engine save");
    writeFileSync(o.out, o.blob ? JSON.stringify(blob) : blob.engine, { flag: "wx" });
    console.log(
      JSON.stringify(
        { out: o.out, format: o.blob ? "client-blob" : "engine-save", ...meta },
        (k, v) => (v === undefined ? undefined : v),
        2,
      ),
    );
    return;
  }
  if (o.cmd === "import") {
    if (!o.port || o.files.length !== 1) throw Error(usage);
    const { blob } = blobOf(readFileSync(o.files[0], "utf8"));
    JSON.parse(blob.engine);
    const label = o.label ?? `import ${o.files[0].split("/").pop().slice(0, 24)}`;
    const m = await drive(
      o.port,
      `${HAS}.add(${JSON.stringify(JSON.stringify(blob))}, ${JSON.stringify(label)})`,
    );
    console.log(
      JSON.stringify(
        { added: m, restore: "index 0 (newest) in the panel, or history.restore(0)" },
        null,
        2,
      ),
    );
    return;
  }
  throw Error(usage);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
