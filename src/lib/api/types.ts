import type { ApiResponse } from '../../types/api';

export interface ApiCore {
  setToken(token: string): void;
  setPersona(persona: string): void;
  request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>>;
}
