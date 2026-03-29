import type { ApiEndpointItem } from '../types';
import { buildRouteUrl } from '../url';

export function buildEventsCatalog(base: URL): ApiEndpointItem[] {
  return [
    {
      id: 'events-list',
      category: 'Events',
      method: 'GET',
      name: 'Events',
      description: 'Read global event stream',
      url: buildRouteUrl(base, 'events', { token: '{TOKEN}', since_id: '{ID}', limit: '{LIMIT}' }),
    },
  ];
}
