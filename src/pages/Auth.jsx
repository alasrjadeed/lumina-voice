import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppState.jsx'
import { oauthAuthorizeUrl } from '../data/api'
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
    // Device-local operator: info@alasarjadeed.com (or "admin") with the bundled
    // password. Supabase accounts take over when a backend is configured.
    if (!authConfigured && (/^admin$/i.test(uname) || isAdminEmail(uname))) {
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
        <h1>{mode === 'login' ? 'Sign in to your Account' : 'Create your Account'}</h1>
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
          <label>{!authConfigured && (/^admin$/i.test(email.trim()) || isAdminEmail(email)) ? 'Admin username / email' : 'Email'}</label>
          <input type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com · or admin" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Register'}
        </button>
        <div className="or">or Login with</div>
        <button type="button" className="btn btn-ghost btn-block" onClick={google}>
          <IcoGoogle /> Google
        </button>
        <p className="hint">
          {mode === 'login' ? (
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
        <button
          type="button"
          className="studio-hint"
          onClick={() => {
            setEmail(ADMIN_EMAIL)
            setPass(ADMIN_PASSWORD)
            setMode('login')
            setErr('')
            setInfo('')
          }}
        >
          {`Admin login: ${ADMIN_EMAIL} · password “${ADMIN_PASSWORD}”.`}
        </button>
        <p className="hint" style={{ textAlign: 'center' }}>
          <Link to="/site" className="linkish">View the website — no account needed →</Link>
        </p>
      </form>
    </div>
  )
}
