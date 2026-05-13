import { eq } from 'drizzle-orm'
import { db, sql } from '../db/client.ts'
import {
  budgetActuals,
  contracts,
  costCategories,
  departments,
  projects,
  roles,
  tools,
  usageRecords,
  users,
  vendors,
} from '../db/schema.ts'

async function ensure<T extends { id: number }>(
  table: any,
  name: string,
  values: Record<string, unknown>,
): Promise<T> {
  const existing = await db
    .select()
    .from(table)
    .where(eq(table.name, name))
    .limit(1)
  if (existing[0]) return existing[0] as T
  const inserted = await db.insert(table).values(values).returning()
  return inserted[0] as T
}

const sales = await ensure<typeof departments.$inferSelect>(departments, '営業本部', {
  name: '営業本部',
})
const marketing = await ensure<typeof departments.$inferSelect>(
  departments,
  'マーケティング部',
  { name: 'マーケティング部' },
)
const it = await ensure<typeof departments.$inferSelect>(departments, '情報システム部', {
  name: '情報システム部',
})
const finance = await ensure<typeof departments.$inferSelect>(departments, '経理・財務部', {
  name: '経理・財務部',
})

const crmRefresh = await ensure<typeof projects.$inferSelect>(projects, '顧客管理刷新', {
  name: '顧客管理刷新',
  departmentId: sales.id,
})
const analytics = await ensure<typeof projects.$inferSelect>(projects, '顧客分析基盤', {
  name: '顧客分析基盤',
  departmentId: marketing.id,
})

const saasCost = await ensure<typeof costCategories.$inferSelect>(
  costCategories,
  'SaaS利用料',
  { name: 'SaaS利用料' },
)
const cloudCost = await ensure<typeof costCategories.$inferSelect>(
  costCategories,
  'クラウド従量課金',
  { name: 'クラウド従量課金' },
)

const salesforceVendor = await ensure<typeof vendors.$inferSelect>(
  vendors,
  'Salesforce, Inc.',
  { name: 'Salesforce, Inc.' },
)
const dataCloudVendor = await ensure<typeof vendors.$inferSelect>(
  vendors,
  'DataCloud',
  { name: 'DataCloud' },
)

const salesforce = await ensure<typeof tools.$inferSelect>(tools, 'Salesforce', {
  name: 'Salesforce',
  vendorId: salesforceVendor.id,
  category: 'CRM',
  departmentId: sales.id,
  importance: '高',
  securityStatus: '承認済み',
})
const usageApi = await ensure<typeof tools.$inferSelect>(tools, 'DataCloud API', {
  name: 'DataCloud API',
  vendorId: dataCloudVendor.id,
  category: 'データ基盤',
  departmentId: marketing.id,
  importance: '高',
  securityStatus: '承認済み',
})

const roleRows = [
  {
    name: '全体管理者',
    description: '全社データと権限設定を管理する',
    canManageSettings: true,
    canEditContracts: true,
    canEditFinance: true,
    canEditUsage: true,
  },
  {
    name: 'IT管理責任者',
    description: '契約、利用状況、従量課金を管理する',
    canManageSettings: false,
    canEditContracts: true,
    canEditFinance: false,
    canEditUsage: true,
  },
  {
    name: '財務管理者',
    description: '予算、実績、請求金額を管理する',
    canManageSettings: false,
    canEditContracts: false,
    canEditFinance: true,
    canEditUsage: false,
  },
  {
    name: '部門管理者',
    description: '自部門の契約、予実、利用状況を確認する',
    canManageSettings: false,
    canEditContracts: false,
    canEditFinance: false,
    canEditUsage: false,
  },
  {
    name: '閲覧者',
    description: '許可された範囲を閲覧する',
    canManageSettings: false,
    canEditContracts: false,
    canEditFinance: false,
    canEditUsage: false,
  },
]

for (const role of roleRows) {
  await ensure<typeof roles.$inferSelect>(roles, role.name, role)
}

const adminRole = await db.query.roles.findFirst({ where: eq(roles.name, '全体管理者') })
const itRole = await db.query.roles.findFirst({ where: eq(roles.name, 'IT管理責任者') })
const financeRole = await db.query.roles.findFirst({ where: eq(roles.name, '財務管理者') })

await db
  .insert(users)
  .values([
    {
      name: '山田 太郎',
      email: 'admin@example.com',
      departmentId: it.id,
      roleId: adminRole!.id,
    },
    {
      name: '佐藤 花子',
      email: 'it-manager@example.com',
      departmentId: it.id,
      roleId: itRole!.id,
    },
    {
      name: '鈴木 一郎',
      email: 'finance@example.com',
      departmentId: finance.id,
      roleId: financeRole!.id,
    },
  ])
  .onConflictDoNothing()

await db
  .insert(contracts)
  .values([
    {
      toolId: salesforce.id,
      vendorId: salesforceVendor.id,
      departmentId: sales.id,
      contractAmount: 24_000_000,
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      noticeDate: '2027-01-31',
      autoRenew: true,
      owner: '情シス SaaS管理チーム',
      status: '有効',
      risk: '中',
      memo: '営業本部のCRM基盤',
    },
    {
      toolId: usageApi.id,
      vendorId: dataCloudVendor.id,
      departmentId: marketing.id,
      contractAmount: 3_600_000,
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      noticeDate: '2027-01-15',
      autoRenew: false,
      owner: 'データ基盤チーム',
      status: '更新検討中',
      risk: '高',
      memo: '従量課金の急増を監視対象にする',
    },
  ])
  .onConflictDoNothing()

await db
  .insert(budgetActuals)
  .values([
    {
      periodMonth: '2026-04',
      fiscalYear: 2026,
      quarter: '2026年度Q1',
      departmentId: sales.id,
      projectId: crmRefresh.id,
      costCategoryId: saasCost.id,
      toolId: salesforce.id,
      vendorId: salesforceVendor.id,
      annualBudget: 30_000_000,
      monthlyActual: 2_100_000,
      fullYearForecast: 25_200_000,
    },
    {
      periodMonth: '2026-05',
      fiscalYear: 2026,
      quarter: '2026年度Q1',
      departmentId: marketing.id,
      projectId: analytics.id,
      costCategoryId: cloudCost.id,
      toolId: usageApi.id,
      vendorId: dataCloudVendor.id,
      annualBudget: 2_400_000,
      monthlyActual: 380_000,
      fullYearForecast: 4_560_000,
    },
  ])
  .onConflictDoNothing()

await db
  .insert(usageRecords)
  .values([
    {
      periodMonth: '2026-05',
      toolId: usageApi.id,
      departmentId: marketing.id,
      projectId: analytics.id,
      metric: 'APIコール数',
      quantity: 1_250_000,
      unit: '1,000コール',
      unitPrice: 120,
      estimatedCost: 150_000,
      budgetUsageRate: 82,
      monthOverMonthRate: 18,
    },
  ])
  .onConflictDoNothing()

await sql.end()
