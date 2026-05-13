import type {
  AppUser,
  BudgetActualInput,
  BudgetActualRecord,
  ContractInput,
  ContractRecord,
  Dashboard,
  AuditLogRecord,
  ImportPreview,
  ImportResult,
  Masters,
  UsageInput,
  UsageRecord,
} from '../shared/types'

type ApiOptions = {
  userId: number
}

async function request<T>(
  path: string,
  options: ApiOptions,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': String(options.userId),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(error?.error ?? `API error: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export const api = {
  dashboard: (options: ApiOptions) => request<Dashboard>('/api/dashboard', options),
  masters: (options: ApiOptions) => request<Masters>('/api/masters', options),
  me: (options: ApiOptions) => request<AppUser>('/api/me', options),
  contracts: (options: ApiOptions) => request<ContractRecord[]>('/api/contracts', options),
  createContract: (options: ApiOptions, body: ContractInput) =>
    request<ContractRecord>('/api/contracts', options, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateContract: (options: ApiOptions, id: number, body: ContractInput) =>
    request<ContractRecord>(`/api/contracts/${id}`, options, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteContract: (options: ApiOptions, id: number) =>
    request<{ ok: boolean }>(`/api/contracts/${id}`, options, { method: 'DELETE' }),
  budgetActuals: (options: ApiOptions) =>
    request<BudgetActualRecord[]>('/api/budget-actuals', options),
  createBudgetActual: (options: ApiOptions, body: BudgetActualInput) =>
    request<BudgetActualRecord>('/api/budget-actuals', options, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateBudgetActual: (options: ApiOptions, id: number, body: BudgetActualInput) =>
    request<BudgetActualRecord>(`/api/budget-actuals/${id}`, options, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteBudgetActual: (options: ApiOptions, id: number) =>
    request<{ ok: boolean }>(`/api/budget-actuals/${id}`, options, { method: 'DELETE' }),
  usageRecords: (options: ApiOptions) => request<UsageRecord[]>('/api/usage-records', options),
  createUsageRecord: (options: ApiOptions, body: UsageInput) =>
    request<UsageRecord>('/api/usage-records', options, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateUsageRecord: (options: ApiOptions, id: number, body: UsageInput) =>
    request<UsageRecord>(`/api/usage-records/${id}`, options, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteUsageRecord: (options: ApiOptions, id: number) =>
    request<{ ok: boolean }>(`/api/usage-records/${id}`, options, { method: 'DELETE' }),
  users: (options: ApiOptions) => request<AppUser[]>('/api/users', options),
  createUser: (
    options: ApiOptions,
    body: { name: string; email: string; departmentId: number | null; roleId: number },
  ) =>
    request<AppUser>('/api/users', options, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateUser: (
    options: ApiOptions,
    id: number,
    body: { name: string; email: string; departmentId: number | null; roleId: number },
  ) =>
    request<AppUser>(`/api/users/${id}`, options, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteUser: (options: ApiOptions, id: number) =>
    request<{ ok: boolean }>(`/api/users/${id}`, options, { method: 'DELETE' }),
  previewContractsImport: (options: ApiOptions, csv: string) =>
    request<ImportPreview>('/api/import/contracts/preview', options, {
      method: 'POST',
      body: JSON.stringify({ csv }),
    }),
  importContracts: (options: ApiOptions, csv: string, selectedRows?: number[]) =>
    request<ImportResult>('/api/import/contracts', options, {
      method: 'POST',
      body: JSON.stringify({ csv, selectedRows }),
    }),
  previewBudgetActualsImport: (options: ApiOptions, csv: string) =>
    request<ImportPreview>('/api/import/budget-actuals/preview', options, {
      method: 'POST',
      body: JSON.stringify({ csv }),
    }),
  importBudgetActuals: (options: ApiOptions, csv: string, selectedRows?: number[]) =>
    request<ImportResult>('/api/import/budget-actuals', options, {
      method: 'POST',
      body: JSON.stringify({ csv, selectedRows }),
    }),
  auditLogs: (options: ApiOptions) => request<AuditLogRecord[]>('/api/audit-logs', options),
}
