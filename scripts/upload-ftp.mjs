import path from "node:path";
import { stat } from "node:fs/promises";
import { Client } from "basic-ftp";

const deployDir = path.join(process.cwd(), "deploy");

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

async function ensureDeployDir() {
  const info = await stat(deployDir).catch(() => null);
  if (!info || !info.isDirectory()) {
    throw new Error("deploy folder missing. Run `npm run deploy:prepare` first.");
  }
}

async function main() {
  await ensureDeployDir();

  const host = getRequiredEnv("FTP_HOST");
  const user = getRequiredEnv("FTP_USER");
  const password = getRequiredEnv("FTP_PASSWORD");
  const remoteDir = process.env.FTP_REMOTE_DIR || "/html/apps/thread-pilot/";
  const port = Number(process.env.FTP_PORT || 21);
  const secure = parseBool(process.env.FTP_SECURE, false);

  const client = new Client(30000);
  client.ftp.verbose = false;

  try {
    await client.access({
      host,
      user,
      password,
      port,
      secure,
    });

    await client.ensureDir(remoteDir);
    await client.uploadFromDir(deployDir);
    console.log(`FTP upload done: ${deployDir} -> ${remoteDir}`);
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error("deploy:ftp failed:", error.message);
  process.exit(1);
});
