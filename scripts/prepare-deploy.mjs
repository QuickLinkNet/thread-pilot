import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const deployDir = path.join(rootDir, "deploy");
const distDir = path.join(rootDir, "dist");
const apiSrcDir = path.join(rootDir, "api");
const apiDstDir = path.join(deployDir, "api");
const rootHtaccess = path.join(rootDir, ".htaccess");

function isExcluded(relativePath, isDirectory) {
  const normalized = relativePath.split(path.sep).join("/");
  const name = path.basename(relativePath);

  if (isDirectory && (name === "data" || name === "node_modules" || name === ".git")) {
    return true;
  }

  if (!isDirectory && (name === ".env" || name.startsWith(".env."))) {
    return true;
  }

  if (normalized === "data" || normalized.startsWith("data/")) {
    return true;
  }

  if (normalized.includes("/node_modules/") || normalized.includes("/.git/")) {
    return true;
  }

  return false;
}

async function copyApiRecursive(srcDir, dstDir, relative = "") {
  const entries = await readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = relative ? path.join(relative, entry.name) : entry.name;
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);

    if (entry.isDirectory()) {
      if (isExcluded(relPath, true)) {
        continue;
      }
      await mkdir(dstPath, { recursive: true });
      await copyApiRecursive(srcPath, dstPath, relPath);
      continue;
    }

    if (entry.isFile()) {
      if (isExcluded(relPath, false)) {
        continue;
      }
      await cp(srcPath, dstPath, { force: true });
    }
  }
}

async function ensureExists(directoryPath, label) {
  try {
    const info = await stat(directoryPath);
    if (!info.isDirectory()) {
      throw new Error(`${label} is not a directory: ${directoryPath}`);
    }
  } catch (error) {
    throw new Error(`${label} not found: ${directoryPath}`);
  }
}

async function main() {
  await ensureExists(distDir, "dist");
  await ensureExists(apiSrcDir, "api");

  await rm(deployDir, { recursive: true, force: true });
  await mkdir(deployDir, { recursive: true });

  await cp(distDir, deployDir, { recursive: true, force: true });

  await mkdir(apiDstDir, { recursive: true });
  await copyApiRecursive(apiSrcDir, apiDstDir);

  if (existsSync(rootHtaccess)) {
    await cp(rootHtaccess, path.join(deployDir, ".htaccess"), { force: true });
  }

  console.log("Deploy folder prepared:", deployDir);
  console.log("Included: dist + api + optional root .htaccess (without api/data, .env*, node_modules, .git)");
}

main().catch((error) => {
  console.error("deploy:prepare failed:", error.message);
  process.exit(1);
});
