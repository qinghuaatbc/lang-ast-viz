import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={
      <div style={{ padding: 40, fontFamily: 'monospace', color: '#ff6b6b' }}>
        <h2>App crashed — check browser console for details</h2>
      </div>
    }>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
