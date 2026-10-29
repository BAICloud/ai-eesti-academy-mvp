import type { Category, KnowledgeItem, KnowledgeKind, KnowledgePermission, KnowledgeSource, Lesson, Method, MethodId, Person, State, WorkspaceConfig } from './types'

export const WORKSPACES: WorkspaceConfig[] = [
  {
    id: 'kaldaranna',
    name: 'Kaldaranna Ehitus',
    sector: 'Construction',
    employeeCount: 18,
    workshop: 'Claude and Cowork workshop · October 2026',
    managerId: 'kadri',
    managerLabel: 'Project director',
    ownerName: 'Mart Saar',
    ownerLabel: 'Owner',
    ownerDepartment: 'Kaldaranna Ehitus',
    accent: '#00579c',
    roles: [
      { id: 'quoter', label: 'Estimator', department: 'Kaldaranna Ehitus', methodIds: ['A', 'B'] },
      { id: 'office', label: 'Office administrator', department: 'Kaldaranna Ehitus', methodIds: ['A', 'C'] },
      { id: 'site', label: 'Site supervisor', department: 'Kaldaranna Ehitus', methodIds: ['A', 'D'] },
      { id: 'pm', label: 'Project director', department: 'Kaldaranna Ehitus', methodIds: ['A', 'C'] },
    ],
  },
  {
    id: 'pohjarannik',
    name: 'Põhjarannik Grupp',
    sector: 'Media & publishing',
    employeeCount: 20,
    workshop: 'Claude Chat and Cowork workshop · September 2026',
    managerId: 'maarika',
    managerLabel: 'Managing editor',
    ownerName: 'Erik Saar',
    ownerLabel: 'Publisher',
    ownerDepartment: 'Põhjarannik Grupp',
    accent: '#7c3aed',
    roles: [
      { id: 'journalist', label: 'Journalist', department: 'Põhjarannik Grupp', methodIds: ['A', 'B'] },
      { id: 'editor', label: 'Editor', department: 'Põhjarannik Grupp', methodIds: ['A', 'C'] },
      { id: 'sales', label: 'Advertising sales', department: 'Põhjarannik Grupp', methodIds: ['A', 'D'] },
    ],
  },
]

export const MONTHS = [
  'November 2026',
  'December 2026',
  'January 2027',
  'February 2027',
  'March 2027',
  'April 2027',
  'May 2027',
  'June 2027',
  'July 2027',
  'August 2027',
  'September 2027',
  'October 2027',
]

export const WORKSHOP_MONTH = 'October 2026'

export const CATEGORY_LABEL: Record<Category, string> = {
  missing: 'Missing items',
  numbers: 'Numbers',
  facts: 'Facts',
  tone: 'Tone',
  'not-using': 'Not using the method',
  none: 'No recurring problem',
}

export const CATEGORY_DETAIL: Partial<Record<Category, string[]>> = {
  missing: ['Site extras (waste, temporary power, protection)', 'Finishing items (skirting, trims)', 'A whole work stage'],
  numbers: ['Unit prices', 'Quantities', 'Totals and VAT'],
  facts: ['Dates', 'Promises not agreed', 'Names and owners'],
  tone: ['Too long', 'Too informal', 'Too vague'],
  'not-using': ['Skips the structure', 'Falls back to the old way', 'Cannot find the steps'],
}

export const KNOWLEDGE_SOURCE_LABEL: Record<KnowledgeSource, string> = {
  'company-custom': 'AI Eesti custom',
  'company-upload': 'Company library',
  'role-staff': 'Role additions',
}

export const KNOWLEDGE_KINDS: KnowledgeKind[] = ['prompt', 'tools', 'experience']

export const KNOWLEDGE_KIND_LABEL: Record<KnowledgeKind, string> = {
  prompt: 'Prompts',
  tools: 'Tools',
  experience: 'Experience',
}

export const KNOWLEDGE_KIND_BLURB: Record<KnowledgeKind, string> = {
  prompt: 'Reusable wording for this role’s recurring tasks.',
  tools: 'Which tools to use, and what stays out of them.',
  experience: 'What this role has learned. Fictional examples only.',
}

export function remapKnowledgeKind(kind: string): KnowledgeKind {
  if (kind === 'prompt' || kind === 'template') return 'prompt'
  if (kind === 'tools' || kind === 'checklist' || kind === 'rule') return 'tools'
  return 'experience'
}

function defaultKnowledgePermissions(workspace: WorkspaceConfig): KnowledgePermission[] {
  return workspace.roles.map((role) => ({
    roleKey: role.id,
    staffCanAdd: true,
    staffCanEditOwn: true,
    managerMustApprove: true,
  }))
}

function k(
  workspaceId: string,
  n: number,
  item: Omit<KnowledgeItem, 'id'>,
): KnowledgeItem {
  return { id: `k-${workspaceId}-${n}`, ...item }
}

