#!/usr/bin/env node
// Parallel balance sweep: candidate profiles × targeted dayplayer rows, no recompile between candidates.
//
//   node tools/sweep.mjs --name ramp --grid '{"grid":{"recovery.1":[12,14,16],"recovery.2":[26,28]}}' \
//        --rows tuned-picked,picked-idle [--seeds 16] [--objective tuned-picked[@0][:min]] [--threads 32] [--jobs K]
//        [--base tuning/balance.json] [--no-fail-fast] [--fresh] [--fresh-jobs] [--list] [--example opening]
//
// --grid is a JSON file or inline JSON: {"grid": {path: [values…]}} (the Cartesian product) and/or
//   {"candidates": [{"name"?: "…", "set": {path: value}}]}. A path is `key`, `key.1` or `key[1]` into the base
//   profile (tuning/balance.json unless "base"/--base); the file may also carry "rows", "seeds", "objective".
// Each candidate gets target/sweep/<name>/<candidate>/{profile.json,out.txt,err.txt,result.json}. The dayplayer is
//   built once with `--features dev-balance` and snapshotted into target/sweep/<name>/ so a rebuild elsewhere cannot
//   swap it mid-sweep; each candidate runs it with IDLEVER_BALANCE_JSON (the Rust parser validates the profile;
//   a rejected one is INVALID) and the same IDLEVER_SRC_KEY as `gates.mjs --balance`, so kept fortnights are shared
//   with targeted gate runs in target/gates/dp.
// Fail-fast per candidate (the dayplayer's own `--fail-fast`: seeds lowest first, abort on the first row settled
//   FAIL — and stop once every row has settled, so a PASS row reads a range like 1.15…1.20, ranked by its
//   midpoint); `--refine K` then replays the K best PASS candidates without fail-fast for exact values (in
//   <candidate>/exact/); `--no-fail-fast` plays every candidate to exact values.
// Parallelism: --threads (else GATES_THREADS, else the cores) is the total; --jobs candidates run at once
//   (default min(candidates, threads/4)), each with threads/jobs dayplayer threads.
// Resume: a candidate whose result.json matches its profile, rows, seeds, mode and binary is skipped; --fresh
//   reruns them (the fortnight job cache still applies; --fresh-jobs also replays those, for timing).
// Output: target/sweep/<name>/results.{md,json}, ranked PASS first, then by the objective (default: the first
//   row's first number, maximised), then FAIL, then INVALID/ERROR. Values read from a row settled early by
//   fail-fast are the low end of its settled range, marked `~`. Never a gate pass.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  copyFileSync,
  openSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runtimeKey } from "./runtime-key.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sha = (x) => createHash("sha256").update(x).digest("hex");

