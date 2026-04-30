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

function SortChevron({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1.5 inline-block transition-colors ${active ? 'text-ember' : 'text-steel'}`}>
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )
}

export function FindingsTable({ findings, onDismiss }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('monthlySavingsUsd')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterCheck, setFilterCheck] = useState('')
  const [minSavings, setMinSavings] = useState(0)
  const [dismissingId, setDismissingId] = useState<string | null>(null)

  const regions = useMemo(() => [...new Set(findings.map(f => f.region))].sort(), [findings])
  const checks = useMemo(() => [...new Set(findings.map(f => f.checkType))].sort(), [findings])

  const filtered = useMemo(() => findings
    .filter(f => !filterRegion || f.region === filterRegion)
    .filter(f => !filterCheck || f.checkType === filterCheck)
    .filter(f => f.monthlySavingsUsd >= minSavings),
  [findings, filterRegion, filterCheck, minSavings])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'monthlySavingsUsd') cmp = a.monthlySavingsUsd - b.monthlySavingsUsd
    else if (sortKey === 'severity') cmp = severityOrder[a.severity] - severityOrder[b.severity]
    else cmp = a[sortKey].localeCompare(b[sortKey])
    return sortDir === 'asc' ? cmp : -cmp
  }), [filtered, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  async function handleDismiss(finding: Finding) {
    setDismissingId(finding.sk)
    await new Promise(r => setTimeout(r, 260))
    onDismiss(finding)
    setDismissingId(null)
  }

  const COLS: [SortKey, string][] = [
    ['severity', 'Severity'],
    ['checkType', 'Check'],
    ['region', 'Region'],
    ['monthlySavingsUsd', 'Savings / mo'],
    ['detectedAt', 'Detected'],
  ]

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* Region chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['', ...regions].map(r => (
            <button
              key={r || '__all_regions__'}
              onClick={() => setFilterRegion(r)}
              className={`text-[11px] font-mono px-2.5 py-1 rounded-full border transition-colors ${
                filterRegion === r
                  ? 'bg-ember/10 border-ember/40 text-ember'
                  : 'bg-transparent border-graphite text-ash hover:border-steel hover:text-fog'
              }`}
            >
              {r || 'All regions'}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-graphite mx-1" />

        {/* Check type chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['', ...checks].map(c => (
            <button
              key={c || '__all_checks__'}
              onClick={() => setFilterCheck(c)}
              className={`text-[11px] font-mono px-2.5 py-1 rounded-full border transition-colors ${
                filterCheck === c
                  ? 'bg-ember/10 border-ember/40 text-ember'
                  : 'bg-transparent border-graphite text-ash hover:border-steel hover:text-fog'
              }`}
            >
              {c || 'All checks'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-ash font-mono">Min $</span>
          <input
            type="number"
            min={0}
            className="w-16 bg-graphite border border-steel rounded px-2 py-1 text-[12px] font-mono text-fog focus:outline-none focus:border-ember"
            value={minSavings}
            onChange={e => setMinSavings(Number(e.target.value))}
          />
          <span className="text-[11px] font-mono text-ash">{sorted.length} results</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-graphite">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-graphite">
              {COLS.map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-4 py-3 text-left text-[11px] font-mono tracking-widest uppercase text-ash cursor-pointer select-none hover:text-fog transition-colors"
                >
                  {label}
                  <SortChevron active={sortKey === key} dir={sortDir} />
                </th>
              ))}
              <th className="px-4 py-3 text-left text-[11px] font-mono tracking-widest uppercase text-ash">
                Resource
              </th>
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-steel">
                      <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <p className="text-snow text-base font-500">No findings match the current filters</p>
                    <p className="text-ash text-sm">Adjust filters or run a fresh scan</p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((finding, i) => (
                <tr
                  key={finding.sk}
                  style={{
                    animationDelay: `${i * 25}ms`,
                    opacity: dismissingId === finding.sk ? 0 : undefined,
                    transform: dismissingId === finding.sk ? 'translateX(100%)' : undefined,
                    transition: dismissingId === finding.sk ? 'opacity 0.25s ease, transform 0.25s ease' : undefined,
                  }}
                  className={`
                    border-b border-graphite/50 animate-fade-slide
                    hover:bg-white/[0.015]
                    group relative
                    transition-colors duration-150
                  `}
                >
                  <td className="px-4 py-3 relative">
                    <span className="absolute left-0 top-0 bottom-0 w-0 bg-ember group-hover:w-0.5 transition-all duration-150 rounded-r" />
                    <SeverityBadge severity={finding.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px] bg-graphite text-ash px-2 py-0.5 rounded">
                      {finding.checkType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ash">{finding.region}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-savings font-500">
                    ${finding.monthlySavingsUsd.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ash">
                    {new Date(finding.detectedAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-fog text-[13px]" title={finding.title}>
                    {finding.title}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => void handleDismiss(finding)}
                      className="text-[12px] text-ash hover:text-fog hover:underline active:translate-y-px transition-all duration-100"
                    >
                      Dismiss
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
