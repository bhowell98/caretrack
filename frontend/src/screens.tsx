import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import {
  api,
  formatDuration,
  formatWhen,
  fromLocalInput,
  medicationButtonLabel,
  behaviorButtonLabel,
  nowIso,
  toLocalInput,
  type Appointment,
  type Behavior,
  type BehaviorEvent,
  type BowelMovement,
  type Medication,
  type MedicationDose,
  type SleepInterval,
  type SleepQuality,
  type LogEntry,
} from './api'
import { EditedFlag, HistoryPanel } from './history'
import { ActivityList, LogsPage, endOfDayIso, startOfDayIso, toDateInput } from './logs'
import { LogEventPage } from './log-event'
import { useAuth } from './auth'

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function ErrorText({ error }: { error: string }) {
  if (!error) return null
  return <p className="error">{error}</p>
}

export function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    }
  }

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={onSubmit}>
        <p className="eyebrow">CareTrack</p>
        <h1>Sign in</h1>
        <p className="muted">Track sleep, bowel movements, medications, and appointments in one place.</p>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </Field>
        <ErrorText error={error} />
        <button type="submit">Sign in</button>
        <p className="muted">
          New here? <NavLink to="/register">Create an account</NavLink>
        </p>
      </form>
    </div>
  )
}

export function RegisterPage() {
  const { register, user } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await register(displayName, email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register')
    }
  }

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={onSubmit}>
        <p className="eyebrow">CareTrack</p>
        <h1>Create account</h1>
        <Field label="Your name">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label="Password (8+ characters)">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
        </Field>
        <ErrorText error={error} />
        <button type="submit">Create account</button>
        <p className="muted">
          Already have an account? <NavLink to="/login">Sign in</NavLink>
        </p>
      </form>
    </div>
  )
}

export function Layout() {
  const { user, loading, children, child, setChildId, logout } = useAuth()
  if (loading) return <div className="auth-shell">Loading…</div>
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      <header className="topbar">
        <p className="eyebrow">CareTrack</p>
        <div className="topbar-row">
          {children.length > 0 ? (
            <select
              className="child-select"
              value={child?.id ?? ''}
              onChange={(e) => setChildId(Number(e.target.value))}
              aria-label="Selected child"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.role === 'SHARED' ? `${c.name} (shared)` : c.name}
                </option>
              ))}
            </select>
          ) : (
            <strong>Add a child to start</strong>
          )}
          <div className="topbar-user">
            <span className="muted">{user.displayName}</span>
            <button type="button" className="ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <nav className="nav">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/log">Log</NavLink>
        <NavLink to="/sleep">Sleep</NavLink>
        <NavLink to="/bowel">Bowel</NavLink>
        <NavLink to="/meds">Meds</NavLink>
        <NavLink to="/behaviors">Behaviors</NavLink>
        <NavLink to="/appointments">Appointments</NavLink>
        <NavLink to="/logs">Logs</NavLink>
        <NavLink to="/child">Child</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/log" element={<LogEventPage />} />
          <Route path="/sleep" element={<SleepPage />} />
          <Route path="/bowel" element={<BowelPage />} />
          <Route path="/meds" element={<MedsPage />} />
          <Route path="/behaviors" element={<BehaviorsPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/child" element={<ChildPage />} />
        </Routes>
      </main>
    </div>
  )
}

function NeedChild({ children }: { children: ReactNode }) {
  const { child } = useAuth()
  if (!child) {
    return (
      <section className="card">
        <h2>Add your child first</h2>
        <p className="muted">Care logs are saved per child.</p>
        <NavLink to="/child">Set up a child profile</NavLink>
      </section>
    )
  }
  return children
}

const MED_BUTTON_COLORS = ['#3d6b5a', '#4a6fa5', '#7a5c9e', '#c46b4a', '#8b5a3c', '#2d6a4f']

type QuickButtonDraft = {
  kind: 'med' | 'behavior'
  id: number | null
  name: string
  buttonLabel: string
  buttonColor: string
  active: boolean
  dosage: string
  schedule: string
  promptForDosage: boolean
  description: string
}

function emptyButtonDraft(kind: 'med' | 'behavior'): QuickButtonDraft {
  return {
    kind,
    id: null,
    name: '',
    buttonLabel: '',
    buttonColor: MED_BUTTON_COLORS[0],
    active: true,
    dosage: '',
    schedule: '',
    promptForDosage: false,
    description: '',
  }
}

function draftFromMedication(med: Medication): QuickButtonDraft {
  return {
    kind: 'med',
    id: med.id,
    name: med.name,
    buttonLabel: med.buttonLabel ?? '',
    buttonColor: med.buttonColor || MED_BUTTON_COLORS[0],
    active: med.active,
    dosage: med.dosageInstructions ?? '',
    schedule: med.scheduleNotes ?? '',
    promptForDosage: Boolean(med.promptForDosage),
    description: '',
  }
}

function draftFromBehavior(behavior: Behavior): QuickButtonDraft {
  return {
    kind: 'behavior',
    id: behavior.id,
    name: behavior.name,
    buttonLabel: behavior.buttonLabel ?? '',
    buttonColor: behavior.buttonColor || MED_BUTTON_COLORS[0],
    active: behavior.active,
    dosage: '',
    schedule: '',
    promptForDosage: false,
    description: behavior.description ?? '',
  }
}

function mergeButtonLayout(stored: string[] | undefined, meds: Medication[], behaviors: Behavior[]) {
  const allowed = [
    'sleep',
    'awake',
    'bowel',
    ...meds.map((med) => `med:${med.id}`),
    ...behaviors.map((behavior) => `behavior:${behavior.id}`),
  ]
  const allowedSet = new Set(allowed)
  const next: string[] = []
  for (const key of stored ?? []) {
    if (allowedSet.has(key) && !next.includes(key)) {
      next.push(key)
    }
  }
  for (const key of allowed) {
    if (!next.includes(key)) {
      next.push(key)
    }
  }
  return next
}

function QuickSlot({
  editing,
  dragging,
  canMoveLeft,
  canMoveRight,
  onMove,
  onDragStart,
  onDrop,
  onDragEnd,
  children,
}: {
  editing: boolean
  dragging: boolean
  canMoveLeft: boolean
  canMoveRight: boolean
  onMove: (delta: number) => void
  onDragStart: () => void
  onDrop: () => void
  onDragEnd: () => void
  children: ReactNode
}) {
  return (
    <div
      className={`quick-slot${editing ? ' arranging' : ''}${dragging ? ' dragging' : ''}`}
      draggable={editing}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        if (editing) event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        onDrop()
      }}
      onDragEnd={onDragEnd}
    >
      {children}
      {editing && (
        <div className="quick-slot-move">
          <button type="button" className="secondary" disabled={!canMoveLeft} aria-label="Move earlier" onClick={() => onMove(-1)}>
            ‹
          </button>
          <button type="button" className="secondary" disabled={!canMoveRight} aria-label="Move later" onClick={() => onMove(1)}>
            ›
          </button>
        </div>
      )}
    </div>
  )
}

