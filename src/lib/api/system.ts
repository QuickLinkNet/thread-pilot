import type {
  ApiResponse,
  DbRowsResponse,
  DbSchemaResponse,
  DbTableInfo,
  Message,
  SystemHealth,
  SystemStats,
} from '../../types/api';
import type { ApiCore } from './types';

export function createSystemApi(core: ApiCore) {
  return {
    getHealth() {
      return core.request<SystemHealth>('health');
    },

    getStats() {
      return core.request<SystemStats>('stats');
    },

    getDbTables() {
      return core.request<DbTableInfo[]>('db?action=tables');
    },

    getDbSchema(table: string) {
      const params = new URLSearchParams({
        action: 'schema',
        table,
      });
      return core.request<DbSchemaResponse>(`db?${params.toString()}`);
    },

    getDbRows(table: string, limit: number = 50, offset: number = 0) {
      const params = new URLSearchParams({
        action: 'rows',
        table,
        limit: String(limit),
        offset: String(offset),
      });
      return core.request<DbRowsResponse>(`db?${params.toString()}`);
    },

    async validateToken(): Promise<ApiResponse<boolean>> {
      const response = await core.request<Message[]>('messages?since_id=2147483647');

      if (!response.ok) {
        return {
          ok: false,
          error: response.error || 'Invalid token',
        };
      }

      return {
        ok: true,
        data: true,
      };
    },
  };
}
