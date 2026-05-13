export interface CategoryFieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  required: boolean
  max_length?: number
  options?: string[]
}

export const CATEGORY_FIELD_SCHEMA: Record<string, CategoryFieldDef[]> = {
  process_improvement: [
    { key: 'target_process', label: 'Target Process', type: 'text', required: true, max_length: 200 },
    { key: 'estimated_time_saved_per_week', label: 'Estimated Time Saved per Week', type: 'number', required: false },
  ],
  technology: [
    { key: 'technology_tool_name', label: 'Technology / Tool Name', type: 'text', required: true, max_length: 200 },
    { key: 'affected_systems_or_teams', label: 'Affected Systems or Teams', type: 'text', required: false, max_length: 300 },
  ],
  cost_saving: [
    { key: 'current_annual_cost_usd', label: 'Current Annual Cost (USD)', type: 'number', required: false },
    { key: 'projected_annual_saving_usd', label: 'Projected Annual Saving (USD)', type: 'number', required: true },
  ],
  talent_development: [
    { key: 'target_audience', label: 'Target Audience', type: 'text', required: true, max_length: 200 },
    { key: 'skill_area', label: 'Skill Area', type: 'text', required: true, max_length: 200 },
    { key: 'estimated_duration_hours', label: 'Estimated Duration in Hours', type: 'number', required: false },
  ],
  client_delivery: [
    { key: 'affected_delivery_phase', label: 'Affected Delivery Phase', type: 'text', required: true, max_length: 200 },
    { key: 'client_impact', label: 'Client Impact', type: 'text', required: true, max_length: 300 },
  ],
  workplace_culture: [
    { key: 'target_group', label: 'Target Group', type: 'text', required: true, max_length: 200 },
    {
      key: 'recurring_or_one_time',
      label: 'Recurring or One-Time',
      type: 'select',
      required: true,
      options: ['recurring', 'one_time'],
    },
  ],
  other: [],
}

export const OPTION_LABELS: Record<string, string> = {
  recurring: 'Recurring',
  one_time: 'One-Time',
}

export const ALL_EXTRA_FIELD_KEYS: string[] = [
  'target_process',
  'estimated_time_saved_per_week',
  'technology_tool_name',
  'affected_systems_or_teams',
  'current_annual_cost_usd',
  'projected_annual_saving_usd',
  'target_audience',
  'skill_area',
  'estimated_duration_hours',
  'affected_delivery_phase',
  'client_impact',
  'target_group',
  'recurring_or_one_time',
]
