import { useEffect, useState, useCallback } from 'react'
import type { Finding, SummaryResponse } from '../api/client.ts'
import { fetchFindings, fetchSummary, dismissFinding } from '../api/client.ts'
import { FindingsTable } from '../components/FindingsTable.tsx'
import { SavingsChart } from '../components/SavingsChart.tsx'
import { SeverityBadge } from '../components/SeverityBadge.tsx'

function SkeletonRow() {
  return (
    <tr className="border-b border-graphite/50">
      {[130, 80, 80, 60, 70, 180, 48].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="shimmer-bar h-4 rounded"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  )
}

function KpiCard({
  label,
  value,
  sub,
  wide,
  pulse,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  wide?: boolean
  pulse?: boolean
}) {
  return (
    <div
      className={`bg-void-surface border border-graphite rounded-xl p-5 flex flex-col justify-between ${wide ? 'col-span-2' : ''} ${pulse ? 'animate-savings-pulse' : ''}`}
    >
      <p className="text-[11px] font-mono tracking-widest uppercase text-ash mb-3">{label}</p>
      <div>
        <div className="leading-none">{value}</div>
        {sub && <p className="text-ash text-[11px] font-mono mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export function Dashboard() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const [findingsResp, summaryResp] = await Promise.all([fetchFindings(), fetchSummary()])
      setFindings(findingsResp.items)
      setSummary(summaryResp)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleDismiss(finding: Finding) {
    try {
      await dismissFinding(finding)
      setFindings(prev => prev.filter(f => f.sk !== finding.sk))
      setSummary(prev =>
        prev
          ? {
              ...prev,
              totalActive: prev.totalActive - 1,
              totalMonthlySavingsUsd:
                Math.round((prev.totalMonthlySavingsUsd - finding.monthlySavingsUsd) * 100) / 100,
              bySeverity: {
                ...prev.bySeverity,
                [finding.severity]: prev.bySeverity[finding.severity] - 1,
              },
            }
          : prev,
      )
    } catch {
      // silent — finding stays in table on failure
    }
  }

  const yearlySavings = summary ? summary.totalMonthlySavingsUsd * 12 : 0

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 border-b border-graphite bg-abyss/80 backdrop-blur-xl px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-ember/10 border border-ember/30 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="#E8793A" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M7 5V9M5 7H9" stroke="#E8793A" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-snow text-sm font-600 leading-none">AWS Cost Optimizer</h1>
            <p className="text-ash text-[11px] font-mono leading-none mt-0.5">Idle resource scanner</p>
          </div>
        </div>

        <button
          onClick={() => void load(true)}
          disabled={loading || refreshing}
          className="text-[12px] text-ash hover:text-fog border border-graphite hover:border-steel rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 font-mono"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <div className="border border-red-500/30 bg-red-500/5 text-red-400 rounded-xl px-4 py-3 text-sm font-mono">
            {error}
          </div>
        )}

        {/* KPI Strip — asymmetric 4-col, savings spans 2 */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-void-surface border border-graphite rounded-xl p-5 h-24">
                <div className="shimmer-bar h-3 w-20 rounded mb-4" />
                <div className="shimmer-bar h-7 w-28 rounded" />
              </div>
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              label="Active Findings"
              value={
                <span className="font-mono text-3xl text-snow font-600">
                  {summary.totalActive}
                </span>
              }
            />
            <KpiCard
              label="Monthly Savings"
              wide
              pulse
              value={
                <div className="flex items-baseline gap-1">
                  <span className="text-ash font-mono text-lg">$</span>
                  <span className="font-mono text-4xl text-savings font-600">
                    {summary.totalMonthlySavingsUsd.toFixed(2)}
                  </span>
                </div>
              }
              sub={`$${yearlySavings.toFixed(0)} / year`}
            />
            <KpiCard
              label="By Severity"
              value={
                <div className="flex flex-col gap-1.5 mt-1">
                  {(['high', 'medium', 'low'] as const).map(s => (
                    <div key={s} className="flex items-center justify-between">
                      <SeverityBadge severity={s} />
                      <span className="font-mono text-sm text-fog">{summary.bySeverity[s]}</span>
                    </div>
                  ))}
                </div>
              }
            />
          </div>
        ) : null}

        {/* Chart + table layout */}
        {!loading && summary && Object.keys(summary.byCheckType).length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <SavingsChart summary={summary} />
            </div>
            <div className="lg:col-span-2 bg-void-surface border border-graphite rounded-xl p-5">
              <p className="text-[11px] font-mono tracking-widest uppercase text-ash mb-4">
                Findings per Check
              </p>
              <div className="space-y-3">
                {Object.entries(summary.byCheckType)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .map(([check, { count, savingsUsd }]) => (
                    <div key={check} className="flex items-center justify-between">
                      <span className="font-mono text-[11px] bg-graphite text-ash px-2 py-0.5 rounded">
                        {check}
                      </span>
                      <div className="text-right">
                        <span className="font-mono text-sm text-fog">{count}</span>
                        <span className="font-mono text-[11px] text-savings ml-2">
                          ${savingsUsd.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Findings Table */}
        <div className="bg-void-surface rounded-xl border border-graphite p-5">
          <p className="text-[11px] font-mono tracking-widest uppercase text-ash mb-5">
            Active Findings
          </p>

          {loading ? (
            <div className="overflow-x-auto rounded-xl border border-graphite">
              <table className="min-w-full text-sm">
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
                </tbody>
              </table>
            </div>
          ) : (
            <FindingsTable
              findings={findings}
              onDismiss={finding => void handleDismiss(finding)}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex justify-end px-6 py-3 border-t border-graphite/50">
        <span className="font-mono text-steel" style={{ fontSize: '9px' }}>
          #{__COMMIT_HASH__}
        </span>
      </footer>
    </div>
  )
}
