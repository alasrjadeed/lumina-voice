// Lumina Bot · the brain.
// System prompt + tool contract, a self-contained offline agent (used when no
// AI provider is reachable), plus the report generator and problem scanner.
// Pure functions over a state snapshot — no React, no network.
import { categories, hhmm } from '../data/broadcast'
import { RADIO_ENABLED } from '../config/features.js'

// Tools the bot may call on the broadcast desk (gated by authority in state).
export const BOT_TOOLS = [
  { tool: 'goLive', args: [], desc: 'Take over the desk manually (operator live)' },
  { tool: 'returnToAI', args: [], desc: 'Hand control back to AI automation' },
  ...(RADIO_ENABLED ? [{ tool: 'startBroadcast', args: [], desc: 'Start the broadcast (go on air)' }] : []),
  { tool: 'stopBroadcast', args: [], desc: 'Stop the broadcast' },
  { tool: 'skipItem', args: [], desc: 'Skip the currently playing item' },
  ...(RADIO_ENABLED ? [{ tool: 'insertStationId', args: [], desc: 'Insert a station ID jingle now' }] : []),
  { tool: 'applyAISchedule', args: [], desc: 'Regenerate the whole week with the AI scheduler' },
  { tool: 'setRule', args: ['id', 'on'], desc: 'Enable/disable an automation rule' },
  { tool: 'updateRotation', args: ['id', 'patch'], desc: 'Patch a rotation item (weight, enabled…)' },
  { tool: 'moveRotation', args: ['id', 'dir'], desc: 'Reorder a rotation item (dir = -1|1)' },
  { tool: 'setAuthority', args: ['owner'], desc: 'Set control owner: human | bot | both' }
]

export function buildSystemPrompt(ctx) {
  return `You are Lumina Bot, the AI assistant of "Lumina Voice", an Urdu/English audio-film and drama library.
You share the control room with a human operator. Current state:
- Library: ${ctx.rotation.length} rotation items · ${ctx.schedule.length} weekly slots
- Daypart: ${ctx.daypart.name} (${hhmm(ctx.daypart.start)}–${hhmm(ctx.daypart.end)}) · control owner now: ${ctx.owner}
- Rotation: ${ctx.rotation.length} items (${ctx.enabledCount} enabled) · schedule: ${ctx.schedule.length} weekly slots
- Recent problems: ${ctx.problems.length ? ctx.problems.map((p) => p.title).join('; ') : 'none'}

Rules:
- Be concise (max ~120 words), professional, mix English with short Urdu phrases where natural.
- To act on the desk, reply with ONLY a JSON object: {"reply": "...", "actions":[{"tool":"...","args":{...}}]}
- Available tools: ${BOT_TOOLS.map((t) => `${t.tool}(${t.args.join(', ')})`).join(' | ')}
- Never invent tool names. Prefer suggesting to the human unless the action is routine (skip, station ID, regenerate week).`
}

// --- problem scanner: rotation + logs sanity -------------------------------
export function scanProblems(ctx) {
  const out = []
  const { rotation, logs } = ctx
  if (rotation.length === 0) {
    out.push({
      id: 'empty-rotation',
      severity: 'error',
      title: 'Rotation is empty',
      detail: 'Automation has nothing to play. Add titles in the Add content tab.',
      fix: null
    })
  } else if (!rotation.some((r) => r.enabled)) {
    out.push({
      id: 'all-disabled',
      severity: 'error',
      title: 'Every rotation item is disabled',
      detail: 'The AI has an empty pool. Re-enable at least one item.',
      fix: { tool: 'updateRotation', args: { id: rotation[0].id, patch: { enabled: true } } }
    })
  }
  rotation.forEach((r) => {
    if (!r.audio && !(r.asset || '').startsWith('local:')) {
      out.push({
        id: `no-audio-${r.id}`,
        severity: 'warn',
        title: `"${r.name}" has no audio URL`,
        detail: 'It will be skipped silently during automation.',
        fix: { tool: 'updateRotation', args: { id: r.id, patch: { enabled: false } } }
      })
    }
    if (r.weight > 5) {
      out.push({
        id: `weight-${r.id}`,
        severity: 'warn',
        title: `"${r.name}" weight ${r.weight} is very high`,
        detail: 'Heavy weights dominate the rotation and fatigue listeners.',
        fix: { tool: 'updateRotation', args: { id: r.id, patch: { weight: 3 } } }
      })
    }
  })
  const errs = logs.filter((l) => l.level === 'error' || l.level === 'warn').slice(0, 5)
  errs.forEach((l, i) => {
    out.push({
      id: `log-${i}`,
      severity: l.level === 'error' ? 'error' : 'warn',
      title: `Recent ${l.level}: ${l.text}`,
      detail: new Date(l.t).toLocaleString(),
      fix: null
    })
  })
  return out
}