function seedConstructionKnowledge(): { knowledge: KnowledgeItem[]; knowledgePermissions: KnowledgePermission[] } {
  const ws = WORKSPACES[0]
  return {
    knowledgePermissions: defaultKnowledgePermissions(ws),
    knowledge: [
      k(ws.id, 1, { roleKey: 'quoter', source: 'company-custom', kind: 'prompt', title: 'Quote draft skeleton', body: 'Use this structure every time. Pull numbers from the current sheet, never from the last Claude answer.\n\nHeader — site and date from the request notes.\nItems — unit and quantity.\nExtras as a separate list.\nOpen questions.\nWho checks before send.', authorId: 'admin', status: 'published' }),
      k(ws.id, 2, { roleKey: 'quoter', source: 'company-upload', kind: 'tools', title: 'What never goes into Claude', body: 'Claude is for drafting. Company tools keep the live numbers.\n\nKeep out: client name + price floor, unsigned contracts, bank details.\nTraining uses fictional quotes only.', authorId: 'kadri', status: 'published' }),
      k(ws.id, 3, { roleKey: 'quoter', source: 'role-staff', kind: 'experience', title: 'Laminate line I keep forgetting', body: 'Practice item: laminate at €19 / m².\n\nAlways pull the number from the current sheet, never from the last Claude answer. If the sheet changed this morning, the old chat is wrong.', authorId: 'andres', status: 'pending' }),
      k(ws.id, 4, { roleKey: 'office', source: 'company-custom', kind: 'prompt', title: 'Client email structure', body: 'What changed.\nWho does what.\nBy when.\nThe open question.\n\nNo discounts unless already agreed.', authorId: 'admin', status: 'published' }),
      k(ws.id, 5, { roleKey: 'office', source: 'company-upload', kind: 'tools', title: 'Inbox routing', body: 'Quotes → estimator.\nDates and access → site.\nComplaints → project director.\n\nDo not invent an owner. If it is unclear, ask Kadri.', authorId: 'kadri', status: 'published' }),
      k(ws.id, 6, { roleKey: 'office', source: 'role-staff', kind: 'experience', title: 'Shorter greeting I use', body: '“Thank you for yesterday. Here is what is confirmed, and one thing still open.”\n\nThen the four-line structure. Do not add a discount line unless Kadri already agreed it.', authorId: 'liis', status: 'published' }),
      k(ws.id, 7, { roleKey: 'site', source: 'company-custom', kind: 'prompt', title: 'Daily report headings', body: 'Weather.\nCrew.\nDone today.\nBlockers.\nTomorrow.\n\nNo health details. No neighbour names.', authorId: 'admin', status: 'published' }),
      k(ws.id, 8, { roleKey: 'site', source: 'company-upload', kind: 'tools', title: '16:00 reminder', body: 'Write five short notes during the day. Sort them under the headings in the report prompt.\n\nDelete anything that identifies a household before it goes near Claude.', authorId: 'kadri', status: 'published' }),
      k(ws.id, 9, { roleKey: 'pm', source: 'company-custom', kind: 'experience', title: 'What the manager confirms', body: 'Training standard only: same method, same pass line, manager click.\n\nNo real files. Monthly report is numbers and categories.', authorId: 'admin', status: 'published' }),
    ],
  }
}

function seedMediaKnowledge(): { knowledge: KnowledgeItem[]; knowledgePermissions: KnowledgePermission[] } {
  const ws = WORKSPACES[1]
  return {
    knowledgePermissions: defaultKnowledgePermissions(ws),
    knowledge: [
      k(ws.id, 1, { roleKey: 'journalist', source: 'company-custom', kind: 'prompt', title: 'Research brief skeleton', body: 'Claim.\nSource.\nContext.\nOpen question.\n\nMark every unsupported statement “needs source”.', authorId: 'admin', status: 'published' }),
      k(ws.id, 2, { roleKey: 'journalist', source: 'company-upload', kind: 'tools', title: 'Source identities stay out', body: 'Anonymous sources, embargoed material and unpublished drafts stay in newsroom tools.\n\nExercises use fictional notes. Claude never sees a real source identity.', authorId: 'maarika', status: 'published' }),
      k(ws.id, 3, { roleKey: 'journalist', source: 'role-staff', kind: 'experience', title: 'One-person quote is not “everyone”', body: 'If one resident says everyone supports it, the brief must say “one resident”, not “public support”.\n\nClaude will often upgrade a single quote. Put it back.', authorId: 'toomas', status: 'pending' }),
      k(ws.id, 4, { roleKey: 'editor', source: 'company-custom', kind: 'tools', title: 'Fact-check before publish', body: 'Names.\nDates.\nNumbers.\nAttribution.\n\nThe editor, not AI, makes the final publish decision.', authorId: 'admin', status: 'published' }),
      k(ws.id, 5, { roleKey: 'editor', source: 'company-upload', kind: 'prompt', title: 'Mismatch note', body: 'Draft says X. Source note says Y.\n\nChange to Y, or mark as unconfirmed. Do not split the difference.', authorId: 'maarika', status: 'published' }),
      k(ws.id, 6, { roleKey: 'sales', source: 'company-custom', kind: 'prompt', title: 'Advertiser proposal skeleton', body: 'Goal.\nProducts from the current rate card.\nConfirmed facts.\nOptional suggestions.', authorId: 'admin', status: 'published' }),
      k(ws.id, 7, { roleKey: 'sales', source: 'company-upload', kind: 'experience', title: 'Unapproved work is optional', body: 'If the brief did not approve video, it can appear only as an optional extra, never as confirmed.', authorId: 'maarika', status: 'published' }),
    ],
  }
}

