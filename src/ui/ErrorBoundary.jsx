import React from 'react'
import { captureException } from '../lib/logger.js'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) {
    return { err }
  }
  componentDidCatch(err, info) {
    captureException(err, { source: 'ErrorBoundary', componentStack: info?.componentStack })
    const msg = String(err?.message || err || '')
    if (/missing AppProvider|does not provide an export named/.test(msg)) {
      sessionStorage.setItem('lumina-sw-bust', '1')
    }
  }
  render() {
    if (!this.state.err) return this.props.children
    if (this.props.fallback) return this.props.fallback
    return (
      <div style={{ minHeight: '100vh', padding: 32, background: '#08070b', color: '#f4efe6', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ letterSpacing: '0.16em', color: '#e4c36a', fontSize: 12 }}>LUMINA VOICE</p>
        <h1 style={{ fontSize: 28, margin: '8px 0 12px' }}>Something went wrong</h1>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#ef6b6b', fontSize: 13 }}>{String(this.state.err?.message || this.state.err)}</pre>
        <button
          type="button"
          onClick={() => {
            const go = () => window.location.reload()
            if (navigator.serviceWorker) {
              navigator.serviceWorker.getRegistrations()
                .then((regs) => Promise.all(regs.map((r) => r.unregister())))
                .then(() => (window.caches ? caches.keys() : Promise.resolve([])))
                .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
                .finally(go)
            } else go()
          }}
          style={{ marginTop: 16, height: 44, padding: '0 18px', borderRadius: 999, border: 0, background: '#e4c36a', color: '#1a1408', fontWeight: 600 }}
        >
          Reset and reload
        </button>
      </div>
    )
  }
}
