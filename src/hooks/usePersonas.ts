import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';
import type { Persona } from '../types/api';

export function usePersonas() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonas = async () => {
    const response = await apiClient.getPersonas();

    if (response.ok && response.data) {
      setPersonas(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch personas');
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  return { personas, loading, error, refetch: fetchPersonas };
}
