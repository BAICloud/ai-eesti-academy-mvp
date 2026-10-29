import type { ReactNode } from 'react'
import { METHOD_LOOK } from '../data'
import { currentVersion, lessonsOf } from '../store'
import type { Method, MethodId, Progress } from '../types'

export function Shape({ id, size = 40 }: { id: MethodId; size?: number }) {
  const { fg, shape } = METHOD_LOOK[id] ?? { fg: '#6d28d9', shape: 'hexagon' as const }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      {shape === 'diamond' && <rect x="8" y="8" width="24" height="24" rx="2" transform="rotate(45 20 20)" fill={fg} />}
      {shape === 'hexagon' && <polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill={fg} />}
      {shape === 'arch' && <path d="M8 36V18a12 12 0 0 1 24 0v18h-7V18a5 5 0 0 0-10 0v18z" fill={fg} />}
      {shape === 'flower' && (
        <g fill={fg}>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            return <circle key={i} cx={20 + Math.cos(a) * 9} cy={20 + Math.sin(a) * 9} r="7" />
          })}
          <circle cx="20" cy="20" r="10" />
        </g>
      )}
    </svg>
  )
}

export function StatusBadge({ p }: { p: Progress }) {
  if (p.update?.state === 'todo')
    return (
      <span className="badge warn">
        <span className="dot" />
        Update
      </span>
    )
  if (p.update?.state === 'awaiting')
    return (
      <span className="badge info">
        <span className="dot" />
        Review
      </span>
    )
  switch (p.state) {
    case 'passed':
      return (
        <span className="badge ok">
          <span className="dot" />
          Passed
        </span>
      )
    case 'awaiting':
      return (
        <span className="badge info">
          <span className="dot" />
          Review
        </span>
      )
    case 'learning':
      return (
        <span className="badge warn">
          <span className="dot" />
          In progress
        </span>
      )
    default:
      return (
        <span className="badge">
          <span className="dot" />
          New
        </span>
      )
  }
}

export function Notice({ children, tone }: { children: ReactNode; tone?: 'warn' }) {
  return (
    <div className={`notice ${tone ?? ''}`}>
      <div>{children}</div>
    </div>
  )
}

export function MethodBody({ m, onlyLessonId, compact }: { m: Method; onlyLessonId?: string; compact?: boolean }) {
  const lessons = lessonsOf(m)
  if (onlyLessonId) {
    const l = lessons.find((x) => x.id === onlyLessonId)
    return l ? <LessonBox l={l} /> : null
  }
  return (
    <div className="stack" style={{ gap: 20 }}>
      <ol className="steps">
        {(compact ? m.steps.slice(0, 4) : m.steps).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      {!compact &&
        lessons.map((l) => (
          <LessonBox key={l.id} l={l} />
        ))}
      {!compact && (
        <div className="stack">
          {m.rules.map((r) => (
            <div className="rule" key={r}>
              {r}
            </div>
          ))}
        </div>
      )}
      <p className="small muted">v{currentVersion(m).version}</p>
    </div>
  )
}

export function LessonBox({ l }: { l: { title: string; minutes: number; why: string; points: string[] } }) {
  return (
    <div className="lesson-box">
      <div className="row between">
        <h4>{l.title}</h4>
        <span className="badge info">{l.minutes} min</span>
      </div>
      <p className="small muted" style={{ marginTop: 6 }}>
        {l.why}
      </p>
      <ul>
        {l.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  )
}
