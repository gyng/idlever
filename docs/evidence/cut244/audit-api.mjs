// Run from repository root. Inventories actual declarations/registries, not substring matches.
import ts from '../../../web/node_modules/typescript/lib/typescript.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { generate } from '../../../tools/native-codegen.mjs';
const retired = ['loadout', 'keep', 'autoKeep', 'setKeepPref', 'insure', 'sellVault'];
const sources = {};
function source(path) {
  const body = readFileSync(path, 'utf8');
  sources[path] = createHash('sha256').update(body).digest('hex');
  return ts.createSourceFile(path, body, ts.ScriptTarget.Latest, true);
}
const registries = {}, fields = {};
for (const path of ['web/src/engine/types.ts', 'web/src/engine/wasm.ts', 'web/src/engine/fake.ts', 'web/src/engine/proxy.ts', 'web/src/app.ts', 'web/src/store.ts']) {
  const ast = source(path), methods = [], resurrected = [];
  function walk(n) {
    if ((ts.isMethodDeclaration(n) || ts.isMethodSignature(n)) && n.name) methods.push(n.name.getText(ast));
    if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'METHODS') {
      for (const el of n.initializer.elements) methods.push(el.text);
    }
    if ((ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n) || ts.isClassDeclaration(n)) && n.name) {
      const members = n.members ?? n.type?.members;
      if (members) fields[`${path}:${n.name.text}`] = members.filter(m => ts.isPropertySignature(m) || ts.isPropertyDeclaration(m)).map(m => m.name.getText(ast));
    }
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) && n.left.expression.getText(ast) === 'P' && retired.includes(n.left.name.text)) resurrected.push(n.left.name.text);
    ts.forEachChild(n, walk);
  }
  walk(ast);
  registries[path] = { methods: [...new Set(methods)].sort(), retired: methods.filter(x => retired.includes(x)), resurrected };
}
const violations = [];
for (const [path, r] of Object.entries(registries)) if (r.retired.length || r.resurrected.length) violations.push({ path, methods: r.retired, prototypeAssignments: r.resurrected });
for (const [name, denied] of Object.entries({
  'web/src/engine/types.ts:Lineage': ['vault', 'insured', 'keep_pref', 'keep_auto', 'keep_salvaged', 'selected_loadout'],
  'web/src/engine/types.ts:StandingOrders': ['keep', 'insure'],
  'web/src/engine/types.ts:StepResult': ['exit_pending'],
  'web/src/engine/types.ts:Stake': ['brought'],
  'web/src/engine/types.ts:ReturnReport': ['found', 'kept'],
  'web/src/engine/types.ts:RunRec': ['kept'],
  'web/src/app.ts:App': ['loadout'],
  'web/src/store.ts:SaveBlob': ['loadout'],
})) {
  if (!fields[name]) throw Error(`Missing actual type ${name}`);
  for (const field of denied) if (fields[name].includes(field)) violations.push({ type: name, field });
}
const engine = registries['web/src/engine/types.ts'].methods;
for (const required of ['choose', 'setVaultPref', 'setStartingKit', 'saveStartingKit', 'selectStartingKit', 'deleteStartingKit', 'buySupply', 'dropSupply']) if (!engine.includes(required)) violations.push({ missingActiveMethod: required });
const bridgePath = 'crates/idlever-wasm/src/lib.rs', bridge = readFileSync(bridgePath, 'utf8');
sources[bridgePath] = createHash('sha256').update(bridge).digest('hex');
const shipping = JSON.parse(generate(bridge).metadata), published = JSON.parse(readFileSync('web/src/engine/native-api.json', 'utf8'));
const native = { shippingMethods: shipping.methods.map(m => m.name), publishedMethods: published.methods.map(m => m.name), publishedBridgeMatches: shipping.bridgeSha256 === published.bridgeSha256 };
native.retiredShipping = native.shippingMethods.filter(n => retired.includes(n));
native.retiredPublished = native.publishedMethods.filter(n => retired.includes(n));
const clientPass = violations.length === 0, nativePass = !native.retiredShipping.length && !native.retiredPublished.length && native.publishedBridgeMatches;
const result = { scope: 'Source declaration and generated API registry absence only; not runtime/WASM or gameplay parity acceptance', clientPass, nativePass, violations, registries, native, sources };
const arg = process.argv.indexOf('--out');
if (arg >= 0) writeFileSync(process.argv[arg + 1], JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ clientPass, nativePass, violations, pendingShipping: native.retiredShipping, pendingPublished: native.retiredPublished }));
if (!clientPass || (!process.argv.includes('--client-only') && !nativePass)) process.exitCode = 1;
