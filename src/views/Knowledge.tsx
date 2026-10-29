import { useState, type Dispatch } from 'react'
import { departmentOf, KNOWLEDGE_KINDS, KNOWLEDGE_KIND_BLURB, KNOWLEDGE_KIND_LABEL, KNOWLEDGE_SOURCE_LABEL, postLine } from '../data'
import { knowledgePermission, type Action } from '../store'
import type { KnowledgeItem, KnowledgeKind, KnowledgeSource, RoleKey, State } from '../types'

const STATUS_LABEL: Record<KnowledgeItem['status'], string> = {
  published: 'Live',
  pending: 'Waiting',
  returned: 'Returned',
  restricted: 'Restricted',
}

const STATUS_CLASS: Record<KnowledgeItem['status'], string> = {
  published: 'ok',
  pending: 'warn',
  returned: 'bad',
  restricted: '',
}

function authorName(s: State, id: string) {
  if (id === 'admin') return 'AI Eesti'
  return s.people.find((person) => person.id === id)?.name.split(' ')[0] ?? id
}

function roleName(s: State, roleKey: RoleKey) {
  return s.workspace.roles.find((role) => role.id === roleKey)?.label ?? roleKey
}

export function KnowledgeBase({
  s,
  dispatch,
  mode,
  personId,
  query = '',
  onClose,
}: {
  s: State
  dispatch: Dispatch<Action>
  mode: 'staff' | 'manager' | 'admin'
  personId?: string
  query?: string
  onClose?: () => void
}) {
  const person = s.people.find((item) => item.id === personId)
  const staffRole = person?.roleKey
  const [roleFilter, setRoleFilter] = useState<RoleKey | 'all'>(mode === 'staff' ? (staffRole ?? 'all') : 'all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [composeKind, setComposeKind] = useState<KnowledgeKind | null>(null)
  const q = query.trim().toLowerCase()
  const pending = s.knowledge.filter((item) => item.status === 'pending')
  const activeRole = mode === 'staff' && staffRole ? staffRole : roleFilter === 'all' ? undefined : roleFilter
  const perm = knowledgePermission(s, staffRole ?? (typeof roleFilter === 'string' && roleFilter !== 'all' ? roleFilter : s.workspace.roles[0].id))
  const canAdd = mode === 'staff' ? !!staffRole && perm.staffCanAdd : true
  const addSource: KnowledgeSource = mode === 'admin' ? 'company-custom' : mode === 'manager' ? 'company-upload' : 'role-staff'
  const addRole = mode === 'staff' && staffRole ? staffRole : roleFilter === 'all' ? s.workspace.roles[0].id : roleFilter

  const visible = s.knowledge.filter((item) => {
    if (activeRole && item.roleKey !== activeRole) return false
    if (q && !`${item.title} ${item.body} ${KNOWLEDGE_KIND_LABEL[item.kind]} ${KNOWLEDGE_SOURCE_LABEL[item.source]}`.toLowerCase().includes(q)) return false
    if (mode === 'staff') {
      if (item.status === 'restricted') return false
      if (item.status === 'pending' || item.status === 'returned') return item.authorId === personId
    }
    return true
  })

  const openItem = openId ? s.knowledge.find((item) => item.id === openId) : undefined

  if (openItem) {
    return (
      <DocumentView
        s={s}
        item={openItem}
        dispatch={dispatch}
        mode={mode}
        personId={personId}
        onBack={() => setOpenId(null)}
      />
    )
  }

  if (composeKind) {
    return (
      <ComposeView
        s={s}
        dispatch={dispatch}
        kind={composeKind}
        source={addSource}
        roleKey={addRole}
        authorId={mode === 'admin' ? 'admin' : personId ?? s.workspace.managerId}
        lockRole={mode === 'staff'}
        mustApprove={mode === 'staff' && perm.managerMustApprove}
        onBack={() => setComposeKind(null)}
      />
    )
  }

  return (
    <div className="stack" style={{ gap: 28 }}>
      {onClose && (
        <button className="link" onClick={onClose}>
          ← Back
        </button>
      )}
      <div className="page-head" style={{ marginBottom: 0, marginTop: onClose ? 12 : 0 }}>
        <div>
          <h1>
            {mode === 'staff' ? 'Knowledge' : 'Role knowledge'}
          </h1>
          <p className="lead">
            {mode === 'staff'
              ? person
                ? postLine(person.title, departmentOf(s, person.roleKey))
                : ''
              : 'Same sections in every company. Open an entry to read the document.'}
          </p>
        </div>
      </div>

      {mode !== 'staff' && (
        <div className="seg" style={{ flexWrap: 'wrap' }}>
          <button type="button" className={`opt ${roleFilter === 'all' ? 'on' : ''}`} onClick={() => setRoleFilter('all')}>
            All roles
          </button>
          {s.workspace.roles.map((role) => (
            <button key={role.id} type="button" className={`opt ${roleFilter === role.id ? 'on' : ''}`} onClick={() => setRoleFilter(role.id)}>
              {role.label}
            </button>
          ))}
        </div>
      )}

      {mode !== 'staff' && pending.filter((item) => !activeRole || item.roleKey === activeRole).length > 0 && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="k">Waiting for review</div>
          {pending
            .filter((item) => !activeRole || item.roleKey === activeRole)
            .map((item) => (
              <ReviewCard key={item.id} s={s} item={item} dispatch={dispatch} onOpen={() => setOpenId(item.id)} />
            ))}
        </div>
      )}

      {mode !== 'staff' && <PermissionMatrix s={s} dispatch={dispatch} />}

      {KNOWLEDGE_KINDS.map((kind) => {
        const items = visible.filter((item) => item.kind === kind && (mode === 'staff' || item.status !== 'pending'))
        if (q && items.length === 0) return null
        return (
          <section key={kind} className="kb-layer">
            <div>
              <div className="k">{KNOWLEDGE_KIND_LABEL[kind]}</div>
              <p className="muted small" style={{ marginTop: 6 }}>
                {KNOWLEDGE_KIND_BLURB[kind]}
              </p>
            </div>
            <div className="kb-grid">
              {canAdd && (
                <button className="kb-add" onClick={() => setComposeKind(kind)} aria-label={`Add ${KNOWLEDGE_KIND_LABEL[kind].toLowerCase()} entry`}>
                  <span>+</span>
                </button>
              )}
              {items.map((item) => (
                <button key={item.id} className="kb-door" onClick={() => setOpenId(item.id)}>
                  <div className="row between">
                    <span className="k">{KNOWLEDGE_SOURCE_LABEL[item.source]}</span>
                    <span className={`badge ${STATUS_CLASS[item.status]}`}>
                      <span className="dot" />
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <h3>{item.title}</h3>
                  {mode !== 'staff' && <p className="small muted">{roleName(s, item.roleKey)}</p>}
                </button>
              ))}
            </div>
          </section>
        )
      })}

      {visible.length === 0 && q && <div className="card empty">No knowledge matches “{query}”.</div>}
    </div>
  )
}

