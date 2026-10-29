import { useState, type Dispatch } from 'react'
import { LessonBox, Shape, StatusBadge } from '../components/ui'
import { CATEGORY_DETAIL, CATEGORY_LABEL, departmentOf, methodLayer, MONTHS, pathGroups, postLine } from '../data'
import { currentVersion, lessonsOf, monthLabel, nextVersion, pathOf, progressOf, type Action } from '../store'
import type { Category, MethodId, RoleKey, State } from '../types'
export type ManagerTab = 'mine' | 'team' | 'methods' | 'year'

export function managerQueue(s: State) {
  return s.people
    .filter((p) => p.status === 'active' && p.id !== s.workspace.managerId)
    .flatMap((p) =>
      pathOf(p)
        .map((mid) => ({ person: p, m: s.methods.find((x) => x.id === mid)!, pr: progressOf(s, p.id, mid) }))
        .filter(({ pr }) => pr.state === 'awaiting' || pr.update?.state === 'awaiting'),
    )
}

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

function joinedLabel(joined: string) {
  return joined === 'before workshop' ? 'Before workshop' : joined
}

function waitingIds(s: State, person: State['people'][number]) {
  return pathOf(person).filter((id) => {
    const pr = progressOf(s, person.id, id)
    return pr.state === 'awaiting' || pr.update?.state === 'awaiting'
  })
}

type PersonPane = 'path' | 'progress' | 'feedback'

