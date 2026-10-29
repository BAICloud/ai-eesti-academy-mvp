import { useState, type Dispatch } from 'react'
import { draftLesson, saveAi, type AiSettings } from '../ai'
import { LessonBox, MethodBody, Notice, Shape } from '../components/ui'
import { CATEGORY_LABEL, MONTHS } from '../data'
import { currentVersion, nextVersion, progressOf, type Action } from '../store'
import type { Draft, MethodId, Report, State, WorkspaceConfig } from '../types'
import { KnowledgeBase } from './Knowledge'

export type AdminTab = 'setup' | 'signals' | 'drafts' | 'library' | 'knowledge' | 'settings'

export function Admin({
  s,
  dispatch,
  ai,
  setAi,
  tab,
  setTab,
  workspaces,
  onSelectWorkspace,
  query = '',
}: {
  s: State
  dispatch: Dispatch<Action>
  ai: AiSettings
  setAi: (a: AiSettings) => void
  tab: AdminTab
  setTab: (t: AdminTab) => void
  workspaces: WorkspaceConfig[]
  onSelectWorkspace: (id: string) => void
  query?: string
}) {
  const [openDraft, setOpenDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | undefined>()

  const signals = s.reports.filter((r) => r.category !== 'none' && !r.handled && !s.drafts.some((d) => d.reportId === r.id && d.status !== 'returned'))
  const open = s.drafts.filter((d) => d.status === 'editing' || d.status === 'returned')
  const manager = s.people.find((person) => person.id === s.workspace.managerId)!
  const managerName = manager.name.split(' ')[0]
  const managerQueue = manager.methodIds.filter((id) => {
    const p = progressOf(s, manager.id, id)
    return p.state === 'awaiting' || p.update?.state === 'awaiting'
  })

  const makeDraft = async (input: { methodId: MethodId; report?: Report; toolNote?: string }) => {
    const m = s.methods.find((x) => x.id === input.methodId)!
    setBusy(input.report?.id ?? `tool-${m.id}`)
    setError(undefined)
    const r = await draftLesson(ai, {
      method: m,
      category: input.report ? input.report.category : 'tool',
      detail: input.report?.detail,
      tasks: input.report?.tasks,
      reworks: input.report?.reworks,
      toolNote: input.toolNote,
    })
    setError(r.error)
    const draft: Draft = {
      id: `d-${s.workspace.id}-${s.drafts.length + 1}`,
      methodId: m.id,
      reportId: input.report?.id,
      reason: input.report
        ? `${MONTHS[input.report.monthIndex]} report: “${CATEGORY_LABEL[input.report.category]}”${input.report.detail ? ` (${input.report.detail})` : ''}, ${input.report.reworks} of ${input.report.tasks} sent back.`
        : `Tool change: ${input.toolNote}`,
      lesson: r.lesson,
      author: r.author,
      prompt: r.prompt,
      status: 'editing',
    }
    dispatch({ type: 'saveDraft', draft })
    setBusy(null)
    setOpenDraft(draft.id)
    setTab('drafts')
  }

  const tabs: { id: AdminTab; label: string; count?: number }[] = [
    { id: 'setup', label: 'Setup' },
    { id: 'signals', label: 'Signals', count: signals.length + managerQueue.length },
    { id: 'drafts', label: 'Drafts', count: open.length },
    { id: 'library', label: 'Method library' },
    { id: 'knowledge', label: 'Knowledge' },
    { id: 'settings', label: 'Claude settings' },
  ]
  const activeTab = tabs.some((item) => item.id === tab) ? tab : 'setup'

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>
            Maintain the <em>methods</em>
          </h1>
          <p className="lead">Signals in. Short lessons out.</p>
        </div>
        <div className="admin-head-aside">
          <label className="client-switch">
            <span className="k">Client</span>
            <select value={s.workspace.id} aria-label="Client" onChange={(e) => onSelectWorkspace(e.target.value)}>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
          <span className={`badge ${ai.apiKey ? 'ok' : ''}`}>
            <span className="dot" />
            {ai.apiKey ? `Claude connected · ${ai.model}` : 'Claude not connected · using prepared drafts'}
          </span>
        </div>
      </div>
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={activeTab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
            {!!t.count && <span className="count">{t.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'setup' && <Setup key={s.workspace.id} s={s} dispatch={dispatch} />}

      {activeTab === 'signals' && (
        <div className="stack" style={{ gap: 16 }}>
          {managerQueue.map((id) => (
            <div className="card row between" key={id}>
              <div>
                <h4>{managerName} passed “{s.methods.find((m) => m.id === id)!.title}”</h4>
                <p className="small muted">The manager’s own exercise is confirmed by AI Eesti, so nobody confirms themselves.</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'confirm', personId: manager.id, methodId: id, approve: true })}>
                Confirm
              </button>
            </div>
          ))}
          {!signals.length && !managerQueue.length && <div className="empty">No open signals. They appear when the client manager reports a recurring problem.</div>}
          {signals.map((r) => {
            const m = s.methods.find((x) => x.id === r.methodId)!
            return (
              <div className="card stack" key={r.id}>
                <div className="row between">
                  <div className="row" style={{ gap: 14 }}>
                    <Shape id={m.id} size={30} />
                    <div>
                      <span className="small muted">
                        {MONTHS[r.monthIndex]} report · from {managerName}
                      </span>
                      <h3>
                        {m.title}: {CATEGORY_LABEL[r.category]}
                      </h3>
                    </div>
                  </div>
                  <span className="badge warn">
                    {r.reworks} of {r.tasks} sent back
                  </span>
                </div>
                <p className="muted small">
                  {r.detail ? `Kind: ${r.detail}. ` : ''}About {r.minutes} min per task against a {m.baselineMin}-minute baseline. This is everything AI Eesti receives. No files, no client names.
                </p>
                <div className="row">
                  <button className="btn btn-primary" disabled={!!busy} onClick={() => makeDraft({ methodId: m.id, report: r })}>
                    {busy === r.id ? (ai.apiKey ? 'Claude is drafting…' : 'Drafting…') : 'Draft a short lesson'} →
                  </button>
                </div>
              </div>
            )
          })}
          <ToolChange s={s} busy={!!busy} onDraft={(methodId, note) => makeDraft({ methodId, toolNote: note })} />
        </div>
      )}

      {activeTab === 'drafts' && (
        <Drafts
          key={s.workspace.id}
          s={s}
          dispatch={dispatch}
          openId={openDraft}
          setOpenId={setOpenDraft}
          error={error}
          regenerate={(d) => {
            const r = s.reports.find((x) => x.id === d.reportId)
            dispatch({ type: 'saveDraft', draft: { ...d, status: 'returned', clientComment: 'Replaced by a new draft.' } })
            return makeDraft({ methodId: d.methodId, report: r, toolNote: r ? undefined : d.reason.replace('Tool change: ', '') })
          }}
        />
      )}

      {activeTab === 'library' && <Library key={s.workspace.id} s={s} dispatch={dispatch} />}

      {activeTab === 'knowledge' && <KnowledgeBase key={s.workspace.id} s={s} dispatch={dispatch} mode="admin" query={query} />}

      {activeTab === 'settings' && <Settings ai={ai} setAi={setAi} />}
    </div>
  )
}

