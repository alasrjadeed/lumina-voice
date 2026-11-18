import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBroadcast } from '../state/Broadcast.jsx'
import { runPipeline, providerStatus } from '../ai/pipeline'
import { buildSystemPrompt, buildReport, offlineReply, parseBotJson, scanProblems, BOT_TOOLS } from '../ai/brain'
import { loadKeys } from '../ai/providers'
import { DAYS, hhmm } from '../data/broadcast'
import { IcoBolt, IcoWave } from '../ui/Icons'

const QUICK = [
  { label: 'Daily report', msg: 'Generate the daily broadcast report.' },
  { label: 'Repair errors', msg: 'Scan for errors and repair them.' },
  { label: 'Rebuild week', msg: 'Regenerate the weekly schedule.' },
  { label: 'Status', msg: 'What is the station status?' }
]

function botContext(b, ownerNow) {
  return {
    live: b.live,
    mode: b.mode,
    listeners: b.listeners,
    daypart: b.daypart,
    owner: ownerNow,
    rotation: b.rotation,
    enabledCount: b.rotation.filter((r) => r.enabled).length,
    schedule: b.schedule,
    spins: b.spins,
    problems: scanProblems({
      rotation: b.rotation,
      logs: b.logs
    })
  }
}

export default function LuminaBot() {
  const b = useBroadcast()
  const [statusTick, setStatusTick] = useState(0)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(null) // proposed actions awaiting approval
  const [tasks, setTasks] = useState(() => ({
    report: true,
    health: true,
    regen: false
  }))
  const [taskLog, setTaskLog] = useState([])
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      content:
        'Salaam — Lumina Bot online. I share the desk with you: full control in my shifts, approval-required in shared time. Ask for a report, a repair, or a status check.'
    }
  ])
  const feedRef = useRef(null)

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const ctx = useMemo(() => botContext(b, b.ownerNow), [b.rotation, b.logs, b.live, b.mode, b.listeners, b.daypart, b.ownerNow])

  const problems = scanProblems({ rotation: b.rotation, logs: b.logs })

  // Apply proposed actions: auto in bot-owned windows, approval otherwise.
  const applyActions = (actions, force = false) => {
    actions.forEach((a) => b.runBotAction(a.tool, a.args || {}, force))
  }

  const send = async (textIn) => {
    const text = (textIn ?? input).trim()
    if (!text || busy) return
    setInput('')
    setPending(null)
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setBusy(true)
    try {
      const sys = buildSystemPrompt(ctx)
      const remote = await runPipeline(
        [{ role: 'system', content: sys }, ...next.slice(-8)],
        loadKeys()
      )
      let reply
      let actions = []
      let provider = 'offline'
      if (remote) {
        provider = remote.provider
        const parsed = parseBotJson(remote.text)
        if (parsed) {
          reply = parsed.reply
          actions = parsed.actions.filter((a) => a && typeof a.tool === 'string')
        } else {
          reply = remote.text
        }
      } else {
        const off = offlineReply(text, ctx)
        reply = off.reply
        actions = off.actions
      }
      if (actions.length) {
        if (b.botCanAct) {
          applyActions(actions)
          reply += `\n\n✅ Executed: ${actions.map((a) => a.tool).join(', ')}`
        } else {
          setPending(actions)
          reply += `\n\n⏳ Control is human-owned — review the proposed actions below and approve.`
        }
      }
      setMessages((m) => [...m, { role: 'assistant', content: reply, provider }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `Pipeline error: ${e.message || e}` }])
    } finally {
      setBusy(false)
      setStatusTick((n) => n + 1)
    }
  }

  const approve = () => {
    if (!pending) return
    applyActions(pending, true)
    setMessages((m) => [...m, { role: 'assistant', content: `✅ Approved & executed: ${pending.map((a) => a.tool).join(', ')}.` }])
    setPending(null)
  }

  // Background tasks — run on an interval while the tab is open.
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date()
      if (!tasks.report && !tasks.health && !tasks.regen) return
      if (tasks.health && now.getMinutes() % 15 === 0) {
        const p = scanProblems({ rotation: b.rotation, logs: b.logs })
        setTaskLog((l) => [{ t: Date.now(), text: p.length ? `Health check: ${p.length} issue(s).` : 'Health check: all clear.' }, ...l].slice(0, 20))
      }
      if (tasks.regen && now.getHours() === 3 && now.getMinutes() === 0 && b.botCanAct) {
        b.applyAISchedule()
        setTaskLog((l) => [{ t: Date.now(), text: 'Nightly schedule regeneration ran.' }, ...l].slice(0, 20))
      }
      if (tasks.report && now.getHours() === 8 && now.getMinutes() === 0) {
        setMessages((m) => [...m, { role: 'assistant', content: buildReport(ctx), provider: 'scheduled' }])
      }
    }, 60000)
    return () => clearInterval(id)
  }, [tasks, b.rotation, b.logs, b.botCanAct, ctx])

  const status = providerStatus()
  void statusTick

  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="display">Lumina Bot</h2>
          <p className="meta" style={{ margin: 0 }}>
            AI co-pilot for the control room · pipeline with free daily-token providers and offline fallback
          </p>
        </div>
        <span className={`owner-chip ${b.ownerNow}`}>
          <IcoBolt />
          Desk: {b.ownerNow.toUpperCase()}
        </span>
      </div>

      <div className="bot-layout">
        <div className="bot-main">
          <div className="bot-feed panel" ref={feedRef}>
            {messages.map((m, i) => (
              <div className={`bot-msg ${m.role}`} key={i}>
                <div className="bot-who">
                  {m.role === 'user' ? 'You' : 'Lumina Bot'}
                  {m.provider && m.provider !== 'offline' ? <span className="bot-provider">{m.provider}</span> : null}
                  {m.provider === 'offline' ? <span className="bot-provider off">offline</span> : null}
                </div>
                <div className="bot-text">{m.content}</div>
              </div>
            ))}
            {busy ? (
              <div className="bot-msg assistant">
                <div className="bot-who">Lumina Bot</div>
                <div className="bot-text bot-typing"><i /><i /><i /></div>
              </div>
            ) : null}
          </div>

          {pending ? (
            <div className="bot-pending panel">
              <strong>Proposed actions (approval required):</strong>
              {pending.map((a, i) => (
                <div className="pending-row" key={i}>
                  <code>{a.tool}</code>
                  <span className="meta">{JSON.stringify(a.args || {})}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-primary" onClick={approve}><IcoBolt /> Approve & run</button>
                <button className="btn btn-ghost" onClick={() => setPending(null)}>Discard</button>
              </div>
            </div>
          ) : null}

          <div className="quick-row">
            {QUICK.map((q) => (
              <button key={q.label} className="quality-pill" onClick={() => send(q.msg)} disabled={busy}>
                {q.label}
              </button>
            ))}
          </div>

          <div className="bot-input">
            <input
              className="search-input"
              placeholder="Ask Lumina Bot… (report, repair, rebuild week, status)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={busy}
            />
            <button className="btn btn-primary" onClick={() => send()} disabled={busy || !input.trim()}>
              {busy ? 'Thinking…' : 'Send'}
            </button>
          </div>
        </div>

        <div className="bot-side">
          <div className="panel">
            <div className="row-title" style={{ marginTop: 0 }}>
              <h2>Agent pipeline</h2>
            </div>
            {status.map((p) => (
              <div className="pipe-row" key={p.id}>
                <span className={`pipe-dot ${p.used > 0 ? 'ok' : ''} ${p.cooldown ? 'cool' : ''}`} />
                <span className="pipe-name">{p.name}</span>
                <span className="pipe-tokens">{p.used.toLocaleString()} / {p.budget.toLocaleString()}</span>
              </div>
            ))}
            <p className="meta" style={{ marginBottom: 0 }}>
              Fallback order top→bottom; quota or error advances to the next agent. All agents unavailable → offline
              heuristic agent keeps the bot alive.
            </p>
          </div>

          <div className="panel">
            <div className="row-title" style={{ marginTop: 0 }}>
              <h2>Error repair</h2>
              <span className={`log-chip ${problems.length ? 'warn' : 'all'} active`}>{problems.length}</span>
            </div>
            {problems.map((p) => (
              <div className={`repair-row ${p.severity}`} key={p.id}>
                <div>
                  <div className="repair-title">{p.title}</div>
                  <div className="meta">{p.detail}</div>
                </div>
                {p.fix ? (
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      b.runBotAction(p.fix.tool, p.fix.args, true)
                      setTaskLog((l) => [{ t: Date.now(), text: `Fixed: ${p.title}` }, ...l].slice(0, 20))
                    }}
                  >
                    Fix
                  </button>
                ) : null}
              </div>
            ))}
            {!problems.length ? <p className="meta" style={{ margin: 0 }}>Rotation and logs look healthy.</p> : null}
            <button
              className="btn btn-ghost"
              style={{ marginTop: 10 }}
              onClick={() => {
                const md = buildReport(ctx)
                const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }))
                const a = document.createElement('a')
                a.href = url
                a.download = `lumina-report-${new Date().toISOString().slice(0, 10)}.md`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              Export report (MD)
            </button>
          </div>

          <div className="panel">
            <div className="row-title" style={{ marginTop: 0 }}>
              <h2>Shifts &amp; authority</h2>
            </div>
            <div className="stream-quality" role="group" aria-label="Control owner">
              {['human', 'both', 'bot'].map((o) => (
                <button
                  key={o}
                  className={`quality-pill ${b.authority.owner === o ? 'active' : ''}`}
                  onClick={() => b.setAuthorityOwner(o)}
                >
                  {o === 'human' ? 'Human only' : o === 'bot' ? 'Bot only' : 'Shared'}
                </button>
              ))}
            </div>
            {b.authority.shifts.map((s) => (
              <div className="shift-row" key={s.id}>
                <span className="shift-days">{s.days.map((d) => DAYS[d][0]).join('')}</span>
                <span className="shift-time">{hhmm(s.start)}–{hhmm(s.end)}</span>
                <select
                  className="select"
                  value={s.owner}
                  onChange={(e) => b.updateAuthorityShift(s.id, { owner: e.target.value })}
                >
                  <option value="bot">Bot</option>
                  <option value="human">Human</option>
                  <option value="both">Shared</option>
                </select>
                <button className="icon-btn" aria-label="Remove shift" onClick={() => b.removeAuthorityShift(s.id)}>
                  ✕
                </button>
              </div>
            ))}
            <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => b.addAuthorityShift()}>
              <IcoWave /> Add bot shift (weekdays 09:00–18:00)
            </button>
            <p className="meta" style={{ marginBottom: 0, marginTop: 10 }}>
              In <b>Bot only</b> / bot shifts the bot acts automatically. In <b>Shared</b> it proposes and you approve.
              In <b>Human only</b> every bot action is denied and logged.
            </p>
          </div>

          <div className="panel">
            <div className="row-title" style={{ marginTop: 0 }}>
              <h2>Scheduled tasks</h2>
            </div>
            {[
              ['report', 'Morning report at 08:00'],
              ['health', 'Rotation health check every 15 min'],
              ['regen', 'Nightly schedule regeneration (03:00, bot-owned only)']
            ].map(([id, label]) => (
              <label className="task-row" key={id}>
                <input
                  type="checkbox"
                  checked={tasks[id]}
                  onChange={(e) => setTasks((t) => ({ ...t, [id]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
            {taskLog.map((l, i) => (
              <div className="meta" key={i}>{new Date(l.t).toLocaleTimeString()} · {l.text}</div>
            ))}
          </div>

          <div className="panel">
            <div className="row-title" style={{ marginTop: 0 }}>
              <h2>AI services</h2>
            </div>
            <p className="meta" style={{ marginTop: 0 }}>
              Provider keys, custom OpenAI-compatible agents, test connections and the daily token budget are managed
              in Settings.
            </p>
            <Link to="/settings" className="linkish" style={{ display: 'inline-block' }}>
              Open Settings → AI services
            </Link>
            <p className="meta" style={{ marginBottom: 0, marginTop: 10 }}>
              Tools available: {BOT_TOOLS.length} · status refresh #{statusTick}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
