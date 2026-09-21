#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const candidates = [
  process.env.FLYCTL_PATH,
  path.join(homedir(), ".fly", "bin", "flyctl.exe"),
  path.join(homedir(), ".fly", "bin", "flyctl"),
  "flyctl",
  "fly",
].filter(Boolean);

const flyctl = candidates.find((bin) => {
  if (bin === "flyctl" || bin === "fly") return true;
  return existsSync(bin);
});

if (!flyctl || (flyctl.includes(path.sep) && !existsSync(flyctl))) {
  console.error(
    "flyctl not found. Install from https://fly.io/docs/hands-on/install-flyctl/ then reopen the terminal.",
  );
  process.exit(1);
}

const child = spawn(flyctl, process.argv.slice(2), {
  stdio: "inherit",
  shell: flyctl === "flyctl" || flyctl === "fly",
});

child.on("exit", (code) => process.exit(code ?? 1));
