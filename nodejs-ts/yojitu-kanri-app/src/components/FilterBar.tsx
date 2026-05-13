import type { Masters } from '../../shared/types'

export type CommonFilters = {
  search: string
  departmentId: string
  projectId: string
  costCategoryId: string
  toolId: string
  vendorId: string
  periodMonth: string
}

export const emptyFilters: CommonFilters = {
  search: '',
  departmentId: '',
  projectId: '',
  costCategoryId: '',
  toolId: '',
  vendorId: '',
  periodMonth: '',
}

type FilterKey = keyof CommonFilters

export function FilterBar({
  filters,
  masters,
  visible,
  onChange,
  onReset,
}: {
  filters: CommonFilters
  masters: Masters | null
  visible: FilterKey[]
  onChange: (filters: CommonFilters) => void
  onReset: () => void
}) {
  function update(key: FilterKey, value: string) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <section className="panel filter-bar">
      {visible.includes('search') ? (
        <label>
          検索
          <input
            value={filters.search}
            placeholder="ツール、ベンダー、担当者など"
            onChange={(event) => update('search', event.target.value)}
          />
        </label>
      ) : null}
      {visible.includes('periodMonth') ? (
        <label>
          対象年月
          <input
            type="month"
            value={filters.periodMonth}
            onChange={(event) => update('periodMonth', event.target.value)}
          />
        </label>
      ) : null}
      {visible.includes('departmentId') ? (
        <SelectFilter
          label="部門"
          value={filters.departmentId}
          items={masters?.departments}
          onChange={(value) => update('departmentId', value)}
        />
      ) : null}
      {visible.includes('projectId') ? (
        <SelectFilter
          label="プロジェクト"
          value={filters.projectId}
          items={masters?.projects}
          onChange={(value) => update('projectId', value)}
        />
      ) : null}
      {visible.includes('costCategoryId') ? (
        <SelectFilter
          label="費目"
          value={filters.costCategoryId}
          items={masters?.costCategories}
          onChange={(value) => update('costCategoryId', value)}
        />
      ) : null}
      {visible.includes('toolId') ? (
        <SelectFilter
          label="ツール"
          value={filters.toolId}
          items={masters?.tools}
          onChange={(value) => update('toolId', value)}
        />
      ) : null}
      {visible.includes('vendorId') ? (
        <SelectFilter
          label="ベンダー"
          value={filters.vendorId}
          items={masters?.vendors}
          onChange={(value) => update('vendorId', value)}
        />
      ) : null}
      <button type="button" className="secondary" onClick={onReset}>
        クリア
      </button>
    </section>
  )
}

function SelectFilter({
  label,
  value,
  items,
  onChange,
}: {
  label: string
  value: string
  items?: { id: number; name: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">すべて</option>
        {(items ?? []).map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  )
}
