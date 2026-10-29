import { useState } from 'react'
import { reviewEmail, type AiSettings } from '../ai'
import type { Exercise, Material, Question } from '../types'

const same = (a: number[] = [], b: number[]) => a.length === b.length && b.every((x) => a.includes(x))

function MaterialView({ m }: { m: Material }) {
  return (
    <div className="material">
      <div className="material-title">{m.title}</div>
      {m.kind === 'notes' ? (
        <ul>
          {m.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : (
        <table>
          <thead>
            <tr>
              {m.head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function QuestionView({ q, value, onChange, checked }: { q: Question; value?: number[]; onChange: (v: number[]) => void; checked: boolean }) {
  const right = same(value, q.correct)
  const inline = !q.multi && q.options.length === 2
  const toggle = (i: number) => {
    if (checked) return
    if (!q.multi) return onChange([i])
    const v = value ?? []
    onChange(v.includes(i) ? v.filter((x) => x !== i) : [...v, i])
  }
  const opts = (
    <div className="options">
      {q.options.map((o, i) => (
        <button key={o} type="button" className={`opt ${value?.includes(i) ? 'on' : ''}`} onClick={() => toggle(i)}>
          {q.multi && (value?.includes(i) ? '☑ ' : '☐ ')}
          {o}
        </button>
      ))}
    </div>
  )
  return (
    <div className={`question ${checked ? (right ? 'right' : 'wrong') : ''}`}>
      {inline ? (
        <div className="question-inline">
          <div>{q.prompt}</div>
          {opts}
        </div>
      ) : (
        <>
          <div>
            {q.prompt}
            {q.multi && <span className="muted small"> · choose all that apply</span>}
          </div>
          {opts}
        </>
      )}
      {checked && (
        <div className="explain">
          {right ? '✓ ' : '✗ '}
          {q.explain}
          {!right && q.critical && <strong> Must be right to pass.</strong>}
        </div>
      )}
    </div>
  )
}

export function ExerciseRunner({
  sections,
  ai,
  onPass,
  submitLabel = 'Send to Kadri for confirmation',
}: {
  sections: { title: string; exercise: Exercise }[]
  ai: AiSettings
  onPass: () => void
  submitLabel?: string
}) {
  const [answers, setAnswers] = useState<Record<string, number[]>>({})
  const [texts, setTexts] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState(false)
  const [review, setReview] = useState<Record<number, string>>({})
  const [reviewing, setReviewing] = useState<number | null>(null)

  const questions = sections.flatMap((s) => s.exercise.questions)
  const textResults = sections.map((s, i) =>
    s.exercise.freeText?.checks.map((c) => {
      const t = (texts[i] ?? '').toLowerCase()
      const okMatch = c.mustMatch ? new RegExp(c.mustMatch, 'i').test(t) : true
      const okNot = c.mustNotMatch ? !new RegExp(c.mustNotMatch, 'i').test(t) : true
      return { label: c.label, ok: okMatch && okNot && t.trim().length > 40 }
    }),
  )
  const rightCount = questions.filter((q) => same(answers[q.id], q.correct)).length
  const criticalOk = questions.filter((q) => q.critical).every((q) => same(answers[q.id], q.correct))
  const textOk = textResults.every((r) => !r || r.every((x) => x.ok))
  const passed = criticalOk && rightCount >= Math.ceil(questions.length * 0.75) && textOk
  const answeredAll = questions.every((q) => answers[q.id]?.length) && sections.every((s, i) => !s.exercise.freeText || (texts[i] ?? '').trim().length > 0)

  const retry = () => {
    const keep: Record<string, number[]> = {}
    for (const q of questions) if (same(answers[q.id], q.correct)) keep[q.id] = answers[q.id]
    setAnswers(keep)
    setChecked(false)
  }

  const askClaude = async (i: number, notes: string[]) => {
    setReviewing(i)
    try {
      const r = await reviewEmail(ai, notes, texts[i] ?? '')
      setReview((x) => ({ ...x, [i]: r }))
    } catch (e) {
      setReview((x) => ({ ...x, [i]: String(e) }))
    }
    setReviewing(null)
  }

  return (
    <div className="stack" style={{ gap: 24 }}>
      {sections.map((s, i) => (
        <div className="stack" key={s.title} style={{ gap: 14 }}>
          {sections.length > 1 && <h4>{s.title}</h4>}
          <p className="muted">{s.exercise.brief}</p>
          {s.exercise.materials.length > 0 && (
            <div className={s.exercise.materials.length > 1 ? 'grid grid-2' : 'stack'} style={{ gap: 12 }}>
              {s.exercise.materials.map((m) => (
                <MaterialView key={m.title} m={m} />
              ))}
            </div>
          )}
          {s.exercise.questions.map((q) => (
            <QuestionView key={q.id} q={q} value={answers[q.id]} checked={checked} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
          ))}
          {s.exercise.freeText && (
            <div className="stack">
              <label className="small muted">{s.exercise.freeText.prompt}</label>
              <textarea
                value={texts[i] ?? ''}
                placeholder={s.exercise.freeText.placeholder}
                readOnly={checked && passed}
                onChange={(e) => {
                  setTexts((t) => ({ ...t, [i]: e.target.value }))
                  setChecked(false)
                }}
              />
              {checked && textResults[i] && (
                <div className="checklist">
                  {textResults[i]!.map((r) => (
                    <div key={r.label} style={{ color: r.ok ? 'var(--ok)' : 'var(--bad)' }}>
                      {r.ok ? '✓' : '✗'} {r.label}
                    </div>
                  ))}
                </div>
              )}
              {ai.apiKey && (
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={!texts[i]?.trim() || reviewing === i}
                    onClick={() => askClaude(i, s.exercise.materials.flatMap((m) => (m.kind === 'notes' ? m.lines : [])))}
                  >
                    {reviewing === i ? 'Claude is reading…' : 'Ask Claude for feedback'}
                  </button>
                  <span className="small muted">Claude sees only the fictional notes and your draft.</span>
                </div>
              )}
              {review[i] && <div className="notice" style={{ whiteSpace: 'pre-wrap' }}>{review[i]}</div>}
            </div>
          )}
        </div>
      ))}

      <div className="row">
        {!checked && (
          <button className="btn btn-dark" disabled={!answeredAll} onClick={() => setChecked(true)}>
            Check my answers
          </button>
        )}
        {checked && passed && (
          <>
            <span className="badge ok">
              <span className="dot" />
              Exercise passed
            </span>
            <button className="btn btn-primary" onClick={onPass}>
              {submitLabel} →
            </button>
          </>
        )}
        {checked && !passed && (
          <>
            <span className="badge bad">
              <span className="dot" />
              Not yet. {questions.length ? `${rightCount} of ${questions.length} right.` : ''}
            </span>
            <button className="btn btn-ghost" onClick={retry}>
              Try the wrong ones again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
