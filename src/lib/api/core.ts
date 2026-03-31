import type { ApiResponse } from '../../types/api';
import type { ApiCore } from './types';
import { isValidThreadPilotToken, normalizeThreadPilotToken } from '../token';

function parseLooseJson<T>(raw: string): ApiResponse<T> | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as ApiResponse<T>;
  } catch {
    // Continue with best-effort extraction.
  }

  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart !== -1 && objectEnd > objectStart) {
    const candidate = trimmed.slice(objectStart, objectEnd + 1);
    try {
      return JSON.parse(candidate) as ApiResponse<T>;
    } catch {
      // Ignore and try array shape below.
    }
  }

  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    const candidate = trimmed.slice(arrayStart, arrayEnd + 1);
    try {
      return JSON.parse(candidate) as ApiResponse<T>;
    } catch {
      // Nothing else to do.
    }
  }

  return null;
}

export class DefaultApiCore implements ApiCore {
  private baseUrl: string;
  private token: string;
  private persona: string;

  constructor(baseUrl: string, token: string, persona: string) {
    this.baseUrl = baseUrl;
    const normalized = normalizeThreadPilotToken(token);
    this.token = isValidThreadPilotToken(normalized) ? normalized : '';
    this.persona = persona;
  }

  setToken(token: string) {
    const normalized = normalizeThreadPilotToken(token);
    this.token = isValidThreadPilotToken(normalized) ? normalized : '';
  }

  setPersona(persona: string) {
    this.persona = persona;
  }

  request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.performRequest<T>(endpoint, options);
  }

  private buildUrl(endpoint: string): string {
    const [route, endpointQuery = ''] = endpoint.split('?');
    const url = new URL(this.baseUrl, window.location.origin);
    const hasRouteQuery = url.searchParams.has('route');

    if (hasRouteQuery) {
      url.searchParams.set('route', route);
    } else {
      const normalizedPath = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
      url.pathname = `${normalizedPath}/${route}`;
    }

    if (endpointQuery) {
      const queryParams = new URLSearchParams(endpointQuery);
      queryParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    }

    if (this.token) {
      url.searchParams.set('token', this.token);
    }

    return url.toString();
  }

  private async performRequest<T>(endpoint: string, options: RequestInit): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { 'X-THREAD-TOKEN': this.token } : {}),
          ...(this.persona ? { 'X-THREAD-PERSONA': this.persona } : {}),
          ...options.headers,
        },
      });

      const raw = await response.text();
      if (!raw) {
        return response.ok
          ? ({ ok: true } as ApiResponse<T>)
          : { ok: false, error: `HTTP ${response.status}` };
      }

      const parsed = parseLooseJson<T>(raw);
      if (parsed) {
        return parsed;
      }

      const preview = raw.trim().slice(0, 140).replace(/\s+/g, ' ');
      return {
        ok: false,
        error: `Invalid JSON response (HTTP ${response.status})${preview ? `: ${preview}` : ''}`,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
