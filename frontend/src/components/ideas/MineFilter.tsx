import { ChevronDown } from 'lucide-react'

interface MineFilterProps {
  value: boolean
  onChange: (value: boolean) => void
}

export function MineFilter({ value, onChange }: MineFilterProps) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value ? 'mine' : 'all'}
        aria-label="Scope"
        onChange={e => onChange(e.target.value === 'mine')}
        className="appearance-none min-h-[44px] pl-4 pr-9 rounded-lg border border-border bg-white text-sm font-medium text-slate-600 hover:border-primary/40 hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-150 cursor-pointer"
      >
        <option value="all">All ideas</option>
        <option value="mine">My ideas</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
    </div>
  )
}
