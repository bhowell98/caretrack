import { useEffect, useState } from 'react'
import { api, formatWhen, type AuditEntryType, type AuditEvent } from './api'
import { useAuth } from './auth'

export function EditedFlag({ edited }: { edited?: boolean }) {
  if (!edited) return null
  return <span className="flag">Edited</span>
}

export function HistoryPanel({
  type,
  entryId,
  startOpen = false,
  hideToggle = false,
}: {
  type: AuditEntryType
  entryId: number
  startOpen?: boolean
  hideToggle?: boolean
}) {
  const { child } = useAuth()
  const [open, setOpen] = useState(startOpen)
  const [rows, setRows] = useState<AuditEvent[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !child) return
    api
      .history(child.id, type, entryId)
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load history'))
  }, [open, child, type, entryId])

  return (
    <div className="history">
      {!hideToggle && (
        <button type="button" className="secondary" onClick={() => setOpen((value) => !value)}>
          {open ? 'Hide history' : 'History'}
        </button>
      )}
      {open && (
        <div className="audit">
          {error && <p className="error">{error}</p>}
          {rows.length === 0 && !error && <p className="muted">No history yet.</p>}
          {rows.map((row) => (
            <div key={row.id} className="audit-event">
              <p>
                <strong>{row.action.toLowerCase()}</strong>
                <span className="muted">
                  {' '}
                  · {formatWhen(row.changedAt)} · {row.actorName}
                </span>
              </p>
              {row.changes.length === 0 ? (
                <p className="muted">Original entry</p>
              ) : (
                <ul>
                  {row.changes.map((change) => (
                    <li key={`${row.id}-${change.field}`}>
                      <code>{change.field}</code>: {displayValue(change.from)} → {displayValue(change.to)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function displayValue(value: string) {
  if (!value) return '(empty)'
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatWhen(value)
  }
  return value
}
