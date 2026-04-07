import type { FirstMessage, FirstMessageHistoryItem } from '../../types/api';
import type { ApiCore } from './types';

export function createFirstMessageApi(core: ApiCore) {
  return {
    getFirstMessage() {
      return core.request<FirstMessage>('first-message?format=json');
    },

    getFirstMessageHistory(limit: number = 50) {
      return core.request<FirstMessageHistoryItem[]>(`first-message?action=history&limit=${limit}`);
    },

    saveFirstMessage(payload: { text: string; change_note?: string }) {
      return core.request<FirstMessage>('first-message', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    restoreFirstMessage(payload: { id: number }) {
      return core.request<FirstMessage>('first-message?action=restore', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };
}
