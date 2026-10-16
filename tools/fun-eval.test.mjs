import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  APPENDIX_MARKER,
  manifestOf,
  packetCheck,
  parseManifest,
  scoreSummary,
} from "./fun-eval.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(ROOT, "tools/fun-eval.mjs");
const run = (...args) => spawnSync("node", [TOOL, ...args], { cwd: ROOT, encoding: "utf8" });
const sandbox = () => mkdtempSync(join(tmpdir(), "idlever-fun-eval-"));
const write = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};
const json = (path) => JSON.parse(readFileSync(path, "utf8"));

const HAS_EVAL_FUN = existsSync(join(ROOT, "../eval-fun/tools/fun-score.mjs"));
const needsEvalFun = { skip: HAS_EVAL_FUN ? false : "needs ../eval-fun (eval/score.sh)" };

// A tiny served package: index.html plus an asset and an engine, as the freeze requires.
function packageFixture(dir, marker = "console.log(1)\n") {
  write(join(dir, "index.html"), "<html><body>hi</body></html>\n");
  write(join(dir, "assets/app.js"), marker);
  writeFileSync(
    join(dir, "assets/engine.wasm"),
    Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]),
  );
  return dir;
}

function cardFixture(build, awards = 0.6) {
  const axes = [
    "clarity",
    "decisions",
    "mastery",
    "tension",
    "feel",
    "surprise",
    "expression",
    "story",
    "pacing",
    "failure",
    "social",
    "autonomy",
    "progression",
    "aesthetic",
    "return",
    "attribution",
  ].map((id) => ({ id, human: awards, bot: "na", note: "" }));
  return JSON.stringify(
    {
      game: "Idlever",
      build,
      genre: "idle-hybrid",
      presets: "../riddle/eval/presets.json",
      profile: null,
      tier: 1,
      evaluator: "test",
      horizon: {},
      criterion: {},
      axes,
    },
    null,
    2,
  );
}

