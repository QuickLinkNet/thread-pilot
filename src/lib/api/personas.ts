import type { Persona } from '../../types/api';
import type { ApiCore } from './types';

export function createPersonasApi(core: ApiCore) {
  return {
    getPersonas() {
      return core.request<Persona[]>('personas');
    },

    getPersonaById(id: number) {
      return core.request<Persona>(`personas/${id}`);
    },

    addPersona(persona: { name: string; role: string; skills?: string[] }) {
      return core.request<Persona>('personas?action=add', {
        method: 'POST',
        body: JSON.stringify(persona),
      });
    },

    updatePersona(id: number, updates: Partial<{ name: string; role: string; skills: string[] }>) {
      return core.request<Persona>('personas?action=update', {
        method: 'POST',
        body: JSON.stringify({ id, ...updates }),
      });
    },

    regeneratePersonaToken(id: number) {
      return core.request<Persona>('personas?action=regen_token', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
    },

    deletePersona(id: number) {
      return core.request<{ deleted: boolean }>('personas?action=delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
    },
  };
}
