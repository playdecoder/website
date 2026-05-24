#!/usr/bin/env node
/**
 * Generate all social layouts + podcast covers for every episode in social-posts.json.
 * Output: output/ep01/social/, output/ep01/rss/, output/ep02/…
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = __dirname;

function run(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(scriptsDir, script), ...args], {
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

async function main() {
  const extra = process.argv.slice(2);

  console.log("Generating social frames (all episodes, all layouts)…");
  await run("generate-social-post.mjs", ["--all-episodes", "--all-layouts", ...extra]);

  console.log("\nGenerating podcast covers (all episodes)…");
  await run("generate-podcast-cover.mjs", ["--all", ...extra]);

  console.log("\nDone → output/ep01/, output/ep02/, …");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
