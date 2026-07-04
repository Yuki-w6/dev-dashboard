import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App, { Dashboard, fmt, fmtDate, type DayData } from './App'

describe('fmt', () => {
  it('formats whole hours and minutes', () => {
    expect(fmt(3661)).toBe('1h 1m')
  })

  it('formats zero seconds', () => {
    expect(fmt(0)).toBe('0h 0m')
  })

  it('truncates partial minutes rather than rounding', () => {
    expect(fmt(119)).toBe('0h 1m') // 119s = 1m59s -> floors to 1m
  })
})

describe('fmtDate', () => {
  it('extracts the MM-DD portion of an ISO date', () => {
    expect(fmtDate('2024-03-07')).toBe('03-07')
  })
})

function buildDay(date: string, totalSeconds: number, commits: number, prs: number, issues: number): DayData {
  return {
    date,
    wakatime: { total_seconds: totalSeconds, languages: [], projects: [] },
    github: { commits, pull_requests: prs, issues, total_contributions: commits + prs + issues },
  }
}

describe('Dashboard', () => {
  // 14 days: first 7 (prev week) at 1h/day, last 7 (this week) at 2h/day.
  const history: DayData[] = [
    ...Array.from({ length: 7 }, (_, i) => buildDay(`2024-01-0${i + 1}`, 3600, 1, 0, 0)),
    ...Array.from({ length: 7 }, (_, i) => buildDay(`2024-01-${i + 8}`, 7200, 1, 1, 0)),
  ]

  it('sums the last 7 days and compares against the previous 7 days', () => {
    render(<Dashboard history={history} />)

    expect(screen.getByText('14h 0m')).toBeInTheDocument() // 7 * 2h
    expect(screen.getByText('+7h 0m vs 先週')).toBeInTheDocument() // 14h - 7h
  })

  it('sums commits, pull requests, and issues over the last 7 days', () => {
    render(<Dashboard history={history} />)

    expect(screen.getByText('Commits').nextElementSibling).toHaveTextContent('7')
    expect(screen.getByText('Pull Requests').nextElementSibling).toHaveTextContent('7')
    expect(screen.getByText('Issues').nextElementSibling).toHaveTextContent('0')
  })

  it('omits the week-over-week diff when there is no prior week of data', () => {
    render(<Dashboard history={history.slice(-3)} />)

    expect(screen.queryByText(/vs 先週/)).not.toBeInTheDocument()
  })
})

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a loading state before history resolves', () => {
    vi.mocked(fetch).mockReturnValue(new Promise<Response>(() => {}))

    render(<App />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows an empty state when there is no history yet', async () => {
    vi.mocked(fetch).mockResolvedValue({ json: () => Promise.resolve([]) } as unknown as Response)

    render(<App />)

    expect(await screen.findByText(/データがまだありません/)).toBeInTheDocument()
  })

  it('shows an empty state when the fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'))

    render(<App />)

    expect(await screen.findByText(/データがまだありません/)).toBeInTheDocument()
  })

  it('renders the dashboard once history resolves with data', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve([buildDay('2024-01-01', 3600, 1, 0, 0)]),
    } as unknown as Response)

    render(<App />)

    await waitFor(() => expect(screen.getByText('今週のサマリー（直近 7 日）')).toBeInTheDocument())
  })
})
