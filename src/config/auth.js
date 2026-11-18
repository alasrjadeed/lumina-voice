// Device-local operator account. The native app has no backend, so this
// credential ships with the app bundle and only gates local demo features.
// For a public deployment, use a real auth provider instead.
export const ADMIN_EMAIL = 'info@alasarjadeed.com'
export const ADMIN_PASSWORD = 'Aroojaamir@1'
export const ADMIN_NAME = 'Admin'

export const isAdminEmail = (email) =>
  typeof email === 'string' && email.trim().toLowerCase() === ADMIN_EMAIL
