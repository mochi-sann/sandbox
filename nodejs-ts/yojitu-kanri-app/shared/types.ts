export type MasterItem = {
  id: number
  name: string
}

export type Role = MasterItem & {
  description: string
  canManageSettings: boolean
  canEditContracts: boolean
  canEditFinance: boolean
  canEditUsage: boolean
}

export type AppUser = {
  id: number
  name: string
  email: string
  departmentId: number | null
  departmentName: string | null
  roleId: number
  roleName: string
  canManageSettings: boolean
  canEditContracts: boolean
  canEditFinance: boolean
  canEditUsage: boolean
}

export type Masters = {
  departments: MasterItem[]
  projects: (MasterItem & { departmentId: number | null })[]
  costCategories: MasterItem[]
  vendors: MasterItem[]
  tools: (MasterItem & {
    vendorId: number | null
    departmentId: number | null
    category: string
  })[]
  roles: Role[]
  users: AppUser[]
}

export type ContractRecord = {
  id: number
  toolId: number
  toolName: string
  vendorId: number
  vendorName: string
  departmentId: number
  departmentName: string
  contractAmount: number
  startDate: string
  endDate: string
  noticeDate: string | null
  autoRenew: boolean
  owner: string
  status: string
  risk: string
  memo: string
}

export type ContractInput = {
  toolId: number
  vendorId: number
  departmentId: number
  contractAmount: number
  startDate: string
  endDate: string
  noticeDate?: string | null
  autoRenew: boolean
  owner: string
  status: string
  risk: string
  memo?: string
}

export type BudgetActualRecord = {
  id: number
  periodMonth: string
  fiscalYear: number
  quarter: string
  departmentId: number
  departmentName: string
  projectId: number
  projectName: string
  costCategoryId: number
  costCategoryName: string
  toolId: number
  toolName: string
  vendorId: number
  vendorName: string
  annualBudget: number
  monthlyActual: number
  fullYearForecast: number
}

export type BudgetActualInput = {
  periodMonth: string
  fiscalYear: number
  quarter: string
  departmentId: number
  projectId: number
  costCategoryId: number
  toolId: number
  vendorId: number
  annualBudget: number
  monthlyActual: number
  fullYearForecast: number
}

export type UsageRecord = {
  id: number
  periodMonth: string
  toolId: number
  toolName: string
  departmentId: number
  departmentName: string
  projectId: number | null
  projectName: string | null
  metric: string
  quantity: number
  unit: string
  unitPrice: number
  estimatedCost: number
  budgetUsageRate: number
  monthOverMonthRate: number
}

export type UsageInput = {
  periodMonth: string
  toolId: number
  departmentId: number
  projectId?: number | null
  metric: string
  quantity: number
  unit: string
  unitPrice: number
  estimatedCost: number
  budgetUsageRate: number
  monthOverMonthRate: number
}

export type Dashboard = {
  annualBudget: number
  actualTotal: number
  forecastTotal: number
  budgetUsageRate: number
  overrunForecast: number
  renewalWithin90Days: number
  reductionCandidate: number
  usageForecast: number
  usageSpikeCount: number
}

export type AnalysisRow = {
  label: string
  budget: number
  actual: number
  forecast: number
  variance: number
  varianceRate: number
}

export type ImportResult = {
  inserted: number
  warnings: string[]
}

export type ImportPreviewRow = {
  rowNumber: number
  valid: boolean
  warnings: string[]
  creates: string[]
  values: Record<string, string | number | boolean | null>
}

export type ImportPreview = {
  rows: ImportPreviewRow[]
  warnings: string[]
}

export type AuditLogRecord = {
  id: number
  target: string
  action: string
  summary: string
  beforeValue: unknown
  afterValue: unknown
  changedFields: string
  createdAt: string
  userName: string | null
}
