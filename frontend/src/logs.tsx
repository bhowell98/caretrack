import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { api, formatWhen, type Child, type LogEntry, type LogType } from './api'
import { EditedFlag, HistoryPanel } from './history'
import { useAuth } from './auth'

const ALL_TYPES: { type: LogType; label: string }[] = [
  { type: 'SLEEP', label: 'Sleep' },
  { type: 'BOWEL', label: 'Bowel' },
  { type: 'DOSE', label: 'Medication' },
  { type: 'BEHAVIOR', label: 'Behavior' },
  { type: 'APPOINTMENT', label: 'Appointments' },
]

const TYPE_PATH: Record<LogType, string> = {
  SLEEP: '/sleep',
  BOWEL: '/bowel',
  DOSE: '/meds',
  BEHAVIOR: '/behaviors',
  APPOINTMENT: '/appointments',
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function toDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function startOfDayIso(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toISOString()
}

export function endOfDayIso(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999`).toISOString()
}

export function ActivityList({ entries }: { entries: LogEntry[] }) {
  const [selected, setSelected] = useState<LogEntry | null>(null)

  useEffect(() => {
    setSelected((current) =>
      current && entries.some((row) => row.type === current.type && row.id === current.id) ? current : null,
    )
  }, [entries])

  if (entries.length === 0) {
    return <p className="muted">No matching activities.</p>
  }

  return (
    <ul className="list">
      {entries.map((entry) => {
        const isOpen = selected?.type === entry.type && selected?.id === entry.id
        return (
          <li key={`${entry.type}-${entry.id}`} className="list-item log-item">
            <div className="stack">
              <p>
                <span className={`log-type log-type-${entry.type.toLowerCase()}`}>{entry.type}</span> {entry.title}
                <EditedFlag edited={entry.edited} />
              </p>
              <p className="muted">{formatWhen(entry.at)}</p>
              <p>{entry.detail}</p>
              {isOpen && <HistoryPanel type={entry.type} entryId={entry.id} startOpen hideToggle />}
            </div>
            <div className="row-actions no-print">
              <button type="button" className="secondary" onClick={() => setSelected(isOpen ? null : entry)}>
                {isOpen ? 'Hide history' : 'View'}
              </button>
              <NavLink to={TYPE_PATH[entry.type]}>{entry.type === 'APPOINTMENT' ? 'Open' : 'Edit'}</NavLink>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 6)
  return { from: toDateInput(from), to: toDateInput(to) }
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

function toCsv(child: Child, from: string, to: string, entries: LogEntry[]) {
  const header = 'child,from,to,type,when,title,detail,edited'
  const rows = entries.map((entry) =>
    [
      csvEscape(child.name),
      from,
      to,
      entry.type,
      new Date(entry.at).toISOString(),
      csvEscape(entry.title),
      csvEscape(entry.detail),
      entry.edited ? 'yes' : 'no',
    ].join(','),
  )
  return [header, ...rows].join('\n')
}

function toPlainText(child: Child, from: string, to: string, entries: LogEntry[]) {
  const lines = [`CareTrack logs for ${child.name}`, `${from} to ${to}`, '']
  for (const entry of entries) {
    lines.push(`${formatWhen(entry.at)} — ${entry.title}${entry.edited ? ' (edited)' : ''}`)
    lines.push(entry.detail)
    lines.push('')
  }
  if (entries.length === 0) {
    lines.push('No matching log entries.')
  }
  return lines.join('\n')
}

function groupByDay(entries: LogEntry[]) {
  const groups: { label: string; key: string; items: LogEntry[] }[] = []
  for (const entry of entries) {
    const date = new Date(entry.at)
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    const label = date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const last = groups[groups.length - 1]
    if (!last || last.key !== key) {
      groups.push({ label, key, items: [entry] })
    } else {
      last.items.push(entry)
    }
  }
  return groups
}

export function LogsPage() {
  const { child } = useAuth()
  const initial = defaultRange()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [q, setQ] = useState('')
  const [types, setTypes] = useState<LogType[]>(ALL_TYPES.map((item) => item.type))
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [layout, setLayout] = useState<'days' | 'list'>(() => {
    return localStorage.getItem('caretrack.logsLayout') === 'list' ? 'list' : 'days'
  })

  useEffect(() => {
    if (!child) return
    if (types.length === 0) {
      setEntries([])
      return
    }
    const selectedTypes = types.length === ALL_TYPES.length ? undefined : types.join(',')
    api
      .logs(child.id, {
        from: startOfDayIso(from),
        to: endOfDayIso(to),
        q: q.trim() || undefined,
        types: selectedTypes,
      })
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load logs'))
  }, [child, from, to, q, types])

  const groups = useMemo(() => groupByDay(entries), [entries])

  function toggleType(type: LogType) {
    setTypes((current) => (current.includes(type) ? current.filter((item) => item !== type) : [...current, type]))
  }

  async function exportCsv() {
    if (!child) return
    const blob = new Blob([toCsv(child, from, to, entries)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `caretrack-${child.name.replaceAll(/\s+/g, '-').toLowerCase()}-${from}-to-${to}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setStatus('CSV downloaded.')
  }

  async function copyLogs() {
    if (!child) return
    setError('')
    try {
      await navigator.clipboard.writeText(toPlainText(child, from, to, entries))
      setStatus('Copied logs to clipboard.')
    } catch {
      setError('Could not copy. Try Export CSV or Send instead.')
    }
  }

  async function sendLogs() {
    if (!child) return
    setError('')
    const text = toPlainText(child, from, to, entries)
    const subject = `CareTrack logs for ${child.name} (${from} to ${to})`
    if (navigator.share) {
      try {
        await navigator.share({ title: subject, text })
        setStatus('Share sheet opened.')
        return
      } catch {
        /* fall through to email */
      }
    }
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
    setStatus('Email draft opened.')
  }

  if (!child) {
    return (
      <section className="card">
        <h2>Add your child first</h2>
        <p className="muted">Care logs are saved per child.</p>
        <NavLink to="/child">Set up a child profile</NavLink>
      </section>
    )
  }

  return (
    <>
      <h1>Daily logs</h1>
      <p className="muted">Search, review, export, or send sleep, bowel, medication, behavior, and appointment history.</p>
      {error && <p className="error">{error}</p>}
      {status && !error && <p className="status">{status}</p>}

      <section className="card logs-toolbar no-print">
        <div className="row">
          <label className="field">
            <span>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Search</span>
          <input
            type="search"
            value={q}
            placeholder="Notes, medication, behavior, appointment…"
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="type-filters" role="group" aria-label="Log types">
          {ALL_TYPES.map((item) => (
            <label key={item.type} className="check">
              <input type="checkbox" checked={types.includes(item.type)} onChange={() => toggleType(item.type)} />
              {item.label}
            </label>
          ))}
        </div>
        <div className="row-actions">
          <button type="button" onClick={exportCsv}>
            Export CSV
          </button>
          <button type="button" className="secondary" onClick={copyLogs}>
            Copy
          </button>
          <button type="button" className="secondary" onClick={sendLogs}>
            Send
          </button>
          <button type="button" className="secondary" onClick={() => window.print()}>
            Print
          </button>
        </div>
        <div className="view-switch no-print" role="group" aria-label="Log layout">
          <button
            type="button"
            className={layout === 'days' ? 'selected' : 'secondary'}
            aria-pressed={layout === 'days'}
            onClick={() => {
              setLayout('days')
              localStorage.setItem('caretrack.logsLayout', 'days')
            }}
          >
            By day
          </button>
          <button
            type="button"
            className={layout === 'list' ? 'selected' : 'secondary'}
            aria-pressed={layout === 'list'}
            onClick={() => {
              setLayout('list')
              localStorage.setItem('caretrack.logsLayout', 'list')
            }}
          >
            Single list
          </button>
        </div>
      </section>

      <p className="muted">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
      </p>

      {entries.length === 0 && <section className="card">No matching logs in this range.</section>}

      {layout === 'list' && entries.length > 0 && (
        <section className="card">
          <h2>All activities</h2>
          <ActivityList entries={entries} />
        </section>
      )}

      {layout === 'days' &&
        groups.map((group) => (
          <section key={group.key} className="card day-group">
            <h2>{group.label}</h2>
            <ActivityList entries={group.items} />
          </section>
        ))}
    </>
  )
}
