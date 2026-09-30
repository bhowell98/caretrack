export type User = {
  id: number
  email: string
  displayName: string
}

export type ChildRole = 'OWNER' | 'SHARED'

export type Child = {
  id: number
  name: string
  dateOfBirth: string | null
  notes: string | null
  role: ChildRole
  ownerName: string | null
}

export type ChildShare = {
  id: number | null
  userId: number
  email: string
  displayName: string
  role: ChildRole
}

export type SleepQuality = 'UNKNOWN' | 'RESTLESS' | 'FAIR' | 'GOOD'

export type SleepInterval = {
  id: number
  startedAt: string
  endedAt: string | null
  quality: SleepQuality
  nightWakings: number | null
  notes: string | null
  edited: boolean
}

export type BowelMovement = {
  id: number
  occurredAt: string
  bristolType: number | null
  notes: string | null
  edited: boolean
}

export type Medication = {
  id: number
  name: string
  dosageInstructions: string | null
  scheduleNotes: string | null
  buttonLabel: string | null
  buttonColor: string | null
  active: boolean
  promptForDosage: boolean
}

export type MedicationDose = {
  id: number
  medicationId: number
  medicationName: string
  givenAt: string
  amountGiven: string | null
  notes: string | null
  edited: boolean
}

export type Appointment = {
  id: number
  title: string
  startsAt: string
  endsAt: string | null
  provider: string | null
  location: string | null
  notes: string | null
  edited: boolean
}

export type Behavior = {
  id: number
  name: string
  description: string | null
  buttonLabel: string | null
  buttonColor: string | null
  active: boolean
}

export type BehaviorEvent = {
  id: number
  behaviorId: number
  behaviorName: string
  occurredAt: string
  intensity: number | null
  notes: string | null
  edited: boolean
}

export type AuditEntryType = 'SLEEP' | 'BOWEL' | 'DOSE' | 'APPOINTMENT' | 'BEHAVIOR'

export type FieldChange = {
  field: string
  from: string
  to: string
}

export type AuditEvent = {
  id: number
  entryType: AuditEntryType
  entryId: number
  action: 'CREATED' | 'UPDATED' | 'DELETED'
  changedAt: string
  actorName: string
  changes: FieldChange[]
}

export type Dashboard = {
  child: Child
  latestSleep: SleepInterval | null
  latestBowel: BowelMovement | null
  latestDose: MedicationDose | null
  latestBehavior: BehaviorEvent | null
  nextAppointment: Appointment | null
}

export type LogType = 'SLEEP' | 'BOWEL' | 'DOSE' | 'BEHAVIOR' | 'APPOINTMENT'

export type LogEntry = {
  type: LogType
  id: number
  at: string
  title: string
  detail: string
  edited: boolean
}

const TOKEN_KEY = 'caretrack.token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(path, { ...init, headers })
  if (response.status === 204) return undefined as T
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    const message = data?.detail || data?.message || response.statusText
    throw new Error(message)
  }
  return data as T
}

