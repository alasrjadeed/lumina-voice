import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './ui/ErrorBoundary.jsx'
import { initSentry, captureException } from './lib/logger.js'
import './index.css'

initSentry()
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => captureException(e.error || e.message, { source: 'window.error' }))
  window.addEventListener('unhandledrejection', (e) => captureException(e.reason, { source: 'unhandledrejection' }))
}

if (import.meta.env.DEV && typeof navigator !== 'undefined' && navigator.serviceWorker) {
  navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((r) => r.unregister())))
}

const root = document.getElementById('root')
if (!root) {
  throw new Error('Lumina Voice root element missing')
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
