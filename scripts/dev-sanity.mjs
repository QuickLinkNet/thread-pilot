import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function collectPhpFiles(dir) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectPhpFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.toLowerCase().endsWith('.php')) {
      files.push(fullPath);
    }
  }

  return files;
}

function run(cmd, args, label) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: 'pipe',
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`\n[FAIL] ${label}`);
    if (result.stdout) console.error(result.stdout.trim());
    if (result.stderr) console.error(result.stderr.trim());
    process.exit(1);
  }

  if (result.stdout?.trim()) {
    console.log(result.stdout.trim());
  }
}

function runPhpLint() {
  const phpFiles = collectPhpFiles('api');
  if (phpFiles.length === 0) {
    console.log('[INFO] No PHP files found under api/');
    return;
  }

  console.log(`[INFO] Linting ${phpFiles.length} PHP files...`);
  for (const file of phpFiles) {
    run('php', ['-l', file], `php -l ${file}`);
  }
}

function runTypeScriptCheck() {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  console.log('[INFO] Running TypeScript build check...');
  run(npmCmd, ['run', '-s', 'tsc:check'], 'npm run -s tsc:check');
}

function main() {
  runPhpLint();
  runTypeScriptCheck();
  console.log('\n[OK] dev:sanity passed');
}

main();

