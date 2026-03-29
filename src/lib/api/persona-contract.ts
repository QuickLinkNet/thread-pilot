import type { PersonaContract, PersonaContractHistoryItem } from '../../types/api';
import type { ApiCore } from './types';

export function createPersonaContractApi(core: ApiCore) {
  return {
    getPersonaContract() {
      return core.request<PersonaContract>('persona-contract?format=json');
    },

    getPersonaContractHistory(limit: number = 50) {
      return core.request<PersonaContractHistoryItem[]>(`persona-contract?action=history&limit=${limit}`);
    },

    savePersonaContract(payload: { text: string; change_note?: string; version?: string }) {
      return core.request<PersonaContract>('persona-contract?action=save', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    restorePersonaContract(payload: { version_id: number; change_note?: string }) {
      return core.request<PersonaContract>('persona-contract?action=restore', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };
}