function DocumentView({
  s,
  item,
  dispatch,
  mode,
  personId,
  onBack,
}: {
  s: State
  item: KnowledgeItem
  dispatch: Dispatch<Action>
  mode: 'staff' | 'manager' | 'admin'
  personId?: string
  onBack: () => void
}) {
  const perm = knowledgePermission(s, item.roleKey)
  const own = item.authorId === personId && item.source === 'role-staff'
  const canEdit = mode === 'staff' && own && perm.staffCanEditOwn && (item.status === 'pending' || item.status === 'returned')
  const canModerate = mode !== 'staff'
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [body, setBody] = useState(item.body)

  return (
    <div>
      <button className="link" onClick={onBack}>
        ← Knowledge
      </button>
      <article className="card kb-doc" style={{ marginTop: 20 }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="k">{KNOWLEDGE_KIND_LABEL[item.kind]}</span>
            <span className="k">{KNOWLEDGE_SOURCE_LABEL[item.source]}</span>
            {mode !== 'staff' && <span className="k">{roleName(s, item.roleKey)}</span>}
          </div>
          <span className={`badge ${STATUS_CLASS[item.status]}`}>
            <span className="dot" />
            {STATUS_LABEL[item.status]}
          </span>
        </div>
        {editing ? (
          <div className="stack" style={{ marginTop: 16, gap: 12 }}>
            <div className="field">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label>Document</label>
              <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!title.trim() || !body.trim()}
                onClick={() => {
                  dispatch({ type: 'editKnowledge', id: item.id, title: title.trim(), body: body.trim() })
                  setEditing(false)
                }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 36, marginTop: 16 }}>{item.title}</h1>
            <p className="kb-body">{item.body}</p>
            <p className="small muted" style={{ marginTop: 24 }}>
              {authorName(s, item.authorId)}
              {item.note ? ` · ${item.note}` : ''}
            </p>
          </>
        )}
        {(canEdit || canModerate) && !editing && (
          <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
            {canEdit && (
              <button className="btn btn-ghost" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
            {canModerate && item.status === 'pending' && (
              <>
                <button className="btn btn-ghost" onClick={() => dispatch({ type: 'reviewKnowledge', id: item.id, approve: false })}>
                  Send back
                </button>
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'reviewKnowledge', id: item.id, approve: true })}>
                  Publish
                </button>
              </>
            )}
            {canModerate && item.status === 'published' && (
              <button className="btn btn-ghost" onClick={() => dispatch({ type: 'setKnowledgeStatus', id: item.id, status: 'restricted' })}>
                Restrict
              </button>
            )}
            {canModerate && item.status === 'restricted' && (
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'setKnowledgeStatus', id: item.id, status: 'published' })}>
                Restore
              </button>
            )}
          </div>
        )}
      </article>
    </div>
  )
}

