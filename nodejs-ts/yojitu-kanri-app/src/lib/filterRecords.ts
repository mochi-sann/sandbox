import type { CommonFilters } from '../components/FilterBar'
import type { BudgetActualRecord, ContractRecord, UsageRecord } from '../../shared/types'

function matchesSearch(values: unknown[], search: string): boolean {
  const normalized = search.trim().toLowerCase()
  if (!normalized) return true
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalized))
}

function matchesId(filterValue: string, actual: number | null | undefined): boolean {
  return !filterValue || Number(filterValue) === actual
}

export function filterContracts(records: ContractRecord[], filters: CommonFilters) {
  return records.filter(
    (record) =>
      matchesId(filters.departmentId, record.departmentId) &&
      matchesId(filters.toolId, record.toolId) &&
      matchesId(filters.vendorId, record.vendorId) &&
      matchesSearch(
        [record.toolName, record.vendorName, record.departmentName, record.owner, record.status, record.risk],
        filters.search,
      ),
  )
}

export function filterBudgetActuals(records: BudgetActualRecord[], filters: CommonFilters) {
  return records.filter(
    (record) =>
      (!filters.periodMonth || record.periodMonth === filters.periodMonth) &&
      matchesId(filters.departmentId, record.departmentId) &&
      matchesId(filters.projectId, record.projectId) &&
      matchesId(filters.costCategoryId, record.costCategoryId) &&
      matchesId(filters.toolId, record.toolId) &&
      matchesId(filters.vendorId, record.vendorId) &&
      matchesSearch(
        [
          record.periodMonth,
          record.departmentName,
          record.projectName,
          record.costCategoryName,
          record.toolName,
          record.vendorName,
        ],
        filters.search,
      ),
  )
}

export function filterUsageRecords(records: UsageRecord[], filters: CommonFilters) {
  return records.filter(
    (record) =>
      (!filters.periodMonth || record.periodMonth === filters.periodMonth) &&
      matchesId(filters.departmentId, record.departmentId) &&
      matchesId(filters.projectId, record.projectId) &&
      matchesId(filters.toolId, record.toolId) &&
      matchesSearch(
        [record.periodMonth, record.departmentName, record.projectName, record.toolName, record.metric, record.unit],
        filters.search,
      ),
  )
}