export const METHOD_LOOK: Record<MethodId, { bg: string; fg: string; shape: 'diamond' | 'flower' | 'arch' | 'hexagon' }> = {
  A: { bg: '#e8b9c9', fg: '#a8323e', shape: 'diamond' },
  B: { bg: '#c6def3', fg: '#5b9bd5', shape: 'flower' },
  C: { bg: '#c6def3', fg: '#5b9bd5', shape: 'arch' },
  D: { bg: '#d3e78f', fg: '#2f7d5b', shape: 'hexagon' },
}

const methods: Method[] = [
  {
    id: 'A',
    title: 'What can go into AI',
    task: 'Decide what may be shared with Claude before any task',
    roles: ['quoter', 'office', 'site', 'pm'],
    minutes: 30,
    steps: [
      'Before pasting anything into Claude, name what it is: a method, practice data, your own outline, or real client material.',
      'Methods, practice data and your own outlines may go in.',
      'Real client names with prices, unsigned contracts, residents’ personal details and bank details stay out.',
      'If you are unsure, leave it out and ask Kadri.',
    ],
    rules: [
      'Never: a client name together with our lowest acceptable price.',
      'Never: unsigned contracts or partner agreements.',
      'Never: residents’ phone numbers, health details or anything that identifies a household.',
      'Never: bank account details.',
    ],
    humanCheck: ['Kadri confirms that you passed. Nobody else can change your status.'],
    exercise: {
      brief: 'Eight situations from a normal week. Mark each one. All four “Keep out” situations must be right.',
      materials: [],
      questions: [
        { id: 'a1', prompt: 'The public steps for how we prepare a renovation quote', options: ['Can go in', 'Keep out'], correct: [0], explain: 'A method has no client data in it.' },
        { id: 'a2', prompt: 'Fictional unit prices from this training exercise', options: ['Can go in', 'Keep out'], correct: [0], explain: 'Practice data is made up.' },
        { id: 'a3', prompt: 'A client’s name together with the lowest price we would accept', options: ['Can go in', 'Keep out'], correct: [1], critical: true, explain: 'Client name plus price floor is the most sensitive thing in a quote.' },
        { id: 'a4', prompt: 'An unsigned subcontract with a partner', options: ['Can go in', 'Keep out'], correct: [1], critical: true, explain: 'Unsigned contracts stay inside the company.' },
        { id: 'a5', prompt: 'Your own outline for a weekly site report', options: ['Can go in', 'Keep out'], correct: [0], explain: 'Your own structure contains no client material.' },
        { id: 'a6', prompt: 'A resident’s phone number from a complaint', options: ['Can go in', 'Keep out'], correct: [1], critical: true, explain: 'Personal details of residents stay out.' },
        { id: 'a7', prompt: 'The company’s bank account details for an invoice', options: ['Can go in', 'Keep out'], correct: [1], critical: true, explain: 'Bank details stay out.' },
        { id: 'a8', prompt: 'Our standard quote sections: labour, materials, machinery, exclusions', options: ['Can go in', 'Keep out'], correct: [0], explain: 'A list of headings is a method.' },
      ],
    },
    versions: [{ version: '1.0', month: WORKSHOP_MONTH, reason: 'Collected from the workshop' }],
  },
  {
    id: 'B',
    title: 'Quote first draft',
    task: 'Turn request notes into a quote draft Kadri can review',
    roles: ['quoter'],
    baselineMin: 180,
    minutes: 45,
    steps: [
      'Read the request notes on your own computer. The notes are not uploaded anywhere.',
      'Ask Claude for a draft with four sections: labour, materials, machinery, exclusions.',
      'Check every number against your own price sheet. Claude does not invent prices.',
      'Mark any line you cannot confirm as “to check”, then send the draft to Kadri from company email.',
    ],
    rules: ['Client names, price floors and competitors’ quotes do not go into Claude.'],
    humanCheck: ['Every price comes from your own sheet.', 'Kadri reviews every quote before it leaves the company.'],
    exercise: {
      brief: 'A fictional client wants an 80 m² office renovated. Claude produced the draft below. Find what is wrong before it goes to Kadri.',
      materials: [
        {
          kind: 'notes',
          title: 'Request notes (fictional)',
          lines: [
            'Office, 80 m², 2nd floor, lift available.',
            'Remove old carpet, lay laminate.',
            'Paint walls, two coats.',
            'New skirting boards everywhere.',
            '6 extra sockets.',
            'Building has no power on that floor during works → temporary power needed.',
            'Old carpet and packaging must be taken away (skip).',
          ],
        },
        {
          kind: 'table',
          title: 'Claude’s draft',
          head: ['Section', 'Line', 'Price'],
          rows: [
            ['Labour', 'Remove carpet', '€480'],
            ['Labour', 'Lay laminate, 80 m²', '€1,120'],
            ['Labour', 'Paint walls, 2 coats', '€1,350'],
            ['Labour', 'Install 6 sockets', '€390'],
            ['Materials', 'Laminate, 80 m² × €24', '€1,920'],
            ['Materials', 'Paint and primer', '€310'],
            ['Machinery', 'Crane hire, 1 day', '€650'],
            ['Exclusions', 'Moving furniture', '—'],
          ],
        },
        {
          kind: 'table',
          title: 'Your price sheet (fictional)',
          head: ['Item', 'Unit price'],
          rows: [
            ['Laminate', '€19 / m²'],
            ['Skirting board', '€6 / m'],
            ['Temporary power, per week', '€140'],
            ['Skip, 8 m³', '€260'],
          ],
        },
      ],
      questions: [
        {
          id: 'b1',
          prompt: 'Which items from the request notes are missing from the draft?',
          options: ['Waste removal (skip)', 'Skirting boards', 'Temporary power', 'Laminate', 'Wall painting', 'Moving furniture'],
          correct: [0, 1, 2],
          multi: true,
          critical: true,
          explain: 'Waste removal, skirting boards and temporary power are in the notes but not in the draft.',
        },
        {
          id: 'b2',
          prompt: 'The draft prices laminate at €24 / m². What do you do?',
          options: ['Keep Claude’s price', 'Use €19 from my price sheet', 'Ask Claude for a better estimate'],
          correct: [1],
          critical: true,
          explain: 'Prices come only from your own sheet.',
        },
        {
          id: 'b3',
          prompt: 'The notes say a lift is available, yet the draft has crane hire. You cannot confirm it. What do you do?',
          options: ['Delete it without telling anyone', 'Mark it “to check” before sending to Kadri', 'Send it as it is'],
          correct: [1],
          explain: 'Lines you cannot confirm are marked, not hidden.',
        },
      ],
    },
    versions: [{ version: '1.0', month: WORKSHOP_MONTH, reason: 'Collected from the workshop' }],
  },
  {
    id: 'C',
    title: 'Client email from meeting notes',
    task: 'Write a short follow-up with decisions, owners and dates',
    roles: ['office', 'pm'],
    baselineMin: 40,
    minutes: 25,
    steps: [
      'Put your own meeting notes into four headings: decisions, who does what, by when, still open.',
      'Ask Claude to write a short email from those headings only.',
      'Remove anything that is not in your notes. Claude must not add promises.',
      'You send the email yourself.',
    ],
    rules: ['Residents’ phone numbers and complaint details that identify a household do not go into Claude.'],
    humanCheck: ['Every date and promise in the email is in your notes.'],
    exercise: {
      brief: 'Write the follow-up email to the client from these fictional meeting notes.',
      materials: [
        {
          kind: 'notes',
          title: 'Meeting notes (fictional)',
          lines: [
            'Laminate delivery delayed from 12 Nov to 19 Nov.',
            'Decided: painters start first, in the week of 16 Nov.',
            'Kadri calls the supplier by Friday 14 Nov to confirm the new date.',
            'Still open: who pays for one extra week of temporary power.',
            'Client asked about a discount. Nothing was agreed.',
          ],
        },
      ],
      questions: [],
      freeText: {
        prompt: 'Your email',
        placeholder: 'Hello,\n\nThank you for meeting with us today…',
        checks: [
          { label: 'Gives the new delivery date (19 Nov)', mustMatch: '19' },
          { label: 'Says who does what (Kadri calls the supplier)', mustMatch: 'kadri' },
          { label: 'Gives the deadline (14 Nov)', mustMatch: '14' },
          { label: 'Names the open question (temporary power)', mustMatch: 'power|open|not yet|still to' },
          { label: 'Does not mention a discount', mustNotMatch: 'discount|reduction|\\d+\\s?%' },
        ],
      },
    },
    versions: [{ version: '1.0', month: WORKSHOP_MONTH, reason: 'Collected from the workshop' }],
  },
  {
    id: 'D',
    title: 'Site daily report',
    task: 'Turn five quick notes into a report Kadri can read in a minute',
    roles: ['site'],
    baselineMin: 25,
    minutes: 20,
    steps: [
      'During the day, write short notes in your phone.',
      'Ask Claude to sort them under: weather, crew, done today, blockers, tomorrow.',
      'Before sending, delete anything about a worker’s health or a neighbour dispute.',
      'Set a scheduled task in Cowork so the report reminder arrives at 16:00.',
    ],
    rules: ['Names together with health details, named accidents and neighbour disputes do not go into AI.'],
    humanCheck: ['Read the report once before it goes to Kadri.'],
    exercise: {
      brief: 'These are today’s notes from a fictional site.',
      materials: [
        {
          kind: 'notes',
          title: 'Phone notes (fictional)',
          lines: [
            'rain until 10',
            '6 on site, 1 from the electrician',
            'Tiit felt sick, went home at 11',
            'screed done rooms 2–3',
            'windows did not arrive, call supplier',
            'tomorrow tiles room 1 if screed is dry',
          ],
        },
      ],
      questions: [
        {
          id: 'd1',
          prompt: 'Which headings does the report have?',
          options: ['Weather', 'Crew', 'Done today', 'Blockers', 'Tomorrow', 'Worker health'],
          correct: [0, 1, 2, 3, 4],
          multi: true,
          explain: 'Five headings. Health is not one of them.',
        },
        {
          id: 'd2',
          prompt: 'What happens to “Tiit felt sick, went home at 11”?',
          options: ['Keep it as written', 'Rewrite it politely without the name', 'Delete it. The crew count already says how many were on site'],
          correct: [2],
          critical: true,
          explain: 'Health details are deleted, not softened.',
        },
        {
          id: 'd3',
          prompt: 'Where does “windows did not arrive” go?',
          options: ['Done today', 'Blockers', 'Tomorrow'],
          correct: [1],
          explain: 'Anything that stops work is a blocker.',
        },
      ],
    },
    versions: [{ version: '1.0', month: WORKSHOP_MONTH, reason: 'Collected from the workshop' }],
  },
]