test("the manifest is the recorded sha256sum format and follows the bytes", () => {
  const root = sandbox();
  try {
    const dist = packageFixture(join(root, "dist"));
    const first = manifestOf(dist);
    assert.equal(first.files, 3);
    assert.match(first.text, /^[0-9a-f]{64} {2}\.\/assets\/app\.js\n/);
    assert.deepEqual(
      parseManifest(first.text).map((e) => ({ path: e.path, sha256: e.sha256 })),
      first.entries.map((e) => ({ path: e.path, sha256: e.sha256 })),
    );
    assert.equal(first.sha256, manifestOf(dist).sha256);
    writeFileSync(join(dist, "assets/app.js"), "console.log(2)\n");
    const second = manifestOf(dist);
    assert.notEqual(second.sha256, first.sha256);
    assert.equal(second.entries.find((e) => e.path === "./assets/app.js").bytes, 15);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("freeze is byte-deterministic, refuses a package other than the frozen one, and heals from the source", () => {
  const root = sandbox();
  try {
    const fixture = packageFixture(join(root, "pkg"));
    const dir = join(root, "frozen");
    const identity = () => JSON.parse(readFileSync(join(dir, "identity.json"), "utf8"));
    const freeze = (...extra) =>
      run("freeze", "--candidate", "smoke", "--dir", dir, "--no-serve", ...extra);

    assert.equal(freeze("--package", fixture).status, 0);
    const frozen = identity().dist.manifestSha256;
    const stable = identity().identitySha256;
    assert.equal(
      freeze("--package", fixture).status,
      0,
      "a second freeze of the same package must not refuse",
    );
    assert.equal(
      identity().dist.manifestSha256,
      frozen,
      "identical identity must mean identical bytes",
    );
    assert.equal(
      identity().identitySha256,
      stable,
      "the artifact identity must not move on a rebuild of the same source",
    );

    // a tampered dist is a different package: --no-build refuses and rewrites nothing
    appendFileSync(join(dir, "dist/index.html"), "tampered\n");
    const refused = freeze("--no-build");
    assert.equal(refused.status, 2);
    assert.match(refused.stderr, /REFUSING to reuse the frozen artifact/);
    assert.equal(
      identity().dist.manifestSha256,
      frozen,
      "the frozen record must not be rewritten on refusal",
    );
    assert.match(
      readFileSync(join(dir, "dist/index.html"), "utf8"),
      /tampered/,
      "refusal must not serve the tampered bytes as frozen",
    );

    // rebuilding from the source package restores the frozen bytes
    assert.equal(freeze("--package", fixture).status, 0);
    assert.equal(identity().dist.manifestSha256, frozen);
    assert.equal(manifestOf(join(dir, "dist")).sha256, frozen);
    assert.doesNotMatch(readFileSync(join(dir, "dist/index.html"), "utf8"), /tampered/);

    // a genuinely different package must not reuse this frozen artifact
    writeFileSync(join(fixture, "assets/app.js"), "console.log(3)\n");
    const other = freeze("--package", fixture);
    assert.equal(other.status, 2);
    assert.match(other.stderr, /REFUSING to reuse the frozen artifact/);
    assert.equal(identity().dist.manifestSha256, frozen);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the packet is the frozen brief plus the four briefed documents, and check catches anything else", () => {
  const root = sandbox();
  try {
    const fixture = packageFixture(join(root, "pkg"));
    const dir = join(root, "frozen");
    assert.equal(
      run("freeze", "--candidate", "smoke", "--dir", dir, "--package", fixture, "--no-serve")
        .status,
      0,
    );
    const brief = run(
      "brief",
      "--candidate",
      "smoke",
      "--dir",
      dir,
      "--rater",
      "r1",
      "--seed",
      "7",
      "--url",
      "http://127.0.0.1:9/",
    );
    assert.equal(brief.status, 0, brief.stderr);
    assert.equal(packetCheck("smoke", "r1", { dir }).problems.length, 0);

    const packet = join(dir, "packets/r1");
    const record = JSON.parse(readFileSync(join(packet, "PACKET.json"), "utf8"));
    assert.deepEqual(
      record.documents.map((d) => d.name),
      ["RATING.md", "FUN_EVAL_IDLE.md", "FRAMEWORK.md", "SCORECARD.template.json"],
    );
    assert.deepEqual(
      record.documents.map((d) => d.source),
      [
        "eval/RATING.md",
        "docs/FUN_EVAL_IDLE.md",
        "../eval-fun/docs/FRAMEWORK.md",
        "eval/SCORECARD.template.json",
      ],
    );
    const text = readFileSync(join(packet, "brief.txt"), "utf8");
    assert.match(text, /You are a blind fun rater/);
    assert.match(text, /card\/smoke\.r1\.json/);
    assert.doesNotMatch(text.split(APPENDIX_MARKER)[0], /eval\/cards\//);
    assert.doesNotMatch(
      text.split(APPENDIX_MARKER)[0],
      /\{URL\}|\{RATER\}|\{PORT\}|\{SEED\}|\{BUILD\}/,
    );

    // every leak the harness can author is caught: a stray file, an edited document, an injected score
    write(join(packet, "PLAN.md"), "# the design history\n");
    appendFileSync(join(packet, "RATING.md"), "\nedited\n");
    appendFileSync(join(packet, "brief.txt"), "\nThe build must reach a score of 85.\n");
    const leaked = packetCheck("smoke", "r1", { dir }).problems.join("\n");
    assert.match(leaked, /unexpected file in the packet: PLAN\.md/);
    assert.match(leaked, /RATING\.md is not a verbatim copy/);
    assert.match(leaked, /names a score target/);

    rmSync(join(packet, "PLAN.md"));
    assert.equal(
      run(
        "brief",
        "--candidate",
        "smoke",
        "--dir",
        dir,
        "--rater",
        "r1",
        "--seed",
        "7",
        "--url",
        "http://127.0.0.1:9/",
        "--force",
      ).status,
      0,
    );
    assert.equal(packetCheck("smoke", "r1", { dir }).problems.length, 0);
    assert.equal(existsSync(join(packet, "brief.txt")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test(
  "collect keys the card by candidate, rater and date and never overwrites one",
  needsEvalFun,
  () => {
    const root = sandbox();
    try {
      const fixture = packageFixture(join(root, "pkg"));
      const dir = join(root, "frozen");
      const cards = join(root, "cards");
      assert.equal(
        run("freeze", "--candidate", "smoke", "--dir", dir, "--package", fixture, "--no-serve")
          .status,
        0,
      );
      assert.equal(
        run(
          "brief",
          "--candidate",
          "smoke",
          "--dir",
          dir,
          "--rater",
          "r1",
          "--seed",
          "7",
          "--url",
          "http://127.0.0.1:9/",
        ).status,
        0,
      );
      const packetCard = join(dir, "packets/r1/card/smoke.r1.json");
      write(packetCard, cardFixture("smoke"));

      const landed = run(
        "collect",
        "--candidate",
        "smoke",
        "--dir",
        dir,
        "--rater",
        "r1",
        "--date",
        "2026-01-02",
        "--cards-dir",
        cards,
      );
      assert.equal(landed.status, 0, landed.stderr);
      const canonical = join(cards, "smoke.r1.json");
      const dated = join(dir, "cards/smoke.r1.2026-01-02.json");
      assert.equal(existsSync(canonical), true);
      assert.equal(existsSync(dated), true);
      assert.equal(readFileSync(canonical, "utf8"), readFileSync(dated, "utf8"));

      const again = run(
        "collect",
        "--candidate",
        "smoke",
        "--dir",
        dir,
        "--rater",
        "r1",
        "--date",
        "2026-01-03",
        "--cards-dir",
        cards,
      );
      assert.equal(again.status, 2);
      assert.match(again.stderr, /REFUSING to overwrite an existing card/);
      assert.deepEqual(
        json(canonical),
        json(packetCard),
        "the landed card must carry the filed card's content",
      );
      assert.equal(
        existsSync(join(dir, "cards/smoke.r1.2026-01-03.json")),
        false,
        "a refusal must land no new receipt",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
);

test("the score comes from the cards alone and repeats to the byte", needsEvalFun, () => {
  const root = sandbox();
  try {
    const fixture = packageFixture(join(root, "pkg"));
    const dir = join(root, "frozen");
    const cards = join(root, "cards");
    assert.equal(
      run("freeze", "--candidate", "smoke", "--dir", dir, "--package", fixture, "--no-serve")
        .status,
      0,
    );
    for (const [rater, awards] of [
      ["r1", 0.6],
      ["r2", 0.8],
    ]) {
      assert.equal(
        run(
          "brief",
          "--candidate",
          "smoke",
          "--dir",
          dir,
          "--rater",
          rater,
          "--seed",
          "7",
          "--url",
          "http://127.0.0.1:9/",
        ).status,
        0,
      );
      write(join(dir, `packets/${rater}/card/smoke.${rater}.json`), cardFixture("smoke", awards));
      assert.equal(
        run(
          "collect",
          "--candidate",
          "smoke",
          "--dir",
          dir,
          "--rater",
          rater,
          "--date",
          "2026-01-02",
          "--cards-dir",
          cards,
        ).status,
        0,
      );
    }
    const paths = [join(cards, "smoke.r1.json"), join(cards, "smoke.r2.json")];
    const first = scoreSummary("smoke", paths, { dir });
    const second = scoreSummary("smoke", paths, { dir });
    assert.deepEqual(second, first, "the same cards must give the same number");
    assert.deepEqual(
      first.cards.map((c) => c.total),
      [60, 80],
    );
    assert.equal(first.mean, 70);
    assert.equal(first.cards[0].preset, "idle-hybrid");
    assert.equal(typeof first.alpha, "number");
    assert.equal(
      JSON.stringify(first).includes("Utc"),
      false,
      "the score output carries no timestamp",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("collect reads a card's build as a claim about the build, with or without provenance", () => {
  const root = sandbox();
  try {
    const fixture = packageFixture(join(root, "pkg"));
    const dir = join(root, "frozen");
    const cards = join(root, "cards");
    assert.equal(
      run("freeze", "--candidate", "smoke", "--dir", dir, "--package", fixture, "--no-serve")
        .status,
      0,
    );
    const commit = json(join(dir, "identity.json")).git.commit;
    // The brief asks a rater for the identity it played, and the filed cards record provenance
    // around the commit; both forms must land, and a card naming another build must not.
    for (const [rater, build] of [
      [
        "r1",
        `${commit} (wasm sha256 ${"a".repeat(64)}; dist manifest sha256 ${"b".repeat(64)})`,
      ],
      ["r2", commit],
      ["r3", "smoke"],
    ]) {
      assert.equal(
        run(
          "brief",
          "--candidate",
          "smoke",
          "--dir",
          dir,
          "--rater",
          rater,
          "--seed",
          "7",
          "--url",
          "http://127.0.0.1:9/",
        ).status,
        0,
      );
      write(join(dir, `packets/${rater}/card/smoke.${rater}.json`), cardFixture(build));
      const landed = run(
        "collect",
        "--candidate",
        "smoke",
        "--dir",
        dir,
        "--rater",
        rater,
        "--date",
        "2026-01-02",
        "--cards-dir",
        cards,
      );
      assert.equal(landed.status, 0, landed.stderr);
      assert.doesNotMatch(landed.stderr, /WARNING|says build/, `rater ${rater}: ${landed.stderr}`);
    }
    write(
      join(dir, "packets/r1/card/smoke.r1.json"),
      cardFixture("ffffffffffffffffffffffffffffffffffffffff (another build)"),
    );
    const foreign = run(
      "collect",
      "--candidate",
      "smoke",
      "--dir",
      dir,
      "--rater",
      "r1",
      "--date",
      "2026-01-04",
      "--cards-dir",
      cards,
    );
    assert.notEqual(foreign.status, 0, "a card naming another build must be refused");
    assert.match(foreign.stderr, /says build .*another build/s);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
