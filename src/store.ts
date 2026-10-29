import { ensureKnowledge, MONTHS, seedState } from './data'
import type { Draft, KnowledgeItem, KnowledgePermission, KnowledgeStatus, LearningReport, Lesson, Method, MethodId, Person, Progress, Report, State, WorkspaceConfig } from './types'

export type Action =
  | { type: 'start'; personId: string; methodId: MethodId }
  | { type: 'submit'; personId: string; methodId: MethodId; update: boolean }
  | { type: 'confirm'; personId: string; methodId: MethodId; approve: boolean }
  | { type: 'report'; report: Omit<Report, 'id' | 'monthIndex'> }
  | { type: 'saveLearningReport'; report: Omit<LearningReport, 'id' | 'monthIndex'> }
  | { type: 'saveDraft'; draft: Draft }
  | { type: 'decideDraft'; draftId: string; approve: boolean; comment?: string }
  | { type: 'addPerson'; person: Omit<Person, 'status' | 'joined'> }
  | { type: 'setPath'; personId: string; methodIds: MethodId[] }
  | { type: 'personLeft'; personId: string }
  | { type: 'updateWorkspace'; workspace: WorkspaceConfig }
  | { type: 'updateMethod'; method: Method }
  | { type: 'addKnowledge'; item: Omit<KnowledgeItem, 'id' | 'status' | 'note'> }
  | { type: 'editKnowledge'; id: string; title: string; body: string }
  | { type: 'reviewKnowledge'; id: string; approve: boolean; note?: string }
  | { type: 'setKnowledgeStatus'; id: string; status: KnowledgeStatus }
  | { type: 'setKnowledgePermission'; permission: KnowledgePermission }
  | { type: 'nextMonth' }
  | { type: 'reset' }

export const key = (personId: string, methodId: MethodId) => `${personId}:${methodId}`

export const currentVersion = (m: Method) => m.versions[m.versions.length - 1]

export const lessonsOf = (m: Method): Lesson[] => m.versions.flatMap((v) => (v.lesson ? [v.lesson] : []))

export const pathOf = (p: Person) => p.methodIds

export const monthLabel = (s: State) => MONTHS[Math.min(s.monthIndex, MONTHS.length - 1)]

export function progressOf(s: State, personId: string, methodId: MethodId): Progress {
  const m = s.methods.find((x) => x.id === methodId)!
  return s.progress[key(personId, methodId)] ?? { state: 'not-started', version: currentVersion(m).version }
}

export function nextVersion(v: string) {
  const [major, minor] = v.split('.').map(Number)
  return `${major}.${minor + 1}`
}

function personName(s: State, id: string) {
  if (id === 'admin') return 'AI Eesti'
  return s.people.find((p) => p.id === id)?.name.split(' ')[0] ?? id
}

function roleLabel(s: State, roleKey: string) {
  return s.workspace.roles.find((role) => role.id === roleKey)?.label ?? roleKey
}

export function knowledgePermission(s: State, roleKey: string): KnowledgePermission {
  return (
    s.knowledgePermissions.find((item) => item.roleKey === roleKey) ?? {
      roleKey,
      staffCanAdd: true,
      staffCanEditOwn: true,
      managerMustApprove: true,
    }
  )
}

function methodTitle(s: State, id: MethodId) {
  return s.methods.find((m) => m.id === id)!.title
}

