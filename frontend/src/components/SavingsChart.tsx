import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { SummaryResponse } from '../api/client.ts'

interface Props {
  summary: SummaryResponse
}

interface TooltipPayloadItem {
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-void-surface border border-graphite rounded-lg px-3 py-2 shadow-xl">
      <p className="text-ash text-[11px] font-mono mb-1">{label}</p>
      <p className="text-savings font-mono text-sm font-500">
        ${(payload[0]?.value ?? 0).toFixed(2)}
        <span className="text-ash text-[11px] ml-1">/mo</span>
      </p>
    </div>
  )
}

export function SavingsChart({ summary }: Props) {
  const data = Object.entries(summary.byCheckType)
    .map(([name, { savingsUsd }]) => ({ name, value: Math.round(savingsUsd * 100) / 100 }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="bg-void-surface rounded-xl border border-graphite p-5">
      <p className="text-[11px] font-mono tracking-widest uppercase text-ash mb-4">
        Savings by Check Type
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 24, bottom: 0, left: 8 }}
        >
          <CartesianGrid horizontal={false} stroke="#27272A" strokeDasharray="4 4" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#A1A1AA', fontFamily: 'JetBrains Mono' }}
            tickFormatter={v => `$${v as number}`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#A1A1AA', fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            width={130}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(232,121,58,0.05)' }} />
          <Bar dataKey="value" fill="#E8793A" radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
