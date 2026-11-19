import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppState.jsx'
import { oauthAuthorizeUrl, requestPasswordReset } from '../data/api'
import { ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD, isAdminEmail } from '../config/auth'
import { BrandMark } from '../art/covers'
import { IcoGoogle } from '../ui/Icons'

export default function Auth() {
  const { login, authenticate, authConfigured, backend, user } = useApp()
  const nav = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const resetMode = mode === 'reset'

  // After Supabase OAuth redirects back with tokens in the hash, AppState
  // consumes them on boot; once the session lands, continue into the app.
  useEffect(() => {
    if (user) nav('/', { replace: true })
  }, [user, nav])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setInfo('')
    const uname = email.trim()
    if (mode === 'reset') {
      if (!authConfigured) {
        setErr('Password recovery needs Supabase. Connect it first in Settings → Supabase.')
        return
      }
      if (!uname.includes('@')) {
        setErr('Enter your email address.')
        return
      }
      setBusy(true)
      try {
        await requestPasswordReset(uname)
        setInfo('Recovery link sent. Open it on this device or the tablet to choose a new password.')
        setMode('login')
        setPass('')
      } catch (e) {
        setErr(e.message || 'Could not send the recovery email.')
      } finally {
        setBusy(false)
      }
      return
    }
    // Device-local operator: only info@alasarjadeed.com with the bundled
    // password. Supabase accounts take over when a backend is configured.
    if (!authConfigured && isAdminEmail(uname)) {
      if (pass !== ADMIN_PASSWORD) {
        setErr('Incorrect admin password.')
        return
      }
      login(ADMIN_EMAIL, ADMIN_NAME)
      nav('/')
      return
    }
    if (!uname.includes('@') || pass.length < 6) {
      setErr('Enter a valid email and a password of 6+ characters.')
      return
    }
    setBusy(true)
    const res = await authenticate({ email, password: pass, name, mode })
    setBusy(false)
    if (!res.ok) {
      setErr(res.error || 'Could not sign you in. Please try again.')
      return
    }
    if (res.needsConfirmation) {
      setInfo('Almost there — check your inbox to confirm your email, then sign in.')
      setMode('login')
      return
    }
    nav('/')
  }

  const google = () => {
    // Real Google sign-in when Supabase is configured (Google provider enabled
    // in the dashboard); otherwise fall back to the local demo guest account.
    if (authConfigured) {
      const url = oauthAuthorizeUrl('google')
      if (url) {
        window.location.href = url
        return
      }
      setErr('Google sign-in is not enabled on this backend yet.')
      return
    }
    login('guest@luminavoice.app', 'Lumina Guest')
    nav('/')
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="auth-logo">
          <div className="brand" style={{ width: 64, height: 64, borderRadius: 20 }}>
            <BrandMark size={36} />
          </div>
        </div>
        <div className="kicker" style={{ textAlign: 'center' }}>LUMINA VOICE</div>
        <p className="urdu" style={{ textAlign: 'center', fontSize: 18, color: 'var(--gold)', marginTop: -6 }}>
          آنکھیں بند کیجیے، کہانی شروع ہوتی ہے
        </p>
        <h1>{resetMode ? 'Reset your Password' : mode === 'login' ? 'Sign in to your Account' : 'Create your Account'}</h1>
        <p className="meta" style={{ textAlign: 'center', marginTop: -8 }}>
          {authConfigured ? `Secured by Supabase · ${backend}` : 'Local demo account (no backend configured)'}
        </p>
        {err ? <div className="err">{err}</div> : null}
        {info ? <div className="info-note">{info}</div> : null}
        {mode === 'register' ? (
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
        ) : null}
        <div className="field">
          <label>Email</label>
          <input type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </div>
        {!resetMode ? (
          <div className="field">
            <label>Password</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
          </div>
        ) : null}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : resetMode ? 'Send recovery link' : mode === 'login' ? 'Login' : 'Register'}
        </button>
        {!resetMode && authConfigured ? (
          <p className="hint" style={{ marginTop: -4 }}>
            <a
              href="#reset"
              onClick={(e) => { e.preventDefault(); setMode('reset'); setErr(''); setInfo('') }}
            >
              Forgot password?
            </a>
          </p>
        ) : null}
        {!resetMode ? (
          <>
            <div className="or">or Login with</div>
            <button type="button" className="btn btn-ghost btn-block" onClick={google}>
              <IcoGoogle /> Google
            </button>
          </>
        ) : null}
        <p className="hint">
          {resetMode ? (
            <>
              Remembered it?{' '}
              <a href="#login" onClick={(e) => { e.preventDefault(); setMode('login'); setErr(''); setInfo('') }}>
                Back to sign in
              </a>
            </>
          ) : mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <a href="#reg" onClick={(e) => { e.preventDefault(); setMode('register'); setErr(''); setInfo('') }}>
                Register
              </a>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <a href="#login" onClick={(e) => { e.preventDefault(); setMode('login'); setErr(''); setInfo('') }}>
                Login
              </a>
            </>
          )}
        </p>
        <p className="hint" style={{ textAlign: 'center' }}>
          {authConfigured
            ? 'Your own email creates your own saved library. The shared Archive.org catalogue is visible to everyone; only the operator account can manage it.'
            : 'Local demo mode: your library stays on this device unless Supabase is connected.'}
        </p>
        <p className="hint" style={{ textAlign: 'center' }}>
          <Link to="/site" className="linkish">View the website — no account needed →</Link>
        </p>
      </form>
    </div>
  )
}
