import { useState, useEffect } from 'react';
import { Dashboard } from './components/organisms/Dashboard';
import { TokenLogin } from './components/organisms/TokenLogin';
import { Card } from './components/atoms/Card';
import { Spinner } from './components/atoms/Spinner';
import { apiClient } from './lib/api-client';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const envToken = import.meta.env.VITE_API_TOKEN || '';

  useEffect(() => {
    const validateStoredToken = async () => {
      const storedToken = localStorage.getItem('api_token') || '';
      const token = storedToken || envToken;

      if (!token) {
        setIsLoading(false);
        return;
      }

      apiClient.setToken(token);
      const response = await apiClient.validateToken();

      if (response.ok) {
        localStorage.setItem('api_token', token);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('api_token');
        apiClient.setToken('');
      }

      setIsLoading(false);
    };

    validateStoredToken();
  }, [envToken]);

  const handleAuthenticated = (token: string) => {
    apiClient.setToken(token);
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div className="app-shell auth-layout">
        <Card className="auth-card" elevated>
          <Spinner label="Checking token..." />
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <TokenLogin defaultToken={envToken} onAuthenticated={handleAuthenticated} />;
  }

  return <Dashboard />;
}

export default App;
