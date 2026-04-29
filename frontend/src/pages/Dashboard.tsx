import { useEffect, useState, useCallback } from 'react'
import type { Finding, SummaryResponse } from '../api/client.ts'
import { fetchFindings, fetchSummary, dismissFinding } from '../api/client.ts'
import { FindingsTable } from '../components/FindingsTable.tsx'
import { SavingsChart } from '../components/SavingsChart.tsx'
import { SeverityBadge } from '../components/SeverityBadge.tsx'

export function Dashboard() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [findingsResp, summaryResp] = await Promise.all([fetchFindings(), fetchSummary()])
      setFindings(findingsResp.items)
      setSummary(summaryResp)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleDismiss(finding: Finding) {
    try {
      await dismissFinding(finding)
      setFindings(prev => prev.filter(f => f.sk !== finding.sk))
      setSummary(prev => prev ? { ...prev, totalActive: prev.totalActive - 1 } : prev)
    } catch (err) {
      console.error('Failed to dismiss', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-aws-dark text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-aws-orange text-2xl font-bold">⚡</span>
          <div>
            <h1 className="text-lg font-bold leading-none">AWS Cost Optimizer</h1>
            <p className="text-xs text-gray-400 leading-none mt-0.5">Idle resource scanner</p>
          </div>
        </div>
        <button
          onClick={() => void load()}
          className="text-xs text-gray-400 hover:text-white transition-colors"
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Active Findings</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalActive}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Potential Savings/mo</p>
              <p className="text-2xl font-bold text-green-600">
                ${summary.totalMonthlySavingsUsd.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">By Severity</p>
              <div className="flex flex-col gap-1">
                {(['high', 'medium', 'low'] as const).map(s => (
                  <div key={s} className="flex items-center justify-between text-xs">
                    <SeverityBadge severity={s} />
                    <span className="font-semibold">{summary.bySeverity[s]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Yearly Savings</p>
              <p className="text-2xl font-bold text-green-600">
                ${(summary.totalMonthlySavingsUsd * 12).toFixed(0)}
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        {summary && Object.keys(summary.byCheckType).length > 0 && (
          <SavingsChart summary={summary} />
        )}

        {/* Findings Table */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Active Findings</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading findings…</div>
          ) : (
            <FindingsTable findings={findings} onDismiss={finding => void handleDismiss(finding)} />
          )}
        </div>
      </main>

      {/* Footer with build hash */}
      <footer className="text-center py-4">
        <span className="font-mono text-gray-300" style={{ fontSize: '9px' }}>
          #{__COMMIT_HASH__}
        </span>
      </footer>
    </div>
  )
}
