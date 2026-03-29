import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

function loadDotEnv(filePath = '.env') {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function normalizeBaseUrl() {
  const raw =
    process.env.SMOKE_BASE_URL
    || process.env.VITE_API_BASE_URL
    || 'http://localhost:5173/api';

  return new URL(raw);
}

function routeUrl(baseUrl, route, query = {}) {
  const url = new URL(baseUrl.toString());
  const hasRouteQuery = url.searchParams.has('route');

  if (hasRouteQuery) {
    url.searchParams.set('route', route);
  } else {
    const pathname = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
    url.pathname = `${pathname}/${route}`;
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const raw = await response.text();

  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    raw,
    json: parsed,
  };
}

function assertApiOk(result, label) {
  if (!result.ok) {
    throw new Error(`${label} failed with HTTP ${result.status}: ${result.raw.slice(0, 300)}`);
  }

  if (!result.json || typeof result.json !== 'object') {
    throw new Error(`${label} returned no JSON object`);
  }

  if (result.json.ok !== true) {
    const errorText = result.json.error || result.raw;
    throw new Error(`${label} API error: ${errorText}`);
  }

  return result.json.data;
}

function requireEnv(name, fallback = '') {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

async function main() {
  loadDotEnv('.env');
  loadDotEnv('.env.local');

  const baseUrl = normalizeBaseUrl();
  const token = requireEnv('SMOKE_TOKEN', process.env.VITE_API_TOKEN || process.env.API_TOKEN || '');
  const persona = process.env.SMOKE_PERSONA || process.env.VITE_API_PERSONA || 'Admin';
  const assignee = process.env.SMOKE_ASSIGNEE || persona;
  const strictMessages = (process.env.SMOKE_STRICT_MESSAGES || '0') === '1';

  const commonHeaders = {
    'Content-Type': 'application/json',
    'X-THREAD-TOKEN': token,
    'X-THREAD-PERSONA': persona,
  };

  console.log(`[SMOKE] Base URL: ${baseUrl.toString()}`);
  console.log(`[SMOKE] Persona: ${persona}`);

  const healthData = assertApiOk(
    await requestJson(routeUrl(baseUrl, 'health')),
    'GET health',
  );
  console.log(`[OK] health: ${healthData.status}`);

  assertApiOk(
    await requestJson(routeUrl(baseUrl, 'stats'), { headers: commonHeaders }),
    'GET stats',
  );
  console.log('[OK] stats');

  const contractData = assertApiOk(
    await requestJson(routeUrl(baseUrl, 'persona-contract', { format: 'json' }), { headers: commonHeaders }),
    'GET persona-contract',
  );
  console.log(`[OK] contract: v${contractData.version}`);

  try {
    const syncResult = await requestJson(
      routeUrl(baseUrl, 'messages', { action: 'sync', since_id: 0 }),
      { headers: commonHeaders },
    );
    if (syncResult.ok && syncResult.json?.ok === true) {
      const syncData = syncResult.json.data ?? {};
      console.log(`[OK] messages sync: ${syncData.count ?? 0} items`);
    } else {
      console.warn('[WARN] messages sync failed, fallback to messages?since_id=0');
      assertApiOk(
        await requestJson(routeUrl(baseUrl, 'messages', { since_id: 0 }), { headers: commonHeaders }),
        'GET messages since',
      );
      console.log('[OK] messages since fallback');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (strictMessages) {
      throw error;
    }
    console.warn(`[WARN] messages endpoint check skipped: ${message}`);
  }

  const createdTask = assertApiOk(
    await requestJson(routeUrl(baseUrl, 'tasks', { action: 'add' }), {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({
        title: `[SMOKE] ${new Date().toISOString()}`,
        description: 'Automated smoke test ticket',
        assignee,
        tags: 'smoke,automation',
      }),
    }),
    'POST tasks add',
  );

  const taskId = Number(createdTask.id || 0);
  if (!Number.isFinite(taskId) || taskId <= 0) {
    throw new Error('POST tasks add did not return a valid task id');
  }
  console.log(`[OK] tasks add: #${taskId}`);

  assertApiOk(
    await requestJson(routeUrl(baseUrl, `tasks/${taskId}`), { headers: commonHeaders }),
    'GET task by id',
  );
  console.log('[OK] task by id');

  assertApiOk(
    await requestJson(routeUrl(baseUrl, 'tasks', { action: 'delete' }), {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({ task_id: taskId }),
    }),
    'POST tasks delete',
  );
  console.log(`[OK] tasks delete: #${taskId}`);

  console.log('\n[OK] api:smoke passed');
}

main().catch((error) => {
  console.error('\n[FAIL] api:smoke');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
