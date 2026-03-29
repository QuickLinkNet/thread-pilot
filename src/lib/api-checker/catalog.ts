import type { ApiEndpointItem } from './types';
import { buildEventsCatalog } from './catalog/events';
import { buildMessagesCatalog } from './catalog/messages';
import { buildPersonasCatalog } from './catalog/personas';
import { buildSystemCatalog } from './catalog/system';
import { buildTasksCatalog } from './catalog/tasks';

export function buildApiCheckerCatalog(base: URL): ApiEndpointItem[] {
  return [
    ...buildPersonasCatalog(base),
    ...buildMessagesCatalog(base),
    ...buildTasksCatalog(base),
    ...buildEventsCatalog(base),
    ...buildSystemCatalog(base),
  ];
}
