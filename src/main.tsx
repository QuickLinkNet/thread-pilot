import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

const theme = import.meta.env.VITE_THEME || 'classic';
if (theme === 'logo') {
  await import('./styles/theme-logo.css');
} else {
  await import('./styles/theme-classic.css');
}

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