export const api = {
  register: (body: { email: string; password: string; displayName: string }) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  me: () => request<User>('/api/me'),
  children: () => request<Child[]>('/api/children'),
  createChild: (body: { name: string; dateOfBirth?: string; notes?: string }) =>
    request<Child>('/api/children', { method: 'POST', body: JSON.stringify(body) }),
  updateChild: (id: number, body: { name: string; dateOfBirth?: string; notes?: string }) =>
    request<Child>(`/api/children/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  shares: (childId: number) => request<ChildShare[]>(`/api/children/${childId}/shares`),
  inviteShare: (childId: number, email: string) =>
    request<ChildShare>(`/api/children/${childId}/shares`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  removeShare: (childId: number, shareId: number) =>
    request<void>(`/api/children/${childId}/shares/${shareId}`, { method: 'DELETE' }),
  leaveShare: (childId: number) => request<void>(`/api/children/${childId}/leave`, { method: 'POST' }),
  dashboard: (childId: number) => request<Dashboard>(`/api/children/${childId}/dashboard`),
  logs: (childId: number, params: { from?: string; to?: string; q?: string; types?: string }) => {
    const search = new URLSearchParams()
    if (params.from) search.set('from', params.from)
    if (params.to) search.set('to', params.to)
    if (params.q) search.set('q', params.q)
    if (params.types) search.set('types', params.types)
    const query = search.toString()
    return request<LogEntry[]>(`/api/children/${childId}/logs${query ? `?${query}` : ''}`)
  },
  sleep: (childId: number) => request<SleepInterval[]>(`/api/children/${childId}/sleep`),
  createSleep: (childId: number, body: object) =>
    request<SleepInterval>(`/api/children/${childId}/sleep`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateSleep: (childId: number, id: number, body: object) =>
    request<SleepInterval>(`/api/children/${childId}/sleep/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteSleep: (childId: number, id: number) =>
    request<void>(`/api/children/${childId}/sleep/${id}`, { method: 'DELETE' }),
  bowel: (childId: number) => request<BowelMovement[]>(`/api/children/${childId}/bowel`),
  createBowel: (childId: number, body: object) =>
    request<BowelMovement>(`/api/children/${childId}/bowel`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateBowel: (childId: number, id: number, body: object) =>
    request<BowelMovement>(`/api/children/${childId}/bowel/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteBowel: (childId: number, id: number) =>
    request<void>(`/api/children/${childId}/bowel/${id}`, { method: 'DELETE' }),
  medications: (childId: number) => request<Medication[]>(`/api/children/${childId}/medications`),
  createMedication: (childId: number, body: object) =>
    request<Medication>(`/api/children/${childId}/medications`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateMedication: (childId: number, id: number, body: object) =>
    request<Medication>(`/api/children/${childId}/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteMedication: (childId: number, id: number) =>
    request<void>(`/api/children/${childId}/medications/${id}`, { method: 'DELETE' }),
  doses: (childId: number) => request<MedicationDose[]>(`/api/children/${childId}/doses`),
  createDose: (childId: number, body: object) =>
    request<MedicationDose>(`/api/children/${childId}/doses`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateDose: (childId: number, id: number, body: object) =>
    request<MedicationDose>(`/api/children/${childId}/doses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteDose: (childId: number, id: number) =>
    request<void>(`/api/children/${childId}/doses/${id}`, { method: 'DELETE' }),
  appointments: (childId: number) =>
    request<Appointment[]>(`/api/children/${childId}/appointments`),
  createAppointment: (childId: number, body: object) =>
    request<Appointment>(`/api/children/${childId}/appointments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateAppointment: (childId: number, id: number, body: object) =>
    request<Appointment>(`/api/children/${childId}/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteAppointment: (childId: number, id: number) =>
    request<void>(`/api/children/${childId}/appointments/${id}`, { method: 'DELETE' }),
  history: (childId: number, entryType: AuditEntryType, entryId: number) =>
    request<AuditEvent[]>(`/api/children/${childId}/history/${entryType}/${entryId}`),
  behaviors: (childId: number) => request<Behavior[]>(`/api/children/${childId}/behaviors`),
  createBehavior: (childId: number, body: object) =>
    request<Behavior>(`/api/children/${childId}/behaviors`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateBehavior: (childId: number, id: number, body: object) =>
    request<Behavior>(`/api/children/${childId}/behaviors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteBehavior: (childId: number, id: number) =>
    request<void>(`/api/children/${childId}/behaviors/${id}`, { method: 'DELETE' }),
  behaviorEvents: (childId: number) =>
    request<BehaviorEvent[]>(`/api/children/${childId}/behavior-events`),
  createBehaviorEvent: (childId: number, body: object) =>
    request<BehaviorEvent>(`/api/children/${childId}/behavior-events`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateBehaviorEvent: (childId: number, id: number, body: object) =>
    request<BehaviorEvent>(`/api/children/${childId}/behavior-events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteBehaviorEvent: (childId: number, id: number) =>
    request<void>(`/api/children/${childId}/behavior-events/${id}`, { method: 'DELETE' }),
}

export function toLocalInput(iso?: string | null) {
  const date = iso ? new Date(iso) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromLocalInput(value: string) {
  return new Date(value).toISOString()
}

export function nowIso() {
  return new Date().toISOString()
}

export function medicationButtonLabel(medication: Medication) {
  return medication.buttonLabel?.trim() || medication.name
}

export function behaviorButtonLabel(behavior: Behavior) {
  return behavior.buttonLabel?.trim() || behavior.name
}

export function formatWhen(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDuration(start: string, end?: string | null) {
  if (!end) return 'In progress'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.round((ms % 3_600_000) / 60_000)
  return `${hours}h ${minutes}m`
}
