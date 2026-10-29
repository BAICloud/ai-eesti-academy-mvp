import { useCallback, useEffect, useState, type Dispatch } from 'react'
import { loadAi, type AiSettings } from './ai'
import { ensureKnowledge, seedPortfolio } from './data'
import { currentVersion, monthLabel, progressOf, reducer, type Action } from './store'
import type { State } from './types'
import { Admin, type AdminTab } from './views/Admin'
import { Learner } from './views/Learner'
import { type ManagerTab } from './views/Manager'

type View = { actor: string; managerTab: ManagerTab; adminTab: AdminTab }

type Step = { who: string; text: string; hint?: string; go: Partial<View>; done: (s: State, v: View) => boolean }

const STEPS: Step[] = [
  {
    who: 'Andres',
    text: 'Finish the quote method.',
    hint: 'Find the three missing items. Use €19 for laminate.',
    go: { actor: 'andres' },
    done: (s) => ['awaiting', 'passed'].includes(progressOf(s, 'andres', 'B').state),
  },
  { who: 'Kadri', text: 'Confirm Andres passed.', go: { actor: 'kadri', managerTab: 'team' }, done: (s) => progressOf(s, 'andres', 'B').state === 'passed' },
  {
    who: 'Kadri',
    text: 'File November’s report.',
    hint: 'Quote → Missing items · 4 tasks · 70 min · 2 sent back',
    go: { actor: 'kadri', managerTab: 'methods' },
    done: (s) => s.reports.some((r) => r.methodId === 'B' && r.category === 'missing'),
  },
  {
    who: 'AI Eesti',
    text: 'Draft the short lesson and send it.',
    go: { actor: 'admin', adminTab: 'signals' },
    done: (s) => s.drafts.some((d) => d.methodId === 'B' && ['awaiting-client', 'published'].includes(d.status)),
  },
  { who: 'Kadri', text: 'Approve v1.1.', go: { actor: 'kadri', managerTab: 'methods' }, done: (s) => currentVersion(s.methods.find((m) => m.id === 'B')!).version !== '1.0' },
  {
    who: 'Andres',
    text: 'Take the 15-minute update.',
    go: { actor: 'andres' },
    done: (s) => {
      const p = progressOf(s, 'andres', 'B')
      return p.state === 'passed' && !p.update && p.version !== '1.0'
    },
  },
  {
    who: 'Kadri',
    text: 'Next month. Add Eva.',
    hint: 'Advance the month, then add Eva Rebane as estimator.',
    go: { actor: 'kadri', managerTab: 'team' },
    done: (s) => s.people.some((p) => p.roleKey === 'quoter' && p.id !== 'andres'),
  },
  {
    who: 'Eva',
    text: 'Learn the current version. No new workshop.',
    go: {},
    done: (s) => s.people.some((p) => p.roleKey === 'quoter' && p.id !== 'andres' && progressOf(s, p.id, 'B').state === 'passed'),
  },
  { who: 'Kadri', text: 'Mark Andres as left.', go: { actor: 'kadri', managerTab: 'team' }, done: (s) => s.people.some((p) => p.id === 'andres' && p.status === 'left') },
  { who: 'Mart', text: 'Open the year in review.', go: { actor: 'owner', managerTab: 'year' }, done: (s, v) => v.actor === 'owner' && s.people.some((p) => p.id === 'andres' && p.status === 'left') },
]

const COLORS: Record<string, string> = {
  andres: '#5b9bd5',
  liis: '#2f7d5b',
  jaan: '#a8323e',
  kadri: '#00579c',
  mart: '#111111',
  admin: '#d97757',
  eva: '#7c5cbf',
  mari: '#c0316f',
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
}

