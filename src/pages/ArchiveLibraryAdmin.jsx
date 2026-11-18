import { useMemo, useState } from 'react'

import summary from '../data/generated/archiveLibraryAdmin.json'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified' },
  { id: 'candidate', label: 'Unchecked' },
  { id: 'blocked', label: 'Rights blocked' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'duplicate', label: 'Duplicate' }
]

function fmtDate(value) {
  if (!value) return 'not checked yet'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10)
}

export default function ArchiveLibraryAdmin() {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return summary.records.filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false
      if (!needle) return true
      return `${row.id} ${row.title} ${row.category} ${row.identifier}`.toLowerCase().includes(needle)
    })
  }, [filter, query])

  return (
    <div className="archive-library-admin">
      <div className="panel-head">
        <div>
          <h2 className="display">Archive library</h2>
          <p className="meta" style={{ margin: 0 }}>
            Internet Archive only. A row can publish only after its item page, MP3, duration, Urdu
            language and reuse rights are verified. Review is read-only; publishing is a build step.
          </p>
        </div>
      </div>

      <div className="al-stats" aria-label="Library totals">
        <div className="al-stat"><strong>{summary.totals.candidates}</strong><span>candidates</span></div>
        <div className="al-stat"><strong>{summary.totals.unchecked}</strong><span>unchecked</span></div>
        <div className="al-stat"><strong>{summary.totals.verified}</strong><span>verified</span></div>
        <div className="al-stat"><strong>{summary.totals.blocked}</strong><span>rights blocked</span></div>
        <div className="al-stat"><strong>{summary.totals.rejected}</strong><span>rejected</span></div>
        <div className="al-stat"><strong>{summary.totals.published}</strong><span>published</span></div>
      </div>

      <section className="panel al-panel">
        <h3>Shelf targets</h3>
        <p className="meta">Published count is the only count that fills a shelf.</p>
        <div className="al-targets">
          {summary.targets.map((target) => (
            <div className="al-target" key={target.id}>
              <div className="al-target-head">
                <span>{target.label}</span>
                <strong>{target.published}/{target.target}</strong>
              </div>
              <div className="al-bar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (target.published / target.target) * 100)}%` }} />
              </div>
              <div className="meta al-target-meta">
                {target.candidates} candidates · {target.verified} verified · {target.blocked} blocked · {target.rejected} rejected
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel al-panel">
        <div className="al-toolbar">
          <h3>Review queue</h3>
          <input
            className="al-input al-search"
            type="search"
            placeholder="Search id, title, category or Archive item"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search Archive library candidates"
          />
        </div>
        <div className="al-filters" role="group" aria-label="Filter candidates">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`al-filter ${filter === item.id ? 'active' : ''}`}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="al-table-wrap">
          <table className="al-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Title</th>
                <th scope="col">Shelf</th>
                <th scope="col">State</th>
                <th scope="col">Rights</th>
                <th scope="col">Check</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="al-mono">{row.id}</td>
                  <td>
                    <span className="al-title">{row.title}</span>
                    {row.archiveItemUrl && /^https:\/\/archive\.org\/details\//.test(row.archiveItemUrl) ? (
                      <a className="al-link" href={row.archiveItemUrl} target="_blank" rel="noreferrer">Archive item</a>
                    ) : null}
                  </td>
                  <td>{row.category}</td>
                  <td><span className={`al-state ${row.status}`}>{row.status}</span></td>
                  <td>{row.rightsStatus}</td>
                  <td className="al-check">
                    {row.reason || '—'}
                    {row.identifier ? <span className="meta">{row.identifier}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <p className="al-empty">No candidates match this filter.</p> : null}
        </div>
        <p className="meta al-note">
          Metadata checked {fmtDate(summary.checkedAt)} ({summary.stage} stage). Rejected and rights-blocked
          rows are never published; there is no publish control here.
        </p>
      </section>
    </div>
  )
}