function seedConstructionState(): State {
  const progress: State['progress'] = {}
  const passed = (p: string, m: MethodId) => (progress[`${p}:${m}`] = { state: 'passed', version: '1.0' })
  passed('kadri', 'A')
  passed('kadri', 'C')
  passed('liis', 'A')
  passed('liis', 'C')
  passed('jaan', 'A')
  passed('jaan', 'D')
  passed('andres', 'A')
  progress['andres:B'] = { state: 'learning', version: '1.0' }

  return {
    workspace: structuredClone(WORKSPACES[0]),
    monthIndex: 0,
    people: [
      { id: 'kadri', name: 'Kadri Tamm', title: 'Project director', roleKey: 'pm', methodIds: ['A', 'C'], status: 'active', joined: 'before workshop' },
      { id: 'andres', name: 'Andres Kask', title: 'Estimator', roleKey: 'quoter', methodIds: ['A', 'B'], status: 'active', joined: 'before workshop' },
      { id: 'liis', name: 'Liis Mets', title: 'Office administrator', roleKey: 'office', methodIds: ['A', 'C'], status: 'active', joined: 'before workshop' },
      { id: 'jaan', name: 'Jaan Saar', title: 'Site supervisor', roleKey: 'site', methodIds: ['A', 'D'], status: 'active', joined: 'before workshop' },
    ],
    methods: structuredClone(methods),
    progress,
    reports: [],
    learningReports: [
      { id: 'lr-liis-A-0', personId: 'liis', monthIndex: 0, methodId: 'A', body: 'The keep-out list is the part I use every day. I still pause on greetings.' },
      { id: 'lr-liis-C-0', personId: 'liis', monthIndex: 0, methodId: 'C', body: 'Four-line emails are faster. I add one human line at the end.' },
      { id: 'lr-liis-month-0', personId: 'liis', monthIndex: 0, body: 'Both methods are in use. Nothing stuck this month.' },
      { id: 'lr-jaan-A-0', personId: 'jaan', monthIndex: 0, methodId: 'A', body: 'I delete household names before anything goes near Claude.' },
      { id: 'lr-jaan-D-0', personId: 'jaan', monthIndex: 0, methodId: 'D', body: 'The 16:00 reminder is what I actually follow.' },
      { id: 'lr-jaan-month-0', personId: 'jaan', monthIndex: 0, body: 'Site reports are shorter. No change needed this month.' },
      { id: 'lr-andres-A-0', personId: 'andres', monthIndex: 0, methodId: 'A', body: 'Clear. Quote method is the one still open.' },
    ],
    drafts: [],
    ...seedConstructionKnowledge(),
    log: [
      { month: WORKSHOP_MONTH, kind: 'method', text: 'Four methods collected from the workshop and published as v1.0.' },
      { month: WORKSHOP_MONTH, kind: 'report', text: 'Baselines agreed with Kadri: quote 3 h, client email 40 min, site report 25 min.' },
      { month: WORKSHOP_MONTH, kind: 'training', text: 'Kadri, Liis and Jaan passed their paths. Andres has the quote method left.' },
    ],
  }
}

