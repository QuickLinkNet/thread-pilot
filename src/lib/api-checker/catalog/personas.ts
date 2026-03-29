import type { ApiEndpointItem } from '../types';
import { buildRouteUrl } from '../url';

export function buildPersonasCatalog(base: URL): ApiEndpointItem[] {
  return [
    {
      id: 'personas-list',
      category: 'Personas',
      method: 'GET',
      name: 'Personas',
      description: 'List all personas',
      url: buildRouteUrl(base, 'personas', { token: '{TOKEN}' }),
    },
    {
      id: 'personas-single',
      category: 'Personas',
      method: 'GET',
      name: 'Persona by ID',
      description: 'Get one persona by ID',
      url: buildRouteUrl(base, 'personas/{ID}', { token: '{TOKEN}' }),
    },
    {
      id: 'personas-add',
      category: 'Personas',
      method: 'POST',
      name: 'Persona Add',
      description: 'Create a persona',
      url: buildRouteUrl(base, 'personas', { action: 'add', token: '{TOKEN}' }),
      body: '{ "name": "Alice", "role": "frontend", "skills": ["react", "ui"] }',
    },
    {
      id: 'personas-update',
      category: 'Personas',
      method: 'POST',
      name: 'Persona Update',
      description: 'Update persona name/role',
      url: buildRouteUrl(base, 'personas', { action: 'update', token: '{TOKEN}' }),
      body: '{ "id": 2, "name": "Alice", "role": "backend", "skills": ["php", "sqlite"] }',
    },
    {
      id: 'personas-regen',
      category: 'Personas',
      method: 'POST',
      name: 'Persona Regenerate Token',
      description: 'Generate a new token for one persona',
      url: buildRouteUrl(base, 'personas', { action: 'regen_token', token: '{TOKEN}' }),
      body: '{ "id": 2 }',
    },
    {
      id: 'personas-delete',
      category: 'Personas',
      method: 'POST',
      name: 'Persona Delete',
      description: 'Delete one persona',
      url: buildRouteUrl(base, 'personas', { action: 'delete', token: '{TOKEN}' }),
      body: '{ "id": 2 }',
    },
  ];
}
