import { DefaultApiCore } from './api/core';
import { createEventsApi } from './api/events';
import { createFirstMessageApi } from './api/first-message';
import { createMessagesApi } from './api/messages';
import { createPersonaContractApi } from './api/persona-contract';
import { createPersonasApi } from './api/personas';
import { createSystemApi } from './api/system';
import { createTasksApi } from './api/tasks';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';
const API_PERSONA = import.meta.env.VITE_API_PERSONA || '';

function createApiClient(baseUrl: string, token: string, persona: string) {
  const core = new DefaultApiCore(baseUrl, token, persona);

  return {
    setToken: core.setToken.bind(core),
    setPersona: core.setPersona.bind(core),
    ...createPersonasApi(core),
    ...createPersonaContractApi(core),
    ...createFirstMessageApi(core),
    ...createMessagesApi(core),
    ...createTasksApi(core),
    ...createEventsApi(core),
    ...createSystemApi(core),
  };
}

export const apiClient = createApiClient(API_BASE_URL, API_TOKEN, API_PERSONA);