function mediaMethods(): Method[] {
  const shared = structuredClone(methods[0])
  shared.roles = ['journalist', 'editor', 'sales']
  shared.steps[3] = 'If you are unsure, leave it out and ask the managing editor.'
  shared.humanCheck = ['The managing editor confirms that you passed.']
  shared.exercise = {
    brief: 'Decide what can be used in a fictional newsroom exercise.',
    materials: [],
    questions: [
      { id: 'ma1', prompt: 'A public press release', options: ['Can go in', 'Keep out'], correct: [0], explain: 'It is already public.' },
      { id: 'ma2', prompt: 'The real identity of an anonymous source', options: ['Can go in', 'Keep out'], correct: [1], critical: true, explain: 'A protected source identity stays out.' },
      { id: 'ma3', prompt: 'A fictional article created for training', options: ['Can go in', 'Keep out'], correct: [0], explain: 'It contains no real newsroom data.' },
      { id: 'ma4', prompt: 'An unpublished investigation draft', options: ['Can go in', 'Keep out'], correct: [1], critical: true, explain: 'Unpublished editorial material stays in company systems.' },
    ],
  }

  const article: Method = {
    ...structuredClone(methods[1]),
    id: 'B',
    title: 'Article research brief',
    task: 'Turn source notes into a structured brief without inventing facts',
    roles: ['journalist'],
    baselineMin: 90,
    minutes: 35,
    steps: [
      'Keep interviews and unpublished source files in company tools.',
      'Give Claude only the approved, anonymised notes for the exercise.',
      'Structure the brief into claim, source, context and open question.',
      'Mark every unsupported statement “needs source” before the editor sees it.',
    ],
    rules: ['Anonymous sources, embargoed material and unpublished personal data stay out of public AI tools.'],
    humanCheck: ['Every factual claim points back to a source.', 'The editor approves the brief before drafting.'],
    exercise: {
      brief: 'Build a brief from fictional reporting notes.',
      materials: [{ kind: 'notes', title: 'Reporting notes (fictional)', lines: ['Council approved the plan on 12 September.', 'Budget: €1.2m according to the public decision.', 'Opening date is not yet confirmed.', 'A resident says “everyone supports it” — one person, not a survey.'] }],
      questions: [
        { id: 'mb1', prompt: 'Which statement needs to be marked as unsupported?', options: ['The vote happened on 12 September', 'The budget is €1.2m', 'Everyone supports the plan'], correct: [2], critical: true, explain: 'One resident cannot support a claim about everyone.' },
        { id: 'mb2', prompt: 'What should the brief say about the opening date?', options: ['Expected next spring', 'Not yet confirmed', 'Ask Claude to estimate'], correct: [1], explain: 'Unknown facts stay explicitly unknown.' },
      ],
    },
    versions: [{ version: '1.0', month: WORKSHOP_MONTH, reason: 'Collected from the workshop' }],
  }

  const edit: Method = {
    ...structuredClone(methods[2]),
    id: 'C',
    title: 'Fact-check before publish',
    task: 'Check names, dates, numbers and attribution against source notes',
    roles: ['editor'],
    baselineMin: 35,
    minutes: 25,
    steps: ['Extract factual claims from the draft.', 'Match each claim to the approved source notes.', 'Flag names, dates and numbers that do not match.', 'An editor makes the final publish decision.'],
    rules: ['Unpublished drafts and confidential source identities stay in company systems.'],
    humanCheck: ['The editor, not AI, makes the final publish decision.'],
    exercise: {
      brief: 'Compare a fictional draft with its public source note.',
      materials: [{ kind: 'notes', title: 'Public source note', lines: ['Event: 18 November', 'Location: Jõhvi concert hall', 'Attendance limit: 450'] }],
      questions: [{ id: 'mc1', prompt: 'The draft says 480 seats. What happens?', options: ['Publish it', 'Change it to 450', 'Let Claude choose'], correct: [1], critical: true, explain: 'The public source note says 450.' }],
    },
    versions: [{ version: '1.0', month: WORKSHOP_MONTH, reason: 'Collected from the workshop' }],
  }

  const sales: Method = {
    ...structuredClone(methods[3]),
    id: 'D',
    title: 'Advertiser proposal',
    task: 'Turn a campaign brief into a clear proposal for review',
    roles: ['sales'],
    baselineMin: 60,
    minutes: 30,
    steps: ['Summarise the campaign goal.', 'Choose only products from the current rate card.', 'Separate confirmed facts from suggestions.', 'Send the proposal for sales lead review.'],
    rules: ['Client budgets, private contacts and unpublished rate exceptions stay out of public AI tools.'],
    humanCheck: ['Every price comes from the current rate card.'],
    exercise: {
      brief: 'Review a fictional proposal against a rate card.',
      materials: [{ kind: 'notes', title: 'Campaign brief', lines: ['Goal: local event awareness', 'Run: two weeks', 'Budget ceiling: €2,000', 'Client has not approved video production.'] }],
      questions: [{ id: 'md1', prompt: 'The proposal adds video production. What do you do?', options: ['Keep it as confirmed', 'Mark it as an optional suggestion', 'Hide it'], correct: [1], critical: true, explain: 'Unapproved work must be presented as optional.' }],
    },
    versions: [{ version: '1.0', month: WORKSHOP_MONTH, reason: 'Collected from the workshop' }],
  }

  return [shared, article, edit, sales]
}

