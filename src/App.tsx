import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export interface DayData {
  date: string
  wakatime: {
    total_seconds: number
    languages: { name: string; seconds: number }[]
    projects: { name: string; seconds: number }[]
  }
  github: {
    commits: number
    pull_requests: number
    issues: number
    total_contributions: number
  }
}

export function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

export function fmtDate(d: string): string {
  return d.slice(5) // MM-DD
}

const GH_GREEN = '#39d353'
const BLUE     = '#58a6ff'
const PURPLE   = '#bc8cff'
const MUTED    = '#484f58'

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1117; color: #c9d1d9; font-family: 'Courier New', Courier, monospace; }
  .dashboard { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
  h1 { font-size: 1.4rem; color: ${GH_GREEN}; margin-bottom: 24px; letter-spacing: 0.05em; }
  h2 { font-size: 0.85rem; color: #8b949e; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 32px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
  .card-label { font-size: 0.72rem; color: #8b949e; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .card-value { font-size: 1.6rem; color: #e6edf3; }
  .card-sub { font-size: 0.72rem; margin-top: 4px; }
  .pos { color: ${GH_GREEN}; } .neg { color: #f85149; } .neu { color: #8b949e; }
  .section { margin-bottom: 32px; }
  .chart-box { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 640px) { .two-col { grid-template-columns: 1fr; } }
  .empty { text-align: center; padding: 80px 16px; color: #8b949e; font-size: 1rem; }
  .loading { text-align: center; padding: 80px 16px; color: #8b949e; }
`

export default function App() {
  const [history, setHistory] = useState<DayData[] | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}history.json`)
      .then(r => r.json())
      .then((d: DayData[]) => setHistory(d))
      .catch(() => setHistory([]))
  }, [])

  return (
    <>
      <style>{css}</style>
      <div className="dashboard">
        <h1>{'> dev dashboard'}</h1>
        {history === null
          ? <div className="loading">Loading...</div>
          : history.length === 0
            ? <div className="empty">データがまだありません。<br />GitHub Actions を実行してデータを取得してください。</div>
            : <Dashboard history={history} />
        }
      </div>
    </>
  )
}

export function Dashboard({ history }: { history: DayData[] }) {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const last14 = sorted.slice(-14)
  const last7  = sorted.slice(-7)
  const prev7  = sorted.slice(-14, -7)

  const sum7sec  = last7.reduce((s, d) => s + d.wakatime.total_seconds, 0)
  const prev7sec = prev7.reduce((s, d) => s + d.wakatime.total_seconds, 0)
  const secDiff  = sum7sec - prev7sec
  const sum7commits = last7.reduce((s, d) => s + d.github.commits, 0)
  const sum7prs     = last7.reduce((s, d) => s + d.github.pull_requests, 0)
  const sum7issues  = last7.reduce((s, d) => s + d.github.issues, 0)

  const langMap: Record<string, number> = {}
  const projMap: Record<string, number> = {}
  last7.forEach(d => {
    d.wakatime.languages.forEach(l => { langMap[l.name] = (langMap[l.name] ?? 0) + l.seconds })
    d.wakatime.projects.forEach(p => { projMap[p.name] = (projMap[p.name] ?? 0) + p.seconds })
  })
  const langData = Object.entries(langMap).map(([name, seconds]) => ({ name, hours: +(seconds / 3600).toFixed(2) })).sort((a, b) => b.hours - a.hours).slice(0, 8)
  const projData = Object.entries(projMap).map(([name, seconds]) => ({ name, hours: +(seconds / 3600).toFixed(2) })).sort((a, b) => b.hours - a.hours).slice(0, 8)

  const lineData = last14.map(d => ({ date: fmtDate(d.date), hours: +(d.wakatime.total_seconds / 3600).toFixed(2) }))
  const barData  = last14.map(d => ({ date: fmtDate(d.date), commits: d.github.commits }))

  const diffLabel = prev7sec === 0 ? null : `${secDiff >= 0 ? '+' : ''}${fmt(Math.abs(secDiff))} vs 先週`
  const diffClass = secDiff > 0 ? 'pos' : secDiff < 0 ? 'neg' : 'neu'

  const tooltipStyle = { backgroundColor: '#1c2128', border: '1px solid #30363d', color: '#c9d1d9', fontFamily: 'monospace', fontSize: '0.8rem' }
  const axisStyle    = { fill: '#8b949e', fontSize: 11 }

  return (
    <>
      <div className="section">
        <h2>今週のサマリー（直近 7 日）</h2>
        <div className="cards">
          <div className="card">
            <div className="card-label">作業時間</div>
            <div className="card-value">{fmt(sum7sec)}</div>
            {diffLabel && <div className={`card-sub ${diffClass}`}>{diffLabel}</div>}
          </div>
          <div className="card">
            <div className="card-label">Commits</div>
            <div className="card-value" style={{ color: GH_GREEN }}>{sum7commits}</div>
          </div>
          <div className="card">
            <div className="card-label">Pull Requests</div>
            <div className="card-value" style={{ color: BLUE }}>{sum7prs}</div>
          </div>
          <div className="card">
            <div className="card-label">Issues</div>
            <div className="card-value" style={{ color: PURPLE }}>{sum7issues}</div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>作業時間の推移（直近 14 日）</h2>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={MUTED} />
              <XAxis dataKey="date" tick={axisStyle} />
              <YAxis tick={axisStyle} unit="h" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}h`, '作業時間']} />
              <Line type="monotone" dataKey="hours" stroke={GH_GREEN} strokeWidth={2} dot={{ r: 3, fill: GH_GREEN }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="section two-col">
        <div>
          <h2>言語別作業時間（直近 7 日）</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={langData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={MUTED} horizontal={false} />
                <XAxis type="number" tick={axisStyle} unit="h" />
                <YAxis type="category" dataKey="name" tick={axisStyle} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}h`, '時間']} />
                <Bar dataKey="hours" fill={BLUE} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h2>プロジェクト別作業時間（直近 7 日）</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={MUTED} horizontal={false} />
                <XAxis type="number" tick={axisStyle} unit="h" />
                <YAxis type="category" dataKey="name" tick={axisStyle} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}h`, '時間']} />
                <Bar dataKey="hours" fill={PURPLE} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>コミット数の推移（直近 14 日）</h2>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={MUTED} />
              <XAxis dataKey="date" tick={axisStyle} />
              <YAxis tick={axisStyle} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'コミット数']} />
              <Bar dataKey="commits" fill={GH_GREEN} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}