export default function App() {
  const [portfolio, setPortfolio] = useState(() => {
    try {
      const saved = localStorage.getItem('aieesti-academy-portfolio-v1')
      const parsed = saved ? JSON.parse(saved) as Record<string, State> : null
      if (parsed && Object.values(parsed).every((item) => item.workspace && item.people.every((person) => person.methodIds))) {
        return Object.fromEntries(Object.entries(parsed).map(([id, item]) => [id, ensureKnowledge(item)]))
      }
    } catch {
      // Use the demo workspaces below.
    }
    return seedPortfolio()
  })
  const [workspaceId, setWorkspaceId] = useState('kaldaranna')
  const s = portfolio[workspaceId]
  const dispatch: Dispatch<Action> = useCallback(
    (action) => setPortfolio((all) => ({ ...all, [workspaceId]: reducer(all[workspaceId], action) })),
    [workspaceId],
  )
  const [ai, setAi] = useState<AiSettings>(loadAi)
  const [view, setView] = useState<View>({ actor: 'andres', managerTab: 'mine', adminTab: 'clients' })
  const [guide, setGuide] = useState(true)
  const [intro, setIntro] = useState(() => sessionStorage.getItem('aieesti-intro') !== '1')
  const [query, setQuery] = useState('')

  useEffect(() => {
    localStorage.setItem('aieesti-academy-portfolio-v1', JSON.stringify(portfolio))
  }, [portfolio])
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view.actor, view.managerTab, view.adminTab])

  const manager = s.people.find((p) => p.id === s.workspace.managerId)!
  const learners = s.people.filter((p) => p.status === 'active' && p.id !== manager.id)
  const actors = [
    ...learners.map((p) => ({ id: p.id, name: p.name, label: p.title, color: COLORS[p.id] ?? '#5b9bd5' })),
    { id: manager.id, name: manager.name, label: manager.title, color: COLORS[manager.id] ?? s.workspace.accent },
    { id: 'owner', name: s.workspace.ownerName, label: s.workspace.ownerLabel, color: COLORS.mart },
    { id: 'admin', name: 'AI Eesti', label: 'Team', color: COLORS.admin },
  ]
  const actor = actors.some((a) => a.id === view.actor) ? view.actor : manager.id
  const current = actors.find((a) => a.id === actor)!
  const go = (v: Partial<View>) => setView((x) => ({ ...x, ...v }))
  const stepIndex = STEPS.findIndex((st) => !st.done(s, view))
  const step = stepIndex >= 0 ? STEPS[stepIndex] : null
  const eva = s.people.find((p) => p.roleKey === 'quoter' && p.id !== 'andres' && p.status === 'active')
  const isCaseDemo = s.workspace.id === 'kaldaranna'
  const enter = () => {
    sessionStorage.setItem('aieesti-intro', '1')
    setIntro(false)
  }

  if (intro) {
    return (
      <div className="splash">
        <div className="splash-dots" aria-hidden />
        <div className="splash-topbar">
          <span>AI solutions that actually work.</span>
          <button type="button" onClick={enter}>
            Enter Academy →
          </button>
        </div>
        <header className="splash-nav">
          <div className="splash-nav-inner">
            <div className="splash-brand">
              <img src="./ai-eesti-logo.svg" alt="AI Eesti" className="splash-logo" />
              <span>Academy</span>
            </div>
            <nav className="splash-links">
              <a href="https://aieesti.ee/en" target="_blank" rel="noreferrer">
                AI Training
              </a>
              <a href="https://aieesti.ee/en" target="_blank" rel="noreferrer">
                Services
              </a>
              <span className="on">Academy</span>
              <a href="https://aieesti.ee/en/blog" target="_blank" rel="noreferrer">
                Blog
              </a>
            </nav>
            <button type="button" className="glass-btn" onClick={enter}>
              Enter Academy →
            </button>
          </div>
        </header>
        <main className="splash-hero">
          <p className="splash-kicker">Academy · Start</p>
          <h1>
            <span>Turn every lesson into</span>
            <span>lasting capability.</span>
          </h1>
          <button type="button" className="glass-btn splash-cta" onClick={enter}>
            Enter Academy →
          </button>
          <p className="lead">A Custom AI Workflow Improvement and Talent Development Platform</p>
        </main>
        <footer className="splash-foot">
          <span>Map</span>
          <span>Train</span>
          <span>Build</span>
        </footer>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <img src="./ai-eesti-logo.svg" alt="AI Eesti" className="header-logo" />
            <span className="brand-product">Academy</span>
            <small>{s.workspace.name}</small>
          </div>
          <label className="search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search methods and knowledge"
              aria-label="Search methods and knowledge"
            />
          </label>
          <div className="spacer" />
          <span className="month-chip">{monthLabel(s)}</span>
          <div className="people-switch" role="tablist" aria-label="Switch person">
            {actors.map((a) => (
              <button
                key={a.id}
                className={actor === a.id ? 'on' : ''}
                title={`${a.name} · ${a.label}`}
                onClick={() =>
                  go({
                    actor: a.id,
                    managerTab: a.id === 'owner' ? 'year' : a.id === manager.id ? 'mine' : view.managerTab,
                  })
                }
              >
                <span className="avatar" style={{ background: a.color }}>
                  {a.id === 'admin' ? 'AI' : initials(a.name)}
                </span>
              </button>
            ))}
          </div>
          <div className="who">
            <span className="avatar" style={{ background: current.color }}>
              {current.id === 'admin' ? 'AI' : initials(current.name)}
            </span>
            <span>
              <strong>{current.name.split(' ')[0]}</strong>
              <span className="muted"> · {current.label}</span>
            </span>
          </div>
        </div>
      </header>

      {actor === 'admin' ? (
        <Admin
          s={s}
          dispatch={dispatch}
          ai={ai}
          setAi={setAi}
          tab={view.adminTab}
          setTab={(t) => go({ adminTab: t })}
          workspaces={Object.values(portfolio).map((item) => item.workspace)}
          onSelectWorkspace={(id) => {
            setWorkspaceId(id)
            setView({ actor: 'admin', managerTab: 'mine', adminTab: 'clients' })
          }}
          query={query}
        />
      ) : (
        <Learner
          key={actor}
          s={s}
          dispatch={dispatch}
          personId={actor === 'owner' ? undefined : actor}
          ai={ai}
          query={query}
          level={actor === 'owner' ? 'owner' : actor === manager.id ? 'manager' : 'staff'}
          tab={view.managerTab}
          setTab={(t) => go({ managerTab: t })}
          color={current.color}
        />
      )}

      {guide && isCaseDemo && step && (
        <div className="demo">
          <span className="step-no">0{stepIndex + 1} · {step.who}</span>
          <div className="step-text">
            {step.text}
            {step.hint && <span className="hint">{step.hint}</span>}
          </div>
          <div className="dots" aria-hidden>
            {STEPS.map((_, i) => (
              <i key={i} className={i < stepIndex ? 'done' : i === stepIndex ? 'on' : ''} />
            ))}
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => go(stepIndex === 7 && eva ? { actor: eva.id } : step.go)}
          >
            Go →
          </button>
          {stepIndex === 6 && (
            <button className="btn btn-ghost btn-sm" style={{ background: '#222', color: '#fff', borderColor: '#333' }} onClick={() => dispatch({ type: 'nextMonth' })}>
              Month
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm"
            style={{ background: '#222', color: '#fff', borderColor: '#333' }}
            onClick={() => {
              dispatch({ type: 'reset' })
              go({ actor: learners[0]?.id ?? manager.id, managerTab: 'mine', adminTab: 'signals' })
            }}
          >
            Reset
          </button>
          <button className="btn btn-ghost btn-sm" style={{ background: '#222', color: '#fff', borderColor: '#333' }} onClick={() => setGuide(false)}>
            ×
          </button>
        </div>
      )}
      {guide && isCaseDemo && !step && (
        <div className="demo">
          <span className="step-no">Done</span>
          <div className="step-text">A year inside the product. This is the case for renewal.</div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              dispatch({ type: 'reset' })
              go({ actor: learners[0]?.id ?? manager.id, managerTab: 'mine', adminTab: 'signals' })
            }}
          >
            Reset
          </button>
        </div>
      )}
      {!guide && isCaseDemo && (
        <button className="btn btn-dark demo-toggle" onClick={() => setGuide(true)}>
          Demo
        </button>
      )}
    </div>
  )
}