function ToolChange({ s, busy, onDraft }: { s: State; busy: boolean; onDraft: (m: MethodId, note: string) => void }) {
  const [open, setOpen] = useState(false)
  const [methodId, setMethodId] = useState<MethodId>(s.methods[0]?.id ?? 'A')
  const [note, setNote] = useState('Cowork moved scheduled tasks to Settings → Schedules')
  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)} style={{ alignSelf: 'flex-start' }}>
        Log a tool change
      </button>
    )
  }
  return (
    <div className="card stack">
      <div className="row between">
        <div>
          <h4>Log a tool change</h4>
          <p className="small muted">Only people on that method get the update.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      <div className="row">
        <select value={methodId} onChange={(e) => setMethodId(e.target.value as MethodId)} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px' }}>
          {s.methods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1, minWidth: 240, border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px' }} />
        <button className="btn btn-primary btn-sm" disabled={busy || !note.trim()} onClick={() => onDraft(methodId, note.trim())}>
          Draft update
        </button>
      </div>
    </div>
  )
}

function Setup({ s, dispatch }: { s: State; dispatch: Dispatch<Action> }) {
  const [draft, setDraft] = useState<WorkspaceConfig>(structuredClone(s.workspace))
  const dirty = JSON.stringify(draft) !== JSON.stringify(s.workspace)

  const patchRole = (roleId: string, patch: Partial<WorkspaceConfig['roles'][number]>) => {
    setDraft((current) => ({
      ...current,
      roles: current.roles.map((role) => (role.id === roleId ? { ...role, ...patch } : role)),
    }))
  }

  const toggleMethod = (roleId: string, methodId: string) => {
    const role = draft.roles.find((item) => item.id === roleId)
    if (!role) return
    patchRole(roleId, {
      methodIds: role.methodIds.includes(methodId)
        ? role.methodIds.filter((id) => id !== methodId)
        : [...role.methodIds, methodId],
    })
  }

  return (
    <div className="card stack" style={{ gap: 18 }}>
      <div className="section-title" style={{ marginBottom: 0 }}>
        <div>
          <h3>{draft.name}</h3>
          <p className="small muted" style={{ marginTop: 4 }}>
            One product shell. This changes what every role sees.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" disabled={!dirty} onClick={() => dispatch({ type: 'updateWorkspace', workspace: draft })}>
          Save
        </button>
      </div>
      <div className="form-grid setup-grid">
        <div className="field">
          <label>Client name</label>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Sector</label>
          <input value={draft.sector} onChange={(e) => setDraft({ ...draft, sector: e.target.value })} />
        </div>
        <div className="field">
          <label>People</label>
          <input type="number" value={draft.employeeCount} onChange={(e) => setDraft({ ...draft, employeeCount: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label>Workshop</label>
          <input value={draft.workshop} onChange={(e) => setDraft({ ...draft, workshop: e.target.value })} />
        </div>
      </div>

        <div>
          <h4>Role paths</h4>
          <p className="small muted" style={{ marginTop: 4 }}>
            Methods on each position. If the team is too small to split, the department is the company name.
          </p>
        </div>
        <div className="role-paths">
          {draft.roles.map((role) => (
            <div className="role-path" key={role.id}>
              <div className="role-path-head">
                <input
                  value={role.label}
                  aria-label="Position"
                  onChange={(e) => patchRole(role.id, { label: e.target.value })}
                />
                <input
                  value={role.department}
                  aria-label="Department"
                  onChange={(e) => patchRole(role.id, { department: e.target.value })}
                />
              </div>
              <div className="seg">
                {s.methods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    className={`opt ${role.methodIds.includes(method.id) ? 'on' : ''}`}
                    onClick={() => toggleMethod(role.id, method.id)}
                  >
                    {method.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
    </div>
  )
}

function Drafts({
  s,
  dispatch,
  openId,
  setOpenId,
  error,
  regenerate,
}: {
  s: State
  dispatch: Dispatch<Action>
  openId: string | null
  setOpenId: (id: string | null) => void
  error?: string
  regenerate: (d: Draft) => void
}) {
  const list = [...s.drafts].reverse()
  if (!list.length) return <div className="empty">No drafts yet. Start from a signal.</div>
  const d = list.find((x) => x.id === openId) ?? list[0]
  const m = s.methods.find((x) => x.id === d.methodId)!
  const managerName = s.people.find((person) => person.id === s.workspace.managerId)?.name.split(' ')[0] ?? 'client manager'
  const editable = d.status === 'editing' || d.status === 'returned'
  const set = (patch: Partial<Draft['lesson']>) => dispatch({ type: 'saveDraft', draft: { ...d, lesson: { ...d.lesson, ...patch } } })

  return (
    <div className="detail">
      <div className="card stack" style={{ gap: 16 }}>
        <div className="row between">
          <div>
            <span className="small muted">
              {m.title} · v{currentVersion(m).version} → v{nextVersion(currentVersion(m).version)}
            </span>
            <h3>Short lesson draft</h3>
          </div>
          <span className={`badge ${d.status === 'published' ? 'ok' : d.status === 'awaiting-client' ? 'info' : d.status === 'returned' ? 'bad' : 'warn'}`}>
            {d.status === 'editing' ? 'Editing' : d.status === 'awaiting-client' ? `Waiting for ${managerName}` : d.status === 'published' ? 'Published' : 'Sent back'}
          </span>
        </div>
        <p className="muted small">{d.reason}</p>
        {d.status === 'returned' && d.clientComment && <Notice tone="warn">{managerName}: “{d.clientComment}”</Notice>}
        {error && d.status === 'editing' && <Notice tone="warn">Claude call failed, so a prepared draft was used. {error}</Notice>}

        {editable ? (
          <div className="stack">
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 120px' }}>
              <div className="field">
                <label>Title</label>
                <input value={d.lesson.title} onChange={(e) => set({ title: e.target.value })} />
              </div>
              <div className="field">
                <label>Minutes</label>
                <input type="number" value={d.lesson.minutes} onChange={(e) => set({ minutes: +e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Why this lesson</label>
              <input value={d.lesson.why} onChange={(e) => set({ why: e.target.value })} />
            </div>
            <div className="field">
              <label>What to do (one point per line)</label>
              <textarea style={{ minHeight: 140 }} value={d.lesson.points.join('\n')} onChange={(e) => set({ points: e.target.value.split('\n') })} />
            </div>
          </div>
        ) : (
          <LessonBox l={d.lesson} />
        )}

        <div className="stack">
          <h4>Practice ({d.lesson.exercise.questions.length} question{d.lesson.exercise.questions.length > 1 ? 's' : ''})</h4>
          <p className="small muted">{d.lesson.exercise.brief}</p>
          {d.lesson.exercise.questions.map((q) => (
            <div className="question small" key={q.id}>
              <div>{q.prompt}</div>
              <div className="options">
                {q.options.map((o, i) => (
                  <span key={o} className={`opt ${q.correct.includes(i) ? 'on' : ''}`}>
                    {o}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {editable && (
          <div className="row">
            <button className="btn btn-ghost" onClick={() => regenerate(d)}>
              Draft again
            </button>
            <button
              className="btn btn-primary"
              onClick={() => dispatch({ type: 'saveDraft', draft: { ...d, lesson: { ...d.lesson, points: d.lesson.points.filter((p) => p.trim()) }, status: 'awaiting-client' } })}
            >
              Send to {managerName} for approval →
            </button>
          </div>
        )}
      </div>

      <div className="stack">
        <div className="card stack">
          <div className="row between">
            <h4>What {d.author === 'claude' ? 'Claude saw' : 'Claude would see'}</h4>
            <span className={`badge ${d.author === 'claude' ? 'ok' : ''}`}>{d.author === 'claude' ? 'Written by Claude' : 'Prepared draft'}</span>
          </div>
          <p className="small muted">The method and the manager’s categories. No client files, names or prices.</p>
          <div className="prompt">{d.prompt}</div>
        </div>
        {list.length > 1 && (
          <div className="card stack">
            <h4>All drafts</h4>
            {list.map((x) => (
              <button key={x.id} className="link" style={{ textAlign: 'left', fontWeight: x.id === d.id ? 600 : 400 }} onClick={() => setOpenId(x.id)}>
                {s.methods.find((mm) => mm.id === x.methodId)!.title}: {x.lesson.title} · {x.status}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Library({ s, dispatch }: { s: State; dispatch: Dispatch<Action> }) {
  const [id, setId] = useState<MethodId | null>(null)
  const m = s.methods.find((x) => x.id === id)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(m)
  const choose = (methodId: MethodId) => {
    setId(methodId)
    setDraft(structuredClone(s.methods.find((method) => method.id === methodId)!))
    setEditing(false)
  }
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card year-methods">
        {s.methods.map((x) => (
          <button
            key={x.id}
            type="button"
            className={`year-method${x.id === id ? ' on' : ''}`}
            onClick={() => choose(x.id)}
          >
            <Shape id={x.id} size={22} />
            <div>
              <h4>{x.title}</h4>
              <p className="small muted">{x.task}</p>
            </div>
            <span className="badge">v{currentVersion(x).version}</span>
          </button>
        ))}
      </div>
      {m && draft && (
        <div className="card stack" style={{ gap: 16 }}>
          <div className="row between">
            <div className="row" style={{ gap: 12 }}>
              <Shape id={m.id} size={28} />
              <div>
                <h3>{m.title}</h3>
                <p className="small muted">{m.task}</p>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing((value) => !value)}>
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editing ? (
            <div className="stack">
              <div className="field">
                <label>Method title</label>
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div className="field">
                <label>Outcome</label>
                <input value={draft.task} onChange={(e) => setDraft({ ...draft, task: e.target.value })} />
              </div>
              <div className="field">
                <label>Steps · one per line</label>
                <textarea value={draft.steps.join('\n')} onChange={(e) => setDraft({ ...draft, steps: e.target.value.split('\n').filter(Boolean) })} />
              </div>
              <div className="field">
                <label>AI boundaries · one per line</label>
                <textarea style={{ minHeight: 100 }} value={draft.rules.join('\n')} onChange={(e) => setDraft({ ...draft, rules: e.target.value.split('\n').filter(Boolean) })} />
              </div>
              <div className="row">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    dispatch({ type: 'updateMethod', method: draft })
                    setEditing(false)
                  }}
                >
                  Save method
                </button>
                <span className="small muted">Used by every role path that contains this method.</span>
              </div>
            </div>
          ) : (
            <>
              <MethodBody m={m} />
              <div>
                <h4>Versions</h4>
                <div className="stack small" style={{ marginTop: 10, gap: 8 }}>
                  {[...m.versions].reverse().map((v) => (
                    <div key={v.version}>
                      <strong>v{v.version}</strong> <span className="muted">· {v.month}</span>
                      <div className="muted">{v.lesson ? `${v.lesson.title}. ${v.reason}` : v.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Settings({ ai, setAi }: { ai: AiSettings; setAi: (a: AiSettings) => void }) {
  const [key, setKey] = useState(ai.apiKey)
  const [model, setModel] = useState(ai.model)
  return (
    <div className="card stack" style={{ maxWidth: 640 }}>
      <h3>Connect Claude</h3>
      <p className="muted small">
        Optional. With a key, lesson drafts and email feedback are written live by Claude. Without one, the demo uses prepared drafts. The key is stored only in this browser.
      </p>
      <div className="field">
        <label>Anthropic API key</label>
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" />
      </div>
      <div className="field">
        <label>Model</label>
        <input value={model} onChange={(e) => setModel(e.target.value)} />
      </div>
      <div className="row">
        <button
          className="btn btn-primary"
          onClick={() => {
            const next = { apiKey: key.trim(), model: model.trim() || 'claude-sonnet-4-5' }
            saveAi(next)
            setAi(next)
          }}
        >
          Save
        </button>
        {ai.apiKey && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              saveAi({ apiKey: '', model })
              setAi({ apiKey: '', model })
              setKey('')
            }}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  )
}
