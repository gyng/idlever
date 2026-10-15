// Static completeness inventory; classifications are candidates, never runtime passes.
import ts from "../../../web/node_modules/typescript/lib/typescript.js";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../../../", import.meta.url);
const rows = [];
const registry = readFileSync(new URL("web/src/ui/menu-material.ts", root), "utf8");
const families = {
  "camp.ts": "bloodlines",
  "chronicle.ts": "journal",
  "class-styles.ts": "bloodlines",
  "class-tree.ts": "bloodlines",
  "crier.ts": "journal",
  "death.ts": "journal",
  "editor.ts": "bloodlines",
  "ending.ts": "bloodlines",
  "feats.ts": "journal",
  "forge.ts": "forge",
  "frame.ts": "journal",
  "gold.ts": "journal",
  "hero-hub.ts": "bloodlines",
  "hero-life.ts": "bloodlines",
  "heroes.ts": "bloodlines",
  "journal-window.ts": "journal",
  "legendary-discovery.ts": "forge",
  "look.ts": "bloodlines",
  "oaths.ts": "bloodlines",
  "packages.ts": "bloodlines",
  "party.ts": "bloodlines",
  "patches.ts": "bloodlines",
  "preparation.ts": "bloodlines",
  "quest.ts": "journal",
  "replay.ts": "journal",
  "return-pick.ts": "bloodlines",
  "runs.ts": "journal",
  "settings.ts": "forge",
  "tactic-observer.ts": "journal",
  "town.ts": "forge",
  "trace.ts": "journal",
  "unlocks.ts": "bloodlines",
  "watch.ts": "forge",
  "works.ts": "forge",
};
const defaultProbed = new Set([
  "openChronicle",
  "openForge",
  "openGoldSheet",
  "openHeroHub",
  "openHeroLife",
  "openJournal",
  "openLooks",
  "openOathBoard",
  "openPackages",
  "openLedger",
  "openPreparationForge",
  "openRuns",
  "openSettings",
  "openHeroClass",
  "openWorks",
]);
function classify(name, owner, classes) {
  const exception =
    (name === "frame.ts" && owner === "renderConsole") || ["pickCond", "pickVerb"].includes(owner);
  const gap = classes.has("drop-sheet") && !registry.includes(".drop-sheet");
  const material = exception
    ? "intentional compact anchored control"
    : owner === "openRowSheet" || owner === "openHeroClass"
      ? "bloodlines"
      : ["openWhy", "openLedger"].includes(owner)
        ? "journal"
        : owner === "openRules"
          ? "bloodlines"
          : families[name];
  return {
    materialClassification: {
      intended: material,
      current: gap
        ? "unassigned semantic material (source-confirmed; earned runtime delivery pending)"
        : exception
          ? "dedicated anchored control exception"
          : material,
      authority: exception
        ? "Existing anchored token/console behavior retained by Cut241/Cut243"
        : gap
          ? "Current menu-material.ts has no matching selector or explicit material option"
          : "Current explicit opener option, sheet.ts built-in material, or menu-material.ts selector; static classification only",
    },
    runtimeCoverage: defaultProbed.has(owner)
      ? {
          status: "actual current earned default measured",
          evidence: [
            "baseline-dom/results.json",
            "candidate-dom/results.json",
            "candidate-desktop-dom/results.json",
          ],
          limit:
            "22 major entry routes; no child/state inference; only rows with measurements count",
        }
      : {
          status: "not newly probed",
          evidence: [],
          limit: "Needs actual public entry/earned state; historical family proof is not promoted",
        },
    stateApplicability: {
      status: "source audit only; runtime state matrix pending",
      requiredReview: [
        "default",
        "selected",
        "locked",
        "disabled",
        "away",
        "empty",
        "confirmation",
        "refusal",
        "busy",
        "error",
      ],
      limit: "No state marked inapplicable or passed merely from source classification",
    },
  };
}
const hash = (x) => createHash("sha256").update(x).digest("hex");
for (const name of readdirSync(new URL("web/src/ui/", root)).filter((n) => n.endsWith(".ts"))) {
  const path = `web/src/ui/${name}`,
    text = readFileSync(new URL(path, root), "utf8");
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const local = new Map();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.text !== "./sheet")
      continue;
    for (const item of statement.importClause?.namedBindings?.elements ?? []) {
      const imported = item.propertyName?.text ?? item.name.text;
      if (["openSheet", "openWindow"].includes(imported)) local.set(item.name.text, imported);
    }
  }
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      local.has(node.expression.text)
    ) {
      const classes = new Set(),
        dynamic = [];
      function props(n) {
        if (ts.isPropertyAssignment(n) && n.name.getText(file) === "class") {
          if (ts.isStringLiteralLike(n.initializer))
            n.initializer.text.split(/\s+/).forEach((c) => classes.add(c));
          else dynamic.push(n.initializer.getText(file));
        }
        ts.forEachChild(n, props);
      }
      if (node.arguments[0]) props(node.arguments[0]);
      let ancestor = node.parent,
        owner = null;
      while (ancestor) {
        if (ts.isFunctionDeclaration(ancestor) && ancestor.name) {
          owner = ancestor.name.text;
          break;
        }
        ancestor = ancestor.parent;
      }
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      rows.push({
        id: `${name}:${line}`,
        path,
        line,
        sourceSha256: hash(text),
        opener: local.get(node.expression.text),
        owner,
        explicitOptions: node.arguments[1]?.getText(file) ?? null,
        classes: [...classes],
        dynamicClasses: dynamic,
        sourceOpening: node.getText(file).slice(0, 220),
        ...classify(name, owner, classes),
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
}
const dedicated = [
  "game-menu.ts",
  "camp.ts",
  "town.ts",
  "watch.ts",
  "report.ts",
  "death.ts",
  "ending.ts",
  "editor.ts",
];
writeFileSync(
  new URL("source-routes.json", import.meta.url),
  JSON.stringify(
    {
      scope:
        "All imported sheet/window calls resolved through TypeScript AST (including aliases), plus dedicated screen inventory. Source inventory is not runtime/state acceptance.",
      semanticOpenerCallsites: rows.length,
      routes: rows,
      dedicated: dedicated.map((name) => ({
        path: `web/src/ui/${name}`,
        sourceSha256: hash(readFileSync(new URL(`web/src/ui/${name}`, root))),
        coverage: "pending dedicated-screen/control-family mapping",
      })),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Inventoried ${rows.length} semantic opener callsites and ${dedicated.length} dedicated screen modules.`,
);
