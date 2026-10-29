import { CATEGORY_LABEL, templateLesson } from './data'
import type { Category, Lesson, Method } from './types'

export type AiSettings = { apiKey: string; model: string }

const SETTINGS = 'aieesti-academy-ai'

export function loadAi(): AiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS)
    if (raw) return JSON.parse(raw) as AiSettings
  } catch {
    /* use defaults */
  }
  return { apiKey: '', model: 'claude-sonnet-4-5' }
}

export function saveAi(s: AiSettings) {
  localStorage.setItem(SETTINGS, JSON.stringify(s))
}

async function callClaude(ai: AiSettings, prompt: string, maxTokens = 1500): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ai.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: ai.model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as { content: { type: string; text?: string }[] }
  return data.content.map((c) => c.text ?? '').join('')
}

export type LessonInput = {
  method: Method
  category: Category | 'tool'
  detail?: string
  tasks?: number
  reworks?: number
  toolNote?: string
}

export function lessonPrompt({ method, category, detail, tasks, reworks, toolNote }: LessonInput) {
  const signal =
    category === 'tool'
      ? `Tool change reported by AI Eesti: ${toolNote ?? 'the tool interface changed'}.`
      : `Monthly report from the client's manager: problem category "${CATEGORY_LABEL[category]}"${detail ? `, kind: "${detail}"` : ''}. ${tasks ?? '?'} tasks this month, ${reworks ?? '?'} sent back.`

  return `You maintain a company's AI working methods for AI Eesti Academy.
You never see the client's real files. You only see the method below and a structured signal.

Method: "${method.title}" (${method.task})
Steps:
${method.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
Rules:
${method.rules.map((r) => `- ${r}`).join('\n')}

Signal: ${signal}

Write ONE short refresher lesson (10–15 minutes) that fixes this specific problem.
Use only fictional practice material. No real client names, prices or documents.
Plain, concrete English for non-technical staff.

Return only JSON, no prose, in this shape:
{
  "title": "3–5 words",
  "minutes": 10,
  "why": "one sentence: what the signal showed",
  "points": ["2–4 concrete instructions"],
  "exercise": {
    "brief": "one sentence",
    "materials": [{"kind":"notes","title":"... (fictional)","lines":["..."]}],
    "questions": [{"id":"q1","prompt":"...","options":["...","...","..."],"correct":[0],"multi":false,"critical":true,"explain":"..."}]
  }
}`
}

function parseLesson(text: string): Omit<Lesson, 'id'> {
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  const l = JSON.parse(json) as Omit<Lesson, 'id'>
  if (!l.title || !Array.isArray(l.points) || !l.exercise?.questions?.length) throw new Error('Incomplete lesson')
  l.exercise.materials ??= []
  l.exercise.questions = l.exercise.questions.map((q, i) => ({ ...q, id: q.id || `q${i + 1}` }))
  return l
}

export async function draftLesson(ai: AiSettings, input: LessonInput) {
  const prompt = lessonPrompt(input)
  const id = `l${Date.now()}`
  if (ai.apiKey) {
    try {
      const lesson = parseLesson(await callClaude(ai, prompt))
      return { lesson: { ...lesson, id }, author: 'claude' as const, prompt, error: undefined }
    } catch (e) {
      return { lesson: { ...fallback(input), id }, author: 'template' as const, prompt, error: String(e) }
    }
  }
  return { lesson: { ...fallback(input), id }, author: 'template' as const, prompt, error: undefined }
}

function fallback(input: LessonInput) {
  const l = templateLesson(input.method.id, input.category, input.detail)
  if (input.category !== 'tool' && input.tasks !== undefined) {
    l.why = `${input.reworks} of ${input.tasks} tasks this month were sent back for “${CATEGORY_LABEL[input.category].toLowerCase()}”.`
  }
  return l
}

export async function reviewEmail(ai: AiSettings, notes: string[], email: string) {
  const prompt = `You are coaching an office administrator at a construction company. This is a training exercise with fictional notes.

Meeting notes:
${notes.map((n) => `- ${n}`).join('\n')}

Their follow-up email to the client:
"""
${email}
"""

In at most 4 short bullet points: what is missing from the notes, what was added that is not in the notes, and one concrete improvement. Plain English.`
  return callClaude(ai, prompt, 400)
}
