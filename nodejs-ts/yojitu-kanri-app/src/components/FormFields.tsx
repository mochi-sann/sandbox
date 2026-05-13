export function InputField({
  name,
  label,
  value,
  type = 'text',
}: {
  name: string
  label: string
  value?: string | number | null
  type?: string
}) {
  return (
    <label>
      {label}
      <input name={name} type={type} defaultValue={value ?? ''} />
    </label>
  )
}

export function SelectField({
  name,
  label,
  value,
  items,
}: {
  name: string
  label: string
  value?: string | number | null
  items?: { id: number; name: string }[] | string[]
}) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={value ?? ''}>
        <option value="">選択</option>
        {(items ?? []).map((item) => {
          if (typeof item === 'string') {
            return (
              <option key={item} value={item}>
                {item}
              </option>
            )
          }
          return (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          )
        })}
      </select>
    </label>
  )
}