// ---- pure helpers (tools/sweep.test.mjs) ----
export function pathTokens(path) {
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .map((t) => (/^\d+$/.test(t) ? Number(t) : t));
}
export function setPath(obj, path, value) {
  const toks = pathTokens(path);
  let o = obj;
  for (let i = 0; i < toks.length - 1; i++) {
    if (o == null || !(toks[i] in Object(o)))
      throw new Error(`sweep: no ${path} in the base profile`);
    o = o[toks[i]];
  }
  const last = toks.at(-1);
  if (o == null || !(last in Object(o))) throw new Error(`sweep: no ${path} in the base profile`);
  o[last] = value;
}
export function slug(set) {
  return Object.entries(set)
    .map(([k, v]) => `${k.replace(/\[(\d+)\]/g, ".$1")}=${JSON.stringify(v)}`)
    .join(",");
}
export function expandCandidates(spec, base) {
  const out = [];
  if (spec.grid) {
    let combos = [{}];
    for (const [path, values] of Object.entries(spec.grid)) {
      if (!Array.isArray(values) || !values.length)
        throw new Error(`sweep: grid ${path} needs values`);
      combos = combos.flatMap((c) => values.map((v) => ({ ...c, [path]: v })));
    }
    for (const set of combos) out.push({ set });
  }
  for (const c of spec.candidates ?? []) out.push({ name: c.name, set: c.set ?? {} });
  if (!out.length) throw new Error("sweep: the grid names no candidates");
  const seen = new Set();
  return out.map((c) => {
    const profile = structuredClone(base);
    for (const [path, v] of Object.entries(c.set)) setPath(profile, path, v);
    const name = c.name ?? (slug(c.set) || "base");
    const dir = name
      .replace(/[^A-Za-z0-9.=,_+-]+/g, "_")
      .replace(/[=,]/g, (m) => (m === "=" ? "-" : "_"));
    if (seen.has(dir)) throw new Error(`sweep: two candidates named ${name}`);
    seen.add(dir);
    return { name, dir, set: c.set, profile, text: JSON.stringify(profile, null, 2) + "\n" };
  });
}
/** `dayplayer --rows ?` stderr → [{id, key}] */
export function parseRowList(text) {
  return [...text.matchAll(/^ {2}(\S+) +(\S.*)$/gm)].map((m) => ({ id: m[1], key: m[2].trim() }));
}
const NUM = /[-+]?\d+(?:\.\d+)?/g;
export function numbersOf(value) {
  const range = /([-+]?\d+(?:\.\d+)?)…([-+]?\d+(?:\.\d+)?)/.exec(value);
  if (range) {
    const lo = Number(range[1]);
    const hi = Number(range[2]);
    return { nums: [Number(((lo + hi) / 2).toFixed(6))], lo, hi, approx: true };
  }
  // skip floor names (D13) so "D13 0.9" reads 0.9
  return { nums: (value.replace(/\bD\d+\b/g, " ").match(NUM) ?? []).map(Number), approx: false };
}
/** the last targeted bar table of a dayplayer printout → {id: {value, result, say?, nums, approx}} */
export function parseBars(stdout, rowList) {
  const at = Math.max(
    stdout.lastIndexOf("\nbar (targeted"),
    stdout.startsWith("bar (targeted") ? 0 : -1,
  );
  const out = {};
  if (at < 0) return out;
  const lines = stdout.slice(at + 1).split("\n");
  const keys = [...rowList].sort((a, b) => b.key.length - a.key.length);
  for (let i = 1; i < lines.length; i++) {
    const m = /^(.*\S)\s+(PASS|FAIL|open)$/.exec(lines[i]);
    if (!m) continue;
    const row = keys.find((r) => m[1].startsWith(r.key));
    if (!row || out[row.id]) continue;
    const rest = m[1];
    let value;
    const spaced = /^(.*\S)\s{2,}(\S.*)$/.exec(rest);
    if (spaced) value = spaced[2];
    else {
      const p = rest.indexOf(") ", row.key.length);
      value = p >= 0 ? rest.slice(p + 2) : rest.slice(row.key.length).trim();
    }
    const entry = { value, result: m[2] };
    if (value === "settled") {
      entry.say = (lines[i + 1] ?? "").trim().replace(/^settled early: /, "");
      Object.assign(entry, numbersOf(entry.say));
      entry.approx = true;
    } else Object.assign(entry, numbersOf(value));
    out[row.id] = entry;
  }
  return out;
}
export function parseObjective(spec, rows) {
  const m = /^([^@:]+)(?:@(\d+))?(?::(max|min))?$/.exec(spec ?? rows[0]);
  if (!m) throw new Error(`sweep: objective ${spec}: use row[@index][:max|min]`);
  return { row: m[1], index: Number(m[2] ?? 0), dir: m[3] ?? "max" };
}
export function objectiveOf(result, obj) {
  const v = result.rows?.[obj.row]?.nums?.[obj.index];
  return Number.isFinite(v) ? v : null;
}
const ORDER = { PASS: 0, FAIL: 1, INVALID: 2, ERROR: 3 };
export function rank(results, obj) {
  const score = (r) => {
    const v = objectiveOf(r, obj);
    return v == null ? -Infinity : obj.dir === "min" ? -v : v;
  };
  return [...results].sort(
    (a, b) =>
      (ORDER[a.verdict] ?? 9) - (ORDER[b.verdict] ?? 9) ||
      score(b) - score(a) ||
      a.name.localeCompare(b.name),
  );
}
export function verdictOf(status, stdout, stderr) {
  if (/invalid balance|valid immutable balance profile|balance overrides require/i.test(stderr))
    return "INVALID";
  if (status === 0 && /targeted rows PASS/.test(stdout)) return "PASS";
  if (status === 1 && /— not a gate pass/.test(stdout) && /\bFAIL\b/.test(stdout)) return "FAIL";
  return "ERROR";
}
export function renderMarkdown(meta, ranked, obj) {
  const L = [];
  L.push(`# Sweep ${meta.name}`, "");
  L.push(
    `Base \`${meta.base}\` · rows \`${meta.rows.join(",")}\` · ${meta.seeds} seeds · ${meta.failFast ? "fail-fast" : "exact"} · objective ${obj.row}@${obj.index} ${obj.dir} · binary ${meta.binKey}`,
  );
  if (meta.timing)
    L.push(
      "",
      `Wall ${meta.timing.wall.toFixed(0)} s for ${meta.timing.ran} candidates run (${meta.timing.skipped} resumed) at ${meta.jobs} × ${meta.threadsPer} threads (cap ${meta.cap}). ` +
        `Σ candidate wall ${meta.timing.sumWall.toFixed(0)} s · Σ CPU ${meta.timing.sumCpu.toFixed(0)} s · sequential estimate ${meta.timing.sequential.toFixed(0)} s ` +
        `(each alone on the cap: max(CPU/cap, longest game)) → ${(meta.timing.sequential / Math.max(1, meta.timing.wall)).toFixed(2)}× faster.`,
    );
  L.push(
    "",
    "Never a gate pass: a candidate's PASS is the targeted rows only; `~` marks a row fail-fast settled early (its range; ranked by the midpoint); `exact` marks a `--refine` rerun without fail-fast.",
    "",
  );
  L.push(`| # | candidate | verdict | ${obj.row} | ${meta.rows.join(" | ")} | wall s | CPU s |`);
  L.push(`|---|---|---|---|${meta.rows.map(() => "---|").join("")}---|---|`);
  ranked.forEach((r, i) => {
    const v = objectiveOf(r, obj);
    const cells = meta.rows.map((id) => {
      const x = r.rows?.[id];
      if (!x) return "–";
      const shown =
        x.value !== "settled"
          ? x.value
          : x.lo != null
            ? `~${x.lo}…${x.hi}`
            : `~${(x.nums ?? []).join(" · ") || "?"}`;
      return `${shown.replace(/\|/g, "/")} ${x.result}`;
    });
    const note = r.refined
      ? " exact"
      : r.verdict === "FAIL" && r.failedRow
        ? ` (${r.failedRow})`
        : r.verdict === "INVALID" || r.verdict === "ERROR"
          ? ` (${(r.error ?? "").slice(0, 60).replace(/\|/g, "/")})`
          : "";
    L.push(
      `| ${i + 1} | ${r.name} | ${r.verdict}${note} | ${v == null ? "–" : `${r.rows?.[obj.row]?.approx ? "~" : ""}${Number(v.toFixed(3))}`} | ${cells.join(" | ")} | ${r.wall?.toFixed(0) ?? "–"} | ${r.cpu?.toFixed(0) ?? "–"} |`,
    );
  });
  return L.join("\n") + "\n";
}

