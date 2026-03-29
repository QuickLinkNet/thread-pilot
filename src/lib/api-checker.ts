import { buildApiCheckerCatalog } from './api-checker/catalog';
import type { ApiEndpointItem } from './api-checker/types';
import { normalizeApiBase } from './api-checker/url';

export type { ApiEndpointItem } from './api-checker/types';

export function getApiCheckerItems(baseUrl: string): ApiEndpointItem[] {
  const base = normalizeApiBase(baseUrl);
  return buildApiCheckerCatalog(base);
}
