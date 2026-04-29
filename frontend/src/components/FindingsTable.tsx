import { useState, useMemo } from 'react'
import type { Finding } from '../api/client.ts'
import { SeverityBadge } from './SeverityBadge.tsx'

interface Props {
  findings: Finding[]
  onDismiss: (finding: Finding) => void
}

type SortKey = 'monthlySavingsUsd' | 'severity' | 'checkType' | 'region' | 'detectedAt'
type SortDir = 'asc' | 'desc'

const severityOrder = { high: 3, medium: 2, low: 1 }

export function FindingsTable({ findings, onDismiss }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('monthlySavingsUsd')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterCheck, setFilterCheck] = useState('')
  const [minSavings, setMinSavings] = useState(0)

  const regions = useMemo(() => [...new Set(findings.map(f => f.region))].sort(), [findings])
  const checks = useMemo(() => [...new Set(findings.map(f => f.checkType))].sort(), [findings])

  const filtered = useMemo(() => {
    return findings
      .filter(f => !filterRegion || f.region === filterRegion)
      .filter(f => !filterCheck || f.checkType === filterCheck)
      .filter(f => f.monthlySavingsUsd >= minSavings)
  }, [findings, filterRegion, filterCheck, minSavings])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'monthlySavingsUsd') cmp = a.monthlySavingsUsd - b.monthlySavingsUsd
      else if (sortKey === 'severity') cmp = severityOrder[a.severity] - severityOrder[b.severity]
      else cmp = a[sortKey].localeCompare(b[sortKey])
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortKey) return <span className="ml-1 text-gray-300">↕</span>
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={filterRegion}
          onChange={e => setFilterRegion(e.target.value)}
        >
          <option value="">All regions</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={filterCheck}
          onChange={e => setFilterCheck(e.target.value)}
        >
          <option value="">All checks</option>
          {checks.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500">Min savings $</span>
          <input
            type="number"
            min={0}
            className="border rounded px-2 py-1 text-sm w-20"
            value={minSavings}
            onChange={e => setMinSavings(Number(e.target.value))}
          />
        </div>
        <span className="text-sm text-gray-500 self-center">{sorted.length} findings</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {([
                ['severity', 'Severity'],
                ['checkType', 'Check'],
                ['region', 'Region'],
                ['monthlySavingsUsd', 'Savings/mo'],
                ['detectedAt', 'Detected'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                  onClick={() => handleSort(key)}
                >
                  {label}<SortIcon col={key} />
                </th>
              ))}
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Resource</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sorted.map(finding => (
              <tr key={finding.sk} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3"><SeverityBadge severity={finding.severity} /></td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{finding.checkType}</td>
                <td className="px-4 py-3 text-gray-600">{finding.region}</td>
                <td className="px-4 py-3 font-semibold text-green-700">
                  ${finding.monthlySavingsUsd.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(finding.detectedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 max-w-xs truncate text-gray-700" title={finding.title}>
                  {finding.title}
                </td>
                <td className="px-4 py-3">
                  <button
                    className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                    onClick={() => onDismiss(finding)}
                  >
                    Dismiss
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No findings match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