// ---- main ----
async function main(argv) {
  const opt = (n) => {
    const i = argv.indexOf(n);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const flag = (n) => argv.includes(n);
  const name = opt("--name");
  const gridArg = opt("--grid");
  if (!name || !gridArg) {
    console.error(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\nimport ")[0]);
    process.exit(2);
  }
  const spec = JSON.parse(gridArg.trim().startsWith("{") ? gridArg : readFileSync(gridArg, "utf8"));
  const basePath = opt("--base") ?? spec.base ?? "tuning/balance.json";
  const base = JSON.parse(readFileSync(resolve(root, basePath), "utf8"));
  const rows = (opt("--rows") ?? spec.rows ?? "").split(",").filter(Boolean);
  if (!rows.length) throw new Error("sweep: name the rows (--rows a,b)");
  const seeds = Number(opt("--seeds") ?? spec.seeds ?? 16);
  const failFast = !flag("--no-fail-fast");
  const obj = parseObjective(opt("--objective") ?? spec.objective, rows);
  const candidates = expandCandidates(spec, base);
  const out = join(root, "target/sweep", name);
  mkdirSync(out, { recursive: true });
  if (flag("--list")) {
    for (const c of candidates) console.log(`${c.dir}\t${JSON.stringify(c.set)}`);
    return;
  }
  // build + snapshot (or a given binary: tests)
  // --example opening: the Cut258 opening probe (its `opening-*` rows) instead of the dayplayer
  const example = opt("--example") ?? spec.example ?? "dayplayer";
  if (!/^[a-z_]+$/.test(example)) throw new Error(`sweep: --example ${example}`);
  let bin = opt("--bin");
  let srcKey;
  if (!bin) {
    const b = spawnSync(
      "cargo",
      [
        "build",
        "-q",
        "--message-format=json",
        "--profile",
        "fast",
        "-p",
        "idlever-core",
        "--features",
        "dev-balance",
        "--example",
        example,
      ],
      { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    if (b.stderr) process.stderr.write(b.stderr);
    if (b.status !== 0) process.exit(b.status ?? 1);
    let core;
    for (const line of b.stdout.split("\n").filter(Boolean)) {
      const m = JSON.parse(line);
      if (
        m.reason === "compiler-artifact" &&
        m.target.name === "idlever_core" &&
        m.target.kind.includes("lib") &&
        !m.profile.test
      )
        core = m;
    }
    const rustc = spawnSync("rustc", ["-vV"], { encoding: "utf8" }).stdout;
    srcKey = runtimeKey(core, root, rustc);
    const built = join(root, `target/fast/examples/${example}`);
    bin = join(out, `${example}-${sha(readFileSync(built)).slice(0, 12)}`);
    if (!existsSync(bin)) {
      copyFileSync(built, `${bin}.tmp`);
      spawnSync("chmod", ["+x", `${bin}.tmp`]);
      renameSync(`${bin}.tmp`, bin);
    }
  } else {
    bin = resolve(bin);
    srcKey = `fake${sha(readFileSync(bin)).slice(0, 12)}`;
  }
  const binKey = srcKey;
  const list = spawnSync(bin, ["--rows", "?"], { cwd: root, encoding: "utf8" });
  const rowList = parseRowList(list.stderr ?? "");
  for (const r of rows)
    if (!rowList.some((x) => x.id === r))
      throw new Error(`sweep: no row ${r} (dayplayer --rows ? lists them)`);
  if (!rows.includes(obj.row))
    throw new Error(`sweep: objective row ${obj.row} is not among --rows`);
  const cap = Number(opt("--threads") ?? process.env.GATES_THREADS ?? os.availableParallelism());
  // (default: at most threads/4 at once, evened over the batches so the last batch is not one candidate alone)
  const pending = Math.max(1, candidates.length);
  const widest = Math.max(1, Math.floor(cap / 4));
  const jobs = Math.max(
    1,
    Math.min(pending, Number(opt("--jobs") ?? Math.ceil(pending / Math.ceil(pending / widest)))),
  );
  const threadsPer = Math.max(1, Math.floor(cap / jobs));
  const args = [
    "--seeds",
    String(seeds),
    "--loo-seeds",
    String(seeds),
    "--tuned-seeds",
    String(seeds),
    "--rows",
    rows.join(","),
    ...(failFast ? ["--fail-fast"] : []),
  ];
  const exactArgs = args.filter((a) => a !== "--fail-fast");
  const keyOf = (a) => sha(JSON.stringify({ args: a, binKey })).slice(0, 16);
  const argsKey = keyOf(args);
  const refine = Number(opt("--refine") ?? 0);
  const meta = {
    name,
    base: basePath,
    rows,
    seeds,
    failFast,
    refine,
    binKey,
    cap,
    jobs,
    threadsPer,
    bin,
  };
  const priorOf = (dirPath, key, text) => {
    try {
      const prior = JSON.parse(readFileSync(join(dirPath, "result.json"), "utf8"));
      if (flag("--fresh") || prior.profileSha !== sha(text) || prior.argsKey !== key) return null;
      // (re-read the kept printout: a resumed result reads its rows with this parser)
      prior.rows = parseBars(readFileSync(join(dirPath, "out.txt"), "utf8"), rowList);
      return prior;
    } catch {
      return null;
    }
  };
  const time = existsSync("/usr/bin/time") ? "/usr/bin/time" : null;
  const results = [];
  const todo = [];
  for (const c of candidates) {
    const dir = join(out, c.dir);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "profile.json"), c.text);
    const prior = priorOf(dir, argsKey, c.text);
    if (prior) {
      results.push({ ...prior, resumed: true });
      console.error(`sweep: ${c.name} resumed (${prior.verdict})`);
    } else todo.push({ ...c, dirPath: dir });
  }
  console.error(
    `sweep ${name}: ${candidates.length} candidates (${todo.length} to run) × rows ${rows.join(",")} × ${seeds} seeds; ${jobs} at once × ${threadsPer} threads (cap ${cap})${failFast ? "; fail-fast" : ""}`,
  );
  const children = new Set();
  const stop = () => {
    // (each run is its own process group: time(1) does not pass a signal on to the dayplayer)
    for (const p of children)
      try {
        process.kill(-p.pid, "SIGTERM");
      } catch {
        p.kill("SIGTERM");
      }
    process.exit(130);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  const t0 = Date.now();
  const runOne = (c, exact = false) =>
    new Promise((done) => {
      const started = Date.now();
      const runArgs = exact ? exactArgs : args;
      const runKey = exact ? keyOf(exactArgs) : argsKey;
      const cpuFile = join(c.dirPath, "time.txt");
      const full = [...runArgs, "--threads", String(threadsPer)];
      const env = {
        ...process.env,
        IDLEVER_BALANCE_JSON: c.text,
        IDLEVER_SRC_KEY: `${srcKey}:balance:${sha(c.text)}`,
        ...(flag("--fresh-jobs") ? { IDLEVER_CACHE_FRESH: "1" } : {}),
      };
      const [cmd, cmdArgs] = time
        ? [time, ["-f", "%e %U %S", "-o", cpuFile, bin, ...full]]
        : [bin, full];
      // (streamed to the candidate's files: `tail -f target/sweep/<name>/<candidate>/err.txt` shows its games)
      const outFd = openSync(join(c.dirPath, "out.txt"), "w");
      const errFd = openSync(join(c.dirPath, "err.txt"), "w");
      const p = spawn(cmd, cmdArgs, {
        cwd: root,
        env,
        stdio: ["ignore", outFd, errFd],
        detached: true,
      });
      children.add(p);
      p.on("close", (status) => {
        children.delete(p);
        closeSync(outFd);
        closeSync(errFd);
        const so = readFileSync(join(c.dirPath, "out.txt"), "utf8");
        const se = readFileSync(join(c.dirPath, "err.txt"), "utf8");
        let cpu = null;
        try {
          const [, u, s] = readFileSync(cpuFile, "utf8")
            .trim()
            .split("\n")
            .at(-1)
            .split(" ")
            .map(Number);
          cpu = u + s;
        } catch {
          /* no time(1) */
        }
        const games = [...se.matchAll(/done in (\d+(?:\.\d+)?)s/g)].map((m) => Number(m[1]));
        const verdict = verdictOf(status, so, se);
        const parsed = parseBars(so, rowList);
        const failed =
          /fail-fast: `([^`]+)` settled FAIL/.exec(so)?.[1] ??
          Object.entries(parsed).find(([, v]) => v.result === "FAIL")?.[0];
        const r = {
          name: c.name,
          dir: c.dir,
          set: c.set,
          profileSha: sha(c.text),
          argsKey: runKey,
          exact,
          verdict,
          exit: status,
          rows: parsed,
          failedRow: verdict === "FAIL" ? failed : undefined,
          error:
            verdict === "INVALID" || verdict === "ERROR"
              ? se.trim().split("\n").slice(-3).join(" ")
              : undefined,
          wall: (Date.now() - started) / 1000,
          cpu,
          longestGame: games.length ? Math.max(...games) : null,
        };
        const tmp = join(c.dirPath, `result.json.tmp-${process.pid}`);
        writeFileSync(tmp, JSON.stringify(r, null, 2));
        renameSync(tmp, join(c.dirPath, "result.json"));
        console.error(
          `sweep: ${c.name}${exact ? " (exact)" : ""} ${verdict}${r.failedRow ? ` (${r.failedRow})` : ""} ${objectiveOf(r, obj) ?? "–"} in ${r.wall.toFixed(0)}s${cpu != null ? `, ${cpu.toFixed(0)} CPU-s` : ""}`,
        );
        done(r);
      });
    });
  const queue = [...todo];
  const ran = [];
  await Promise.all(
    Array.from({ length: Math.min(jobs, queue.length) }, async () => {
      while (queue.length) ran.push(await runOne(queue.shift()));
    }),
  );
  let all = [...results, ...ran];
  // --refine K: the K best PASS candidates whose rows settled early, replayed without fail-fast for exact values
  if (refine > 0) {
    const pick = rank(all, obj)
      .filter((r) => r.verdict === "PASS" && Object.values(r.rows ?? {}).some((x) => x.approx))
      .slice(0, refine);
    const exactTodo = [];
    const exactOf = new Map();
    for (const r of pick) {
      const c = candidates.find((x) => x.name === r.name);
      const dirPath = join(out, c.dir, "exact");
      mkdirSync(dirPath, { recursive: true });
      const prior = priorOf(dirPath, keyOf(exactArgs), c.text);
      if (prior) exactOf.set(c.name, { ...prior, resumed: true });
      else exactTodo.push({ ...c, dirPath });
    }
    console.error(`sweep: refining ${pick.length} (${exactTodo.length} to run) without fail-fast`);
    await Promise.all(
      Array.from({ length: Math.min(jobs, exactTodo.length) }, async () => {
        while (exactTodo.length) {
          const r = await runOne(exactTodo.shift(), true);
          ran.push(r);
          exactOf.set(r.name, r);
        }
      }),
    );
    all = all.map((r) =>
      exactOf.has(r.name)
        ? { ...exactOf.get(r.name), refined: true, screen: { verdict: r.verdict, rows: r.rows } }
        : r,
    );
  }
  const wall = (Date.now() - t0) / 1000;
  meta.timing = {
    wall,
    ran: ran.length,
    skipped: results.length,
    sumWall: ran.reduce((s, r) => s + r.wall, 0),
    sumCpu: ran.reduce((s, r) => s + (r.cpu ?? 0), 0),
    sequential: ran.reduce(
      (s, r) => s + Math.max((r.cpu ?? r.wall * threadsPer) / cap, r.longestGame ?? 0),
      0,
    ),
  };
  // (every invocation's timing, so a resumed or refined run does not hide the first one's)
  appendFileSync(
    join(out, "runs.jsonl"),
    JSON.stringify({
      at: new Date().toISOString(),
      ...meta.timing,
      refine,
      jobs,
      threadsPer,
      cap,
    }) + "\n",
  );
  const ranked = rank(all, obj);
  writeFileSync(
    join(out, "results.json"),
    JSON.stringify({ meta, objective: obj, ranked }, null, 2),
  );
  const md = renderMarkdown(meta, ranked, obj);
  writeFileSync(join(out, "results.md"), md);
  process.stdout.write(md);
  console.error(`sweep: wrote ${join(out, "results.md")} and results.json`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main(process.argv.slice(2));
