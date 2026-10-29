import { useState, type Dispatch } from 'react'
import type { AiSettings } from '../ai'
import { ExerciseRunner } from '../components/Exercise'
import { MethodBody, Shape, StatusBadge } from '../components/ui'
import { departmentOf, METHOD_LOOK, postLine } from '../data'
import { lessonsOf, monthLabel, pathOf, progressOf, type Action } from '../store'
import type { MethodId, State } from '../types'
import { KnowledgeBase } from './Knowledge'
import { managerQueue, MonthlyReport, Team, TeamFeedback, Updates, type ManagerTab } from './Manager'
import { OwnerYear } from './Owner'

export type WorkspaceLevel = 'staff' | 'manager' | 'owner'

export function Learner({
  s,
  dispatch,
  personId,
  ai,
  query = '',
  level = 'staff',
  tab = 'mine',
  setTab,
  color = '#5b9bd5',
}: {
  s: State
  dispatch: Dispatch<Action>
  personId?: string
  ai: AiSettings
  query?: string
  level?: WorkspaceLevel
  tab?: ManagerTab
  setTab?: (t: ManagerTab) => void
  color?: string
}) {
  const person = personId ? s.people.find((p) => p.id === personId) : undefined
  const displayName = person?.name ?? s.workspace.ownerName
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
  const managerName = s.people.find((p) => p.id === s.workspace.managerId)?.name.split(' ')[0] ?? 'your manager'
  const look = (id: MethodId) => METHOD_LOOK[id] ?? { bg: '#ede9fe', fg: '#6d28d9', shape: 'hexagon' as const }
  const [open, setOpen] = useState<MethodId | null>(null)
  const [library, setLibrary] = useState(false)
  const [noteFor, setNoteFor] = useState<MethodId | 'month' | null>(null)
  const positionLabel = postLine(person?.title ?? s.workspace.ownerLabel, departmentOf(s, person?.roleKey))
  const liveKnowledge = s.knowledge.filter((item) => {
    if (item.status !== 'published') return false
    return level === 'staff' && person ? item.roleKey === person.roleKey : true
  }).length
  const rolePath = person ? (s.workspace.roles.find((role) => role.id === person.roleKey)?.methodIds ?? []) : []
  const path = person && pathOf(person).length ? pathOf(person) : rolePath
  const q = query.trim().toLowerCase()
  const items = path.flatMap((id) => {
    const m = s.methods.find((x) => x.id === id)
    if (!m || !person) return []
    return [{ m, p: progressOf(s, person.id, id) }]
  })
  const visible = items.filter(({ m }) => !q || `${m.title} ${m.task}`.toLowerCase().includes(q))
  const waiting = items.filter(({ p }) => p.state === 'awaiting' || p.update?.state === 'awaiting')
  const next = items.find(({ p }) => (p.state !== 'passed' && p.state !== 'awaiting') || p.update?.state === 'todo')
  const queue = managerQueue(s)
  const draftQueue = s.drafts.filter((d) => d.status === 'awaiting-client').length
  const extras: { id: ManagerTab; label: string; count?: number }[] = [
    ...(level === 'owner' ? [{ id: 'year' as const, label: 'Year' }] : []),
    ...(person ? [{ id: 'mine' as const, label: 'My learning' }] : []),
    ...(level === 'staff'
      ? []
      : [
          { id: 'team' as const, label: 'Team', count: queue.length },
          { id: 'methods' as const, label: 'Methods', count: draftQueue },
        ]),
  ]
  const activeTab: ManagerTab = extras.some((item) => item.id === tab) ? tab : extras[0]?.id ?? 'mine'

  if (open && person) {
    const { m, p } = items.find((x) => x.m.id === open)!
    const isUpdate = !!p.update
    const lesson = isUpdate ? lessonsOf(m).find((l) => l.id === p.update!.lessonId) : undefined
    const sections = isUpdate && lesson
      ? [{ title: lesson.title, exercise: lesson.exercise }]
      : [{ title: m.title, exercise: m.exercise }, ...lessonsOf(m).map((l) => ({ title: l.title, exercise: l.exercise }))]
    const canExercise = isUpdate ? p.update!.state === 'todo' : p.state === 'learning' || p.state === 'not-started'

    return (
      <div className="page">
        <button className="link" onClick={() => setOpen(null)}>
          ← {displayName.split(' ')[0]}
        </button>
        <div className="page-head" style={{ marginTop: 20, alignItems: 'center' }}>
          <div className="row" style={{ gap: 16, alignItems: 'center' }}>
            <div className="hero-icon" style={{ background: look(m.id).bg }}>
              <Shape id={m.id} size={32} />
            </div>
            <div>
              <h1 style={{ fontSize: 42 }}>{isUpdate ? lesson?.title : m.title}</h1>
              <p className="lead" style={{ marginTop: 8 }}>
                {isUpdate ? `${lesson?.minutes} min · you already passed the rest` : m.task}
              </p>
            </div>
          </div>
          <StatusBadge p={p} />
        </div>

        <div className="detail">
          <div className="card">
            {canExercise ? (
              <ExerciseRunner
                key={`${m.id}:${isUpdate ? p.update!.version : p.version}`}
                sections={sections}
                ai={ai}
                submitLabel={`Send to ${managerName} for confirmation`}
                onPass={() => {
                  if (!person) return
                  if (p.state === 'not-started') dispatch({ type: 'start', personId: person.id, methodId: m.id })
                  dispatch({ type: 'submit', personId: person.id, methodId: m.id, update: isUpdate })
                }}
              />
            ) : p.state === 'passed' && !isUpdate ? (
              <div className="stack" style={{ gap: 18 }}>
                <p className="lead" style={{ margin: 0 }}>
                  Passed. You’ll only see this again if the method changes.
                </p>
                <button type="button" className="btn btn-primary" onClick={() => setNoteFor(m.id)} style={{ alignSelf: 'flex-start' }}>
                  {taskNote(s, person.id, m.id) ? 'Feedback ✓' : 'Feedback'}
                </button>
              </div>
            ) : (
              <p className="lead">Sent to {managerName}.</p>
            )}
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <div className="card">
              <MethodBody m={m} onlyLessonId={isUpdate ? p.update!.lessonId : undefined} compact={!isUpdate} />
            </div>
            <div className="card">
              <h4>Versions</h4>
              <div className="stack small" style={{ marginTop: 12, gap: 10 }}>
                {[...m.versions].reverse().map((v) => (
                  <div key={v.version}>
                    <strong>v{v.version}</strong>
                    <span className="muted"> · {v.month}</span>
                    <div className="muted">{v.lesson?.title ?? v.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {noteFor && person && (
          <FeedbackModal
            s={s}
            personId={person.id}
            methodId={noteFor === 'month' ? undefined : noteFor}
            dispatch={dispatch}
            onClose={() => setNoteFor(null)}
          />
        )}
      </div>
    )
  }

  if (library) {
    return (
      <div className="page">
        <KnowledgeBase
          s={s}
          dispatch={dispatch}
          mode={level === 'staff' ? 'staff' : 'manager'}
          personId={person?.id ?? s.workspace.managerId}
          query={query}
          onClose={() => setLibrary(false)}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head learner-head">
        <div className="person-head">
          <span className="avatar person-avatar" style={{ background: color }}>
            {initials}
          </span>
          <div>
            <h1>{displayName}</h1>
            <p className="lead">{positionLabel}</p>
          </div>
        </div>
        <button className="head-tile" onClick={() => setLibrary(true)}>
          <span className="k">Knowledge</span>
          <div className="head-tile-foot">
            <strong>{liveKnowledge ? `${liveKnowledge} live` : 'Library'}</strong>
            <span className="btn btn-ghost btn-sm">Open →</span>
          </div>
        </button>
      </div>

      {extras.length > 0 && setTab && (
        <div className="tabs">
          {extras.map((item) => (
            <button key={item.id} className={activeTab === item.id ? 'on' : ''} onClick={() => setTab(item.id)}>
              {item.label}
              {!!item.count && <span className="count">{item.count}</span>}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'team' && <Team s={s} dispatch={dispatch} viewerId={personId} />}
      {activeTab === 'methods' && (
        <div className="stack" style={{ gap: 28 }}>
          <section className="stack" style={{ gap: 12 }}>
            <div className="k">Feedback</div>
            <p className="lead" style={{ marginBottom: 4 }}>
              Notes after a method, and one for the month when the path is done.
            </p>
            <TeamFeedback s={s} viewerId={personId} />
          </section>
          {level !== 'owner' && (
            <>
              <section className="stack" style={{ gap: 12 }}>
                <div className="k">Method updates</div>
                <Updates s={s} dispatch={dispatch} />
              </section>
              <section className="stack" style={{ gap: 12 }}>
                <div className="k">Work numbers</div>
                <p className="lead" style={{ marginBottom: 4 }}>
                  {monthLabel(s)} · categories and numbers only.
                </p>
                <MonthlyReport s={s} dispatch={dispatch} />
              </section>
            </>
          )}
        </div>
      )}
      {activeTab === 'year' && <OwnerYear s={s} />}

      {activeTab === 'mine' && person && (
        <>
          {next ? (
            <div className="next-banner">
              <div>
                <div className="k">Up next</div>
                <h3 style={{ marginTop: 6 }}>
                  {next.p.update
                    ? lessonsOf(next.m).find((l) => l.id === next.p.update!.lessonId)?.title
                    : next.m.title}
                </h3>
              </div>
              <button className="btn btn-primary" onClick={() => setOpen(next.m.id)}>
                Continue →
              </button>
            </div>
          ) : waiting.length > 0 ? (
            <div className="next-banner">
              <div>
                <div className="k">Waiting</div>
                <h3 style={{ marginTop: 6 }}>{managerName} is reviewing</h3>
              </div>
            </div>
          ) : (
            <div className="next-banner">
              <div>
                <div className="k">This month</div>
                <h3 style={{ marginTop: 6 }}>{taskNote(s, person.id) ? 'Feedback sent' : 'This month’s feedback'}</h3>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setNoteFor('month')}>
                {taskNote(s, person.id) ? 'Update →' : 'Write →'}
              </button>
            </div>
          )}

          <div className="grid grid-2">
            {visible.length === 0 && q ? (
              <div className="card empty" style={{ gridColumn: '1 / -1' }}>
                No methods match “{query}”.
              </div>
            ) : null}
            {visible.map(({ m, p }) => {
              const pct = p.state === 'passed' && !p.update ? 100 : p.state === 'awaiting' || p.update?.state === 'awaiting' ? 80 : p.state === 'learning' || p.update ? 35 : 8
              return (
                <button key={m.id} className="method-card" onClick={() => setOpen(m.id)}>
                  <div className="row between">
                    <div className="hero-icon" style={{ background: look(m.id).bg, width: 44, height: 44, borderRadius: 12 }}>
                      <Shape id={m.id} size={26} />
                    </div>
                    <StatusBadge p={p} />
                  </div>
                  <div>
                    <div className="k">{m.minutes} min</div>
                    <h3>{m.title}</h3>
                    <p className="desc" style={{ marginTop: 8 }}>
                      {m.task}
                    </p>
                  </div>
                  <div className="foot">
                    <div className="bar">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <span className="btn btn-ghost btn-sm">Open →</span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {noteFor && person && (
        <FeedbackModal
          s={s}
          personId={person.id}
          methodId={noteFor === 'month' ? undefined : noteFor}
          dispatch={dispatch}
          onClose={() => setNoteFor(null)}
        />
      )}
    </div>
  )
}

function taskNote(s: State, personId: string, methodId?: MethodId) {
  return (s.learningReports ?? []).find(
    (item) => item.personId === personId && item.monthIndex === s.monthIndex && (item.methodId ?? '') === (methodId ?? ''),
  )
}

function FeedbackModal({
  s,
  personId,
  methodId,
  dispatch,
  onClose,
}: {
  s: State
  personId: string
  methodId?: MethodId
  dispatch: Dispatch<Action>
  onClose: () => void
}) {
  const existing = taskNote(s, personId, methodId)
  const [body, setBody] = useState(existing?.body ?? '')
  const method = methodId ? s.methods.find((item) => item.id === methodId) : undefined

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="k">{method ? 'Method' : monthLabel(s)}</div>
        <h3>{method ? method.title : 'This month’s feedback'}</h3>
        <p className="small muted">A short note for your manager. No real client files.</p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What helped, what was stuck, what to change…"
        />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!body.trim()}
            onClick={() => {
              dispatch({
                type: 'saveLearningReport',
                report: { personId, methodId, body: body.trim() },
              })
              onClose()
            }}
          >
            {existing ? 'Update' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