function ColorSwatches({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="swatches" role="group" aria-label="Button color">
      {MED_BUTTON_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`swatch${value === color ? ' selected' : ''}`}
          style={{ background: color }}
          aria-label={`Use color ${color}`}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  )
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <div className="switch-row">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch${checked ? ' on' : ''}`}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  )
}

function QuickLogButtons({ onLogged, refreshToken = 0 }: { onLogged?: () => void; refreshToken?: number }) {
  const { child, refreshChildren } = useAuth()
  const [sleeps, setSleeps] = useState<SleepInterval[]>([])
  const [meds, setMeds] = useState<Medication[]>([])
  const [behaviors, setBehaviors] = useState<Behavior[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [bmPrompt, setBmPrompt] = useState(false)
  const [dosePrompt, setDosePrompt] = useState<Medication | null>(null)
  const [doseAmount, setDoseAmount] = useState('')
  const [editingButtons, setEditingButtons] = useState(false)
  const [buttonDraft, setButtonDraft] = useState<QuickButtonDraft | null>(null)
  const [dragKey, setDragKey] = useState<string | null>(null)

  async function reload() {
    if (!child) return
    const [nextSleeps, nextMeds, nextBehaviors] = await Promise.all([
      api.sleep(child.id),
      api.medications(child.id),
      api.behaviors(child.id),
    ])
    setSleeps(nextSleeps)
    setMeds(nextMeds)
    setBehaviors(nextBehaviors)
  }

  useEffect(() => {
    void reload().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [child, refreshToken])

  const currentSleep = sleeps.find((row) => !row.endedAt) ?? null
  const layoutKeys = mergeButtonLayout(child?.quickButtonLayout, meds, behaviors)
  const visibleKeys = editingButtons
    ? layoutKeys
    : layoutKeys.filter((key) => {
        if (key.startsWith('med:')) {
          return meds.find((med) => med.id === Number(key.slice(4)))?.active
        }
        if (key.startsWith('behavior:')) {
          return behaviors.find((behavior) => behavior.id === Number(key.slice(9)))?.active
        }
        return true
      })
  const builtInDisabled = Boolean(busy) || editingButtons

  async function run(key: string, action: () => Promise<unknown>, message: string) {
    if (!child) return
    setError('')
    setBusy(key)
    try {
      await action()
      setStatus(message)
      await reload()
      onLogged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  async function saveButtonDraft(event: FormEvent) {
    event.preventDefault()
    if (!child || !buttonDraft) return
    setError('')
    setBusy('button-edit')
    try {
      if (buttonDraft.kind === 'med') {
        const body = {
          name: buttonDraft.name,
          dosageInstructions: buttonDraft.dosage,
          scheduleNotes: buttonDraft.schedule,
          buttonLabel: buttonDraft.buttonLabel,
          buttonColor: buttonDraft.buttonColor,
          active: buttonDraft.active,
          promptForDosage: buttonDraft.promptForDosage,
        }
        if (buttonDraft.id === null) {
          await api.createMedication(child.id, body)
          setStatus('Medication button added')
        } else {
          await api.updateMedication(child.id, buttonDraft.id, body)
          setStatus('Medication button saved')
        }
      } else {
        const body = {
          name: buttonDraft.name,
          description: buttonDraft.description,
          buttonLabel: buttonDraft.buttonLabel,
          buttonColor: buttonDraft.buttonColor,
          active: buttonDraft.active,
        }
        if (buttonDraft.id === null) {
          await api.createBehavior(child.id, body)
          setStatus('Behavior button added')
        } else {
          await api.updateBehavior(child.id, buttonDraft.id, body)
          setStatus('Behavior button saved')
        }
      }
      setButtonDraft(null)
      await reload()
      await refreshChildren()
      onLogged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save button')
    } finally {
      setBusy(null)
    }
  }

  async function deleteButtonDraft() {
    if (!child || !buttonDraft?.id) return
    setError('')
    setBusy('button-edit')
    try {
      if (buttonDraft.kind === 'med') {
        await api.deleteMedication(child.id, buttonDraft.id)
      } else {
        await api.deleteBehavior(child.id, buttonDraft.id)
      }
      setButtonDraft(null)
      setStatus('Button deleted')
      await reload()
      await refreshChildren()
      onLogged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete button')
    } finally {
      setBusy(null)
    }
  }

  async function persistLayout(next: string[]) {
    if (!child) return
    setError('')
    try {
      await api.updateQuickButtonLayout(child.id, next)
      await refreshChildren()
      setStatus('Button order saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save button order')
    }
  }

  async function moveKey(key: string, delta: number) {
    const index = layoutKeys.indexOf(key)
    const target = index + delta
    if (index < 0 || target < 0 || target >= layoutKeys.length) return
    const next = [...layoutKeys]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    await persistLayout(next)
  }

  function dropOn(targetKey: string) {
    if (!dragKey || dragKey === targetKey) return
    const from = layoutKeys.indexOf(dragKey)
    const to = layoutKeys.indexOf(targetKey)
    if (from < 0 || to < 0) return
    const next = [...layoutKeys]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setDragKey(null)
    void persistLayout(next)
  }

  return (
    <section className="card">
      <div className="section-heading">
        <h2>Quick log</h2>
        <button
          type="button"
          className={editingButtons ? undefined : 'secondary'}
          aria-pressed={editingButtons}
          onClick={() => {
            setEditingButtons((value) => !value)
            setButtonDraft(null)
            setBmPrompt(false)
            setDosePrompt(null)
            setStatus('')
          }}
        >
          {editingButtons ? 'Done' : 'Edit buttons'}
        </button>
      </div>
      <p className="muted">
        {editingButtons
          ? 'Drag a button or use the arrows to change order. Tap a medication or behavior button to edit it. Sleep, Awake, and BM stay built-in.'
          : currentSleep
            ? `Sleeping since ${formatWhen(currentSleep.startedAt)}.`
            : 'Tap Sleep, Awake, BM, or a medication or behavior button to log now.'}
      </p>
      <div className="quick-grid">
        {visibleKeys.map((key) => {
          const index = layoutKeys.indexOf(key)
          const wrap = (button: ReactNode) => (
            <QuickSlot
              key={key}
              editing={editingButtons}
              dragging={dragKey === key}
              canMoveLeft={index > 0}
              canMoveRight={index >= 0 && index < layoutKeys.length - 1}
              onMove={(delta) => void moveKey(key, delta)}
              onDragStart={() => setDragKey(key)}
              onDrop={() => dropOn(key)}
              onDragEnd={() => setDragKey(null)}
            >
              {button}
            </QuickSlot>
          )
          if (key === 'sleep') {
            return wrap(
              <button
                type="button"
                className="quick-btn sleep"
                disabled={builtInDisabled || Boolean(currentSleep)}
                onClick={() =>
                  run(
                    'sleep',
                    () =>
                      api.createSleep(child!.id, {
                        startedAt: nowIso(),
                        endedAt: null,
                        quality: 'UNKNOWN',
                        nightWakings: null,
                        notes: '',
                      }),
                    'Sleep started',
                  )
                }
              >
                Sleep
              </button>,
            )
          }
          if (key === 'awake') {
            return wrap(
              <button
                type="button"
                className="quick-btn awake"
                disabled={builtInDisabled || !currentSleep}
                onClick={() =>
                  run(
                    'awake',
                    () =>
                      api.updateSleep(child!.id, currentSleep!.id, {
                        startedAt: currentSleep!.startedAt,
                        endedAt: nowIso(),
                        quality: currentSleep!.quality,
                        nightWakings: currentSleep!.nightWakings,
                        notes: currentSleep!.notes ?? '',
                      }),
                    'Marked awake',
                  )
                }
              >
                Awake
              </button>,
            )
          }
          if (key === 'bowel') {
            return wrap(
              <button
                type="button"
                className="quick-btn bowel"
                disabled={builtInDisabled}
                aria-label="Bowel movement"
                onClick={() => {
                  setError('')
                  setBmPrompt(true)
                }}
              >
                BM
              </button>,
            )
          }
          if (key.startsWith('med:')) {
            const med = meds.find((row) => row.id === Number(key.slice(4)))
            if (!med) return null
            return wrap(
              <button
                type="button"
                className={`quick-btn med${editingButtons ? ' editing' : ''}${med.active ? '' : ' inactive'}`}
                style={{ background: med.buttonColor || undefined }}
                disabled={Boolean(busy) && !editingButtons}
                onClick={() => {
                  if (editingButtons) {
                    setError('')
                    setButtonDraft(draftFromMedication(med))
                    return
                  }
                  if (med.promptForDosage) {
                    setError('')
                    setDosePrompt(med)
                    setDoseAmount(med.dosageInstructions ?? '')
                    return
                  }
                  void run(
                    `med-${med.id}`,
                    () =>
                      api.createDose(child!.id, {
                        medicationId: med.id,
                        givenAt: nowIso(),
                        amountGiven: med.dosageInstructions || '',
                        notes: '',
                      }),
                    `${medicationButtonLabel(med)} logged`,
                  )
                }}
              >
                {medicationButtonLabel(med)}
              </button>,
            )
          }
          if (key.startsWith('behavior:')) {
            const behavior = behaviors.find((row) => row.id === Number(key.slice(9)))
            if (!behavior) return null
            return wrap(
              <button
                type="button"
                className={`quick-btn med${editingButtons ? ' editing' : ''}${behavior.active ? '' : ' inactive'}`}
                style={{ background: behavior.buttonColor || undefined }}
                disabled={Boolean(busy) && !editingButtons}
                onClick={() => {
                  if (editingButtons) {
                    setError('')
                    setButtonDraft(draftFromBehavior(behavior))
                    return
                  }
                  void run(
                    `behavior-${behavior.id}`,
                    () =>
                      api.createBehaviorEvent(child!.id, {
                        behaviorId: behavior.id,
                        occurredAt: nowIso(),
                        intensity: null,
                        notes: '',
                      }),
                    `${behaviorButtonLabel(behavior)} logged`,
                  )
                }}
              >
                {behaviorButtonLabel(behavior)}
              </button>,
            )
          }
          return null
        })}
        {editingButtons && (
          <button
            type="button"
            className="quick-btn add"
            onClick={() => {
              setError('')
              setButtonDraft(emptyButtonDraft('med'))
            }}
          >
            + Add
          </button>
        )}
      </div>
      {!editingButtons && meds.filter((med) => med.active).length === 0 && behaviors.filter((behavior) => behavior.active).length === 0 && (

        <p className="muted">
          Add one-tap buttons with Edit buttons, or on the <NavLink to="/meds">Meds</NavLink> or{' '}
          <NavLink to="/behaviors">Behaviors</NavLink> pages.
        </p>
      )}
      {buttonDraft && (
        <div className="dialog-backdrop" role="presentation" onClick={() => setButtonDraft(null)}>
          <form
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-button-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={saveButtonDraft}
          >
            <h3 id="quick-button-title">{buttonDraft.id === null ? 'Add button' : 'Edit button'}</h3>
            {buttonDraft.id === null && (
              <Field label="Button type">
                <select
                  value={buttonDraft.kind}
                  onChange={(e) =>
                    setButtonDraft({
                      ...buttonDraft,
                      kind: e.target.value === 'behavior' ? 'behavior' : 'med',
                    })
                  }
                >
                  <option value="med">Medication</option>
                  <option value="behavior">Behavior</option>
                </select>
              </Field>
            )}
            <Field label={buttonDraft.kind === 'med' ? 'Medication name' : 'Behavior name'}>
              <input
                value={buttonDraft.name}
                onChange={(e) => setButtonDraft({ ...buttonDraft, name: e.target.value })}
                required
                autoFocus
              />
            </Field>
            <Field label="Button label (optional)">
              <input
                value={buttonDraft.buttonLabel}
                onChange={(e) => setButtonDraft({ ...buttonDraft, buttonLabel: e.target.value })}
                placeholder="Short label on the quick button"
              />
            </Field>
            <Field label="Button color">
              <ColorSwatches
                value={buttonDraft.buttonColor}
                onChange={(buttonColor) => setButtonDraft({ ...buttonDraft, buttonColor })}
              />
            </Field>
            {buttonDraft.kind === 'med' ? (
              <>
                <Field label="Dose instructions">
                  <input
                    value={buttonDraft.dosage}
                    onChange={(e) => setButtonDraft({ ...buttonDraft, dosage: e.target.value })}
                    placeholder="e.g. 5 ml with food"
                  />
                </Field>
                <Switch
                  checked={buttonDraft.promptForDosage}
                  onChange={(promptForDosage) => setButtonDraft({ ...buttonDraft, promptForDosage })}
                  label="Prompt for dosage when logging"
                />
                <Field label="Schedule notes">
                  <input
                    value={buttonDraft.schedule}
                    onChange={(e) => setButtonDraft({ ...buttonDraft, schedule: e.target.value })}
                    placeholder="e.g. morning and bedtime"
                  />
                </Field>
              </>
            ) : (
              <Field label="What it looks like">
                <textarea
                  value={buttonDraft.description}
                  onChange={(e) => setButtonDraft({ ...buttonDraft, description: e.target.value })}
                  rows={3}
                />
              </Field>
            )}
            <Switch
              checked={buttonDraft.active}
              onChange={(active) => setButtonDraft({ ...buttonDraft, active })}
              label="Show on quick log"
            />
            <div className="row-actions">
              <button type="submit" disabled={busy === 'button-edit'}>
                Save button
              </button>
              <button type="button" className="secondary" onClick={() => setButtonDraft(null)}>
                Cancel
              </button>
              {buttonDraft.id !== null && (
                <button type="button" className="ghost" disabled={busy === 'button-edit'} onClick={() => void deleteButtonDraft()}>
                  Delete
                </button>
              )}
            </div>
          </form>
        </div>
      )}
      {bmPrompt && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onClick={() => setBmPrompt(false)}
        >
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bm-prompt-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="bm-prompt-title">Bristol type</h3>
            <p className="muted">Choose a type for this bowel movement, or skip if you do not know.</p>
            <div className="bristol-grid">
              {[1, 2, 3, 4, 5, 6, 7].map((type) => (
                <button
                  key={type}
                  type="button"
                  className="bristol-choice"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    setBmPrompt(false)
                    void run(
                      'bowel',
                      () =>
                        api.createBowel(child!.id, {
                          occurredAt: nowIso(),
                          bristolType: type,
                          notes: '',
                        }),
                      `BM type ${type} logged`,
                    )
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="secondary"
                disabled={Boolean(busy)}
                onClick={() => {
                  setBmPrompt(false)
                  void run(
                    'bowel',
                    () =>
                      api.createBowel(child!.id, {
                        occurredAt: nowIso(),
                        bristolType: null,
                        notes: '',
                      }),
                    'BM logged',
                  )
                }}
              >
                Skip
              </button>
              <button type="button" className="ghost" onClick={() => setBmPrompt(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {dosePrompt && (
        <div className="dialog-backdrop" role="presentation" onClick={() => setDosePrompt(null)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dose-prompt-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="dose-prompt-title">Dosage</h3>
            <p className="muted">Enter how much {medicationButtonLabel(dosePrompt)} was given.</p>
            <Field label="Amount given">
              <input
                value={doseAmount}
                onChange={(e) => setDoseAmount(e.target.value)}
                placeholder="e.g. 0.5mg"
                autoFocus
              />
            </Field>
            <div className="row-actions">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => {
                  const med = dosePrompt
                  setDosePrompt(null)
                  void run(
                    `med-${med.id}`,
                    () =>
                      api.createDose(child!.id, {
                        medicationId: med.id,
                        givenAt: nowIso(),
                        amountGiven: doseAmount,
                        notes: '',
                      }),
                    `${medicationButtonLabel(med)} logged`,
                  )
                }}
              >
                Log dose
              </button>
              <button type="button" className="ghost" onClick={() => setDosePrompt(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <ErrorText error={error} />
      {status && !error && <p className="status">{status}</p>}
    </section>
  )
}

function DashboardPage() {
  const { child } = useAuth()
  const [error, setError] = useState('')
  const [data, setData] = useState<Awaited<ReturnType<typeof api.dashboard>> | null>(null)
  const [view, setView] = useState<'glance' | 'day'>(() =>
    localStorage.getItem('caretrack.homeView') === 'day' ? 'day' : 'glance',
  )
  const [day, setDay] = useState(() => toDateInput(new Date()))
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [tick, setTick] = useState(0)

  function setHomeView(next: 'glance' | 'day') {
    setView(next)
    localStorage.setItem('caretrack.homeView', next)
  }

  function shiftDay(delta: number) {
    const next = new Date(`${day}T12:00:00`)
    next.setDate(next.getDate() + delta)
    setDay(toDateInput(next))
  }

  function reloadDashboard() {
    if (!child) return
    api
      .dashboard(child.id)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }

  useEffect(() => {
    if (!child) return
    reloadDashboard()
  }, [child, tick])

  useEffect(() => {
    if (!child) return
    api
      .logs(child.id, { from: startOfDayIso(day), to: endOfDayIso(day) })
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load logs'))
  }, [child, day, tick])

  const dayLabel = new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <NeedChild>
      <h1>Today at a glance</h1>
      <div className="view-switch no-print" role="group" aria-label="Home view">
        <button
          type="button"
          className={view === 'glance' ? 'selected' : 'secondary'}
          aria-pressed={view === 'glance'}
          onClick={() => setHomeView('glance')}
        >
          Glance
        </button>
        <button
          type="button"
          className={view === 'day' ? 'selected' : 'secondary'}
          aria-pressed={view === 'day'}
          onClick={() => setHomeView('day')}
        >
          Day list
        </button>
      </div>
      <ErrorText error={error} />
      <QuickLogButtons
        onLogged={() => {
          setError('')
          setTick((value) => value + 1)
        }}
      />
      {view === 'day' ? (
        <section className="card">
          <div className="day-nav">
            <button type="button" className="secondary" onClick={() => shiftDay(-1)} aria-label="Previous day">
              Previous
            </button>
            <label className="field">
              <span className="visually-hidden">Day</span>
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            </label>
            <button type="button" className="secondary" onClick={() => shiftDay(1)} aria-label="Next day">
              Next
            </button>
          </div>
          <h2>{dayLabel}</h2>
          <p className="muted">
            {entries.length} {entries.length === 1 ? 'activity' : 'activities'} in one list
          </p>
          <ActivityList entries={entries} />
        </section>
      ) : (
        <div className="grid">
          <article className="card">
            <h2>Sleep</h2>
            {data?.latestSleep ? (
              <>
                <p>{formatWhen(data.latestSleep.startedAt)}</p>
                <p className="muted">{formatDuration(data.latestSleep.startedAt, data.latestSleep.endedAt)}</p>
              </>
            ) : (
              <p className="muted">No sleep logged yet.</p>
            )}
            <NavLink to="/sleep">Log sleep</NavLink>
          </article>
          <article className="card">
            <h2>Bowel</h2>
            {data?.latestBowel ? (
              <>
                <p>{formatWhen(data.latestBowel.occurredAt)}</p>
                <p className="muted">
                  {data.latestBowel.bristolType ? `Bristol ${data.latestBowel.bristolType}` : 'No type recorded'}
                </p>
              </>
            ) : (
              <p className="muted">No bowel movements logged yet.</p>
            )}
            <NavLink to="/bowel">Log bowel movement</NavLink>
          </article>
          <article className="card">
            <h2>Medication</h2>
            {data?.latestDose ? (
              <>
                <p>{data.latestDose.medicationName}</p>
                <p className="muted">{formatWhen(data.latestDose.givenAt)}</p>
              </>
            ) : (
              <p className="muted">No doses logged yet.</p>
            )}
            <NavLink to="/meds">Log a dose</NavLink>
          </article>
          <article className="card">
            <h2>Behavior</h2>
            {data?.latestBehavior ? (
              <>
                <p>{data.latestBehavior.behaviorName}</p>
                <p className="muted">{formatWhen(data.latestBehavior.occurredAt)}</p>
              </>
            ) : (
              <p className="muted">No behaviors logged yet.</p>
            )}
            <NavLink to="/behaviors">Log a behavior</NavLink>
          </article>
          <article className="card">
            <h2>Next appointment</h2>
            {data?.nextAppointment ? (
              <>
                <p>{data.nextAppointment.title}</p>
                <p className="muted">{formatWhen(data.nextAppointment.startsAt)}</p>
              </>
            ) : (
              <p className="muted">Nothing upcoming.</p>
            )}
            <NavLink to="/appointments">Add appointment</NavLink>
          </article>
          <article className="card">
          <h2>Logs</h2>
          <p className="muted">Search daily history, export a CSV, or send a copy.</p>
          <p>
            <NavLink to="/log">Log an event</NavLink>
          </p>
          <NavLink to="/logs">View logs</NavLink>
          </article>
        </div>
      )}
    </NeedChild>
  )
}

function SleepPage() {
  const { child } = useAuth()
  const [rows, setRows] = useState<SleepInterval[]>([])
  const [startedAt, setStartedAt] = useState(toLocalInput())
  const [endedAt, setEndedAt] = useState('')
  const [quality, setQuality] = useState<SleepQuality>('UNKNOWN')
  const [nightWakings, setNightWakings] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [quickRev, setQuickRev] = useState(0)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editStartedAt, setEditStartedAt] = useState('')
  const [editEndedAt, setEditEndedAt] = useState('')
  const [editQuality, setEditQuality] = useState<SleepQuality>('UNKNOWN')
  const [editNightWakings, setEditNightWakings] = useState('')
  const [editNotes, setEditNotes] = useState('')

  async function reload() {
    if (!child) return
    setRows(await api.sleep(child.id))
    setQuickRev((value) => value + 1)
  }

  useEffect(() => {
    void reload().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [child])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!child) return
    setError('')
    try {
      await api.createSleep(child.id, {
        startedAt: fromLocalInput(startedAt),
        endedAt: endedAt ? fromLocalInput(endedAt) : null,
        quality,
        nightWakings: nightWakings === '' ? null : Number(nightWakings),
        notes,
      })
      setNotes('')
      setEndedAt('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    }
  }

  function startSleepEdit(row: SleepInterval) {
    setEditingId(row.id)
    setEditStartedAt(toLocalInput(row.startedAt))
    setEditEndedAt(row.endedAt ? toLocalInput(row.endedAt) : '')
    setEditQuality(row.quality)
    setEditNightWakings(row.nightWakings == null ? '' : String(row.nightWakings))
    setEditNotes(row.notes ?? '')
  }

  async function saveSleepEdit(event: FormEvent) {
    event.preventDefault()
    if (!child || editingId === null) return
    setError('')
    try {
      await api.updateSleep(child.id, editingId, {
        startedAt: fromLocalInput(editStartedAt),
        endedAt: editEndedAt ? fromLocalInput(editEndedAt) : null,
        quality: editQuality,
        nightWakings: editNightWakings === '' ? null : Number(editNightWakings),
        notes: editNotes,
      })
      setEditingId(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    }
  }

  return (
    <NeedChild>
      <h1>Sleep intervals</h1>
      <QuickLogButtons refreshToken={quickRev} onLogged={() => void reload()} />
      <form className="card" onSubmit={onSubmit}>
        <h2>Log sleep</h2>
        <p className="muted">Set the times yourself. Quick log is only for right now.</p>
        <div className="row">
          <Field label="Fell asleep">
            <input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} required />
          </Field>
          <Field label="Woke up (optional)">
            <input type="datetime-local" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} />
          </Field>
        </div>
        <div className="row">
          <Field label="Quality">
            <select value={quality} onChange={(e) => setQuality(e.target.value as SleepQuality)}>
              <option value="UNKNOWN">Unknown</option>
              <option value="RESTLESS">Restless</option>
              <option value="FAIR">Fair</option>
              <option value="GOOD">Good</option>
            </select>
          </Field>
          <Field label="Night wakings">
            <input type="number" min={0} value={nightWakings} onChange={(e) => setNightWakings(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </Field>
        <ErrorText error={error} />
        <button type="submit">Save sleep</button>
      </form>
      <ul className="list">
        {rows.map((row) => (
          <li key={row.id} className="card list-item nested">
            {editingId === row.id ? (
              <form className="stack" onSubmit={saveSleepEdit}>
                <div className="row">
                  <Field label="Fell asleep">
                    <input type="datetime-local" value={editStartedAt} onChange={(e) => setEditStartedAt(e.target.value)} required />
                  </Field>
                  <Field label="Woke up">
                    <input type="datetime-local" value={editEndedAt} onChange={(e) => setEditEndedAt(e.target.value)} />
                  </Field>
                </div>
                <div className="row">
                  <Field label="Quality">
                    <select value={editQuality} onChange={(e) => setEditQuality(e.target.value as SleepQuality)}>
                      <option value="UNKNOWN">Unknown</option>
                      <option value="RESTLESS">Restless</option>
                      <option value="FAIR">Fair</option>
                      <option value="GOOD">Good</option>
                    </select>
                  </Field>
                  <Field label="Night wakings">
                    <input type="number" min={0} value={editNightWakings} onChange={(e) => setEditNightWakings(e.target.value)} />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
                </Field>
                <div className="row-actions">
                  <button type="submit">Save changes</button>
                  <button type="button" className="secondary" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <strong>
                    {formatDuration(row.startedAt, row.endedAt)}
                    <EditedFlag edited={row.edited} />
                  </strong>
                  <p className="muted">
                    {formatWhen(row.startedAt)} → {row.endedAt ? formatWhen(row.endedAt) : 'ongoing'} · {row.quality.toLowerCase()}
                  </p>
                  {row.notes && <p>{row.notes}</p>}
                </div>
                <div className="row-actions">
                  <button type="button" className="secondary" onClick={() => startSleepEdit(row)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => child && api.deleteSleep(child.id, row.id).then(reload)}
                  >
                    Delete
                  </button>
                </div>
                <HistoryPanel type="SLEEP" entryId={row.id} />
              </>
            )}
          </li>
        ))}
      </ul>
    </NeedChild>
  )
}

function BowelPage() {
  const { child } = useAuth()
  const [rows, setRows] = useState<BowelMovement[]>([])
  const [occurredAt, setOccurredAt] = useState(toLocalInput())
  const [bristolType, setBristolType] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editOccurredAt, setEditOccurredAt] = useState('')
  const [editBristolType, setEditBristolType] = useState('')
  const [editNotes, setEditNotes] = useState('')

  async function reload() {
    if (!child) return
    setRows(await api.bowel(child.id))
  }

  useEffect(() => {
    void reload().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [child])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!child) return
    setError('')
    try {
      await api.createBowel(child.id, {
        occurredAt: fromLocalInput(occurredAt),
        bristolType: bristolType === '' ? null : Number(bristolType),
        notes,
      })
      setNotes('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    }
  }

  function startBowelEdit(row: BowelMovement) {
    setEditingId(row.id)
    setEditOccurredAt(toLocalInput(row.occurredAt))
    setEditBristolType(row.bristolType == null ? '' : String(row.bristolType))
    setEditNotes(row.notes ?? '')
  }

  async function saveBowelEdit(event: FormEvent) {
    event.preventDefault()
    if (!child || editingId === null) return
    setError('')
    try {
      await api.updateBowel(child.id, editingId, {
        occurredAt: fromLocalInput(editOccurredAt),
        bristolType: editBristolType === '' ? null : Number(editBristolType),
        notes: editNotes,
      })
      setEditingId(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    }
  }

  return (
    <NeedChild>
      <h1>Bowel movements</h1>
      <QuickLogButtons onLogged={() => void reload()} />
      <form className="card" onSubmit={onSubmit}>
        <h2>Log bowel movement</h2>
        <p className="muted">Pick the time and type. Quick log is only for right now.</p>
        <div className="row">
          <Field label="When">
            <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} required />
          </Field>
          <Field label="Bristol type (1–7, optional)">
            <select value={bristolType} onChange={(e) => setBristolType(e.target.value)}>
              <option value="">Not recorded</option>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </Field>
        <ErrorText error={error} />
        <button type="submit">Save</button>
      </form>
      <ul className="list">
        {rows.map((row) => (
          <li key={row.id} className="card list-item nested">
            {editingId === row.id ? (
              <form className="stack" onSubmit={saveBowelEdit}>
                <div className="row">
                  <Field label="When">
                    <input type="datetime-local" value={editOccurredAt} onChange={(e) => setEditOccurredAt(e.target.value)} required />
                  </Field>
                  <Field label="Bristol type">
                    <select value={editBristolType} onChange={(e) => setEditBristolType(e.target.value)}>
                      <option value="">Not recorded</option>
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
                </Field>
                <div className="row-actions">
                  <button type="submit">Save changes</button>
                  <button type="button" className="secondary" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <strong>
                    {formatWhen(row.occurredAt)}
                    <EditedFlag edited={row.edited} />
                  </strong>
                  <p className="muted">{row.bristolType ? `Bristol ${row.bristolType}` : 'Type not recorded'}</p>
                  {row.notes && <p>{row.notes}</p>}
                </div>
                <div className="row-actions">
                  <button type="button" className="secondary" onClick={() => startBowelEdit(row)}>
                    Edit
                  </button>
                  <button type="button" className="ghost" onClick={() => child && api.deleteBowel(child.id, row.id).then(reload)}>
                    Delete
                  </button>
                </div>
                <HistoryPanel type="BOWEL" entryId={row.id} />
              </>
            )}
          </li>
        ))}
      </ul>
    </NeedChild>
  )
}

function MedsPage() {
  const { child } = useAuth()
  const [meds, setMeds] = useState<Medication[]>([])
  const [doses, setDoses] = useState<MedicationDose[]>([])
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [schedule, setSchedule] = useState('')
  const [buttonLabel, setButtonLabel] = useState('')
  const [buttonColor, setButtonColor] = useState(MED_BUTTON_COLORS[0])
  const [promptForDosage, setPromptForDosage] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editDosage, setEditDosage] = useState('')
  const [editSchedule, setEditSchedule] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState(MED_BUTTON_COLORS[0])
  const [editActive, setEditActive] = useState(true)
  const [editPromptForDosage, setEditPromptForDosage] = useState(false)
  const [error, setError] = useState('')
  const [quickRev, setQuickRev] = useState(0)
  const [editingDoseId, setEditingDoseId] = useState<number | null>(null)
  const [editDoseMedId, setEditDoseMedId] = useState<number | ''>('')
  const [editDoseGivenAt, setEditDoseGivenAt] = useState('')
  const [editDoseAmount, setEditDoseAmount] = useState('')
  const [editDoseNotes, setEditDoseNotes] = useState('')
  const [logMedId, setLogMedId] = useState<number | ''>('')
  const [logGivenAt, setLogGivenAt] = useState(toLocalInput())
  const [logAmount, setLogAmount] = useState('')
  const [logDoseNotes, setLogDoseNotes] = useState('')

  async function reload() {
    if (!child) return
    const [m, d] = await Promise.all([api.medications(child.id), api.doses(child.id)])
    setMeds(m)
    setDoses(d)
    setLogMedId((current) => current || m[0]?.id || '')
    setQuickRev((value) => value + 1)
  }

  useEffect(() => {
    void reload().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [child])

  function startEdit(med: Medication) {
    setEditingId(med.id)
    setEditName(med.name)
    setEditDosage(med.dosageInstructions ?? '')
    setEditSchedule(med.scheduleNotes ?? '')
    setEditLabel(med.buttonLabel ?? '')
    setEditColor(med.buttonColor || MED_BUTTON_COLORS[0])
    setEditActive(med.active)
    setEditPromptForDosage(Boolean(med.promptForDosage))
  }

  async function addMed(event: FormEvent) {
    event.preventDefault()
    if (!child) return
    setError('')
    try {
      await api.createMedication(child.id, {
        name,
        dosageInstructions: dosage,
        scheduleNotes: schedule,
        buttonLabel,
        buttonColor,
        active: true,
        promptForDosage,
      })
      setName('')
      setDosage('')
      setSchedule('')
      setButtonLabel('')
      setButtonColor(MED_BUTTON_COLORS[0])
      setPromptForDosage(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save medication')
    }
  }

  async function saveMed(event: FormEvent) {
    event.preventDefault()
    if (!child || editingId === null) return
    setError('')
    try {
      await api.updateMedication(child.id, editingId, {
        name: editName,
        dosageInstructions: editDosage,
        scheduleNotes: editSchedule,
        buttonLabel: editLabel,
        buttonColor: editColor,
        active: editActive,
        promptForDosage: editPromptForDosage,
      })
      setEditingId(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update medication')
    }
  }

  function startDoseEdit(row: MedicationDose) {
    setEditingDoseId(row.id)
    setEditDoseMedId(row.medicationId)
    setEditDoseGivenAt(toLocalInput(row.givenAt))
    setEditDoseAmount(row.amountGiven ?? '')
    setEditDoseNotes(row.notes ?? '')
  }

  async function saveDoseEdit(event: FormEvent) {
    event.preventDefault()
    if (!child || editingDoseId === null || editDoseMedId === '') return
    setError('')
    try {
      await api.updateDose(child.id, editingDoseId, {
        medicationId: editDoseMedId,
        givenAt: fromLocalInput(editDoseGivenAt),
        amountGiven: editDoseAmount,
        notes: editDoseNotes,
      })
      setEditingDoseId(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update dose')
    }
  }

  async function logDose(event: FormEvent) {
    event.preventDefault()
    if (!child || logMedId === '') return
    setError('')
    try {
      await api.createDose(child.id, {
        medicationId: logMedId,
        givenAt: fromLocalInput(logGivenAt),
        amountGiven: logAmount,
        notes: logDoseNotes,
      })
      setLogDoseNotes('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log dose')
    }
  }

  return (
    <NeedChild>
      <h1>Medications</h1>
      <ErrorText error={error} />
      <QuickLogButtons refreshToken={quickRev} onLogged={() => void reload()} />
      <div className="grid">
        <form className="card" onSubmit={addMed}>
          <h2>Add medication button</h2>
          <Field label="Medication name">
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Button label (optional)">
            <input
              value={buttonLabel}
              onChange={(e) => setButtonLabel(e.target.value)}
              placeholder="Short label on the quick button"
            />
          </Field>
          <Field label="Button color">
            <ColorSwatches value={buttonColor} onChange={setButtonColor} />
          </Field>
          <Field label="Dose instructions">
            <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 5 ml with food" />
          </Field>
          <Switch
            checked={promptForDosage}
            onChange={setPromptForDosage}
            label="Prompt for dosage when logging"
          />
          <Field label="Schedule notes">
            <input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="e.g. morning and bedtime" />
          </Field>
          <button type="submit">Save medication</button>
        </form>
        <section className="card">
          <h2>Customize buttons</h2>
          {meds.length === 0 && <p className="muted">No medications yet.</p>}
          <ul className="list">
            {meds.map((med) => (
              <li key={med.id} className="card list-item nested">
                {editingId === med.id ? (
                  <form className="stack" onSubmit={saveMed}>
                    <Field label="Name">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                    </Field>
                    <Field label="Button label">
                      <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                    </Field>
                    <Field label="Button color">
                      <ColorSwatches value={editColor} onChange={setEditColor} />
                    </Field>
                    <Field label="Dose instructions">
                      <input value={editDosage} onChange={(e) => setEditDosage(e.target.value)} />
                    </Field>
                    <Switch
                      checked={editPromptForDosage}
                      onChange={setEditPromptForDosage}
                      label="Prompt for dosage when logging"
                    />
                    <Field label="Schedule notes">
                      <input value={editSchedule} onChange={(e) => setEditSchedule(e.target.value)} />
                    </Field>
                    <label className="check">
                      <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                      Show on Sleep / Home quick buttons
                    </label>
                    <div className="row-actions">
                      <button type="submit">Save button</button>
                      <button type="button" className="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <strong>{medicationButtonLabel(med)}</strong>
                      <p className="muted">
                        {med.name}
                        {med.dosageInstructions ? ` · ${med.dosageInstructions}` : ''}
                        {med.promptForDosage ? ' · asks for dose' : ''}
                        {med.active ? '' : ' · hidden'}
                      </p>
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => startEdit(med)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => child && api.deleteMedication(child.id, med.id).then(reload)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <form className="card" onSubmit={logDose}>
        <h2>Log a dose</h2>
        <p className="muted">Choose the medication, time, and amount. You do not need the quick-log button.</p>
        {meds.length === 0 ? (
          <p className="muted">Add a medication button above first.</p>
        ) : (
          <>
            <Field label="Medication">
              <select
                value={logMedId}
                onChange={(e) => {
                  const id = Number(e.target.value)
                  setLogMedId(id)
                  const med = meds.find((item) => item.id === id)
                  setLogAmount(med?.dosageInstructions ?? '')
                }}
                required
              >
                {meds.map((med) => (
                  <option key={med.id} value={med.id}>
                    {med.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="row">
              <Field label="Given at">
                <input type="datetime-local" value={logGivenAt} onChange={(e) => setLogGivenAt(e.target.value)} required />
              </Field>
              <Field label="Amount given">
                <input value={logAmount} onChange={(e) => setLogAmount(e.target.value)} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea value={logDoseNotes} onChange={(e) => setLogDoseNotes(e.target.value)} rows={2} />
            </Field>
            <button type="submit">Save dose</button>
          </>
        )}
      </form>
      <h2>Recent doses</h2>
      <ul className="list">
        {doses.map((row) => (
          <li key={row.id} className="card list-item nested">
            {editingDoseId === row.id ? (
              <form className="stack" onSubmit={saveDoseEdit}>
                <Field label="Medication">
                  <select value={editDoseMedId} onChange={(e) => setEditDoseMedId(Number(e.target.value))} required>
                    {meds.map((med) => (
                      <option key={med.id} value={med.id}>
                        {med.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Given at">
                  <input type="datetime-local" value={editDoseGivenAt} onChange={(e) => setEditDoseGivenAt(e.target.value)} required />
                </Field>
                <Field label="Amount given">
                  <input value={editDoseAmount} onChange={(e) => setEditDoseAmount(e.target.value)} />
                </Field>
                <Field label="Notes">
                  <textarea value={editDoseNotes} onChange={(e) => setEditDoseNotes(e.target.value)} rows={2} />
                </Field>
                <div className="row-actions">
                  <button type="submit">Save changes</button>
                  <button type="button" className="secondary" onClick={() => setEditingDoseId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <strong>
                    {row.medicationName}
                    <EditedFlag edited={row.edited} />
                  </strong>
                  <p className="muted">
                    {formatWhen(row.givenAt)}
                    {row.amountGiven ? ` · ${row.amountGiven}` : ''}
                  </p>
                  {row.notes && <p>{row.notes}</p>}
                </div>
                <div className="row-actions">
                  <button type="button" className="secondary" onClick={() => startDoseEdit(row)}>
                    Edit
                  </button>
                  <button type="button" className="ghost" onClick={() => child && api.deleteDose(child.id, row.id).then(reload)}>
                    Delete
                  </button>
                </div>
                <HistoryPanel type="DOSE" entryId={row.id} />
              </>
            )}
          </li>
        ))}
      </ul>
    </NeedChild>
  )
}

function BehaviorsPage() {
  const { child } = useAuth()
  const [behaviors, setBehaviors] = useState<Behavior[]>([])
  const [events, setEvents] = useState<BehaviorEvent[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [buttonLabel, setButtonLabel] = useState('')
  const [buttonColor, setButtonColor] = useState(MED_BUTTON_COLORS[2])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState(MED_BUTTON_COLORS[2])
  const [editActive, setEditActive] = useState(true)
  const [error, setError] = useState('')
  const [quickRev, setQuickRev] = useState(0)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [editEventBehaviorId, setEditEventBehaviorId] = useState<number | ''>('')
  const [editOccurredAt, setEditOccurredAt] = useState('')
  const [editIntensity, setEditIntensity] = useState('')
  const [editEventNotes, setEditEventNotes] = useState('')
  const [logBehaviorId, setLogBehaviorId] = useState<number | ''>('')
  const [logBehaviorAt, setLogBehaviorAt] = useState(toLocalInput())
  const [logIntensity, setLogIntensity] = useState('')
  const [logBehaviorNotes, setLogBehaviorNotes] = useState('')

  async function reload() {
    if (!child) return
    const [nextBehaviors, nextEvents] = await Promise.all([
      api.behaviors(child.id),
      api.behaviorEvents(child.id),
    ])
    setBehaviors(nextBehaviors)
    setEvents(nextEvents)
    setLogBehaviorId((current) => current || nextBehaviors[0]?.id || '')
    setQuickRev((value) => value + 1)
  }

  useEffect(() => {
    void reload().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [child])

  function startEdit(behavior: Behavior) {
    setEditingId(behavior.id)
    setEditName(behavior.name)
    setEditDescription(behavior.description ?? '')
    setEditLabel(behavior.buttonLabel ?? '')
    setEditColor(behavior.buttonColor || MED_BUTTON_COLORS[2])
    setEditActive(behavior.active)
  }

  async function addBehavior(event: FormEvent) {
    event.preventDefault()
    if (!child) return
    setError('')
    try {
      await api.createBehavior(child.id, {
        name,
        description,
        buttonLabel,
        buttonColor,
        active: true,
      })
      setName('')
      setDescription('')
      setButtonLabel('')
      setButtonColor(MED_BUTTON_COLORS[2])
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save behavior')
    }
  }

  async function saveBehavior(event: FormEvent) {
    event.preventDefault()
    if (!child || editingId === null) return
    setError('')
    try {
      await api.updateBehavior(child.id, editingId, {
        name: editName,
        description: editDescription,
        buttonLabel: editLabel,
        buttonColor: editColor,
        active: editActive,
      })
      setEditingId(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update behavior')
    }
  }

  function startEventEdit(row: BehaviorEvent) {
    setEditingEventId(row.id)
    setEditEventBehaviorId(row.behaviorId)
    setEditOccurredAt(toLocalInput(row.occurredAt))
    setEditIntensity(row.intensity == null ? '' : String(row.intensity))
    setEditEventNotes(row.notes ?? '')
  }

  async function saveEventEdit(event: FormEvent) {
    event.preventDefault()
    if (!child || editingEventId === null || editEventBehaviorId === '') return
    setError('')
    try {
      await api.updateBehaviorEvent(child.id, editingEventId, {
        behaviorId: editEventBehaviorId,
        occurredAt: fromLocalInput(editOccurredAt),
        intensity: editIntensity === '' ? null : Number(editIntensity),
        notes: editEventNotes,
      })
      setEditingEventId(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update log')
    }
  }

  async function logBehavior(event: FormEvent) {
    event.preventDefault()
    if (!child || logBehaviorId === '') return
    setError('')
    try {
      await api.createBehaviorEvent(child.id, {
        behaviorId: logBehaviorId,
        occurredAt: fromLocalInput(logBehaviorAt),
        intensity: logIntensity === '' ? null : Number(logIntensity),
        notes: logBehaviorNotes,
      })
      setLogBehaviorNotes('')
      setLogIntensity('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log behavior')
    }
  }

  return (
    <NeedChild>
      <h1>Behaviors</h1>
      <ErrorText error={error} />
      <QuickLogButtons refreshToken={quickRev} onLogged={() => void reload()} />
      <div className="grid">
        <form className="card" onSubmit={addBehavior}>
          <h2>Add behavior button</h2>
          <Field label="Behavior name">
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Stimming, elopement" />
          </Field>
          <Field label="Button label (optional)">
            <input
              value={buttonLabel}
              onChange={(e) => setButtonLabel(e.target.value)}
              placeholder="Short label on the quick button"
            />
          </Field>
          <Field label="Button color">
            <ColorSwatches value={buttonColor} onChange={setButtonColor} />
          </Field>
          <Field label="What it looks like">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </Field>
          <button type="submit">Save behavior</button>
        </form>
        <section className="card">
          <h2>Customize buttons</h2>
          {behaviors.length === 0 && <p className="muted">No behavior buttons yet.</p>}
          <ul className="list">
            {behaviors.map((behavior) => (
              <li key={behavior.id} className="card list-item nested">
                {editingId === behavior.id ? (
                  <form className="stack" onSubmit={saveBehavior}>
                    <Field label="Name">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                    </Field>
                    <Field label="Button label">
                      <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                    </Field>
                    <Field label="Button color">
                      <ColorSwatches value={editColor} onChange={setEditColor} />
                    </Field>
                    <Field label="What it looks like">
                      <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
                    </Field>
                    <label className="check">
                      <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                      Show on Home / Sleep / Meds quick buttons
                    </label>
                    <div className="row-actions">
                      <button type="submit">Save button</button>
                      <button type="button" className="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <strong>{behaviorButtonLabel(behavior)}</strong>
                      <p className="muted">
                        {behavior.name}
                        {behavior.active ? '' : ' · hidden'}
                      </p>
                      {behavior.description && <p>{behavior.description}</p>}
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => startEdit(behavior)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => child && api.deleteBehavior(child.id, behavior.id).then(reload)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <form className="card" onSubmit={logBehavior}>
        <h2>Log a behavior</h2>
        <p className="muted">Choose the behavior, time, and optional intensity. You do not need the quick-log button.</p>
        {behaviors.length === 0 ? (
          <p className="muted">Add a behavior button above first.</p>
        ) : (
          <>
            <Field label="Behavior">
              <select value={logBehaviorId} onChange={(e) => setLogBehaviorId(Number(e.target.value))} required>
                {behaviors.map((behavior) => (
                  <option key={behavior.id} value={behavior.id}>
                    {behavior.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="row">
              <Field label="When">
                <input type="datetime-local" value={logBehaviorAt} onChange={(e) => setLogBehaviorAt(e.target.value)} required />
              </Field>
              <Field label="Intensity (1–5, optional)">
                <input type="number" min={1} max={5} value={logIntensity} onChange={(e) => setLogIntensity(e.target.value)} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea value={logBehaviorNotes} onChange={(e) => setLogBehaviorNotes(e.target.value)} rows={2} />
            </Field>
            <button type="submit">Save log</button>
          </>
        )}
      </form>
      <h2>Recent behavior logs</h2>
      <ul className="list">
        {events.map((row) => (
          <li key={row.id} className="card list-item nested">
            {editingEventId === row.id ? (
              <form className="stack" onSubmit={saveEventEdit}>
                <Field label="Behavior">
                  <select value={editEventBehaviorId} onChange={(e) => setEditEventBehaviorId(Number(e.target.value))} required>
                    {behaviors.map((behavior) => (
                      <option key={behavior.id} value={behavior.id}>
                        {behavior.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="When">
                  <input type="datetime-local" value={editOccurredAt} onChange={(e) => setEditOccurredAt(e.target.value)} required />
                </Field>
                <Field label="Intensity (1–5, optional)">
                  <select value={editIntensity} onChange={(e) => setEditIntensity(e.target.value)}>
                    <option value="">Not recorded</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Notes">
                  <textarea value={editEventNotes} onChange={(e) => setEditEventNotes(e.target.value)} rows={2} />
                </Field>
                <div className="row-actions">
                  <button type="submit">Save changes</button>
                  <button type="button" className="secondary" onClick={() => setEditingEventId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <strong>
                    {row.behaviorName}
                    <EditedFlag edited={row.edited} />
                  </strong>
                  <p className="muted">
                    {formatWhen(row.occurredAt)}
                    {row.intensity ? ` · intensity ${row.intensity}` : ''}
                  </p>
                  {row.notes && <p>{row.notes}</p>}
                </div>
                <div className="row-actions">
                  <button type="button" className="secondary" onClick={() => startEventEdit(row)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => child && api.deleteBehaviorEvent(child.id, row.id).then(reload)}
                  >
                    Delete
                  </button>
                </div>
                <HistoryPanel type="BEHAVIOR" entryId={row.id} />
              </>
            )}
          </li>
        ))}
      </ul>
    </NeedChild>
  )
}

function AppointmentsPage() {
  const { child } = useAuth()
  const [rows, setRows] = useState<Appointment[]>([])
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState(toLocalInput())
  const [endsAt, setEndsAt] = useState('')
  const [provider, setProvider] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStartsAt, setEditStartsAt] = useState('')
  const [editEndsAt, setEditEndsAt] = useState('')
  const [editProvider, setEditProvider] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editNotes, setEditNotes] = useState('')

  async function reload() {
    if (!child) return
    setRows(await api.appointments(child.id))
  }

  useEffect(() => {
    void reload().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [child])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!child) return
    setError('')
    try {
      await api.createAppointment(child.id, {
        title,
        startsAt: fromLocalInput(startsAt),
        endsAt: endsAt ? fromLocalInput(endsAt) : null,
        provider,
        location,
        notes,
      })
      setTitle('')
      setProvider('')
      setLocation('')
      setNotes('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    }
  }

  function startAppointmentEdit(row: Appointment) {
    setEditingId(row.id)
    setEditTitle(row.title)
    setEditStartsAt(toLocalInput(row.startsAt))
    setEditEndsAt(row.endsAt ? toLocalInput(row.endsAt) : '')
    setEditProvider(row.provider ?? '')
    setEditLocation(row.location ?? '')
    setEditNotes(row.notes ?? '')
  }

  async function saveAppointmentEdit(event: FormEvent) {
    event.preventDefault()
    if (!child || editingId === null) return
    setError('')
    try {
      await api.updateAppointment(child.id, editingId, {
        title: editTitle,
        startsAt: fromLocalInput(editStartsAt),
        endsAt: editEndsAt ? fromLocalInput(editEndsAt) : null,
        provider: editProvider,
        location: editLocation,
        notes: editNotes,
      })
      setEditingId(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    }
  }

  return (
    <NeedChild>
      <h1>Appointments</h1>
      <form className="card" onSubmit={onSubmit}>
        <h2>Log appointment</h2>
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="OT, neurology, school meeting…" />
        </Field>
        <div className="row">
          <Field label="Starts">
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          </Field>
          <Field label="Ends (optional)">
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </Field>
        </div>
        <div className="row">
          <Field label="Provider">
            <input value={provider} onChange={(e) => setProvider(e.target.value)} />
          </Field>
          <Field label="Location">
            <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </Field>
        <ErrorText error={error} />
        <button type="submit">Save appointment</button>
      </form>
      <ul className="list">
        {rows.map((row) => (
          <li key={row.id} className="card list-item nested">
            {editingId === row.id ? (
              <form className="stack" onSubmit={saveAppointmentEdit}>
                <Field label="Title">
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
                </Field>
                <div className="row">
                  <Field label="Starts">
                    <input type="datetime-local" value={editStartsAt} onChange={(e) => setEditStartsAt(e.target.value)} required />
                  </Field>
                  <Field label="Ends">
                    <input type="datetime-local" value={editEndsAt} onChange={(e) => setEditEndsAt(e.target.value)} />
                  </Field>
                </div>
                <div className="row">
                  <Field label="Provider">
                    <input value={editProvider} onChange={(e) => setEditProvider(e.target.value)} />
                  </Field>
                  <Field label="Location">
                    <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
                </Field>
                <div className="row-actions">
                  <button type="submit">Save changes</button>
                  <button type="button" className="secondary" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <strong>
                    {row.title}
                    <EditedFlag edited={row.edited} />
                  </strong>
                  <p className="muted">
                    {formatWhen(row.startsAt)}
                    {row.provider ? ` · ${row.provider}` : ''}
                    {row.location ? ` · ${row.location}` : ''}
                  </p>
                  {row.notes && <p>{row.notes}</p>}
                </div>
                <div className="row-actions">
                  <button type="button" className="secondary" onClick={() => startAppointmentEdit(row)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => child && api.deleteAppointment(child.id, row.id).then(reload)}
                  >
                    Delete
                  </button>
                </div>
                <HistoryPanel type="APPOINTMENT" entryId={row.id} />
              </>
            )}
          </li>
        ))}
      </ul>
    </NeedChild>
  )
}

function ChildPage() {
  const { child, children, refreshChildren, setChildId } = useAuth()
  const [adding, setAdding] = useState(!child)
  const [name, setName] = useState(child?.name ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(child?.dateOfBirth ?? '')
  const [notes, setNotes] = useState(child?.notes ?? '')
  const [error, setError] = useState('')
  const [shareEmail, setShareEmail] = useState('')
  const [shares, setShares] = useState<Awaited<ReturnType<typeof api.shares>>>([])
  const [shareStatus, setShareStatus] = useState('')
  const isEdit = Boolean(child) && !adding
  const isOwner = child?.role !== 'SHARED'

  useEffect(() => {
    if (adding) return
    setName(child?.name ?? '')
    setDateOfBirth(child?.dateOfBirth ?? '')
    setNotes(child?.notes ?? '')
  }, [child, adding])

  useEffect(() => {
    if (!child || adding) {
      setShares([])
      return
    }
    api
      .shares(child.id)
      .then(setShares)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load sharing'))
  }, [child, adding])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const body = {
        name,
        dateOfBirth: dateOfBirth || undefined,
        notes,
      }
      if (isEdit && child) {
        await api.updateChild(child.id, body)
      } else {
        const created = await api.createChild(body)
        setChildId(created.id)
        setAdding(false)
      }
      await refreshChildren()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    }
  }

  async function invite(event: FormEvent) {
    event.preventDefault()
    if (!child) return
    setError('')
    setShareStatus('')
    try {
      await api.inviteShare(child.id, shareEmail)
      setShareEmail('')
      setShares(await api.shares(child.id))
      setShareStatus('Access granted. They will see this child after they sign in.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share')
    }
  }

  async function removeShare(shareId: number) {
    if (!child) return
    setError('')
    try {
      await api.removeShare(child.id, shareId)
      setShares(await api.shares(child.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove access')
    }
  }

  async function leave() {
    if (!child) return
    setError('')
    try {
      await api.leaveShare(child.id)
      const remaining = await refreshChildren()
      if (remaining[0]) setChildId(remaining[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not leave')
    }
  }

  return (
    <>
      <h1>{isEdit ? 'Child profile' : 'Add a child'}</h1>
      {Boolean(child) && (
        <p>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setAdding((value) => !value)
              setName('')
              setDateOfBirth('')
              setNotes('')
            }}
          >
            {adding ? 'Cancel' : 'Add another child'}
          </button>
        </p>
      )}
      <form className="card" onSubmit={onSubmit}>
        {isEdit && child?.role === 'SHARED' && (
          <p className="muted">Shared with you by {child.ownerName || 'another parent'}. You can log activities; only the owner can change this profile.</p>
        )}
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} required disabled={isEdit && !isOwner} />
        </Field>
        <Field label="Date of birth">
          <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={isEdit && !isOwner} />
        </Field>
        <Field label="Care notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Allergies, communication tips, routines…"
            disabled={isEdit && !isOwner}
          />
        </Field>
        <ErrorText error={error} />
        {( !isEdit || isOwner) && <button type="submit">{isEdit ? 'Save profile' : 'Add child'}</button>}
      </form>
      {isEdit && child && (
        <section className="card">
          <h2>Shared access</h2>
          <p className="muted">Parents with their own CareTrack accounts can view and update the same activity log.</p>
          <ul className="list">
            {shares.map((share) => (
              <li key={`${share.role}-${share.userId}`} className="list-item">
                <div className="stack">
                  <p>
                    {share.displayName} <span className="muted">· {share.email}</span>
                  </p>
                  <p className="muted">{share.role === 'OWNER' ? 'Owner' : 'Can log activities'}</p>
                </div>
                {isOwner && share.role === 'SHARED' && share.id != null && (
                  <button type="button" className="ghost" onClick={() => void removeShare(share.id!)}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          {isOwner ? (
            <form onSubmit={invite}>
              <Field label="Invite by email">
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="other.parent@example.com"
                  required
                />
              </Field>
              <button type="submit">Give access</button>
              {shareStatus && <p className="status">{shareStatus}</p>}
            </form>
          ) : (
            <button type="button" className="ghost" onClick={() => void leave()}>
              Leave this child
            </button>
          )}
        </section>
      )}
      {children.length > 0 && (
        <p className="muted">
          {children.length} child profile{children.length === 1 ? '' : 's'} on this account.
        </p>
      )}
    </>
  )
}
