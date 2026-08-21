import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    return statSync(fullPath).isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const files = [
  ...["src", "tests", "scripts"].flatMap(walk),
  "playwright.config.js"
].filter((file) => file.endsWith(".js") || file.endsWith(".mjs"));

for (const file of files) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

console.log(`Syntax check passed for ${files.length} files.`);