export function Team({ s, dispatch, viewerId }: { s: State; dispatch: Dispatch<Action>; viewerId?: string }) {
  const [name, setName] = useState(() => {
    if (s.workspace.id !== 'kaldaranna') return ''
    return s.people.some((p) => p.name === 'Eva Rebane') ? '' : 'Eva Rebane'
  })
  const assignableRoles = s.workspace.roles.filter((role) => role.id !== s.people.find((p) => p.id === s.workspace.managerId)?.roleKey)
  const [role, setRole] = useState<RoleKey>(assignableRoles[0]?.id ?? s.workspace.roles[0].id)
  const [leaving, setLeaving] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [pane, setPane] = useState<PersonPane>('path')
  const leaver = s.people.find((p) => p.id === leaving)
  const openPerson = s.people.find((p) => p.id === openId)

  const roster = s.people
    .filter((p) => p.id !== viewerId)
    .slice()
    .sort((a, b) => {
      const wait = (p: typeof a) =>
        waitingIds(s, p).length > 0 && p.status === 'active' ? 0 : p.status === 'left' ? 2 : 1
      return wait(a) - wait(b)
    })

  const open = (personId: string) => {
    const person = s.people.find((p) => p.id === personId)
    setOpenId(personId)
    setPane(person && waitingIds(s, person).length > 0 ? 'progress' : 'path')
  }

  const roleConfig = s.workspace.roles.find((item) => item.id === role)
  const addPerson = () => {
    if (!name.trim() || !roleConfig) return
    const id = name.trim().split(' ')[0].toLowerCase() + (s.people.some((p) => p.id === name.trim().split(' ')[0].toLowerCase()) ? s.people.length : '')
    dispatch({ type: 'addPerson', person: { id, name: name.trim(), title: roleConfig.label, roleKey: role, methodIds: roleConfig.methodIds } })
    setName('')
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card roster">
        <div className="roster-head">
          <span>Person</span>
          <span>Position</span>
          <span>Department</span>
          <span>Joined</span>
          <span />
        </div>
        <form
          className="roster-row roster-add"
          onSubmit={(e) => {
            e.preventDefault()
            addPerson()
          }}
        >
          <span className="roster-who">
            <span className="avatar roster-plus">+</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" />
          </span>
          <select value={role} onChange={(e) => setRole(e.target.value as RoleKey)} aria-label="Position">
            {assignableRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="muted">{roleConfig?.department ?? departmentOf(s, role)}</span>
          <span className="muted">—</span>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!name.trim()}>
            Add
          </button>
        </form>
        {roster.map((person) => {
          const waiting = waitingIds(s, person)
          const notes = (s.learningReports ?? []).filter((item) => item.personId === person.id).length
          return (
            <button
              key={person.id}
              type="button"
              className={`roster-row${person.status === 'left' ? ' is-left' : ''}`}
              onClick={() => open(person.id)}
            >
              <span className="roster-who">
                <span className="avatar" style={{ background: PERSON_COLOR[person.id] ?? s.workspace.accent }}>
                  {initials(person.name)}
                </span>
                {person.name}
              </span>
              <span>{person.title}</span>
              <span>{departmentOf(s, person.roleKey)}</span>
              <span>{person.status === 'left' && person.left ? `Left ${person.left}` : joinedLabel(person.joined)}</span>
              <span className="roster-end">
                {waiting.length > 0 && (
                  <span className="badge info">
                    <span className="dot" />
                    Confirm
                  </span>
                )}
                {notes > 0 && waiting.length === 0 && <span className="badge">Report</span>}
                {person.status === 'left' && <span className="badge">Left</span>}
                <span className="roster-go" aria-hidden>
                  →
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {openPerson && (
        <PersonModal
          s={s}
          person={openPerson}
          pane={pane}
          setPane={setPane}
          dispatch={dispatch}
          onClose={() => setOpenId(null)}
          onLeave={() => {
            setOpenId(null)
            setLeaving(openPerson.id)
          }}
        />
      )}

      {leaver && (
        <div className="modal-back" onClick={() => setLeaving(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Mark {leaver.name} as left?</h3>
            <p className="muted">Their account closes. Their training record stays on the company account. Their AI chats were never in Academy, so nothing needs to be handed over here.</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setLeaving(null)}>
                Cancel
              </button>
              <button
                className="btn btn-dark"
                onClick={() => {
                  dispatch({ type: 'personLeft', personId: leaver.id })
                  setLeaving(null)
                }}
              >
                Mark as left
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PersonModal({
  s,
  person,
  pane,
  setPane,
  dispatch,
  onClose,
  onLeave,
}: {
  s: State
  person: State['people'][number]
  pane: PersonPane
  setPane: (pane: PersonPane) => void
  dispatch: Dispatch<Action>
  onClose: () => void
  onLeave: () => void
}) {
  const active = person.status === 'active'
  const color = PERSON_COLOR[person.id] ?? s.workspace.accent
  const notes = (s.learningReports ?? []).filter((item) => item.personId === person.id).slice().reverse()
  const waiting = waitingIds(s, person)

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="person-card-head">
          <div className="person-card-who">
            <span className="avatar person-avatar" style={{ background: color }}>
              {initials(person.name)}
            </span>
            <div>
              <h3>{person.name}</h3>
              <p className="small muted">{postLine(person.title, departmentOf(s, person.roleKey))}</p>
            </div>
          </div>
          <div className="row">
            {active && person.id !== s.workspace.managerId && (
              <button className="btn btn-danger btn-sm" onClick={onLeave}>
                Mark as left
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="tabs" style={{ marginBottom: 8 }}>
          {([
            { id: 'path', label: 'Path' },
            { id: 'progress', label: 'Progress', count: waiting.length },
            { id: 'feedback', label: 'Feedback', count: notes.length || undefined },
          ] as { id: PersonPane; label: string; count?: number }[]).map((item) => (
            <button key={item.id} className={pane === item.id ? 'on' : ''} onClick={() => setPane(item.id)}>
              {item.label}
              {!!item.count && <span className="count">{item.count}</span>}
            </button>
          ))}
        </div>

        {pane === 'path' && (
          <div className="path-groups">
            {pathGroups(s, person).map((group) => {
              const ids = group.methods.map((m) => m.id)
              const on = ids.length > 0 && ids.every((id) => pathOf(person).includes(id))
              return (
                <div className={`path-group${on ? ' on' : ''}`} key={group.id}>
                  <div>
                    <h4>{group.label}</h4>
                    <p className="small muted">{group.detail}</p>
                  </div>
                  <button
                    type="button"
                    className={`opt ${on ? 'on' : ''}`}
                    disabled={!active || ids.length === 0}
                    onClick={() => {
                      const methodIds = on
                        ? person.methodIds.filter((id) => !ids.includes(id))
                        : [...person.methodIds.filter((id) => !ids.includes(id)), ...ids]
                      dispatch({ type: 'setPath', personId: person.id, methodIds })
                    }}
                  >
                    {ids.length === 0 ? 'None' : on ? 'On path' : 'Add'}
                  </button>
                  <div className="path-group-methods">
                    {group.methods.length === 0
                      ? 'No methods in this group for this position.'
                      : group.methods.map((m) => m.title).join(' · ')}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {pane === 'progress' && (
          pathOf(person).length === 0 ? (
            <p className="muted">Nothing on their path yet.</p>
          ) : (
            <div className="path-list">
              {pathOf(person).map((id) => {
                const m = s.methods.find((item) => item.id === id)!
                const pr = progressOf(s, person.id, id)
                const needsConfirm = active && (pr.state === 'awaiting' || pr.update?.state === 'awaiting')
                const lesson = pr.update ? lessonsOf(m).find((l) => l.id === pr.update!.lessonId) : undefined
                const layer = methodLayer(m, s.workspace)
                const layerLabel = layer === 'general' ? 'General' : layer === 'department' ? 'Department' : 'Position'
                return (
                  <div className={`path-row${needsConfirm ? ' needs-you' : ''}`} key={id}>
                    <div className="row" style={{ gap: 12, minWidth: 0 }}>
                      <Shape id={m.id} size={22} />
                      <div>
                        <div className="k" style={{ marginBottom: 2 }}>{layerLabel}</div>
                        <div>{m.title}</div>
                        {needsConfirm && (
                          <div className="small muted">
                            {lesson ? `Update v${pr.update!.version}: ${lesson.title}` : `v${pr.version}`} · exercise passed in {monthLabel(s)}
                          </div>
                        )}
                      </div>
                    </div>
                    <StatusBadge p={pr} />
                    {needsConfirm ? (
                      <div className="row">
                        <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'confirm', personId: person.id, methodId: m.id, approve: false })}>
                          Send back
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'confirm', personId: person.id, methodId: m.id, approve: true })}>
                          Confirm passed
                        </button>
                      </div>
                    ) : (
                      <span />
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {pane === 'feedback' && (
          notes.length === 0 ? (
            <p className="muted">No feedback yet. They leave a short note on each method, and one for the month.</p>
          ) : (
            <div className="stack" style={{ gap: 16 }}>
              {notes.map((note) => {
                const method = note.methodId ? s.methods.find((item) => item.id === note.methodId) : undefined
                return (
                  <div key={note.id} className="feedback-block">
                    <div className="k">
                      {MONTHS[note.monthIndex] ?? monthLabel(s)}
                      {method ? ` · ${method.title}` : ' · This month'}
                    </div>
                    <p style={{ margin: '8px 0 0' }}>{note.body}</p>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export function TeamFeedback({
  s,
  viewerId,
  initialKind = 'all',
}: {
  s: State
  viewerId?: string
  initialKind?: 'all' | 'method' | 'month'
}) {
  const [kind, setKind] = useState<'all' | 'method' | 'month'>(initialKind)
  const notes = (s.learningReports ?? [])
    .filter((item) => item.personId !== viewerId)
    .slice()
    .sort((a, b) => b.monthIndex - a.monthIndex || Number(!!a.methodId) - Number(!!b.methodId))
  const methodCount = notes.filter((item) => item.methodId).length
  const monthCount = notes.filter((item) => !item.methodId).length
  const visible = notes.filter((item) => kind === 'all' || (kind === 'method' ? !!item.methodId : !item.methodId))
  const empty =
    kind === 'method'
      ? 'No method notes yet. They appear after someone passes a method and leaves a short note.'
      : kind === 'month'
        ? 'No monthly notes yet. They appear when someone finishes their path this month.'
        : 'No feedback yet. People leave a short note after a method, and one for the month when the path is done.'

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="seg">
        {(
          [
            { id: 'all' as const, label: 'All', count: notes.length },
            { id: 'method' as const, label: 'Methods', count: methodCount },
            { id: 'month' as const, label: 'Monthly', count: monthCount },
          ]
        ).map((item) => (
          <button key={item.id} type="button" className={`opt ${kind === item.id ? 'on' : ''}`} onClick={() => setKind(item.id)}>
            {item.label}
            {item.count > 0 ? ` ${item.count}` : ''}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="empty card">{empty}</div>
      ) : (
        <div className="card note-feed">
          {visible.map((note) => {
            const person = s.people.find((p) => p.id === note.personId)
            if (!person) return null
            const method = note.methodId ? s.methods.find((item) => item.id === note.methodId) : undefined
            return (
              <div key={note.id} className="note-item">
                <div className="note-item-head">
                  <span className="avatar" style={{ background: PERSON_COLOR[person.id] ?? s.workspace.accent }}>
                    {initials(person.name)}
                  </span>
                  <div>
                    <div className="note-name">{person.name}</div>
                    <div className="k">{method ? method.title : 'This month'}</div>
                  </div>
                  <span className="note-item-meta">{MONTHS[note.monthIndex] ?? monthLabel(s)}</span>
                </div>
                <p>{note.body}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function MonthlyReport({ s, dispatch }: { s: State; dispatch: Dispatch<Action> }) {
  const used = s.methods.filter((m) => m.baselineMin)
  return (
    <div className="stack" style={{ gap: 10 }}>
      {used.map((m) => (
        <ReportCard key={`${m.id}-${s.monthIndex}`} s={s} methodId={m.id} dispatch={dispatch} />
      ))}
    </div>
  )
}

function ReportCard({ s, methodId, dispatch }: { s: State; methodId: MethodId; dispatch: Dispatch<Action> }) {
  const m = s.methods.find((x) => x.id === methodId)!
  const existing = s.reports.find((r) => r.monthIndex === s.monthIndex && r.methodId === methodId)
  const [category, setCategory] = useState<Category | undefined>(existing?.category)
  const [detail, setDetail] = useState(existing?.detail ?? '')
  const [tasks, setTasks] = useState(existing ? String(existing.tasks) : '')
  const [minutes, setMinutes] = useState(existing ? String(existing.minutes) : '')
  const [reworks, setReworks] = useState(existing ? String(existing.reworks) : '')
  const [editing, setEditing] = useState(false)
  const valid = category && tasks !== '' && minutes !== '' && reworks !== '' && Number(reworks) <= Number(tasks)

  if (!editing) {
    return (
      <div className="card row between">
        <div className="row" style={{ gap: 16 }}>
          <Shape id={m.id} size={28} />
          <div>
            <h4>{m.title}</h4>
            <p className="small muted">
              {existing
                ? `${CATEGORY_LABEL[existing.category]}${existing.detail ? ` · ${existing.detail}` : ''} · ${existing.tasks} tasks · ~${existing.minutes} min (baseline ${m.baselineMin}) · ${existing.reworks} sent back`
                : `Baseline ${m.baselineMin} min · add this month’s numbers`}
            </p>
          </div>
        </div>
        <div className="row">
          {existing && (
            <span className="badge ok">
              <span className="dot" />
              Submitted
            </span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            {existing ? 'Edit' : 'Add'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card stack" style={{ gap: 16 }}>
      <div className="row between">
        <div className="row" style={{ gap: 12 }}>
          <Shape id={m.id} size={28} />
          <h3>{m.title}</h3>
        </div>
        <span className="small muted">Baseline agreed after the workshop: {m.baselineMin} min per task</span>
      </div>
      <div className="field">
        <label>What got stuck most this month?</label>
        <div className="seg">
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
            <button
              key={c}
              type="button"
              className={`opt ${category === c ? 'on' : ''}`}
              onClick={() => {
                setCategory(c)
                setDetail('')
              }}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>
      {category && CATEGORY_DETAIL[category] && (
        <div className="field" style={{ maxWidth: 420 }}>
          <label>Which kind? (optional, no specifics)</label>
          <select value={detail} onChange={(e) => setDetail(e.target.value)}>
            <option value="">Not sure</option>
            {CATEGORY_DETAIL[category]!.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
      )}
      <div className="form-grid">
        <div className="field">
          <label>Tasks done this month</label>
          <input type="number" min={0} value={tasks} onChange={(e) => setTasks(e.target.value)} placeholder="e.g. 4" />
        </div>
        <div className="field">
          <label>About how many minutes each</label>
          <input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder={`baseline ${m.baselineMin}`} />
        </div>
        <div className="field">
          <label>Sent back by you</label>
          <input type="number" min={0} value={reworks} onChange={(e) => setReworks(e.target.value)} placeholder="e.g. 2" />
        </div>
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          <button
            className="btn btn-primary"
            disabled={!valid}
            onClick={() => {
              dispatch({ type: 'report', report: { methodId, category: category!, detail: detail || undefined, tasks: +tasks, minutes: +minutes, reworks: +reworks } })
              setEditing(false)
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

export function Updates({ s, dispatch }: { s: State; dispatch: Dispatch<Action> }) {
  const [comment, setComment] = useState<Record<string, string>>({})
  const pending = s.drafts.filter((d) => d.status === 'awaiting-client')
  const done = s.drafts.filter((d) => d.status === 'published')
  return (
    <div className="stack" style={{ gap: 16 }}>
      {!pending.length && <div className="empty">No changes waiting. AI Eesti sends proposed updates here before anything goes live.</div>}
      {pending.map((d) => {
        const m = s.methods.find((x) => x.id === d.methodId)!
        const affected = s.people.filter((p) => p.status === 'active' && pathOf(p).includes(m.id) && progressOf(s, p.id, m.id).state === 'passed')
        return (
          <div className="card stack" key={d.id} style={{ gap: 16 }}>
            <div className="row between">
              <div>
                <span className="small muted">Proposed by AI Eesti</span>
                <h3>
                  {m.title}: v{currentVersion(m).version} → v{nextVersion(currentVersion(m).version)}
                </h3>
              </div>
              <span className="badge warn">
                <span className="dot" />
                Needs your approval
              </span>
            </div>
            <p className="muted">{d.reason}</p>
            <LessonBox l={d.lesson} />
            <div className="small">
              <strong>Practice:</strong> {d.lesson.exercise.brief} {d.lesson.exercise.questions.map((q) => q.prompt).join(' ')}
            </div>
            <div className="small muted">
              If approved: {affected.length ? `${affected.map((p) => p.name.split(' ')[0]).join(', ')} ${affected.length === 1 ? 'gets' : 'get'} only this ${d.lesson.minutes}-minute part.` : 'nobody has to retake anything.'} New people learn the new version directly.
            </div>
            <div className="row">
              <input
                style={{ flex: 1, minWidth: 220, border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px' }}
                placeholder="Comment if sending back (optional)"
                value={comment[d.id] ?? ''}
                onChange={(e) => setComment((c) => ({ ...c, [d.id]: e.target.value }))}
              />
              <button className="btn btn-ghost" onClick={() => dispatch({ type: 'decideDraft', draftId: d.id, approve: false, comment: comment[d.id] })}>
                Send back
              </button>
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'decideDraft', draftId: d.id, approve: true })}>
                Approve and publish
              </button>
            </div>
          </div>
        )
      })}
      {done.length > 0 && (
        <div className="card">
          <h4>Published this year</h4>
          <div className="stack small" style={{ marginTop: 10, gap: 6 }}>
            {done.map((d) => (
              <div key={d.id}>
                {s.methods.find((m) => m.id === d.methodId)!.title} · {d.lesson.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

