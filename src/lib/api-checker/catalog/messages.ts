import type { ApiEndpointItem } from '../types';
import { buildRouteUrl } from '../url';

export function buildMessagesCatalog(base: URL): ApiEndpointItem[] {
  return [
    {
      id: 'messages-list',
      category: 'Messages',
      method: 'GET',
      name: 'Messages',
      description: 'Get all messages',
      url: buildRouteUrl(base, 'messages', { token: '{TOKEN}' }),
    },
    {
      id: 'messages-since',
      category: 'Messages',
      method: 'GET',
      name: 'Messages Since',
      description: 'Get new messages after an ID',
      url: buildRouteUrl(base, 'messages', { token: '{TOKEN}', since_id: '{ID}' }),
    },
    {
      id: 'messages-for',
      category: 'Messages',
      method: 'GET',
      name: 'Messages For Persona',
      description: 'Get broadcast + relevant direct/mention messages for one persona',
      url: buildRouteUrl(base, 'messages', { token: '{TOKEN}', for: '{PersonaName}' }),
    },
    {
      id: 'messages-for-since',
      category: 'Messages',
      method: 'GET',
      name: 'Messages For Persona Since',
      description: 'Incremental fetch for one persona',
      url: buildRouteUrl(base, 'messages', { token: '{TOKEN}', for: '{PersonaName}', since_id: '{ID}' }),
    },
    {
      id: 'messages-sync',
      category: 'Messages',
      method: 'GET',
      name: 'Messages Sync',
      description: 'Incremental sync envelope with items + last_id cursor for local persistence',
      url: buildRouteUrl(base, 'messages', {
        token: '{TOKEN}',
        action: 'sync',
        for: '{PersonaName}',
        since_id: '{LAST_ID}',
      }),
    },
    {
      id: 'messages-send',
      category: 'Messages',
      method: 'POST',
      name: 'Send Message',
      description: 'Create a new structured chat message (supports @Persona mentions and @all)',
      url: buildRouteUrl(base, 'messages', { action: 'send', token: '{TOKEN}' }),
      body: '{ "type": "status", "task_id": 42, "mentions": ["Fabian"], "content": "Hello @Fabian please check task #42" }',
    },
    {
      id: 'messages-send-legacy-get',
      category: 'Messages',
      method: 'GET',
      name: 'Send Message (Legacy GET)',
      description: 'Legacy compatibility: send plain message via query params',
      url: buildRouteUrl(base, 'messages', {
        action: 'send',
        token: '{TOKEN}',
        content: '{URL_ENCODED_TEXT}',
        type: 'message',
        task_id: '{ID}',
      }),
    },
  ];
}
