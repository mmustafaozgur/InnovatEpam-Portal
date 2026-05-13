interface MineFilterProps {
  value: boolean
  onChange: (value: boolean) => void
}

export function MineFilter({ value, onChange }: MineFilterProps) {
  return (
    <select
      value={value ? 'mine' : 'all'}
      aria-label="Scope"
      onChange={e => onChange(e.target.value === 'mine')}
      className="px-3 py-2 border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
    >
      <option value="all">All ideas</option>
      <option value="mine">My ideas</option>
    </select>
  )
}
