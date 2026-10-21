#!/usr/bin/env node
// Cut316: the design system's enforcement. Colours, type sizes and selector escalation live in one place.
//
//   node tools/style-lint.mjs            check (CI, verify.sh)
//   node tools/style-lint.mjs --update   lower the ratchet to the current counts (never raises it)
//
// Rules:
// - web/src/ui-kit/tokens.css is the only file that may spell a colour (hex, rgb(), hsl()).
// - web/src/ui-kit/**.css and web/src/screens/**.css: no colour literal, no literal font-size, no `html body` / `!important`.
// - Legacy stylesheets (everything else) are grandfathered in tools/style-ratchet.json: per file, the counts of colour literals,
//   literal font sizes, `html body` selectors and `!important` may only fall. A legacy file not in the ratchet is an error —
//   new styling goes in ui-kit/ or screens/.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const src = join(root, "web/src");
const ratchetPath = join(root, "tools/style-ratchet.json");
const update = process.argv.includes("--update");

const walk = (d) =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    if (f === "pkg" || f === "node_modules") return [];
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".css") ? [p] : [];
  });
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "");
function count(text) {
  const t = strip(text);
  return {
    colour: (t.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g) ?? []).length,
    fontSize: (t.match(/font-size:\s*[\d.]+(?:px|rem|em)|font:[^;]*?\b[\d.]+(?:px|rem)\b/g) ?? [])
      .length,
    htmlBody: (t.match(/\bhtml(?:\.[\w-]+)?\s+body\b/g) ?? []).length,
    important: (t.match(/!important/g) ?? []).length,
  };
}
const ratchet = JSON.parse(readFileSync(ratchetPath, "utf8").toString() || "{}");
const errors = [];
const next = {};
for (const file of walk(src).sort()) {
  const rel = relative(root, file);
  const c = count(readFileSync(file, "utf8"));
  const kit = rel.startsWith("web/src/ui-kit/") || rel.startsWith("web/src/screens/");
  if (kit) {
    const tokens = rel === "web/src/ui-kit/tokens.css";
    if (!tokens && c.colour) errors.push(`${rel}: ${c.colour} colour literal(s) — use a token`);
    if (!tokens && c.fontSize)
      errors.push(`${rel}: ${c.fontSize} literal font size(s) — use --k-fs-*`);
    if (c.htmlBody || c.important)
      errors.push(`${rel}: specificity escalation (html body / !important) — use layers`);
    continue;
  }
  const was = ratchet[rel];
  if (!was) {
    if (update) next[rel] = c;
    else
      errors.push(
        `${rel}: new legacy stylesheet — put new styling in web/src/ui-kit/ or web/src/screens/`,
      );
    continue;
  }
  for (const k of Object.keys(c))
    if (c[k] > was[k]) errors.push(`${rel}: ${k} ${was[k]} → ${c[k]} (the ratchet only falls)`);
  next[rel] = Object.fromEntries(Object.keys(c).map((k) => [k, Math.min(c[k], was[k])]));
}
if (update) {
  writeFileSync(ratchetPath, JSON.stringify(next, null, 1) + "\n");
  console.log(`style-lint: ratchet written (${Object.keys(next).length} legacy files)`);
}
const total = (k) => Object.values(next).reduce((s, c) => s + c[k], 0);
if (errors.length && !update) {
  for (const e of errors) console.error("style-lint: " + e);
  process.exit(1);
}
console.log(
  `style-lint: ok — legacy remaining: ${total("colour")} colours · ${total("fontSize")} font sizes · ${total("htmlBody")} html body · ${total("important")} !important in ${Object.keys(next).length} files`,
);
