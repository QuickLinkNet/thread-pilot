import { useState } from 'react';
import { usePersonas } from '../../hooks/usePersonas';
import { apiClient } from '../../lib/api-client';

interface PersonaSelectorProps {
  onPersonaSelected: () => void;
}

export function PersonaSelector({ onPersonaSelected }: PersonaSelectorProps) {
  const { personas, loading } = usePersonas();
  const [selectedToken, setSelectedToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedToken) {
      apiClient.setToken(selectedToken);
      localStorage.setItem('api_token', selectedToken);
      onPersonaSelected();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Thread Pilot</h1>
        <p className="text-gray-600 mb-6">Select your persona to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose Persona
            </label>
            {loading ? (
              <div className="text-gray-500">Loading personas...</div>
            ) : (
              <div className="space-y-2">
                {personas.map((persona) => (
                  <label
                    key={persona.id}
                    className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="persona"
                      value={persona.token}
                      checked={selectedToken === persona.token}
                      onChange={(e) => setSelectedToken(e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{persona.name}</div>
                      <div className="text-sm text-gray-600">{persona.role}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!selectedToken}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
