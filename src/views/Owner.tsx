import { Shape } from '../components/ui'
import { CATEGORY_LABEL, MONTHS } from '../data'
import { currentVersion, lessonsOf, monthLabel, pathOf, progressOf } from '../store'
import type { Method, Person, State } from '../types'
import { TeamFeedback } from './Manager'

const PERSON_COLOR: Record<string, string> = {
  andres: '#5b9bd5',
  liis: '#2f7d5b',
  jaan: '#a8323e',
  kadri: '#00579c',
  maarika: '#7c3aed',
  toomas: '#5b9bd5',
  anna: '#c0316f',
  eva: '#7c5cbf',
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
}

function pathStatus(s: State, person: Person) {
  if (person.status === 'left') return person.left ? `Left ${person.left}` : 'Left'
  const ids = pathOf(person)
  if (!ids.length) return 'No path'
  const waiting = ids.filter((id) => {
    const pr = progressOf(s, person.id, id)
    return pr.state === 'awaiting' || pr.update?.state === 'awaiting'
  })
  if (waiting.length) return 'Confirm'
  const done = ids.filter((id) => {
    const pr = progressOf(s, person.id, id)
    return pr.state === 'passed' && !pr.update
  }).length
  if (done === ids.length) return 'Current'
  return `${done} of ${ids.length}`
}

function MinutesChart({ m, s }: { m: Method; s: State }) {
  const reports = s.reports.filter((r) => r.methodId === m.id).sort((a, b) => a.monthIndex - b.monthIndex)
  if (!reports.length) return null
  const base = m.baselineMin ?? 0
  const bars = [{ label: 'Base', value: base, rework: undefined as string | undefined, base: true }, ...reports.map((r) => ({ label: MONTHS[r.monthIndex].split(' ')[0].slice(0, 3), value: r.minutes, rework: `${r.reworks}/${r.tasks}`, base: false }))]
  const max = Math.max(base, ...bars.map((b) => b.value)) || 1
  const W = 280
  const H = 72
  const bw = Math.min(28, (W - 16) / bars.length - 8)
  return (
    <svg className="year-spark" viewBox={`0 0 ${W} ${H + 36}`} width="100%" role="img" aria-label={`Minutes per task for ${m.title}`}>
      <line x1="0" x2={W} y1={H - (base / max) * (H - 8)} y2={H - (base / max) * (H - 8)} stroke="#94a3b8" strokeDasharray="4 4" />
      {bars.map((b, i) => {
        const h = (b.value / max) * (H - 8)
        const x = 8 + i * ((W - 16) / bars.length) + ((W - 16) / bars.length - bw) / 2
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={bw} height={h} rx="5" fill={b.base ? '#cbd5e1' : '#1c1c1e'} />
            <text x={x + bw / 2} y={H - h - 5} textAnchor="middle" fontSize="10" fill="#1c1c1e">
              {b.value}
            </text>
            <text x={x + bw / 2} y={H + 14} textAnchor="middle" fontSize="10" fill="#5c5c5c">
              {b.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function OwnerYear({ s }: { s: State }) {
  const active = s.people.filter((p) => p.status === 'active')
  const currentPeople = active.filter((p) => pathStatus(s, p) === 'Current')
  const updates = s.methods.flatMap((m) => m.versions.slice(1).map((v) => ({ m, v })))
  const waiting = s.drafts.filter((d) => d.status === 'awaiting-client').length
  const hires = s.people.filter((p) => p.joined !== 'before workshop')
  const liveKnowledge = s.knowledge.filter((item) => item.status === 'published').length
  const pendingKnowledge = s.knowledge.filter((item) => item.status === 'pending').length
  const managerName = s.people.find((p) => p.id === s.workspace.managerId)?.name.split(' ')[0] ?? 'Manager'
  const people = s.people.slice().sort((a, b) => {
    const rank = (p: Person) => (p.status === 'left' ? 2 : pathStatus(s, p) === 'Current' ? 0 : 1)
    return rank(a) - rank(b)
  })

  return (
    <div className="stack" style={{ gap: 28 }}>
      <p className="lead" style={{ marginBottom: 0 }}>
        {monthLabel(s)} · the year so far. Basis for the renewal decision.
      </p>

      <div className="year-stats">
        <div className="card year-stat">
          <b>
            {currentPeople.length}/{active.length}
          </b>
          <span>people on the current version</span>
        </div>
        <div className="card year-stat">
          <b>{hires.length}</b>
          <span>{hires.length === 1 ? 'new hire on the path' : 'new hires on the path'}</span>
        </div>
        <div className="card year-stat">
          <b>{updates.length}</b>
          <span>{updates.length ? `method updates${waiting ? ` · ${waiting} waiting` : ''}` : 'still the workshop version'}</span>
        </div>
        <div className="card year-stat">
          <b>{liveKnowledge}</b>
          <span>knowledge live{pendingKnowledge ? ` · ${pendingKnowledge} waiting` : ''}</span>
        </div>
      </div>

      <section className="stack" style={{ gap: 12 }}>
        <div className="k">People</div>
        <div className="card roster year-people">
          <div className="roster-head">
            <span>Person</span>
            <span>Position</span>
            <span>Path</span>
          </div>
          {people.map((person) => {
            const status = pathStatus(s, person)
            return (
              <div key={person.id} className={`roster-row${person.status === 'left' ? ' is-left' : ''}`}>
                <span className="roster-who">
                  <span className="avatar" style={{ background: PERSON_COLOR[person.id] ?? s.workspace.accent }}>
                    {initials(person.name)}
                  </span>
                  {person.name}
                </span>
                <span>{person.title}</span>
                <span className={status === 'Current' ? '' : 'muted'}>{status}</span>
              </div>
            )
          })}
        </div>
        <p className="small muted">Training standard only. Confirmed by {managerName}.</p>
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <div className="k">Methods</div>
        <div className="card year-methods">
          {s.methods.map((m) => {
            const last = [...s.reports].filter((r) => r.methodId === m.id).sort((a, b) => b.monthIndex - a.monthIndex)[0]
            const added = lessonsOf(m)
            return (
              <div className="year-method" key={m.id}>
                <Shape id={m.id} size={22} />
                <div>
                  <h4>{m.title}</h4>
                  <p className="small muted">
                    {last
                      ? `${MONTHS[last.monthIndex].split(' ')[0]} · ~${last.minutes} min vs ${m.baselineMin} · ${last.reworks}/${last.tasks} sent back · ${CATEGORY_LABEL[last.category]}`
                      : m.baselineMin
                        ? 'No numbers yet'
                        : 'Shared method'}
                    {added.length ? ` · ${added.map((l) => l.title).join(', ')}` : ''}
                  </p>
                  <MinutesChart m={m} s={s} />
                </div>
                <span className="badge">v{currentVersion(m).version}</span>
              </div>
            )
          })}
        </div>
        <p className="small muted">{managerName}’s numbers. Not proof of cause.</p>
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <div className="k">Feedback</div>
        <p className="lead" style={{ marginBottom: 4 }}>
          Monthly notes from the team. Method notes are in Methods.
        </p>
        <TeamFeedback s={s} initialKind="month" />
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <div className="k">This year’s record</div>
        <div className="card">
          <ul className="timeline">
            {[...s.log].reverse().map((e, i) => (
              <li key={i}>
                <span className="small muted">{e.month}</span>
                <span className={`tdot ${e.kind}`} />
                <span>{e.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
