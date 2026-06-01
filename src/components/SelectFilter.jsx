import { ChevronDown } from 'lucide-react'

export function SelectFilter({ label, options, value, onChange }) {
  const normalizedOptions = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  )

  return (
    <label className="select-filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} />
    </label>
  )
}