export function reducer(s: State, a: Action): State {
  const month = monthLabel(s)
  const log = (kind: State['log'][number]['kind'], text: string) => [...s.log, { month, kind, text }]

  switch (a.type) {
    case 'start': {
      const p = progressOf(s, a.personId, a.methodId)
      if (p.state !== 'not-started') return s
      return { ...s, progress: { ...s.progress, [key(a.personId, a.methodId)]: { ...p, state: 'learning' } } }
    }
    case 'submit': {
      const p = progressOf(s, a.personId, a.methodId)
      const next: Progress = a.update && p.update ? { ...p, update: { ...p.update, state: 'awaiting' } } : { ...p, state: 'awaiting' }
      return { ...s, progress: { ...s.progress, [key(a.personId, a.methodId)]: next } }
    }
    case 'confirm': {
      const p = progressOf(s, a.personId, a.methodId)
      const who = personName(s, a.personId)
      const title = methodTitle(s, a.methodId)
      let next: Progress
      let text: string
      if (p.update?.state === 'awaiting') {
        next = a.approve ? { state: 'passed', version: p.update.version } : { ...p, update: { ...p.update, state: 'todo' } }
        text = a.approve ? `${who} completed the v${p.update.version} update of “${title}”.` : `${who}’s update of “${title}” was sent back.`
      } else {
        next = a.approve ? { ...p, state: 'passed' } : { ...p, state: 'learning' }
        text = a.approve ? `${who} passed “${title}” v${p.version}.` : `${who}’s exercise for “${title}” was sent back.`
      }
      return { ...s, progress: { ...s.progress, [key(a.personId, a.methodId)]: next }, log: log('training', text) }
    }
    case 'report': {
      const report: Report = { ...a.report, id: `r${s.reports.length + 1}`, monthIndex: s.monthIndex }
      const others = s.reports.filter((r) => !(r.monthIndex === s.monthIndex && r.methodId === a.report.methodId))
      return {
        ...s,
        reports: [...others, report],
        log: log('report', `${personName(s, s.workspace.managerId)} reported “${methodTitle(s, a.report.methodId)}”: ${a.report.tasks} tasks, ~${a.report.minutes} min each, ${a.report.reworks} sent back.`),
      }
    }
    case 'saveDraft': {
      const exists = s.drafts.some((d) => d.id === a.draft.id)
      return { ...s, drafts: exists ? s.drafts.map((d) => (d.id === a.draft.id ? a.draft : d)) : [...s.drafts, a.draft] }
    }
    case 'decideDraft': {
      const d = s.drafts.find((x) => x.id === a.draftId)!
      if (!a.approve) {
        return { ...s, drafts: s.drafts.map((x) => (x.id === d.id ? { ...x, status: 'returned', clientComment: a.comment } : x)) }
      }
      const m = s.methods.find((x) => x.id === d.methodId)!
      const version = nextVersion(currentVersion(m).version)
      const methods = s.methods.map((x) =>
        x.id === m.id ? { ...x, versions: [...x.versions, { version, month, reason: d.reason, lesson: d.lesson }] } : x,
      )
      const progress = { ...s.progress }
      const refreshed: string[] = []
      for (const person of s.people) {
        if (person.status !== 'active' || !pathOf(person).includes(m.id)) continue
        const k = key(person.id, m.id)
        const p = progress[k]
        if (p?.state === 'passed') {
          progress[k] = { ...p, update: { version, lessonId: d.lesson.id, state: 'todo' } }
          refreshed.push(person.name.split(' ')[0])
        } else if (p) {
          progress[k] = { ...p, version }
        }
      }
      return {
        ...s,
        methods,
        progress,
        drafts: s.drafts.map((x) => (x.id === d.id ? { ...x, status: 'published' } : x)),
        reports: s.reports.map((r) => (r.id === d.reportId ? { ...r, handled: version } : r)),
        log: [
          ...s.log,
          {
            month,
            kind: 'method',
            text: `“${m.title}” v${version} published: ${d.lesson.title}. ${refreshed.length ? `Update sent to ${refreshed.join(', ')}.` : 'No one needs to retake it.'}`,
          },
        ],
      }
    }
    case 'saveLearningReport': {
      const learningReports = s.learningReports ?? []
      const same = (item: LearningReport) =>
        item.personId === a.report.personId && item.monthIndex === s.monthIndex && (item.methodId ?? '') === (a.report.methodId ?? '')
      const existing = learningReports.find(same)
      const report: LearningReport = existing
        ? { ...existing, body: a.report.body, methodId: a.report.methodId }
        : {
            ...a.report,
            id: `lr-${a.report.personId}-${a.report.methodId ?? 'month'}-${s.monthIndex}`,
            monthIndex: s.monthIndex,
          }
      const title = a.report.methodId ? methodTitle(s, a.report.methodId) : month
      return {
        ...s,
        learningReports: existing
          ? learningReports.map((item) => (item.id === existing.id ? report : item))
          : [...learningReports, report],
        log: log('report', `${personName(s, a.report.personId)} left feedback on ${title}.`),
      }
    }
    case 'addPerson': {
      const person: Person = { ...a.person, status: 'active', joined: month }
      return { ...s, people: [...s.people, person], log: log('people', `${person.name} joined as ${person.title.toLowerCase()}. Path assigned with current versions.`) }
    }
    case 'setPath': {
      const person = s.people.find((p) => p.id === a.personId)
      if (!person) return s
      const progress = { ...s.progress }
      for (const id of a.methodIds) {
        const method = s.methods.find((m) => m.id === id)
        if (!method) continue
        const k = key(person.id, id)
        if (!progress[k]) progress[k] = { state: 'not-started', version: currentVersion(method).version }
      }
      return {
        ...s,
        people: s.people.map((p) => (p.id === a.personId ? { ...p, methodIds: a.methodIds } : p)),
        progress,
        log: log('training', `${personName(s, a.personId)}’s learning path was updated.`),
      }
    }
    case 'personLeft':
      return {
        ...s,
        people: s.people.map((p) => (p.id === a.personId ? { ...p, status: 'left', left: month } : p)),
        log: log('people', `${personName(s, a.personId)} left the company. Training record kept, account closed.`),
      }
    case 'updateWorkspace': {
      const people = s.people.map((person) => {
        const role = a.workspace.roles.find((item) => item.id === person.roleKey)
        return role ? { ...person, title: role.label, methodIds: role.methodIds } : person
      })
      const knowledgePermissions = a.workspace.roles.map((role) => knowledgePermission({ ...s, workspace: a.workspace }, role.id))
      return { ...s, workspace: a.workspace, people, knowledgePermissions }
    }
    case 'updateMethod':
      return { ...s, methods: s.methods.map((method) => method.id === a.method.id ? a.method : method) }
    case 'addKnowledge': {
      const perm = knowledgePermission(s, a.item.roleKey)
      const pending = a.item.source === 'role-staff' && perm.managerMustApprove
      const item: KnowledgeItem = { ...a.item, id: `k-${s.workspace.id}-${Date.now()}`, status: pending ? 'pending' : 'published' }
      return {
        ...s,
        knowledge: [...s.knowledge, item],
        log: log('knowledge', `${personName(s, item.authorId)} added “${item.title}” to ${roleLabel(s, item.roleKey)}${pending ? ' · waiting for review' : ''}.`),
      }
    }
    case 'editKnowledge': {
      const item = s.knowledge.find((x) => x.id === a.id)
      if (!item) return s
      const perm = knowledgePermission(s, item.roleKey)
      const status = item.source === 'role-staff' && perm.managerMustApprove && item.status !== 'restricted' ? 'pending' : item.status
      return {
        ...s,
        knowledge: s.knowledge.map((x) => (x.id === a.id ? { ...x, title: a.title, body: a.body, status, note: status === 'pending' ? undefined : x.note } : x)),
      }
    }
    case 'reviewKnowledge': {
      const item = s.knowledge.find((x) => x.id === a.id)
      if (!item) return s
      const status = a.approve ? 'published' : 'returned'
      return {
        ...s,
        knowledge: s.knowledge.map((x) => (x.id === a.id ? { ...x, status, note: a.note || undefined } : x)),
        log: log('knowledge', a.approve ? `Published “${item.title}” for ${roleLabel(s, item.roleKey)}.` : `Returned “${item.title}”.`),
      }
    }
    case 'setKnowledgeStatus': {
      const item = s.knowledge.find((x) => x.id === a.id)
      if (!item) return s
      return {
        ...s,
        knowledge: s.knowledge.map((x) => (x.id === a.id ? { ...x, status: a.status } : x)),
        log: log('knowledge', a.status === 'restricted' ? `Restricted “${item.title}”.` : `Restored “${item.title}”.`),
      }
    }
    case 'setKnowledgePermission': {
      const exists = s.knowledgePermissions.some((item) => item.roleKey === a.permission.roleKey)
      const knowledgePermissions = exists
        ? s.knowledgePermissions.map((item) => (item.roleKey === a.permission.roleKey ? a.permission : item))
        : [...s.knowledgePermissions, a.permission]
      return { ...s, knowledgePermissions }
    }
    case 'nextMonth':
      return { ...s, monthIndex: Math.min(s.monthIndex + 1, MONTHS.length - 1) }
    case 'reset':
      return seedState(s.workspace.id)
  }
}

const STORAGE = 'aieesti-academy-mvp-v1'

export function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE)
    if (raw) return ensureKnowledge(JSON.parse(raw) as State)
  } catch {
    /* fall through to seed */
  }
  return seedState()
}

export function saveState(s: State) {
  localStorage.setItem(STORAGE, JSON.stringify(s))
}