function seedMediaState(): State {
  const media = mediaMethods()
  return {
    workspace: structuredClone(WORKSPACES[1]),
    monthIndex: 1,
    people: [
      { id: 'maarika', name: 'Maarika Põld', title: 'Managing editor', roleKey: 'editor', methodIds: ['A', 'C'], status: 'active', joined: 'before workshop' },
      { id: 'toomas', name: 'Toomas Vaher', title: 'Journalist', roleKey: 'journalist', methodIds: ['A', 'B'], status: 'active', joined: 'before workshop' },
      { id: 'anna', name: 'Anna Kask', title: 'Advertising sales', roleKey: 'sales', methodIds: ['A', 'D'], status: 'active', joined: 'before workshop' },
    ],
    methods: media,
    progress: {
      'maarika:A': { state: 'passed', version: '1.0' },
      'maarika:C': { state: 'passed', version: '1.0' },
      'toomas:A': { state: 'passed', version: '1.0' },
      'toomas:B': { state: 'learning', version: '1.0' },
      'anna:A': { state: 'passed', version: '1.0' },
      'anna:D': { state: 'not-started', version: '1.0' },
    },
    reports: [],
    learningReports: [
      { id: 'lr-maarika-A-1', personId: 'maarika', monthIndex: 1, methodId: 'A', body: 'The keep-out rule is the one I repeat in edit.' },
      { id: 'lr-maarika-C-1', personId: 'maarika', monthIndex: 1, methodId: 'C', body: 'Fact-check list is enough. I do not need a longer one.' },
      { id: 'lr-maarika-month-1', personId: 'maarika', monthIndex: 1, body: 'Editorial path is done. No change this month.' },
      { id: 'lr-toomas-A-1', personId: 'toomas', monthIndex: 1, methodId: 'A', body: 'I mark unsupported claims. The upgrade-to-everyone habit is the hard part.' },
      { id: 'lr-anna-A-1', personId: 'anna', monthIndex: 1, methodId: 'A', body: 'Clear on what can go in.' },
    ],
    drafts: [],
    ...seedMediaKnowledge(),
    log: [
      { month: 'September 2026', kind: 'method', text: 'Four media methods collected from the workshop and published as v1.0.' },
      { month: 'September 2026', kind: 'training', text: 'Role paths assigned to editorial and advertising teams.' },
    ],
  }
}

