import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { SummaryResponse } from '../api/client.ts'

interface Props {
  summary: SummaryResponse
}

const CHECK_COLORS: Record<string, string> = {
  'ec2-idle': '#FF9900',
  'ebs-orphan': '#4053D6',
  'eip-unassoc': '#E7157B',
  'rds-underutilized': '#7AA116',
  'snapshots-old': '#8C4FFF',
  'nat-gw-low-traffic': '#00A1C9',
  'lambda-overprovisioned': '#FF4F8B',
}

export function SavingsChart({ summary }: Props) {
  const data = Object.entries(summary.byCheckType)
    .map(([name, { savingsUsd }]) => ({ name, savingsUsd: Math.round(savingsUsd * 100) / 100 }))
    .sort((a, b) => b.savingsUsd - a.savingsUsd)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-600 mb-3">Savings by Check Type ($/month)</h2>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v as number}`} />
          <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Savings']} />
          <Bar dataKey="savingsUsd" radius={[4, 4, 0, 0]}>
            {data.map(entry => (
              <Cell key={entry.name} fill={CHECK_COLORS[entry.name] ?? '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
