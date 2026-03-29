import type { GlobalEvent } from '../../types/api';
import type { ApiCore } from './types';

export function createEventsApi(core: ApiCore) {
  return {
    getEvents(sinceId?: number, limit?: number) {
      const params = new URLSearchParams();
      if (sinceId && sinceId > 0) {
        params.set('since_id', String(sinceId));
      }
      if (limit && limit > 0) {
        params.set('limit', String(limit));
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      return core.request<GlobalEvent[]>(`events${query}`);
    },
  };
}
