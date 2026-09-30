import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import {
  api,
  formatDuration,
  formatWhen,
  fromLocalInput,
  toLocalInput,
  type Appointment,
  type BowelMovement,
  type Medication,
  type MedicationDose,
  type SleepInterval,
  type SleepQuality,
} from './api'
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
        <div>
          <p className="eyebrow">CareTrack</p>
          <strong>{child ? child.name : 'Add a child to start'}</strong>
        </div>
        <div className="topbar-actions">
          {children.length > 0 && (
            <select value={child?.id ?? ''} onChange={(e) => setChildId(Number(e.target.value))} aria-label="Selected child">
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <span className="muted">{user.displayName}</span>
          <button type="button" className="ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <nav className="nav">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/sleep">Sleep</NavLink>
        <NavLink to="/bowel">Bowel</NavLink>
        <NavLink to="/meds">Meds</NavLink>
        <NavLink to="/appointments">Appointments</NavLink>
        <NavLink to="/child">Child</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sleep" element={<SleepPage />} />
          <Route path="/bowel" element={<BowelPage />} />
          <Route path="/meds" element={<MedsPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
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

function DashboardPage() {
  const { child } = useAuth()
  const [error, setError] = useState('')
  const [data, setData] = useState<Awaited<ReturnType<typeof api.dashboard>> | null>(null)

  useEffect(() => {
    if (!child) return
    api
      .dashboard(child.id)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [child])

  return (
    <NeedChild>
      <h1>Today at a glance</h1>
      <ErrorText error={error} />
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
      </div>
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

  async function reload() {
    if (!child) return
    setRows(await api.sleep(child.id))
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

  return (
    <NeedChild>
      <h1>Sleep intervals</h1>
      <form className="card" onSubmit={onSubmit}>
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
          <li key={row.id} className="card list-item">
            <div>
              <strong>{formatDuration(row.startedAt, row.endedAt)}</strong>
              <p className="muted">
                {formatWhen(row.startedAt)} → {row.endedAt ? formatWhen(row.endedAt) : 'ongoing'} · {row.quality.toLowerCase()}
              </p>
              {row.notes && <p>{row.notes}</p>}
            </div>
            <button
              type="button"
              className="ghost"
              onClick={() => child && api.deleteSleep(child.id, row.id).then(reload)}
            >
              Delete
            </button>
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

  return (
    <NeedChild>
      <h1>Bowel movements</h1>
      <form className="card" onSubmit={onSubmit}>
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
          <li key={row.id} className="card list-item">
            <div>
              <strong>{formatWhen(row.occurredAt)}</strong>
              <p className="muted">{row.bristolType ? `Bristol ${row.bristolType}` : 'Type not recorded'}</p>
              {row.notes && <p>{row.notes}</p>}
            </div>
            <button type="button" className="ghost" onClick={() => child && api.deleteBowel(child.id, row.id).then(reload)}>
              Delete
            </button>
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
  const [medicationId, setMedicationId] = useState<number | ''>('')
  const [givenAt, setGivenAt] = useState(toLocalInput())
  const [amount, setAmount] = useState('')
  const [doseNotes, setDoseNotes] = useState('')
  const [error, setError] = useState('')

  async function reload() {
    if (!child) return
    const [m, d] = await Promise.all([api.medications(child.id), api.doses(child.id)])
    setMeds(m)
    setDoses(d)
    if (m.length && medicationId === '') setMedicationId(m[0].id)
  }

  useEffect(() => {
    void reload().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [child])

  async function addMed(event: FormEvent) {
    event.preventDefault()
    if (!child) return
    setError('')
    try {
      await api.createMedication(child.id, {
        name,
        dosageInstructions: dosage,
        scheduleNotes: schedule,
        active: true,
      })
      setName('')
      setDosage('')
      setSchedule('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save medication')
    }
  }

  async function addDose(event: FormEvent) {
    event.preventDefault()
    if (!child || medicationId === '') return
    setError('')
    try {
      await api.createDose(child.id, {
        medicationId,
        givenAt: fromLocalInput(givenAt),
        amountGiven: amount,
        notes: doseNotes,
      })
      setAmount('')
      setDoseNotes('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save dose')
    }
  }

  return (
    <NeedChild>
      <h1>Medications</h1>
      <ErrorText error={error} />
      <div className="grid">
        <form className="card" onSubmit={addMed}>
          <h2>Add medication</h2>
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Dose instructions">
            <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 5 ml with food" />
          </Field>
          <Field label="Schedule notes">
            <input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="e.g. morning and bedtime" />
          </Field>
          <button type="submit">Save medication</button>
        </form>
        <form className="card" onSubmit={addDose}>
          <h2>Log a dose given</h2>
          <Field label="Medication">
            <select value={medicationId} onChange={(e) => setMedicationId(Number(e.target.value))} required>
              {meds.length === 0 && <option value="">Add a medication first</option>}
              {meds.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Given at">
            <input type="datetime-local" value={givenAt} onChange={(e) => setGivenAt(e.target.value)} required />
          </Field>
          <Field label="Amount given">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Notes">
            <textarea value={doseNotes} onChange={(e) => setDoseNotes(e.target.value)} rows={2} />
          </Field>
          <button type="submit" disabled={meds.length === 0}>
            Log dose
          </button>
        </form>
      </div>
      <h2>Recent doses</h2>
      <ul className="list">
        {doses.map((row) => (
          <li key={row.id} className="card list-item">
            <div>
              <strong>{row.medicationName}</strong>
              <p className="muted">
                {formatWhen(row.givenAt)}
                {row.amountGiven ? ` · ${row.amountGiven}` : ''}
              </p>
              {row.notes && <p>{row.notes}</p>}
            </div>
            <button type="button" className="ghost" onClick={() => child && api.deleteDose(child.id, row.id).then(reload)}>
              Delete
            </button>
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

  return (
    <NeedChild>
      <h1>Appointments</h1>
      <form className="card" onSubmit={onSubmit}>
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
          <li key={row.id} className="card list-item">
            <div>
              <strong>{row.title}</strong>
              <p className="muted">
                {formatWhen(row.startsAt)}
                {row.provider ? ` · ${row.provider}` : ''}
                {row.location ? ` · ${row.location}` : ''}
              </p>
              {row.notes && <p>{row.notes}</p>}
            </div>
            <button
              type="button"
              className="ghost"
              onClick={() => child && api.deleteAppointment(child.id, row.id).then(reload)}
            >
              Delete
            </button>
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
  const isEdit = Boolean(child) && !adding

  useEffect(() => {
    if (adding) return
    setName(child?.name ?? '')
    setDateOfBirth(child?.dateOfBirth ?? '')
    setNotes(child?.notes ?? '')
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
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Date of birth">
          <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        </Field>
        <Field label="Care notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Allergies, communication tips, routines…" />
        </Field>
        <ErrorText error={error} />
        <button type="submit">{isEdit ? 'Save profile' : 'Add child'}</button>
      </form>
      {children.length > 0 && (
        <p className="muted">
          {children.length} child profile{children.length === 1 ? '' : 's'} on this account.
        </p>
      )}
    </>
  )
}
