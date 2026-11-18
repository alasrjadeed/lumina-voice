import { useState } from 'react'
import { useBroadcast } from '../state/Broadcast.jsx'
import { dayparts } from '../data/broadcast'
import { adCategories, getAdCategory, spotLengths } from '../data/ads'
import { IcoMegaphone, IcoPlus, IcoTrash } from '../ui/Icons'

function Stat({ label, value, sub, tone }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone || ''}`}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  )
}

export default function Advertising() {
  const b = useBroadcast()
  const [openId, setOpenId] = useState(null)
  const cfg = b.adConfig
  const preview = b.breakPreview
  const report = b.adReport

  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const countdown = (() => {
    const s = b.nextBreakIn
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  })()

  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="display">Advertising</h2>
          <p className="meta" style={{ margin: 0 }}>
            {b.campaigns.filter((c) => c.enabled).length} active campaigns · {report.totalImpressions.toLocaleString()} session impressions
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => b.airAdBreak('Manual ad break')}><IcoMegaphone /> Air break now</button>
          <button className="btn btn-primary" onClick={b.addCampaign}><IcoPlus /> New campaign</button>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="Next break in" value={cfg.enabled ? countdown : 'off'} sub={`Every ${cfg.everyMin} min`} tone={cfg.enabled ? 'good' : 'bad'} />
        <Stat label="Break used" value={`${preview.totalSeconds}s / ${preview.targetSeconds}s`} sub={`${preview.fillPct}% fill`} />
        <Stat label="Session spots" value={String(report.totalImpressions)} sub="Aired this session" />
        <Stat label="Est. revenue" value={`$${report.totalRevenue.toFixed(2)}`} sub="CPM on session spots" />
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Ad break controls</h2>
        </div>
        <div className="ad-controls">
          <label className="ad-field">
            <span>Enable ad breaks</span>
            <button className={`toggle ${cfg.enabled ? 'on' : ''}`} onClick={() => b.updateAdConfig({ enabled: !cfg.enabled })} aria-label="Toggle ad breaks">
              <i />
            </button>
          </label>
          <label className="ad-field">
            <span>Break every</span>
            <select className="select" value={cfg.everyMin} onChange={(e) => b.updateAdConfig({ everyMin: Number(e.target.value) })}>
              {[15, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </label>
          <label className="ad-field">
            <span>Break length</span>
            <select className="select" value={cfg.breakSeconds} onChange={(e) => b.updateAdConfig({ breakSeconds: Number(e.target.value) })}>
              {[60, 90, 120, 150, 180].map((s) => (
                <option key={s} value={s}>{s}s</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Assembled break preview</h2>
          <span className="meta">now · {b.daypart.name}</span>
        </div>
        {preview.spots.length ? (
          <div className="ad-break">
            {preview.spots.map((s, i) => (
              <div className="ad-slot" key={`${s.spotId}-${i}`}>
                <span className="ad-dot" style={{ background: getAdCategory(s.category)?.color }} />
                <div className="ad-slot-main">
                  <div className="ad-slot-name">{s.advertiser} — {s.name}</div>
                  <div className="ad-slot-sub">
                    {getAdCategory(s.category)?.name}
                    {s.advertiserUr ? ` · ${s.advertiserUr}` : ''}
                  </div>
                </div>
                <span className="ad-slot-len">{s.seconds}s</span>
              </div>
            ))}
            <div className="ad-total">
              Total {preview.totalSeconds}s of {preview.targetSeconds}s ({preview.fillPct}% fill)
            </div>
          </div>
        ) : (
          <p className="meta" style={{ margin: 0 }}>No eligible spots for this daypart.</p>
        )}
      </div>

      <div className="row-title">
        <h2>Campaigns</h2>
        <span className="meta">Fictional advertisers · original spots</span>
      </div>

      <div className="camp-list">
        {b.campaigns.map((c) => (
          <CampaignRow
            key={c.id}
            campaign={c}
            open={openId === c.id}
            onToggleOpen={() => setOpenId(openId === c.id ? null : c.id)}
          />
        ))}
      </div>

      <div className="row-title">
        <h2>Delivery report</h2>
        <button className="linkish" onClick={b.clearPlays}>Clear play log</button>
      </div>
      <div className="panel">
        <div className="rep-head">
          <span>Advertiser</span>
          <span>Category</span>
          <span className="num">Impressions</span>
          <span className="num">Session</span>
          <span className="num">Airtime</span>
          <span className="num">Revenue</span>
        </div>
        {report.rows
          .slice()
          .sort((a, c) => c.sessionImpressions - a.sessionImpressions || c.impressions - a.impressions)
          .map((r) => (
            <div className="rep-row" key={r.id}>
              <span className="rep-name">
                <span className="cat-dot" style={{ background: getAdCategory(r.category)?.color }} />
                {r.advertiser}
              </span>
              <span className="meta">{getAdCategory(r.category)?.name}</span>
              <span className="num">{r.impressions.toLocaleString()}</span>
              <span className="num">{r.sessionImpressions}</span>
              <span className="num">{mmss(r.seconds)}</span>
              <span className="num">${r.revenue.toFixed(2)}</span>
            </div>
          ))}
        <div className="rep-row total">
          <span className="rep-name">Totals</span>
          <span />
          <span className="num">{report.rows.reduce((a, r) => a + r.impressions, 0).toLocaleString()}</span>
          <span className="num">{report.totalImpressions}</span>
          <span className="num">{mmss(report.totalSeconds)}</span>
          <span className="num">${report.totalRevenue.toFixed(2)}</span>
        </div>
      </div>
    </>
  )
}

function CampaignRow({ campaign, open, onToggleOpen }) {
  const b = useBroadcast()
  const c = campaign
  const cat = getAdCategory(c.category)
  return (
    <div className={`camp-row ${c.enabled ? '' : 'muted'} ${open ? 'open' : ''}`}>
      <div className="camp-head" onClick={onToggleOpen}>
        <span className="cat-dot" style={{ background: cat?.color }} />
        <div className="camp-main">
          <div className="camp-name">{c.advertiser}{c.advertiserUr ? ` · ${c.advertiserUr}` : ''}</div>
          <div className="camp-sub">
            {cat?.name} · {c.spots.length} spot{c.spots.length === 1 ? '' : 's'} · weight {c.weight} · CPM ${c.cpm}
            {c.dayparts.includes('all') ? ' · all dayparts' : ` · ${c.dayparts.join(', ')}`}
          </div>
        </div>
        <button
          className={`toggle ${c.enabled ? 'on' : ''}`}
          onClick={(e) => { e.stopPropagation(); b.updateCampaign(c.id, { enabled: !c.enabled }) }}
          aria-label="Toggle campaign"
        >
          <i />
        </button>
        <span className="camp-chev">{open ? '▾' : '▸'}</span>
      </div>

      {open ? (
        <div className="camp-body">
          <div className="camp-grid">
            <label className="ad-field">
              <span>Advertiser</span>
              <input value={c.advertiser} onChange={(e) => b.updateCampaign(c.id, { advertiser: e.target.value })} />
            </label>
            <label className="ad-field">
              <span>Urdu name</span>
              <input className="urdu" value={c.advertiserUr} onChange={(e) => b.updateCampaign(c.id, { advertiserUr: e.target.value })} />
            </label>
            <label className="ad-field">
              <span>Category</span>
              <select className="select" value={c.category} onChange={(e) => b.updateCampaign(c.id, { category: e.target.value })}>
                {adCategories.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label className="ad-field">
              <span>Weight</span>
              <input type="number" min="1" max="9" value={c.weight} onChange={(e) => b.updateCampaign(c.id, { weight: Math.max(1, Math.min(9, Number(e.target.value) || 1)) })} />
            </label>
            <label className="ad-field">
              <span>CPM ($)</span>
              <input type="number" min="0" value={c.cpm} onChange={(e) => b.updateCampaign(c.id, { cpm: Math.max(0, Number(e.target.value) || 0) })} />
            </label>
          </div>

          <div className="camp-dayparts">
            <span className="meta">Dayparts</span>
            <button
              className={`day-chip ${c.dayparts.includes('all') ? 'on' : ''}`}
              onClick={() => b.updateCampaign(c.id, { dayparts: ['all'] })}
            >
              All
            </button>
            {dayparts.map((d) => (
              <button
                key={d.id}
                className={`day-chip ${c.dayparts.includes(d.id) ? 'on' : ''}`}
                onClick={() => {
                  const base = c.dayparts.filter((x) => x !== 'all')
                  const next = base.includes(d.id) ? base.filter((x) => x !== d.id) : [...base, d.id]
                  b.updateCampaign(c.id, { dayparts: next.length ? next : ['all'] })
                }}
              >
                {d.name}
              </button>
            ))}
          </div>

          <div className="spot-editor">
            <div className="spot-editor-head">
              <span>Spots</span>
              <button className="linkish" onClick={() => b.addSpotToCampaign(c.id)}><IcoPlus /> Add spot</button>
            </div>
            {c.spots.map((s) => (
              <div className="spot-row" key={s.id}>
                <input
                  value={s.name}
                  onChange={(e) => b.updateSpot(c.id, s.id, { name: e.target.value })}
                  placeholder="Spot name"
                />
                <select className="select" value={s.seconds} onChange={(e) => b.updateSpot(c.id, s.id, { seconds: Number(e.target.value) })}>
                  {spotLengths.map((len) => (
                    <option key={len} value={len}>{len}s</option>
                  ))}
                </select>
                <input
                  className="spot-audio"
                  value={s.audio}
                  onChange={(e) => b.updateSpot(c.id, s.id, { audio: e.target.value })}
                  placeholder="audio asset id"
                />
                <button className="icon-btn" onClick={() => b.removeSpot(c.id, s.id)} aria-label="Remove spot"><IcoTrash /></button>
              </div>
            ))}
            {!c.spots.length ? <p className="meta" style={{ margin: '6px 0 0' }}>No spots yet — add one to include this campaign in breaks.</p> : null}
          </div>

          <button className="btn btn-ghost danger" onClick={() => b.removeCampaign(c.id)}><IcoTrash /> Delete campaign</button>
        </div>
      ) : null}
    </div>
  )
}
