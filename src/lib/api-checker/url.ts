export function normalizeApiBase(base: string): URL {
  const trimmed = base.trim();
  const raw = trimmed || '/api';
  return new URL(raw, window.location.origin);
}

export function buildRouteUrl(base: URL, route: string, query?: Record<string, string>): string {
  const url = new URL(base.toString());
  const normalizedPath = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
  url.pathname = `${normalizedPath}/${route}`;

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

export function buildRawUtilityUrl(base: URL, relativePath: string): string {
  return new URL(`${base.pathname.replace(/\/$/, '')}/${relativePath}`, base.origin).toString();
}
