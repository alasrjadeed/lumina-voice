import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { radioStation } from '../data/catalog'
import { useCatalog } from './Catalog'
import { titlePlayableOnDevice } from '../data/playability'
import {
  airForTime,
  buildRotation,
  controlOwnerAt,
  daypartOf,
  getShow,
  generateSchedule,
  playlistForShow,
  rotationItemForTitle,
  newRotationItem,
  newSlot,
  estimateListeners
} from '../data/broadcast'
import { cancelReminders, scheduleShowReminders } from '../notify'
import { fetchPwStatus } from '../data/pipewire'
import {
  assembleBreak,
  breakIndexAt,
  buildExactBlock,
  campaignReport,
  defaultCampaigns,
  minutesUntilBreak,
  newCampaign,
  newSpot
} from '../data/ads'

const KEY = 'lumina-broadcast-v1'
const Ctx = createContext(null)

const DEFAULT_AD_CONFIG = { enabled: true, everyMin: 30, breakSeconds: 120 }

// A plausible backfill of airs from earlier in the shift, so the advertising
// report has data the moment the Studio is opened.
function seedPlays(campaigns) {
  const out = []
  const now = Date.now()
  campaigns.forEach((c) => {
    c.spots.forEach((s, si) => {
      const count = Math.max(2, (c.weight || 1) * 2 - si)
      for (let i = 0; i < count; i += 1) {
        out.push({
          t: now - (i * 7 + c.advertiser.length) * 60000 - si * 120000,
          campaignId: c.id,
          advertiser: c.advertiser,
          spotId: s.id,
          name: s.name,
          seconds: s.seconds,
          breakIndex: -1,
          seeded: true
        })
      }
    })
  })
  return out.sort((a, b) => b.t - a.t)
}

function freshState(list) {
  const campaigns = defaultCampaigns()
  return {
    schedule: generateSchedule(),
    rotation: buildRotation(list),
    rules: null,
    mode: 'ai',
    live: true,
    manualQueue: [],
    manualIndex: 0,
    spins: {},
    campaigns,
    plays: seedPlays(campaigns),
    adConfig: { ...DEFAULT_AD_CONFIG }
  }
}

function load() {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.schedule) || !Array.isArray(parsed.rotation)) return null
    if (!Array.isArray(parsed.campaigns)) parsed.campaigns = defaultCampaigns()
    if (!Array.isArray(parsed.plays)) parsed.plays = []
    if (!parsed.adConfig) parsed.adConfig = { ...DEFAULT_AD_CONFIG }
    return parsed
  } catch {
    return null
  }
}

