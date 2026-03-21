#!/usr/bin/env node
/**
 * Seeds packages via Supabase CLI. Project ref is read from VITE_SUPABASE_URL
 * (the subdomain: https://THIS_PART.supabase.co).
 *
 * Requires: npx supabase login
 * Optional: SUPABASE_DB_PASSWORD in .env if the CLI asks for your database password.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

function loadEnvFile(path) {
  if (!existsSync(path)) {
    console.error("Missing .env — copy .env.example and set VITE_SUPABASE_URL.");
    process.exit(1);
  }
  const text = readFileSync(path, "utf8");
  const out = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function runNpx(args, env) {
  const r = spawnSync("npx", args, {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, ...env },
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const env = loadEnvFile(envPath);
const rawUrl = env.VITE_SUPABASE_URL;
if (!rawUrl) {
  console.error("VITE_SUPABASE_URL is not set in .env");
  process.exit(1);
}

let urlString = rawUrl.trim();
if (!/^https?:\/\//i.test(urlString)) urlString = `https://${urlString}`;

let hostname;
try {
  hostname = new URL(urlString).hostname;
} catch {
  console.error(`Invalid VITE_SUPABASE_URL: ${rawUrl}`);
  process.exit(1);
}

const ref = hostname.split(".")[0];
if (!/^[a-z0-9]{20}$/.test(ref)) {
  console.error(
    `Could not parse project ref from VITE_SUPABASE_URL.\n` +
      `  Hostname: ${hostname}\n` +
      `  Subdomain: "${ref}" (expected 20 characters a-z 0-9)\n` +
      `  Or run: npx supabase link --project-ref <Dashboard → Settings → General → Reference ID>`,
  );
  process.exit(1);
}

console.log(`Project ref from VITE_SUPABASE_URL: ${ref}`);
console.log("Linking project…");

const linkArgs = ["supabase", "link", "--project-ref", ref, "--yes"];
if (env.SUPABASE_DB_PASSWORD) {
  linkArgs.splice(2, 0, "-p", env.SUPABASE_DB_PASSWORD);
}

runNpx(linkArgs);

console.log("Running seed SQL…");
runNpx(["supabase", "db", "query", "--file", "supabase/seed/seed_packages.sql", "--linked"]);

console.log("Done.");
