import { describe, expect, it } from 'vitest'
import { ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD, isAdminEmail, roleForEmail } from '../src/config/auth'

describe('device-local admin account', () => {
  it('exposes the operator login shown in the app', () => {
    expect(ADMIN_EMAIL).toBe('info@alasarjadeed.com')
    expect(ADMIN_PASSWORD).toBe('Aroojaamir@1')
    expect(ADMIN_NAME).toBe('Admin')
  })

  it('matches the email regardless of case or surrounding space', () => {
    expect(isAdminEmail(ADMIN_EMAIL)).toBe(true)
    expect(isAdminEmail('  INFO@ALASARJADEED.COM ')).toBe(true)
    expect(isAdminEmail('listener@example.com')).toBe(false)
    expect(isAdminEmail(null)).toBe(false)
  })

  it('never promotes another email, even if it looks like an admin or its profile says admin', () => {
    expect(roleForEmail(ADMIN_EMAIL)).toBe('admin')
    expect(roleForEmail('  INFO@ALASARJADEED.COM ')).toBe('admin')
    expect(roleForEmail('admin@example.com')).toBe('listener')
    expect(roleForEmail('info@alasarjadeed.com.evil.test')).toBe('listener')
    expect(roleForEmail('listener@example.com')).toBe('listener')
  })
})
