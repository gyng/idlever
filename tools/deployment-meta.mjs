#!/usr/bin/env node
// Stamp the completed deployment artifact, never a source commit date or request time.
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const networkGuard = `// Deployment metadata bypasses every SW cache, including older rollback builds.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const metadata = new URL("meta.json", self.registration.scope);
  if (url.origin === metadata.origin && url.pathname === metadata.pathname)
    event.stopImmediatePropagation();
});
`;

export async function writeDeploymentMetadata({
  directory,
  commit,
  version,
  base = "/",
  now = new Date(),
}) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("Deployment commit must be a full Git SHA");
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error("Invalid deployment base path");
  if (version !== undefined && (typeof version !== "string" || !version.trim()))
    throw new Error("Deployment version must be nonempty");
  const metadata = {
    schemaVersion: 1,
    updatedAt: now.toISOString().replace(/\.\d{3}Z$/, "Z"),
    ...(version === undefined ? {} : { version }),
    commit,
  };
  const swPath = join(directory, "sw.js");
  const serviceWorker = await readFile(swPath, "utf8");
  // The deploy helper may build an older committed ref. Its worker needs the same
  // bypass before any pre-existing cache-first fetch listener can handle metadata.
  if (!serviceWorker.startsWith(networkGuard))
    await writeFile(swPath, networkGuard + serviceWorker);
  // Each host uploads this exact file alongside the matching completed build.
  await writeFile(join(directory, "meta.json"), JSON.stringify(metadata, null, 2) + "\n");
  const headersPath = join(directory, "_headers");
  let headers = "";
  try {
    headers = await readFile(headersPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await writeFile(
    headersPath,
    `${headers.replace(new RegExp(`^${base}meta\\.json\\n(?:[ \t]+[^\\n]*\\n)*`, "gm"), "").trimEnd()}\n${base}meta.json\n  Content-Type: application/json\n  Access-Control-Allow-Origin: *\n  Cache-Control: no-cache\n`.trimStart(),
  );
  return metadata;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [directory, commit, base = "/", version] = process.argv.slice(2);
  if (!directory || !commit)
    throw new Error("Usage: deployment-meta.mjs DIST COMMIT [BASE [VERSION]]");
  await writeDeploymentMetadata({ directory, commit, base, version: version || undefined });
}
