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

const TYPE_COLORS: Record<LogType, string> = {
  SLEEP: '#355e8c',
  BOWEL: '#8b5a3c',
  DOSE: '#7a5c9e',
  BEHAVIOR: '#c46b4a',
  APPOINTMENT: '#2d6a4f',
}

function emptyCounts(): Record<LogType, number> {
  return { SLEEP: 0, BOWEL: 0, DOSE: 0, BEHAVIOR: 0, APPOINTMENT: 0 }
}

function eachDay(from: string, to: string) {
  const days: string[] = []
  const cursor = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || end < cursor) {
    return [from]
  }
  while (cursor <= end) {
    days.push(toDateInput(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

function hourLabel(hour: number) {
  return new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, { hour: 'numeric' })
}

function EventGraph({
  from,
  to,
  entries,
  types,
}: {
  from: string
  to: string
  entries: LogEntry[]
  types: LogType[]
}) {
  const singleDay = from === to
  const [kind, setKind] = useState<'bars' | 'lines'>(() =>
    localStorage.getItem('caretrack.logsChart') === 'lines' ? 'lines' : 'bars',
  )
  const buckets = useMemo(() => {
    if (singleDay) {
      return Array.from({ length: 24 }, (_, hour) => {
        const counts = emptyCounts()
        for (const entry of entries) {
          const at = new Date(entry.at)
          if (toDateInput(at) === from && at.getHours() === hour) {
            counts[entry.type] += 1
          }
        }
        return { key: String(hour), label: hourLabel(hour), counts }
      })
    }
    return eachDay(from, to).map((day) => {
      const counts = emptyCounts()
      for (const entry of entries) {
        if (toDateInput(new Date(entry.at)) === day) {
          counts[entry.type] += 1
        }
      }
      const date = new Date(`${day}T12:00:00`)
      return {
        key: day,
        label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        counts,
      }
    })
  }, [entries, from, to, singleDay])

  const totals = useMemo(() => {
    const counts = emptyCounts()
    for (const entry of entries) {
      counts[entry.type] += 1
    }
    return counts
  }, [entries])

  const visibleTypes = types.length === 0 ? ALL_TYPES : ALL_TYPES.filter((item) => types.includes(item.type))
  const stackedMax = Math.max(
    1,
    ...buckets.map((bucket) => visibleTypes.reduce((sum, item) => sum + bucket.counts[item.type], 0)),
  )
  const lineMax = Math.max(
    1,
    ...buckets.flatMap((bucket) => visibleTypes.map((item) => bucket.counts[item.type])),
  )
  const max = kind === 'lines' ? lineMax : stackedMax
  const chartHeight = 160
  const chartLeft = 28
  const barGap = 6
  const barWidth = singleDay ? 18 : Math.max(18, Math.min(36, Math.floor(420 / Math.max(buckets.length, 1))))
  const chartWidth = chartLeft + buckets.length * (barWidth + barGap) + barGap
  const title = `${kind === 'lines' ? 'Line' : 'Bar'} chart of ${
    singleDay
      ? `events by hour on ${new Date(`${from}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`
      : `events by day from ${from} to ${to}`
  }`

  function setChartKind(next: 'bars' | 'lines') {
    setKind(next)
    localStorage.setItem('caretrack.logsChart', next)
  }

  function xFor(index: number) {
    return chartLeft + barGap + index * (barWidth + barGap) + barWidth / 2
  }

  function yFor(count: number) {
    return 8 + chartHeight - (count / max) * chartHeight
  }

  function showTick(index: number) {
    return singleDay ? index % 3 === 0 : buckets.length <= 14 || index % Math.ceil(buckets.length / 10) === 0
  }

  if (entries.length === 0) {
    return (
      <section className="card">
        <h2>Activity graph</h2>
        <p className="muted">No events in this range to graph.</p>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="section-heading">
        <h2>Activity graph</h2>
        <div className="view-switch" role="group" aria-label="Chart type">
          <button
            type="button"
            className={kind === 'bars' ? 'selected' : 'secondary'}
            aria-pressed={kind === 'bars'}
            onClick={() => setChartKind('bars')}
          >
            Bars
          </button>
          <button
            type="button"
            className={kind === 'lines' ? 'selected' : 'secondary'}
            aria-pressed={kind === 'lines'}
            onClick={() => setChartKind('lines')}
          >
            Lines
          </button>
        </div>
      </div>
      <p className="muted">
        {kind === 'lines'
          ? singleDay
            ? 'One line per event type, by hour for the selected day.'
            : 'One line per event type, by day for the selected range.'
          : singleDay
            ? 'Counts by hour for the selected day.'
            : 'Counts by day for the selected range.'}
      </p>
      <div className="event-chart">
        <svg
          role="img"
          aria-label={title}
          viewBox={`0 0 ${chartWidth} ${chartHeight + 36}`}
          width={chartWidth}
          height={chartHeight + 36}
        >
          <title>{title}</title>
          {[0, 0.5, 1].map((fraction) => {
            const value = Math.round(max * (1 - fraction))
            const y = 8 + chartHeight * fraction
            return (
              <g key={fraction}>
                <line x1={chartLeft} x2={chartWidth - 4} y1={y} y2={y} stroke="var(--line)" />
                <text x={chartLeft - 6} y={y + 4} textAnchor="end" className="chart-axis">
                  {value}
                </text>
              </g>
            )
          })}
          {kind === 'bars' &&
            buckets.map((bucket, index) => {
              const x = chartLeft + barGap + index * (barWidth + barGap)
              let y = 8 + chartHeight
              return (
                <g key={bucket.key}>
                  {visibleTypes.map((item) => {
                    const count = bucket.counts[item.type]
                    if (count === 0) return null
                    const height = (count / max) * chartHeight
                    y -= height
                    return (
                      <rect
                        key={item.type}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={height}
                        fill={TYPE_COLORS[item.type]}
                      >
                        <title>{`${bucket.label}: ${count} ${item.label}`}</title>
                      </rect>
                    )
                  })}
                  {showTick(index) && (
                    <text x={x + barWidth / 2} y={chartHeight + 24} textAnchor="middle" className="chart-axis">
                      {bucket.label}
                    </text>
                  )}
                </g>
              )
            })}
          {kind === 'lines' &&
            visibleTypes.map((item) => {
              const points = buckets.map((bucket, index) => `${xFor(index)},${yFor(bucket.counts[item.type])}`).join(' ')
              return (
                <g key={item.type}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke={TYPE_COLORS[item.type]}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {buckets.map((bucket, index) => (
                    <circle
                      key={bucket.key}
                      cx={xFor(index)}
                      cy={yFor(bucket.counts[item.type])}
                      r="3.2"
                      fill={TYPE_COLORS[item.type]}
                    >
                      <title>{`${bucket.label}: ${bucket.counts[item.type]} ${item.label}`}</title>
                    </circle>
                  ))}
                </g>
              )
            })}
          {kind === 'lines' &&
            buckets.map((bucket, index) =>
              showTick(index) ? (
                <text
                  key={bucket.key}
                  x={xFor(index)}
                  y={chartHeight + 24}
                  textAnchor="middle"
                  className="chart-axis"
                >
                  {bucket.label}
                </text>
              ) : null,
            )}
        </svg>
      </div>
      <ul className="chart-legend">
        {visibleTypes.map((item) => (
          <li key={item.type}>
            <span className="chart-swatch" style={{ background: TYPE_COLORS[item.type] }} />
            {item.label} ({totals[item.type]})
          </li>
        ))}
      </ul>
    </section>
  )
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
      <p className="muted">Search, graph, export, or send sleep, bowel, medication, behavior, and appointment history.</p>
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
        <div className="row-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const today = toDateInput(new Date())
              setFrom(today)
              setTo(today)
            }}
          >
            Today
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const range = defaultRange()
              setFrom(range.from)
              setTo(range.to)
            }}
          >
            Last 7 days
          </button>
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

      <EventGraph from={from} to={to} entries={entries} types={types} />

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
