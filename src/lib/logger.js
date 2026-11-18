// Structured browser logging (pino) with optional Sentry alerting.
// Both are no-ops for alert delivery until VITE_SENTRY_DSN is configured, so
// the offline-first build never makes unexpected network calls.
import pino from 'pino'

const env = import.meta.env || {}
const level = env.VITE_LOG_LEVEL || (env.DEV ? 'debug' : 'warn')

export const logger = pino({
  level,
  browser: { asObject: true },
  base: { app: 'lumina-voice' },
  formatters: { level: (label) => ({ level: label }) }
})

let sentryPromise = null

export function initSentry() {
  const dsn = env.VITE_SENTRY_DSN
  if (!dsn) return null
  if (!sentryPromise) {
    sentryPromise = import('@sentry/browser')
      .then((Sentry) => {
        Sentry.init({
          dsn,
          environment: env.VITE_SENTRY_ENVIRONMENT || (env.DEV ? 'development' : 'production'),
          release: env.VITE_APP_VERSION || '1.0.0',
          tracesSampleRate: Number(env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0),
          integrations: [Sentry.browserTracingIntegration?.()].filter(Boolean)
        })
        return Sentry
      })
      .catch((err) => {
        logger.warn({ err }, 'sentry init failed')
        return null
      })
  }
  return sentryPromise
}

export function captureException(error, context = {}) {
  logger.error({ err: error, ...context }, 'unhandled error')
  const pending = initSentry()
  if (pending) pending.then((Sentry) => Sentry?.captureException(error, { extra: context }))
}

export function captureMessage(message, context = {}) {
  logger.warn({ ...context }, message)
  const pending = initSentry()
  if (pending) pending.then((Sentry) => Sentry?.captureMessage(message, { extra: context }))
}
