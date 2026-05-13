import { cn } from '@/lib/utils'

interface CharacterCounterProps {
  current: number
  max: number
}

export function CharacterCounter({ current, max }: CharacterCounterProps) {
  const remaining = max - current
  const isWarning = remaining <= Math.floor(max * 0.1)
  return (
    <p className={cn('text-xs text-right mt-1 select-none', isWarning ? 'text-red-500' : 'text-slate-400')}>
      {current} / {max}
    </p>
  )
}
