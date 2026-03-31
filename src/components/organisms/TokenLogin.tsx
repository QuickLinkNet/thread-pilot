import { useState } from 'react';
import { apiClient } from '../../lib/api-client';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { TextField } from '../atoms/FormFields';
import { AlertBox } from '../molecules/AlertBox';
import { isValidThreadPilotToken, normalizeThreadPilotToken } from '../../lib/token';

interface TokenLoginProps {
  defaultToken?: string;
  onAuthenticated: (token: string) => void;
}

export function TokenLogin({ defaultToken = '', onAuthenticated }: TokenLoginProps) {
  const [token, setToken] = useState(normalizeThreadPilotToken(defaultToken));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedToken = normalizeThreadPilotToken(token);
    if (!trimmedToken || loading) {
      return;
    }
    if (!isValidThreadPilotToken(trimmedToken)) {
      setError('Ungueltiger Token. Erwartet wird ein 64-stelliger Hex-Token.');
      return;
    }

    setLoading(true);
    setError(null);
    apiClient.setToken(trimmedToken);

    const response = await apiClient.validateToken();

    if (response.ok) {
      localStorage.setItem('api_token', trimmedToken);
      onAuthenticated(trimmedToken);
      return;
    }

    apiClient.setToken('');
    setError(response.error || 'Token validation failed');
    setLoading(false);
  };

  return (
    <div className="app-shell auth-layout">
      <Card className="auth-card" elevated>
        <header className="auth-head">
          <h1>Thread Pilot</h1>
          <p>Admin Dashboard Access</p>
        </header>

        <form onSubmit={handleSubmit} className="auth-form">
          <TextField
            id="api-token"
            label="API Token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token eingeben"
          />

          {error && <AlertBox>{error}</AlertBox>}

          <Button type="submit" block disabled={!token.trim() || loading}>
            {loading ? 'Token wird geprueft...' : 'Dashboard oeffnen'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
