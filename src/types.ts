export type RoleKey = string

export type MethodId = string

export type WorkspaceRole = {
  id: RoleKey
  label: string
  department: string
  methodIds: MethodId[]
}

export type WorkspaceConfig = {
  id: string
  name: string
  sector: string
  employeeCount: number
  workshop: string
  managerId: string
  managerLabel: string
  ownerName: string
  ownerLabel: string
  ownerDepartment: string
  accent: string
  roles: WorkspaceRole[]
}

export type Question = {
  id: string
  prompt: string
  options: string[]
  correct: number[]
  multi?: boolean
  critical?: boolean
  explain: string
}

export type TextCheck = {
  label: string
  mustMatch?: string
  mustNotMatch?: string
}

export type Material =
  | { kind: 'notes'; title: string; lines: string[] }
  | { kind: 'table'; title: string; head: string[]; rows: string[][] }

export type Exercise = {
  brief: string
  materials: Material[]
  questions: Question[]
  freeText?: { prompt: string; placeholder: string; checks: TextCheck[] }
}

export type Lesson = {
  id: string
  title: string
  minutes: number
  why: string
  points: string[]
  exercise: Exercise
}

export type MethodVersion = {
  version: string
  month: string
  reason: string
  lesson?: Lesson
}

export type Method = {
  id: MethodId
  title: string
  task: string
  roles: RoleKey[]
  baselineMin?: number
  minutes: number
  steps: string[]
  rules: string[]
  humanCheck: string[]
  exercise: Exercise
  versions: MethodVersion[]
}

export type Person = {
  id: string
  name: string
  title: string
  roleKey: RoleKey
  methodIds: MethodId[]
  status: 'active' | 'left'
  joined: string
  left?: string
}

export type ProgressState = 'not-started' | 'learning' | 'awaiting' | 'passed'

export type Progress = {
  state: ProgressState
  version: string
  update?: { version: string; lessonId: string; state: 'todo' | 'awaiting' }
}

export type Category = 'missing' | 'numbers' | 'facts' | 'tone' | 'not-using' | 'none'

export type Report = {
  id: string
  monthIndex: number
  methodId: MethodId
  category: Category
  detail?: string
  tasks: number
  minutes: number
  reworks: number
  handled?: string
}

export type LearningReport = {
  id: string
  personId: string
  monthIndex: number
  methodId?: MethodId
  body: string
}

export type Draft = {
  id: string
  methodId: MethodId
  reason: string
  reportId?: string
  lesson: Lesson
  author: 'claude' | 'template'
  prompt: string
  status: 'editing' | 'awaiting-client' | 'published' | 'returned'
  clientComment?: string
}

export type KnowledgeSource = 'company-custom' | 'company-upload' | 'role-staff'
export type KnowledgeStatus = 'published' | 'pending' | 'returned' | 'restricted'
export type KnowledgeKind = 'prompt' | 'tools' | 'experience'

export type KnowledgeItem = {
  id: string
  roleKey: RoleKey
  source: KnowledgeSource
  kind: KnowledgeKind
  title: string
  body: string
  authorId: string
  status: KnowledgeStatus
  note?: string
}

export type KnowledgePermission = {
  roleKey: RoleKey
  staffCanAdd: boolean
  staffCanEditOwn: boolean
  managerMustApprove: boolean
}

export type LogEvent = {
  month: string
  kind: 'training' | 'method' | 'report' | 'people' | 'knowledge'
  text: string
}

export type State = {
  workspace: WorkspaceConfig
  monthIndex: number
  people: Person[]
  methods: Method[]
  progress: Record<string, Progress>
  reports: Report[]
  learningReports: LearningReport[]
  drafts: Draft[]
  knowledge: KnowledgeItem[]
  knowledgePermissions: KnowledgePermission[]
  log: LogEvent[]
}

export type Actor = { kind: 'person'; personId: string } | { kind: 'owner' } | { kind: 'admin' }
