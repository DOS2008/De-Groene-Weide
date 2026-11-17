/**
 * Checks that the dev container has the same source files as the working
 * tree (Compose Watch can stop syncing after a container restart).
 *
 *   node scripts/dev/check-sync.mjs          # report differences
 *   node scripts/dev/check-sync.mjs --fix    # copy the differing files over
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const container = process.env.CONTAINER ?? "groene-weide-web-1";
const fix = process.argv.includes("--fix");
const paths = ["src", "messages", "supabase", "scripts", "e2e", "next.config.ts", "playwright.config.ts", "package.json"];
const files = execFileSync("git", ["ls-files", "-c", "-o", "--exclude-standard", ...paths], { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && existsSync(f));

// Hash with line endings removed, so CRLF on Windows doesn't count.
const hash = (buf) => createHash("md5").update(buf.toString("binary").replace(/\r/g, "")).digest("hex");
const local = new Map(files.map((f) => [f, hash(readFileSync(f))]));

// One node process in the container hashes every file the same way.
const script = `const fs=require("fs"),c=require("crypto");const out={};for(const f of JSON.parse(process.argv[1])){try{out[f]=c.createHash("md5").update(fs.readFileSync("/app/"+f).toString("binary").replace(/\r/g,"")).digest("hex")}catch{out[f]=null}}console.log(JSON.stringify(out))`;
const remote = JSON.parse(
  execFileSync("docker", ["exec", container, "node", "-e", script, JSON.stringify(files)], { encoding: "utf8", maxBuffer: 1 << 24 }),
);

const bad = files.filter((f) => remote[f] !== local.get(f));
for (const f of bad) {
  console.log(`out of sync: ${f}`);
  if (fix) {
    execFileSync("docker", ["exec", container, "mkdir", "-p", `/app/${f.split("/").slice(0, -1).join("/") || "."}`]);
    execFileSync("docker", ["cp", f, `${container}:/app/${f}`]);
  }
}
console.log(`${bad.length} file(s) out of sync${fix && bad.length ? ", copied" : ""}`);