export function BroadcastProvider({ children }) {
  const { titles } = useCatalog()
  const native = Capacitor.isNativePlatform()
  const playableIds = useMemo(
    () => new Set(titles.filter((t) => titlePlayableOnDevice(t, { native })).map((t) => t.id)),
    [titles, native]
  )
  const fresh = useMemo(() => freshState(titles), [titles])
  const saved = useRef(load())
  const initial = saved.current
  const [schedule, setSchedule] = useState(initial?.schedule || fresh.schedule)
  // A clean install must not resurrect rotation rows for titles whose audio is
  // no longer available on this device.
  const [rotation, setRotation] = useState(() =>
    (initial?.rotation || fresh.rotation).filter((r) => !r.titleId || playableIds.has(r.titleId))
  )
  const [rules, setRules] = useState(() => initial?.rules || null)
  const [mode, setMode] = useState(initial?.mode || 'ai')
  const [live, setLive] = useState(initial?.live !== false)
  const [manualQueue, setManualQueue] = useState(initial?.manualQueue || [])
  const [manualIndex, setManualIndex] = useState(initial?.manualIndex || 0)
  const [manualStartedAt, setManualStartedAt] = useState(Date.now())
  const [spins, setSpins] = useState(initial?.spins || {})
  const [campaigns, setCampaigns] = useState(() => initial?.campaigns || fresh.campaigns)
  const [plays, setPlays] = useState(() => initial?.plays || [])
  const [adConfig, setAdConfig] = useState(() => initial?.adConfig || { ...DEFAULT_AD_CONFIG })
  const [logs, setLogs] = useState(() => [
    { t: Date.now(), level: 'info', text: 'Broadcast engine online — AI automation in control.' }
  ])
  const [, setTick] = useState(0)

  // PipeWire status bridge (scripts/pw-bridge.mjs) — real playback + volume.
  const [pw, setPw] = useState({ available: false })
  // Opt-in, not opt-out: the bridge is a local helper that most installs do not
  // run, and probing a port that is not listening logs a failed request in every
  // browser. The Studio toggle turns it on once the operator has started it.
  const [pwEnabled, setPwEnabledState] = useState(() => {
    try {
      return localStorage.getItem('lumina-pw-link') === 'on'
    } catch {
      return false
    }
  })
  const setPwEnabled = (on) => {
    setPwEnabledState(on)
    try {
      localStorage.setItem('lumina-pw-link', on ? 'on' : 'off')
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    if (!pwEnabled) {
      setPw({ available: false })
      return undefined
    }
    let alive = true
    let timer = null
    // The bridge is optional and often simply not installed. Hammering it every
    // 3s fills the console with proxy errors, so back off hard once it is
    // clearly unreachable and only retry occasionally.
    let misses = 0
    const poll = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        timer = setTimeout(poll, misses >= 3 ? 30000 : 3000)
        return
      }
      const data = await fetchPwStatus()
      if (!alive) return
      if (data?.available) {
        misses = 0
        setPw(data)
        timer = setTimeout(poll, 3000)
        return
      }
      misses += 1
      // Only surface "unavailable" once, then stay quiet.
      if (misses === 1) setPw({ available: false })
      timer = setTimeout(poll, misses >= 3 ? 30000 : 3000)
    }
    poll()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [pwEnabled])

  // Human/bot control authority. `owner` is the global default; `shifts`
  // override it for specific day/time windows. Resolved fresh each tick.
  const [authority, setAuthority] = useState(initial?.authority || { owner: 'both', shifts: [] })
  const ownerNow = controlOwnerAt(new Date(), authority)
  const ownerIn = (when) => controlOwnerAt(when, authority)

  const setAuthorityOwner = (owner) => {
    setAuthority((a) => ({ ...a, owner }))
    log(`Control authority set to ${owner.toUpperCase()}.`, 'ai')
  }
  const addAuthorityShift = (shift) => {
    setAuthority((a) => ({
      ...a,
      shifts: [...a.shifts, { id: `shift-${Date.now()}`, days: [1, 2, 3, 4, 5], start: 540, end: 1080, owner: 'bot', ...shift }]
    }))
  }
  const updateAuthorityShift = (id, patch) => {
    setAuthority((a) => ({ ...a, shifts: a.shifts.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  }
  const removeAuthorityShift = (id) => {
    setAuthority((a) => ({ ...a, shifts: a.shifts.filter((s) => s.id !== id) }))
  }

  // Gate for every bot-initiated desk action. `force` is set by the UI after
  // explicit human approval (both-mode); a human-owned window denies all.
  const botCanAct = ownerNow === 'bot'
  const runBotAction = (tool, args = {}, force = false) => {
    if (!force && !botCanAct) {
      log(`Lumina Bot tried "${tool}" during a human-owned window — denied.`, 'warn')
      return { ok: false, error: `Control belongs to the human operator right now (${ownerNow}).` }
    }
    const desk = {
      goLive,
      returnToAI,
      stopBroadcast,
      startBroadcast,
      skipItem,
      insertStationId,
      applyAISchedule,
      setAuthority: setAuthorityOwner
    }
    if (typeof desk[tool] === 'function') {
      desk[tool]()
      log(`Lumina Bot ran "${tool}".`, 'ai')
      return { ok: true }
    }
    if (tool === 'setRule' && args?.id) {
      setRule(args.id, !!args.on)
      log(`Lumina Bot set rule ${args.id} ${args.on ? 'on' : 'off'}.`, 'ai')
      return { ok: true }
    }
    if (tool === 'updateRotation' && args?.id) {
      updateRotation(args.id, args.patch || {})
      log(`Lumina Bot updated rotation item ${args.id}.`, 'ai')
      return { ok: true }
    }
    if (tool === 'moveRotation' && args?.id) {
      moveRotation(args.id, Number(args.dir) || 1)
      log(`Lumina Bot reordered rotation item ${args.id}.`, 'ai')
      return { ok: true }
    }
    log(`Lumina Bot called unknown tool "${tool}".`, 'warn')
    return { ok: false, error: `Unknown tool "${tool}".` }
  }

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(
        KEY,
        JSON.stringify({
          schedule,
          rotation,
          rules,
          mode,
          live,
          manualQueue,
          manualIndex,
          spins,
          campaigns,
          plays: plays.slice(0, 200),
          adConfig,
          authority
        })
      )
    } catch {
      /* ignore */
    }
  }, [schedule, rotation, rules, mode, live, manualQueue, manualIndex, spins, campaigns, plays, adConfig, authority])

  // Arm local reminders for upcoming scheduled shows whenever the schedule
  // changes (no-ops until notifications are granted in Settings).
  useEffect(() => {
    let alive = true
    const arm = () => {
      if (!alive) return
      scheduleShowReminders(schedule)
    }
    arm()
    return () => {
      alive = false
      cancelReminders()
    }
  }, [schedule])

  const now = new Date()

  const pool = useMemo(
    () => playlistForShow(getShow('live-darbar'), rotation),
    [rotation]
  )

  const manualItem = useMemo(() => {
    if (mode !== 'manual' || !manualQueue.length) return null
    const id = manualQueue[manualIndex]
    return rotation.find((r) => r.id === id) || pool[manualIndex % Math.max(1, pool.length)] || null
  }, [mode, manualQueue, manualIndex, rotation, pool])

  const ai = useMemo(() => airForTime({ schedule, rotation }, now), [schedule, rotation, now])

  const item = live ? (mode === 'manual' ? manualItem : ai.item) : null
  const show = live ? (mode === 'manual' ? getShow('live-darbar') : ai.show) : null
  const nextItem = live
    ? mode === 'manual'
      ? rotation.find((r) => r.id === manualQueue[manualIndex + 1]) || pool[(manualIndex + 1) % Math.max(1, pool.length)] || null
      : ai.next
    : null

  const progressPct = (() => {
    if (!live || !item) return 0
    if (mode === 'manual') {
      const elapsed = (Date.now() - manualStartedAt) / 60000
      return Math.min(99, Math.round((elapsed / Math.max(1, item.minutes)) * 100))
    }
    return ai.progressPct
  })()

  const remainingMin = (() => {
    if (!live || !item) return 0
    if (mode === 'manual') {
      const elapsed = (Date.now() - manualStartedAt) / 60000
      return Math.max(0, Math.round(item.minutes - elapsed))
    }
    return ai.remainingMin
  })()

  const listeners = live ? estimateListeners(now, mode === 'manual') : 0
  const daypart = daypartOf(now.getHours() * 60 + now.getMinutes())

  const log = (text, level = 'info') => {
    setLogs((l) => [{ t: Date.now(), level, text }, ...l].slice(0, 80))
  }

  const lastSpin = useRef(null)
  useEffect(() => {
    if (!live || !item) return
    if (lastSpin.current === item.id) return
    lastSpin.current = item.id
    setSpins((s) => ({ ...s, [item.id]: (s[item.id] || 0) + 1 }))
    if (item.synthetic) log(`On air: ${item.name}`, 'info')
    else log(`Now playing: ${item.name}${mode === 'manual' ? ' (live)' : ''}`, 'play')
  }, [item?.id, live])

  const nextBreakIn = adConfig.enabled ? minutesUntilBreak(now, adConfig.everyMin) : 0
  const breakPreview = useMemo(
    () =>
      assembleBreak(campaigns, adConfig.breakSeconds, {
        daypartId: daypart.id,
        seed: breakIndexAt(now, adConfig.everyMin)
      }),
    [campaigns, adConfig.breakSeconds, adConfig.everyMin, daypart.id]
  )
  const adReport = useMemo(() => campaignReport(campaigns, plays), [campaigns, plays])

  const airAdBreak = (label = 'Ad break') => {
    const dp = daypartOf(now.getHours() * 60 + now.getMinutes()).id
    const brk = assembleBreak(campaigns, adConfig.breakSeconds, {
      daypartId: dp,
      seed: breakIndexAt(now, adConfig.everyMin) + (plays.length % 5)
    })
    if (!brk.spots.length) {
      log(`${label} due — no eligible campaigns.`, 'warn')
      return brk
    }
    const stamp = Date.now()
    setPlays((p) =>
      [
        ...brk.spots.map((s) => ({
          t: stamp,
          campaignId: s.campaignId,
          advertiser: s.advertiser,
          spotId: s.spotId,
          name: s.name,
          seconds: s.seconds,
          breakIndex: breakIndexAt(now, adConfig.everyMin)
        })),
        ...p
      ].slice(0, 200)
    )
    log(`${label} aired — ${brk.spots.length} spots · ${brk.totalSeconds}s (${brk.fillPct}% fill).`, 'ad')
    return brk
  }

  const lastBreak = useRef(breakIndexAt(new Date(), DEFAULT_AD_CONFIG.everyMin))
  useEffect(() => {
    if (!live || !adConfig.enabled) return
    const idx = breakIndexAt(now, adConfig.everyMin)
    if (idx === lastBreak.current) return
    lastBreak.current = idx
    airAdBreak('Scheduled ad break')
  }, [live, adConfig.enabled, adConfig.everyMin, adConfig.breakSeconds, campaigns.length, plays.length])

  const addCampaign = () => {
    const c = newCampaign()
    setCampaigns((cs) => [...cs, c])
    log(`Campaign "${c.advertiser}" created.`, 'ad')
    return c.id
  }

  const updateCampaign = (id, patch) => {
    setCampaigns((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const removeCampaign = (id) => {
    setCampaigns((cs) => cs.filter((c) => c.id !== id))
    log('Campaign removed.', 'info')
  }

  const addSpotToCampaign = (id) => {
    setCampaigns((cs) => cs.map((c) => (c.id === id ? { ...c, spots: [...c.spots, newSpot()] } : c)))
  }

  const updateSpot = (id, spotId, patch) => {
    setCampaigns((cs) =>
      cs.map((c) =>
        c.id === id ? { ...c, spots: c.spots.map((s) => (s.id === spotId ? { ...s, ...patch } : s)) } : c
      )
    )
  }

  const removeSpot = (id, spotId) => {
    setCampaigns((cs) => cs.map((c) => (c.id === id ? { ...c, spots: c.spots.filter((s) => s.id !== spotId) } : c)))
  }

  const updateAdConfig = (patch) => {
    setAdConfig((cfg) => ({ ...cfg, ...patch }))
    log('Ad settings updated.', 'ad')
  }

  const clearPlays = () => {
    setPlays([])
    log('Ad play log cleared.', 'warn')
  }

  const buildQueue = (startId) => {
    const base = pool.length ? pool : rotation.filter((r) => r.enabled)
    const startIdx = Math.max(0, base.findIndex((r) => r.id === startId))
    const ordered = [...base.slice(startIdx), ...base.slice(0, startIdx)]
    const idItem = rotation.find((r) => r.category === 'id')
    const withIds = []
    ordered.forEach((r, i) => {
      withIds.push(r.id)
      if (idItem && i < ordered.length - 1 && (i + 1) % 3 === 0) withIds.push(idItem.id)
    })
    return withIds.length ? withIds : ordered.map((r) => r.id)
  }

  const goLive = () => {
    const startId = item?.id
    const q = buildQueue(startId)
    setManualQueue(q)
    setManualIndex(0)
    setManualStartedAt(Date.now())
    setMode('manual')
    setLive(true)
    log('Operator took over — live desk is on air.', 'live')
  }

  const returnToAI = () => {
    setMode('ai')
    setManualQueue([])
    setManualIndex(0)
    setLive(true)
    log('Handed back to AI automation.', 'info')
  }

  const stopBroadcast = () => {
    setLive(false)
    log('Broadcast stopped — station is off air.', 'warn')
  }

  const startBroadcast = () => {
    setLive(true)
    log('Broadcast started — station is on air.', 'live')
  }

  const skipItem = () => {
    if (mode !== 'manual') {
      log('AI automation holds the schedule — take over to skip.', 'warn')
      return
    }
    setManualIndex((i) => Math.min(i + 1, manualQueue.length - 1))
    setManualStartedAt(Date.now())
    log('Skipped to the next item.', 'info')
  }

  const insertStationId = () => {
    const idItem = rotation.find((r) => r.category === 'id')
    if (!idItem) return
    if (mode !== 'manual') {
      log('Station ID queued — take over to play it live.', 'info')
      return
    }
    setManualQueue((q) => {
      const copy = [...q]
      copy.splice(manualIndex + 1, 0, idItem.id)
      return copy
    })
    log('Station ID inserted after the current item.', 'info')
  }

  const applyAISchedule = () => {
    const next = generateSchedule()
    setSchedule(next)
    log('AI generated a fresh weekly schedule and filled every slot.', 'ai')
  }

  const addSlot = () => {
    setSchedule((s) => [...s, newSlot()])
    log('New schedule slot added.', 'info')
  }

  const updateSlot = (id, patch) => {
    setSchedule((s) => s.map((sl) => (sl.id === id ? { ...sl, ...patch } : sl)))
  }

  const removeSlot = (id) => {
    setSchedule((s) => s.filter((sl) => sl.id !== id))
    log('Schedule slot removed.', 'info')
  }

  const generateBlock = (startMin = 360, hours = 8) => {
    const day = new Date().getDay()
    const endMin = startMin + hours * 60
    const block = buildExactBlock(startMin, hours, day)
    setSchedule((s) => [
      ...s.filter((sl) => !(sl.days.length === 1 && sl.days[0] === day && sl.start >= startMin && sl.end <= endMin)),
      ...block
    ])
    const hh = String(Math.floor((startMin % 1440) / 60)).padStart(2, '0')
    log(`Built an exact ${hours}-hour block from ${hh}:00 (${block.length} slots).`, 'ai')
    return block
  }

  const addToRotation = (title) => {
    if (!(title.episodes || []).length) {
      log(`${title.name} has no audio yet. Add an Archive.org link first.`, 'warn')
      return
    }
    if (rotation.some((r) => r.titleId === title.id)) {
      log(`${title.name} is already in rotation.`, 'warn')
      return
    }
    setRotation((r) => [...r, newRotationItem(title)])
    log(`Added ${title.name} to the rotation.`, 'info')
  }

  const removeRotation = (id) => {
    setRotation((r) => r.filter((x) => x.id !== id))
    log('Rotation item removed.', 'info')
  }

  const updateRotation = (id, patch) => {
    setRotation((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  // Reorder an item within the rotation list (dir = -1 up, +1 down).
  const moveRotation = (id, dir) => {
    setRotation((r) => {
      const i = r.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= r.length) return r
      const copy = [...r]
      const [item] = copy.splice(i, 1)
      copy.splice(j, 0, item)
      return copy
    })
  }

  const setRule = (id, value) => {
    setRules((rs) => ({ ...(rs || {}), [id]: value }))
    log(`Automation rule "${id}" ${value ? 'enabled' : 'disabled'}.`, 'ai')
  }

  const ruleOn = (id, dflt) => (rules && rules[id] !== undefined ? rules[id] : dflt)

  const value = useMemo(
    () => ({
      station: radioStation,
      schedule,
      rotation,
      shows: getShow,
      mode,
      live,
      onAir: item,
      show,
      nextItem,
      progressPct,
      remainingMin,
      listeners,
      daypart,
      pw,
      pwEnabled,
      setPwEnabled,
      authority,
      ownerNow,
      ownerIn,
      botCanAct,
      runBotAction,
      setAuthorityOwner,
      addAuthorityShift,
      updateAuthorityShift,
      removeAuthorityShift,
      spins,
      logs,
      manualQueue,
      manualIndex,
      goLive,
      returnToAI,
      stopBroadcast,
      startBroadcast,
      skipItem,
      insertStationId,
      applyAISchedule,
      addSlot,
      updateSlot,
      removeSlot,
      generateBlock,
      addToRotation,
      removeRotation,
      updateRotation,
      moveRotation,
      setRule,
      ruleOn,
      campaigns,
      plays,
      adConfig,
      nextBreakIn,
      breakPreview,
      adReport,
      addCampaign,
      updateCampaign,
      removeCampaign,
      addSpotToCampaign,
      updateSpot,
      removeSpot,
      updateAdConfig,
      airAdBreak,
      clearPlays,
      rotationItemForTitle: (id) => rotationItemForTitle(rotation, id)
    }),
    [schedule, rotation, rules, mode, live, item, show, nextItem, progressPct, remainingMin, listeners, daypart, pw, pwEnabled, authority, ownerNow, spins, logs, manualQueue, manualIndex, campaigns, plays, adConfig, nextBreakIn, breakPreview, adReport]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useBroadcast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('Lumina Voice is missing BroadcastProvider')
  return ctx
}
