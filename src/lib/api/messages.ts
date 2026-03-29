import type { Message, MessageSyncData, MessageType } from '../../types/api';
import type { ApiCore } from './types';

export function createMessagesApi(core: ApiCore) {
  return {
    getMessages(sinceId?: number) {
      const query = sinceId ? `?since_id=${sinceId}` : '';
      return core.request<Message[]>(`messages${query}`);
    },

    getMessagesFor(personaName: string, sinceId?: number) {
      const params = new URLSearchParams();
      params.set('for', personaName);
      if (sinceId) {
        params.set('since_id', String(sinceId));
      }
      return core.request<Message[]>(`messages?${params.toString()}`);
    },

    getMessagesSync(sinceId: number = 0, personaName?: string) {
      const params = new URLSearchParams();
      params.set('action', 'sync');
      params.set('since_id', String(Math.max(0, sinceId)));
      if (personaName && personaName.trim() !== '') {
        params.set('for', personaName.trim());
      }
      return core.request<MessageSyncData | Message[]>(`messages?${params.toString()}`);
    },

    sendMessage(content: string) {
      return core.request<Message>('messages?action=send', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },

    sendStructuredMessage(payload: {
      content: string;
      type?: MessageType;
      task_id?: number;
      mentions?: string[];
    }) {
      return core.request<Message>('messages?action=send', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };
}