export function seedKnowledgeFor(workspace: WorkspaceConfig) {
  if (workspace.id === 'pohjarannik') return seedMediaKnowledge()
  if (workspace.id === 'kaldaranna') return seedConstructionKnowledge()
  return { knowledge: [] as KnowledgeItem[], knowledgePermissions: defaultKnowledgePermissions(workspace) }
}

const LEGACY_DEPARTMENTS = new Set([
  'Estimating',
  'Office',
  'Site',
  'Projects',
  'Editorial',
  'Advertising',
  'Leadership',
  'Team',
])

export function postLine(title: string, department?: string) {
  return department ? `${title}｜${department}` : title
}

export type MethodLayer = 'general' | 'department' | 'role'

export function methodLayer(method: Method, workspace: WorkspaceConfig): MethodLayer {
  const roleIds = workspace.roles.map((role) => role.id)
  const covers = method.roles.filter((id) => roleIds.includes(id))
  if (covers.length === 0 || covers.length >= roleIds.length) return 'general'
  if (covers.length > 1) return 'department'
  return 'role'
}

export function pathGroups(state: State, person: Person) {
  const department = departmentOf(state, person.roleKey)
  const position = state.workspace.roles.find((role) => role.id === person.roleKey)?.label ?? person.title
  const inRole = (method: Method) => method.roles.includes(person.roleKey) || methodLayer(method, state.workspace) === 'general'
  const peers = state.workspace.roles.filter((role) => departmentOf(state, role.id) === department).map((role) => role.id)
  const forWholeDepartment = (method: Method) => {
    if (methodLayer(method, state.workspace) === 'general') return false
    return peers.length > 1 && peers.every((id) => method.roles.includes(id))
  }
  return [
    {
      id: 'general' as const,
      label: 'General',
      detail: 'Same in every company',
      methods: state.methods.filter((method) => methodLayer(method, state.workspace) === 'general' && inRole(method)),
    },
    {
      id: 'role' as const,
      label: 'Position',
      detail: position,
      methods: state.methods.filter((method) => inRole(method) && methodLayer(method, state.workspace) !== 'general' && !forWholeDepartment(method)),
    },
    {
      id: 'department' as const,
      label: 'Department',
      detail: department,
      methods: state.methods.filter((method) => forWholeDepartment(method) && inRole(method)),
    },
  ]
}

export function departmentOf(state: State, roleKey?: string) {
  const company = state.workspace.name
  const named = state.workspace.roles.map((role) => role.department).filter(Boolean)
  const unique = new Set(named)
  if (unique.size <= 1) return named[0] || company
  if (!roleKey) return state.workspace.ownerDepartment || company
  return state.workspace.roles.find((role) => role.id === roleKey)?.department || company
}

function companyDepartment(workspace: WorkspaceConfig, seed?: WorkspaceConfig) {
  return seed?.name || workspace.name
}

function resolveDepartment(value: string | undefined, fallback: string) {
  return !value || LEGACY_DEPARTMENTS.has(value) ? fallback : value
}

function ensureWorkspace(state: State): WorkspaceConfig {
  const seed = WORKSPACES.find((workspace) => workspace.id === state.workspace.id)
  const company = companyDepartment(state.workspace, seed)
  return {
    ...state.workspace,
    ownerDepartment: resolveDepartment(state.workspace.ownerDepartment, seed?.ownerDepartment || company),
    roles: state.workspace.roles.map((role) => ({
      ...role,
      department: resolveDepartment(
        role.department,
        seed?.roles.find((item) => item.id === role.id)?.department || company,
      ),
    })),
  }
}