// --- daily report (Markdown) ----------------------------------------------
export function buildReport(ctx) {
  const spinsTotal = Object.values(ctx.spins).reduce((a, c) => a + c, 0)
  const top = ctx.rotation
    .map((r) => ({ name: r.name, n: ctx.spins[r.id] || 0 }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
  const byCat = categories
    .map((c) => `${c.name}: ${ctx.rotation.filter((r) => r.category === c.id).length}`)
    .join(' · ')
  const today = new Date().toDateString()
  return `# Lumina Voice — daily broadcast report
**Date:** ${today} · **Status:** ${ctx.live ? 'ON AIR' : 'OFF AIR'} (${ctx.mode}) · **Daypart:** ${ctx.daypart.name}

## Audience
- Estimated listeners now: **${ctx.listeners}**
- Items played this session: **${spinsTotal}**

## Programming
- Weekly slots: ${ctx.schedule.length} · Rotation: ${ctx.rotation.length} items (${ctx.enabledCount} enabled)
- Categories — ${byCat}
- Top spins: ${top.map((t) => `${t.name} (${t.n}×)`).join(', ') || '—'}

## Health
${ctx.problems.length ? ctx.problems.map((p) => `- [${p.severity.toUpperCase()}] ${p.title}`).join('\n') : '- No problems detected.'}

_Generated by Lumina Bot._`
}

// --- offline agent: deterministic intents when no provider is reachable ----
export function offlineReply(message, ctx) {
  const m = (message || '').toLowerCase()
  if (/report|report_|daily|summary/.test(m)) {
    return { reply: buildReport(ctx), actions: [] }
  }
  if (/repair|fix|error|problem|health/.test(m)) {
    const fixes = ctx.problems.filter((p) => p.fix)
    return {
      reply: ctx.problems.length
        ? `Found ${ctx.problems.length} issue(s); ${fixes.length} can be auto-fixed:\n${ctx.problems
            .map((p) => `• ${p.title}`)
            .join('\n')}`
        : 'All clear — rotation, logs and schedule look healthy.',
      actions: []
    }
  }
  if (/rebuild|regenerate|generate week|new schedule/.test(m)) {
    return { reply: 'Regenerating the weekly schedule now.', actions: [{ tool: 'applyAISchedule', args: {} }] }
  }
  if (/status|on air|listeners|who is in control/.test(m)) {
    return {
      reply: `${ctx.live ? 'We are ON AIR' : 'Currently OFF AIR'} in ${ctx.mode} mode, ${ctx.listeners} listeners estimated. Daypart: ${ctx.daypart.name}. Control: ${ctx.owner}.`,
      actions: []
    }
  }
  if (/skip/.test(m)) return { reply: 'Skipping the current item.', actions: [{ tool: 'skipItem', args: {} }] }
  if (/take over|go live|manual/.test(m)) {
    return { reply: 'Taking over the desk — you are live.', actions: [{ tool: 'goLive', args: {} }] }
  }
  if (/hand back|return|ai control|auto/.test(m)) {
    return { reply: 'Returning control to AI automation.', actions: [{ tool: 'returnToAI', args: {} }] }
  }
  return {
    reply:
      'I am running in offline mode (no AI provider key configured). I can still: generate the daily report, scan for errors, rebuild the week, take over / hand back the desk. Set a free key in Settings → AI services for full conversation.',
    actions: []
  }
}

// Try to extract {"reply","actions"} from a model response (tolerates code fences).
export function parseBotJson(text) {
  const cleaned = (text || '').replace(/```(?:json)?/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1))
    if (typeof obj.reply === 'string' && Array.isArray(obj.actions)) return obj
    return null
  } catch {
    return null
  }
}