function ComposeView({
  s,
  dispatch,
  kind,
  source,
  roleKey,
  authorId,
  lockRole,
  mustApprove,
  onBack,
}: {
  s: State
  dispatch: Dispatch<Action>
  kind: KnowledgeKind
  source: KnowledgeSource
  roleKey: RoleKey
  authorId: string
  lockRole: boolean
  mustApprove: boolean
  onBack: () => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [role, setRole] = useState(roleKey)

  return (
    <div>
      <button className="link" onClick={onBack}>
        ← Knowledge
      </button>
      <div className="card kb-doc" style={{ marginTop: 20 }}>
        <span className="k">{KNOWLEDGE_KIND_LABEL[kind]}</span>
        <h1 style={{ fontSize: 36, marginTop: 10 }}>New entry</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          A short document the team can reopen. Fictional practice only.
          {mustApprove ? ' Your manager publishes it before the team sees it.' : ''}
        </p>
        <div className="stack" style={{ marginTop: 20, gap: 14 }}>
          {!lockRole && (
            <div className="field">
              <label>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {s.workspace.roles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short name the team will recognise" />
          </div>
          <div className="field">
            <label>Document</label>
            <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="The reusable wording. No real client files." />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onBack}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!title.trim() || !body.trim()}
              onClick={() => {
                dispatch({
                  type: 'addKnowledge',
                  item: { roleKey: lockRole ? roleKey : role, source, kind, title: title.trim(), body: body.trim(), authorId },
                })
                onBack()
              }}
            >
              {mustApprove ? 'Send for review' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewCard({
  s,
  item,
  dispatch,
  onOpen,
}: {
  s: State
  item: KnowledgeItem
  dispatch: Dispatch<Action>
  onOpen: () => void
}) {
  const [note, setNote] = useState('')
  return (
    <div className="card stack" style={{ gap: 12 }}>
      <div className="row between">
        <button className="link" onClick={onOpen} style={{ textAlign: 'left' }}>
          <span className="small muted">
            {roleName(s, item.roleKey)} · {KNOWLEDGE_KIND_LABEL[item.kind]} · {authorName(s, item.authorId)}
          </span>
          <h3 style={{ marginTop: 4 }}>{item.title}</h3>
        </button>
        <span className="badge warn">
          <span className="dot" />
          Needs your approval
        </span>
      </div>
      <div className="row">
        <input
          style={{ flex: 1, minWidth: 180 }}
          placeholder="Comment if sending back (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn btn-ghost" onClick={() => dispatch({ type: 'reviewKnowledge', id: item.id, approve: false, note: note.trim() || undefined })}>
          Send back
        </button>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'reviewKnowledge', id: item.id, approve: true })}>
          Publish
        </button>
      </div>
    </div>
  )
}

function PermissionMatrix({ s, dispatch }: { s: State; dispatch: Dispatch<Action> }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="matrix">
        <thead>
          <tr>
            <th>Role</th>
            <th>Staff can add</th>
            <th>Staff can edit own</th>
            <th>Manager must approve</th>
          </tr>
        </thead>
        <tbody>
          {s.workspace.roles.map((role) => {
            const perm = knowledgePermission(s, role.id)
            const toggle = (key: 'staffCanAdd' | 'staffCanEditOwn' | 'managerMustApprove') =>
              dispatch({ type: 'setKnowledgePermission', permission: { ...perm, [key]: !perm[key] } })
            return (
              <tr key={role.id}>
                <td>{role.label}</td>
                <td>
                  <Toggle on={perm.staffCanAdd} onClick={() => toggle('staffCanAdd')} />
                </td>
                <td>
                  <Toggle on={perm.staffCanEditOwn} onClick={() => toggle('staffCanEditOwn')} />
                </td>
                <td>
                  <Toggle on={perm.managerMustApprove} onClick={() => toggle('managerMustApprove')} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`opt ${on ? 'on' : ''}`} onClick={onClick}>
      {on ? 'On' : 'Off'}
    </button>
  )
}