export function ensureKnowledge(state: State): State {
  const workspace = ensureWorkspace(state)
  const seeded = seedKnowledgeFor(workspace)
  const knowledge = (Array.isArray(state.knowledge) ? state.knowledge : seeded.knowledge).map((item) => ({
    ...item,
    kind: remapKnowledgeKind(item.kind),
  }))
  const existing = Array.isArray(state.knowledgePermissions) ? state.knowledgePermissions : seeded.knowledgePermissions
  const knowledgePermissions = workspace.roles.map(
    (role) =>
      existing.find((item) => item.roleKey === role.id) ??
      seeded.knowledgePermissions.find((item) => item.roleKey === role.id) ?? {
        roleKey: role.id,
        staffCanAdd: true,
        staffCanEditOwn: true,
        managerMustApprove: true,
      },
  )
  const people = state.people.map((person) => {
    if (person.methodIds?.length) return person
    const role = workspace.roles.find((item) => item.id === person.roleKey)
    return role ? { ...person, methodIds: role.methodIds } : person
  })
  return {
    ...state,
    workspace,
    people,
    knowledge,
    knowledgePermissions,
    learningReports: (() => {
      const mapped = (Array.isArray(state.learningReports) ? state.learningReports : []).map((item) => {
        if (typeof item.body === 'string') return item
        const legacy = item as typeof item & {
          learningIssues?: string
          workChanges?: string
          automationIdeas?: string
          contentIdeas?: string
        }
        return {
          id: legacy.id,
          personId: legacy.personId,
          monthIndex: legacy.monthIndex,
          methodId: legacy.methodId,
          body: [legacy.learningIssues, legacy.workChanges, legacy.automationIdeas, legacy.contentIdeas].filter(Boolean).join('\n\n'),
        }
      })
      return mapped.length ? mapped : seedState(workspace.id).learningReports
    })(),
  }
}

export function seedState(workspaceId = 'kaldaranna'): State {
  return workspaceId === 'pohjarannik' ? seedMediaState() : seedConstructionState()
}

export function seedPortfolio(): Record<string, State> {
  return Object.fromEntries(WORKSPACES.map((workspace) => [workspace.id, seedState(workspace.id)]))
}

export const TEMPLATE_LESSONS: Record<string, Omit<Lesson, 'id'>> = {
  'B:missing': {
    title: 'Missing-items check',
    minutes: 15,
    why: 'Two of four quotes in the month were sent back for missing items.',
    points: [
      'Before sending, check six things that drafts most often leave out: site clearance, skirting boards, temporary power, dust and floor protection, protection of finished surfaces, waste removal.',
      'Tick each one in your price sheet, or write “not needed” next to it.',
      'Ask Claude: “List any of these six that the notes mention but the draft does not.” Then check its answer against the notes yourself.',
    ],
    exercise: {
      brief: 'A fictional bathroom renovation draft. Two of the six checks are missing.',
      materials: [
        {
          kind: 'notes',
          title: 'Request notes (fictional)',
          lines: ['Bathroom 6 m², tiles out, new tiles in.', 'Flat is lived in: protect the hallway floor.', 'No power in the bathroom during works.', 'Old tiles taken away by us.'],
        },
        {
          kind: 'table',
          title: 'Draft',
          head: ['Section', 'Line'],
          rows: [
            ['Labour', 'Remove tiles'],
            ['Labour', 'Lay new tiles, 6 m²'],
            ['Materials', 'Tiles, adhesive, grout'],
            ['Machinery', 'Waste removal, small skip'],
          ],
        },
      ],
      questions: [
        {
          id: 'bl1',
          prompt: 'Which of the six checks are missing?',
          options: ['Site clearance', 'Skirting boards', 'Temporary power', 'Floor protection', 'Protection of finished surfaces', 'Waste removal'],
          correct: [2, 3],
          multi: true,
          critical: true,
          explain: 'The notes ask for hallway protection and say there is no power. Waste removal is already in.',
        },
      ],
    },
  },
  'D:tool': {
    title: 'Where the schedule moved',
    minutes: 10,
    why: 'Cowork moved scheduled tasks. Step 4 of the site report no longer matches the screen.',
    points: [
      'The 16:00 reminder is now set under Settings → Schedules, not in the task menu (example for this demo).',
      'Your existing reminder keeps running. Only new reminders are set in the new place.',
      'Nothing else in the report changes.',
    ],
    exercise: {
      brief: 'One question.',
      materials: [],
      questions: [
        {
          id: 'dl1',
          prompt: 'Where do you set a new 16:00 report reminder now?',
          options: ['In the task menu', 'Settings → Schedules', 'It is no longer possible'],
          correct: [1],
          critical: true,
          explain: 'Scheduled tasks moved to Settings → Schedules.',
        },
      ],
    },
  },
}

export function templateLesson(methodId: MethodId, category: Category | 'tool', detail?: string): Omit<Lesson, 'id'> {
  const t = TEMPLATE_LESSONS[`${methodId}:${category}`]
  if (t) return structuredClone(t)
  const label = category === 'tool' ? 'Tool change' : CATEGORY_LABEL[category]
  return {
    title: `${label} check`,
    minutes: 10,
    why: `The monthly report flagged “${label}${detail ? `: ${detail}` : ''}”.`,
    points: [
      `Before sending, read the result once only for ${label.toLowerCase()}.`,
      'Compare it line by line with your own notes, not with what Claude wrote.',
      'If something is unclear, mark it and ask Kadri.',
    ],
    exercise: {
      brief: 'One question.',
      materials: [],
      questions: [
        {
          id: 'gl1',
          prompt: `What do you compare the result with when you check for ${label.toLowerCase()}?`,
          options: ['Claude’s previous answer', 'My own notes', 'Nothing, Claude checked it'],
          correct: [1],
          critical: true,
          explain: 'Your own notes are the source.',
        },
      ],
    },
  }
}
