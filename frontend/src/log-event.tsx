import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  api,
  fromLocalInput,
  toLocalInput,
  type Behavior,
  type Medication,
  type SleepQuality,
} from './api'
import { useAuth } from './auth'

type EventKind = 'SLEEP' | 'BOWEL' | 'DOSE' | 'BEHAVIOR' | 'APPOINTMENT'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function LogEventPage() {
  const { child } = useAuth()
  const [kind, setKind] = useState<EventKind>('SLEEP')
  const [meds, setMeds] = useState<Medication[]>([])
  const [behaviors, setBehaviors] = useState<Behavior[]>([])
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const [startedAt, setStartedAt] = useState(toLocalInput())
  const [endedAt, setEndedAt] = useState('')
  const [quality, setQuality] = useState<SleepQuality>('UNKNOWN')
  const [nightWakings, setNightWakings] = useState('')
  const [sleepNotes, setSleepNotes] = useState('')

  const [occurredAt, setOccurredAt] = useState(toLocalInput())
  const [bristolType, setBristolType] = useState('')
  const [bowelNotes, setBowelNotes] = useState('')

  const [medicationId, setMedicationId] = useState<number | ''>('')
  const [givenAt, setGivenAt] = useState(toLocalInput())
  const [amountGiven, setAmountGiven] = useState('')
  const [doseNotes, setDoseNotes] = useState('')

  const [behaviorId, setBehaviorId] = useState<number | ''>('')
  const [behaviorAt, setBehaviorAt] = useState(toLocalInput())
  const [intensity, setIntensity] = useState('')
  const [behaviorNotes, setBehaviorNotes] = useState('')

  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState(toLocalInput())
  const [apptEndsAt, setApptEndsAt] = useState('')
  const [provider, setProvider] = useState('')
  const [location, setLocation] = useState('')
  const [apptNotes, setApptNotes] = useState('')

  useEffect(() => {
    if (!child) return
    void Promise.all([api.medications(child.id), api.behaviors(child.id)])
      .then(([nextMeds, nextBehaviors]) => {
        setMeds(nextMeds)
        setBehaviors(nextBehaviors)
        setMedicationId((current) => current || nextMeds[0]?.id || '')
        setAmountGiven((current) => current || nextMeds[0]?.dosageInstructions || '')
        setBehaviorId((current) => current || nextBehaviors[0]?.id || '')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [child])

  function pickMedication(id: number | '') {
    setMedicationId(id)
    const med = meds.find((item) => item.id === id)
    setAmountGiven(med?.dosageInstructions ?? '')
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!child) return
    setError('')
    setStatus('')
    try {
      if (kind === 'SLEEP') {
        await api.createSleep(child.id, {
          startedAt: fromLocalInput(startedAt),
          endedAt: endedAt ? fromLocalInput(endedAt) : null,
          quality,
          nightWakings: nightWakings === '' ? null : Number(nightWakings),
          notes: sleepNotes,
        })
        setSleepNotes('')
        setEndedAt('')
      } else if (kind === 'BOWEL') {
        await api.createBowel(child.id, {
          occurredAt: fromLocalInput(occurredAt),
          bristolType: bristolType === '' ? null : Number(bristolType),
          notes: bowelNotes,
        })
        setBowelNotes('')
        setBristolType('')
      } else if (kind === 'DOSE') {
        if (medicationId === '') throw new Error('Add a medication first')
        await api.createDose(child.id, {
          medicationId,
          givenAt: fromLocalInput(givenAt),
          amountGiven,
          notes: doseNotes,
        })
        setDoseNotes('')
      } else if (kind === 'BEHAVIOR') {
        if (behaviorId === '') throw new Error('Add a behavior first')
        await api.createBehaviorEvent(child.id, {
          behaviorId,
          occurredAt: fromLocalInput(behaviorAt),
          intensity: intensity === '' ? null : Number(intensity),
          notes: behaviorNotes,
        })
        setBehaviorNotes('')
        setIntensity('')
      } else {
        await api.createAppointment(child.id, {
          title,
          startsAt: fromLocalInput(startsAt),
          endsAt: apptEndsAt ? fromLocalInput(apptEndsAt) : null,
          provider,
          location,
          notes: apptNotes,
        })
        setTitle('')
        setProvider('')
        setLocation('')
        setApptNotes('')
      }
      setStatus('Logged.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    }
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
      <h1>Log an event</h1>
      <p className="muted">Enter a time and details without using a quick-log button.</p>
      <form className="card" onSubmit={onSubmit}>
        <Field label="What happened">
          <select value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
            <option value="SLEEP">Sleep</option>
            <option value="BOWEL">Bowel movement</option>
            <option value="DOSE">Medication</option>
            <option value="BEHAVIOR">Behavior</option>
            <option value="APPOINTMENT">Appointment</option>
          </select>
        </Field>

        {kind === 'SLEEP' && (
          <>
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
              <textarea value={sleepNotes} onChange={(e) => setSleepNotes(e.target.value)} rows={3} />
            </Field>
          </>
        )}

        {kind === 'BOWEL' && (
          <>
            <div className="row">
              <Field label="When">
                <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} required />
              </Field>
              <Field label="Bristol type (optional)">
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
              <textarea value={bowelNotes} onChange={(e) => setBowelNotes(e.target.value)} rows={3} />
            </Field>
          </>
        )}

        {kind === 'DOSE' && (
          <>
            {meds.length === 0 ? (
              <p className="muted">
                Add a medication on the <NavLink to="/meds">Meds</NavLink> page first.
              </p>
            ) : (
              <>
                <Field label="Medication">
                  <select value={medicationId} onChange={(e) => pickMedication(Number(e.target.value))} required>
                    {meds.map((med) => (
                      <option key={med.id} value={med.id}>
                        {med.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="row">
                  <Field label="Given at">
                    <input type="datetime-local" value={givenAt} onChange={(e) => setGivenAt(e.target.value)} required />
                  </Field>
                  <Field label="Amount given">
                    <input value={amountGiven} onChange={(e) => setAmountGiven(e.target.value)} />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea value={doseNotes} onChange={(e) => setDoseNotes(e.target.value)} rows={2} />
                </Field>
              </>
            )}
          </>
        )}

        {kind === 'BEHAVIOR' && (
          <>
            {behaviors.length === 0 ? (
              <p className="muted">
                Add a behavior on the <NavLink to="/behaviors">Behaviors</NavLink> page first.
              </p>
            ) : (
              <>
                <Field label="Behavior">
                  <select value={behaviorId} onChange={(e) => setBehaviorId(Number(e.target.value))} required>
                    {behaviors.map((behavior) => (
                      <option key={behavior.id} value={behavior.id}>
                        {behavior.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="row">
                  <Field label="When">
                    <input type="datetime-local" value={behaviorAt} onChange={(e) => setBehaviorAt(e.target.value)} required />
                  </Field>
                  <Field label="Intensity (1–5, optional)">
                    <input type="number" min={1} max={5} value={intensity} onChange={(e) => setIntensity(e.target.value)} />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea value={behaviorNotes} onChange={(e) => setBehaviorNotes(e.target.value)} rows={2} />
                </Field>
              </>
            )}
          </>
        )}

        {kind === 'APPOINTMENT' && (
          <>
            <Field label="Title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="OT, neurology, school meeting…" />
            </Field>
            <div className="row">
              <Field label="Starts">
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
              </Field>
              <Field label="Ends (optional)">
                <input type="datetime-local" value={apptEndsAt} onChange={(e) => setApptEndsAt(e.target.value)} />
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
              <textarea value={apptNotes} onChange={(e) => setApptNotes(e.target.value)} rows={3} />
            </Field>
          </>
        )}

        {error && <p className="error">{error}</p>}
        {status && !error && <p className="status">{status}</p>}
        <button
          type="submit"
          disabled={(kind === 'DOSE' && meds.length === 0) || (kind === 'BEHAVIOR' && behaviors.length === 0)}
        >
          Save log
        </button>
      </form>
    </>
  )
}
