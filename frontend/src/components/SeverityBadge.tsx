interface Props {
  severity: 'low' | 'medium' | 'high'
}

const styles: Record<Props['severity'], string> = {
  high: 'bg-red-100 text-red-800 border border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  low: 'bg-green-100 text-green-800 border border-green-200',
}

export function SeverityBadge({ severity }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[severity]}`}>
      {severity.toUpperCase()}
    </span>
  )
}
