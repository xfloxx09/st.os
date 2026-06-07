import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const host = process.env.HOST ?? "0.0.0.0";
const port = process.env.PORT ?? "3000";

const root = dirname(fileURLToPath(import.meta.url));
const nextBin = join(root, "..", "node_modules", "next", "dist", "bin", "next");

console.log(`[ca.os] starting next on ${host}:${port}`);

const child = spawn(process.execPath, [nextBin, "start", "-H", host, "-p", port], {
  stdio: "inherit",
  env: process.env,
  cwd: join(root, ".."),
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
