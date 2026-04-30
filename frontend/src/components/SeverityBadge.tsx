interface Props {
  severity: 'low' | 'medium' | 'high'
}

const config = {
  high: {
    label: 'HIGH',
    className: 'bg-red-500/10 text-red-400 border border-red-500/25',
  },
  medium: {
    label: 'MED',
    className: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
  },
  low: {
    label: 'LOW',
    className: 'bg-green-500/10 text-green-400 border border-green-500/25',
  },
}

export function SeverityBadge({ severity }: Props) {
  const { label, className } = config[severity]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-500 tracking-wider ${className}`}
    >
      {label}
    </span>
  )
}
