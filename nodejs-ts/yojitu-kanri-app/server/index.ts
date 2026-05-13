import 'dotenv/config'
import { serve } from '@hono/node-server'
import { and, eq, sql as drizzleSql } from 'drizzle-orm'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { db } from '../db/client.ts'
import {
  auditLogs,
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
import type {
  BudgetActualInput,
  ContractInput,
  ImportPreview,
  ImportPreviewRow,
  ImportResult,
  UsageInput,
} from '../shared/types.ts'
import {
  fiscalYearFor,
  isDateText,
  isMonthText,
  numberValue,
  parseCsv,
  pick,
  quarterFor,
} from './utils.ts'

const app = new Hono()
const port = Number(process.env.API_PORT ?? 8787)

type Permission = 'canManageSettings' | 'canEditContracts' | 'canEditFinance' | 'canEditUsage'

async function getCurrentUser(userId: number) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      departmentId: users.departmentId,
      departmentName: departments.name,
      roleId: users.roleId,
      roleName: roles.name,
      canManageSettings: roles.canManageSettings,
      canEditContracts: roles.canEditContracts,
      canEditFinance: roles.canEditFinance,
      canEditUsage: roles.canEditUsage,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.id, userId))
    .limit(1)
  return user
}

async function currentUserFromHeader(c: Context) {
  const requestedUserId = Number(c.req.header('x-user-id') ?? 1)
  const user = await getCurrentUser(requestedUserId)
  if (user) return user
  const [fallback] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      departmentId: users.departmentId,
      departmentName: departments.name,
      roleId: users.roleId,
      roleName: roles.name,
      canManageSettings: roles.canManageSettings,
      canEditContracts: roles.canEditContracts,
      canEditFinance: roles.canEditFinance,
      canEditUsage: roles.canEditUsage,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .limit(1)
  return fallback
}

async function denyIfMissingPermission(
  c: Context,
  permission: Permission,
) {
  const user = await currentUserFromHeader(c)
  if (!user?.[permission]) {
    return c.json({ error: 'この操作を行う権限がありません' }, 403)
  }
  return null
}

async function addAudit(
  c: Context,
  target: string,
  action: string,
  summary: string,
  beforeValue: unknown = null,
  afterValue: unknown = null,
) {
  const user = await currentUserFromHeader(c)
  await db.insert(auditLogs).values({
    userId: user?.id,
    target,
    action,
    summary,
    beforeValue,
    afterValue,
    changedFields: changedFields(beforeValue, afterValue).join(', '),
  })
}

function changedFields(beforeValue: unknown, afterValue: unknown): string[] {
  if (!beforeValue || !afterValue || typeof beforeValue !== 'object' || typeof afterValue !== 'object') {
    return []
  }
  const beforeRecord = beforeValue as Record<string, unknown>
  const afterRecord = afterValue as Record<string, unknown>
  return [...new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])].filter(
    (key) => JSON.stringify(beforeRecord[key]) !== JSON.stringify(afterRecord[key]),
  )
}

function hasSelectedRow(selectedRows: number[] | undefined, rowNumber: number): boolean {
  return !selectedRows || selectedRows.length === 0 || selectedRows.includes(rowNumber)
}

async function ensureByName<TTable extends { name: any }>(
  table: TTable,
  name: string,
  values: Record<string, unknown>,
) {
  const [existing] = await db.select().from(table as any).where(eq(table.name, name)).limit(1)
  if (existing) return existing as { id: number; name: string }
  const [created] = await db.insert(table as any).values(values).returning()
  return created as { id: number; name: string }
}

async function masterNameSets() {
  const [departmentRows, projectRows, categoryRows, vendorRows, toolRows] = await Promise.all([
    db.select({ name: departments.name }).from(departments),
    db.select({ name: projects.name }).from(projects),
    db.select({ name: costCategories.name }).from(costCategories),
    db.select({ name: vendors.name }).from(vendors),
    db.select({ name: tools.name }).from(tools),
  ])
  return {
    departments: new Set(departmentRows.map((row) => row.name)),
    projects: new Set(projectRows.map((row) => row.name)),
    costCategories: new Set(categoryRows.map((row) => row.name)),
    vendors: new Set(vendorRows.map((row) => row.name)),
    tools: new Set(toolRows.map((row) => row.name)),
  }
}

async function previewContractCsv(csv: string): Promise<ImportPreview> {
  const rows = parseCsv(csv)
  const masters = await masterNameSets()
  const previewRows: ImportPreviewRow[] = rows.map((row, index) => {
    const rowNumber = index + 2
    const departmentName = pick(row, '担当部門', '部門')
    const vendorName = pick(row, 'ベンダー')
    const toolName = pick(row, 'ツール名', 'ツール')
    const category = pick(row, 'カテゴリ') || '未分類'
    const contractAmount = numberValue(pick(row, '契約金額'))
    const startDate = pick(row, '契約開始日') || '2026-04-01'
    const endDate = pick(row, '契約終了日') || '2027-03-31'
    const noticeDate = pick(row, '解約通知期限')
    const warnings: string[] = []
    const creates: string[] = []

    if (!departmentName || !vendorName || !toolName) {
      warnings.push('部門、ベンダー、ツール名のいずれかが不足')
    }
    if (contractAmount <= 0 || !isDateText(startDate) || !isDateText(endDate)) {
      warnings.push('契約金額、契約開始日、契約終了日の形式を確認してください')
    }
    if (noticeDate && !isDateText(noticeDate)) {
      warnings.push('解約通知期限の形式を確認してください')
    }
    if (departmentName && !masters.departments.has(departmentName)) creates.push(`部門: ${departmentName}`)
    if (vendorName && !masters.vendors.has(vendorName)) creates.push(`ベンダー: ${vendorName}`)
    if (toolName && !masters.tools.has(toolName)) creates.push(`ツール: ${toolName}`)

    return {
      rowNumber,
      valid: warnings.length === 0,
      warnings,
      creates,
      values: {
        toolName,
        vendorName,
        category,
        contractAmount,
        startDate,
        endDate,
        noticeDate: noticeDate || null,
        autoRenew: ['あり', 'true', 'TRUE', '1', 'yes'].includes(pick(row, '自動更新')),
        owner: pick(row, '契約責任者') || '未設定',
        departmentName,
      },
    }
  })
  return { rows: previewRows, warnings: previewRows.flatMap((row) => row.warnings) }
}

async function previewBudgetCsv(csv: string): Promise<ImportPreview> {
  const rows = parseCsv(csv)
  const masters = await masterNameSets()
  const previewRows: ImportPreviewRow[] = rows.map((row, index) => {
    const rowNumber = index + 2
    const periodMonth = pick(row, '対象年月')
    const departmentName = pick(row, '部門')
    const projectName = pick(row, 'プロジェクト')
    const categoryName = pick(row, '費目')
    const toolName = pick(row, 'ツール')
    const vendorName = pick(row, 'ベンダー')
    const warnings: string[] = []
    const creates: string[] = []

    if (!periodMonth || !departmentName || !projectName || !categoryName || !toolName || !vendorName) {
      warnings.push('対象年月または分析軸が不足')
    }
    if (periodMonth && !isMonthText(periodMonth)) {
      warnings.push('対象年月はYYYY-MM形式で指定してください')
    }
    if (departmentName && !masters.departments.has(departmentName)) creates.push(`部門: ${departmentName}`)
    if (projectName && !masters.projects.has(projectName)) creates.push(`プロジェクト: ${projectName}`)
    if (categoryName && !masters.costCategories.has(categoryName)) creates.push(`費目: ${categoryName}`)
    if (vendorName && !masters.vendors.has(vendorName)) creates.push(`ベンダー: ${vendorName}`)
    if (toolName && !masters.tools.has(toolName)) creates.push(`ツール: ${toolName}`)

    return {
      rowNumber,
      valid: warnings.length === 0,
      warnings,
      creates,
      values: {
        periodMonth,
        departmentName,
        projectName,
        categoryName,
        toolName,
        vendorName,
        fiscalYear: numberValue(pick(row, '対象年度')) || (periodMonth ? fiscalYearFor(periodMonth) : 0),
        quarter: pick(row, '対象四半期') || (periodMonth ? quarterFor(periodMonth) : ''),
        annualBudget: numberValue(pick(row, '年度予算')),
        monthlyActual: numberValue(pick(row, '月次実績')),
        fullYearForecast: numberValue(pick(row, '通期見込み')),
      },
    }
  })
  return { rows: previewRows, warnings: previewRows.flatMap((row) => row.warnings) }
}

async function listContracts() {
  return db
    .select({
      id: contracts.id,
      toolId: contracts.toolId,
      toolName: tools.name,
      vendorId: contracts.vendorId,
      vendorName: vendors.name,
      departmentId: contracts.departmentId,
      departmentName: departments.name,
      contractAmount: contracts.contractAmount,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      noticeDate: contracts.noticeDate,
      autoRenew: contracts.autoRenew,
      owner: contracts.owner,
      status: contracts.status,
      risk: contracts.risk,
      memo: contracts.memo,
    })
    .from(contracts)
    .innerJoin(tools, eq(contracts.toolId, tools.id))
    .innerJoin(vendors, eq(contracts.vendorId, vendors.id))
    .innerJoin(departments, eq(contracts.departmentId, departments.id))
    .orderBy(contracts.endDate)
}

async function listBudgetActuals() {
  return db
    .select({
      id: budgetActuals.id,
      periodMonth: budgetActuals.periodMonth,
      fiscalYear: budgetActuals.fiscalYear,
      quarter: budgetActuals.quarter,
      departmentId: budgetActuals.departmentId,
      departmentName: departments.name,
      projectId: budgetActuals.projectId,
      projectName: projects.name,
      costCategoryId: budgetActuals.costCategoryId,
      costCategoryName: costCategories.name,
      toolId: budgetActuals.toolId,
      toolName: tools.name,
      vendorId: budgetActuals.vendorId,
      vendorName: vendors.name,
      annualBudget: budgetActuals.annualBudget,
      monthlyActual: budgetActuals.monthlyActual,
      fullYearForecast: budgetActuals.fullYearForecast,
    })
    .from(budgetActuals)
    .innerJoin(departments, eq(budgetActuals.departmentId, departments.id))
    .innerJoin(projects, eq(budgetActuals.projectId, projects.id))
    .innerJoin(costCategories, eq(budgetActuals.costCategoryId, costCategories.id))
    .innerJoin(tools, eq(budgetActuals.toolId, tools.id))
    .innerJoin(vendors, eq(budgetActuals.vendorId, vendors.id))
    .orderBy(budgetActuals.periodMonth)
}

async function listUsageRecords() {
  return db
    .select({
      id: usageRecords.id,
      periodMonth: usageRecords.periodMonth,
      toolId: usageRecords.toolId,
      toolName: tools.name,
      departmentId: usageRecords.departmentId,
      departmentName: departments.name,
      projectId: usageRecords.projectId,
      projectName: projects.name,
      metric: usageRecords.metric,
      quantity: usageRecords.quantity,
      unit: usageRecords.unit,
      unitPrice: usageRecords.unitPrice,
      estimatedCost: usageRecords.estimatedCost,
      budgetUsageRate: usageRecords.budgetUsageRate,
      monthOverMonthRate: usageRecords.monthOverMonthRate,
    })
    .from(usageRecords)
    .innerJoin(tools, eq(usageRecords.toolId, tools.id))
    .innerJoin(departments, eq(usageRecords.departmentId, departments.id))
    .leftJoin(projects, eq(usageRecords.projectId, projects.id))
    .orderBy(usageRecords.periodMonth)
}

async function listUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      departmentId: users.departmentId,
      departmentName: departments.name,
      roleId: users.roleId,
      roleName: roles.name,
      canManageSettings: roles.canManageSettings,
      canEditContracts: roles.canEditContracts,
      canEditFinance: roles.canEditFinance,
      canEditUsage: roles.canEditUsage,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .orderBy(users.id)
}

app.get('/api/health', (c) => c.json({ ok: true }))

app.get('/api/me', async (c) => c.json(await currentUserFromHeader(c)))

app.get('/api/masters', async (c) => {
  const [departmentRows, projectRows, categoryRows, vendorRows, toolRows, roleRows] =
    await Promise.all([
      db.select().from(departments).orderBy(departments.name),
      db.select().from(projects).orderBy(projects.name),
      db.select().from(costCategories).orderBy(costCategories.name),
      db.select().from(vendors).orderBy(vendors.name),
      db.select().from(tools).orderBy(tools.name),
      db.select().from(roles).orderBy(roles.id),
    ])
  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      departmentId: users.departmentId,
      departmentName: departments.name,
      roleId: users.roleId,
      roleName: roles.name,
      canManageSettings: roles.canManageSettings,
      canEditContracts: roles.canEditContracts,
      canEditFinance: roles.canEditFinance,
      canEditUsage: roles.canEditUsage,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .orderBy(users.id)
  return c.json({
    departments: departmentRows,
    projects: projectRows,
    costCategories: categoryRows,
    vendors: vendorRows,
    tools: toolRows,
    roles: roleRows,
    users: userRows,
  })
})

app.get('/api/dashboard', async (c) => {
  const [actualRows, contractRows, usageRows] = await Promise.all([
    listBudgetActuals(),
    listContracts(),
    listUsageRecords(),
  ])
  const annualBudget = actualRows.reduce((sum, row) => sum + row.annualBudget, 0)
  const actualTotal = actualRows.reduce((sum, row) => sum + row.monthlyActual, 0)
  const forecastTotal = actualRows.reduce((sum, row) => sum + row.fullYearForecast, 0)
  const renewalWithin90Days = contractRows.filter((row) => {
    const end = new Date(row.endDate)
    const now = new Date()
    const days = (end.getTime() - now.getTime()) / 86_400_000
    return days >= 0 && days <= 90
  }).length
  return c.json({
    annualBudget,
    actualTotal,
    forecastTotal,
    budgetUsageRate: annualBudget > 0 ? Math.round((actualTotal / annualBudget) * 100) : 0,
    overrunForecast: Math.max(0, forecastTotal - annualBudget),
    renewalWithin90Days,
    reductionCandidate: contractRows
      .filter((row) => row.risk === '高' || row.status === '更新検討中')
      .reduce((sum, row) => sum + Math.round(row.contractAmount * 0.12), 0),
    usageForecast: usageRows.reduce((sum, row) => sum + row.estimatedCost, 0),
    usageSpikeCount: usageRows.filter((row) => row.monthOverMonthRate >= 15).length,
  })
})

app.get('/api/contracts', async (c) => c.json(await listContracts()))

app.post('/api/contracts', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canEditContracts')
  if (denied) return denied
  const body = await c.req.json<ContractInput>()
  const [created] = await db.insert(contracts).values(body).returning()
  await addAudit(c, 'contracts', 'create', `契約ID ${created.id} を作成`, null, created)
  return c.json(created, 201)
})

app.put('/api/contracts/:id', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canEditContracts')
  if (denied) return denied
  const id = Number(c.req.param('id'))
  const body = await c.req.json<ContractInput>()
  const [before] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1)
  const [updated] = await db
    .update(contracts)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(contracts.id, id))
    .returning()
  await addAudit(c, 'contracts', 'update', `契約ID ${id} を更新`, before, updated)
  return c.json(updated)
})

app.delete('/api/contracts/:id', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canEditContracts')
  if (denied) return denied
  const id = Number(c.req.param('id'))
  const [before] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1)
  await db.delete(contracts).where(eq(contracts.id, id))
  await addAudit(c, 'contracts', 'delete', `契約ID ${id} を削除`, before, null)
  return c.json({ ok: true })
})

app.get('/api/budget-actuals', async (c) => c.json(await listBudgetActuals()))

app.post('/api/budget-actuals', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canEditFinance')
  if (denied) return denied
  const body = await c.req.json<BudgetActualInput>()
  const [created] = await db.insert(budgetActuals).values(body).returning()
  await addAudit(c, 'budget_actuals', 'create', `予実ID ${created.id} を作成`, null, created)
  return c.json(created, 201)
})

app.put('/api/budget-actuals/:id', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canEditFinance')
  if (denied) return denied
  const id = Number(c.req.param('id'))
  const body = await c.req.json<BudgetActualInput>()
  const [before] = await db.select().from(budgetActuals).where(eq(budgetActuals.id, id)).limit(1)
  const [updated] = await db
    .update(budgetActuals)
    .set(body)
    .where(eq(budgetActuals.id, id))
    .returning()
  await addAudit(c, 'budget_actuals', 'update', `予実ID ${id} を更新`, before, updated)
  return c.json(updated)
})

app.delete('/api/budget-actuals/:id', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canEditFinance')
  if (denied) return denied
  const id = Number(c.req.param('id'))
  const [before] = await db.select().from(budgetActuals).where(eq(budgetActuals.id, id)).limit(1)
  await db.delete(budgetActuals).where(eq(budgetActuals.id, id))
  await addAudit(c, 'budget_actuals', 'delete', `予実ID ${id} を削除`, before, null)
  return c.json({ ok: true })
})

app.get('/api/usage-records', async (c) => c.json(await listUsageRecords()))

app.post('/api/usage-records', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canEditUsage')
  if (denied) return denied
  const body = await c.req.json<UsageInput>()
  const [created] = await db.insert(usageRecords).values(body).returning()
  await addAudit(c, 'usage_records', 'create', `利用量ID ${created.id} を作成`, null, created)
  return c.json(created, 201)
})

app.put('/api/usage-records/:id', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canEditUsage')
  if (denied) return denied
  const id = Number(c.req.param('id'))
  const body = await c.req.json<UsageInput>()
  const [before] = await db.select().from(usageRecords).where(eq(usageRecords.id, id)).limit(1)
  const [updated] = await db
    .update(usageRecords)
    .set(body)
    .where(eq(usageRecords.id, id))
    .returning()
  await addAudit(c, 'usage_records', 'update', `利用量ID ${id} を更新`, before, updated)
  return c.json(updated)
})

app.delete('/api/usage-records/:id', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canEditUsage')
  if (denied) return denied
  const id = Number(c.req.param('id'))
  const [before] = await db.select().from(usageRecords).where(eq(usageRecords.id, id)).limit(1)
  await db.delete(usageRecords).where(eq(usageRecords.id, id))
  await addAudit(c, 'usage_records', 'delete', `利用量ID ${id} を削除`, before, null)
  return c.json({ ok: true })
})

app.get('/api/users', async (c) => c.json(await listUsers()))

app.post('/api/users', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canManageSettings')
  if (denied) return denied
  const body = await c.req.json<{
    name: string
    email: string
    departmentId: number | null
    roleId: number
  }>()
  const [created] = await db.insert(users).values(body).returning()
  await addAudit(c, 'users', 'create', `ユーザーID ${created.id} を作成`, null, created)
  return c.json(created, 201)
})

app.put('/api/users/:id', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canManageSettings')
  if (denied) return denied
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    name: string
    email: string
    departmentId: number | null
    roleId: number
  }>()
  const [before] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  const [updated] = await db.update(users).set(body).where(eq(users.id, id)).returning()
  await addAudit(c, 'users', 'update', `ユーザーID ${id} を更新`, before, updated)
  return c.json(updated)
})

app.delete('/api/users/:id', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canManageSettings')
  if (denied) return denied
  const id = Number(c.req.param('id'))
  const [before] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  await db.delete(users).where(eq(users.id, id))
  await addAudit(c, 'users', 'delete', `ユーザーID ${id} を削除`, before, null)
  return c.json({ ok: true })
})

app.post('/api/import/contracts/preview', async (c) => {
  const { csv } = await c.req.json<{ csv: string }>()
  return c.json(await previewContractCsv(csv))
})

app.post('/api/import/contracts', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canEditContracts')
  if (denied) return denied
  const { csv, selectedRows } = await c.req.json<{ csv: string; selectedRows?: number[] }>()
  const rows = parseCsv(csv)
  const result: ImportResult = { inserted: 0, warnings: [] }

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2
    if (!hasSelectedRow(selectedRows, rowNumber)) continue
    const departmentName = pick(row, '担当部門', '部門')
    const vendorName = pick(row, 'ベンダー')
    const toolName = pick(row, 'ツール名', 'ツール')
    const category = pick(row, 'カテゴリ') || '未分類'
    if (!departmentName || !vendorName || !toolName) {
      result.warnings.push(`${rowNumber}行目: 部門、ベンダー、ツール名のいずれかが不足`)
      continue
    }
    const contractAmount = numberValue(pick(row, '契約金額'))
    const startDate = pick(row, '契約開始日') || '2026-04-01'
    const endDate = pick(row, '契約終了日') || '2027-03-31'
    const noticeDate = pick(row, '解約通知期限')
    if (contractAmount <= 0 || !isDateText(startDate) || !isDateText(endDate)) {
      result.warnings.push(
        `${rowNumber}行目: 契約金額、契約開始日、契約終了日の形式を確認してください`,
      )
      continue
    }
    if (noticeDate && !isDateText(noticeDate)) {
      result.warnings.push(`${rowNumber}行目: 解約通知期限の形式を確認してください`)
      continue
    }
    const department = await ensureByName(departments, departmentName, { name: departmentName })
    const vendor = await ensureByName(vendors, vendorName, { name: vendorName })
    const tool = await ensureByName(tools, toolName, {
      name: toolName,
      vendorId: vendor.id,
      category,
      departmentId: department.id,
    })
    await db.insert(contracts).values({
      toolId: tool.id,
      vendorId: vendor.id,
      departmentId: department.id,
      contractAmount,
      startDate,
      endDate,
      noticeDate: noticeDate || null,
      autoRenew: ['あり', 'true', 'TRUE', '1', 'yes'].includes(pick(row, '自動更新')),
      owner: pick(row, '契約責任者') || '未設定',
      status: pick(row, '契約ステータス') || '有効',
      risk: pick(row, '契約リスク') || '中',
      memo: pick(row, 'メモ'),
    })
    result.inserted += 1
  }
  await addAudit(
    c,
    'contracts',
    'import',
    `契約CSVから${result.inserted}件取り込み`,
    null,
    { inserted: result.inserted, selectedRows: selectedRows ?? 'all' },
  )
  return c.json(result)
})

app.post('/api/import/budget-actuals/preview', async (c) => {
  const { csv } = await c.req.json<{ csv: string }>()
  return c.json(await previewBudgetCsv(csv))
})

app.post('/api/import/budget-actuals', async (c) => {
  const denied = await denyIfMissingPermission(c, 'canEditFinance')
  if (denied) return denied
  const { csv, selectedRows } = await c.req.json<{ csv: string; selectedRows?: number[] }>()
  const rows = parseCsv(csv)
  const result: ImportResult = { inserted: 0, warnings: [] }

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2
    if (!hasSelectedRow(selectedRows, rowNumber)) continue
    const periodMonth = pick(row, '対象年月')
    const departmentName = pick(row, '部門')
    const projectName = pick(row, 'プロジェクト')
    const categoryName = pick(row, '費目')
    const toolName = pick(row, 'ツール')
    const vendorName = pick(row, 'ベンダー')
    if (!periodMonth || !departmentName || !projectName || !categoryName || !toolName || !vendorName) {
      result.warnings.push(`${rowNumber}行目: 対象年月または分析軸が不足`)
      continue
    }
    if (!isMonthText(periodMonth)) {
      result.warnings.push(`${rowNumber}行目: 対象年月はYYYY-MM形式で指定してください`)
      continue
    }
    const department = await ensureByName(departments, departmentName, { name: departmentName })
    const project = await ensureByName(projects, projectName, {
      name: projectName,
      departmentId: department.id,
    })
    const category = await ensureByName(costCategories, categoryName, { name: categoryName })
    const vendor = await ensureByName(vendors, vendorName, { name: vendorName })
    const tool = await ensureByName(tools, toolName, {
      name: toolName,
      vendorId: vendor.id,
      category: categoryName,
      departmentId: department.id,
    })
    await db.insert(budgetActuals).values({
      periodMonth,
      fiscalYear: numberValue(pick(row, '対象年度')) || fiscalYearFor(periodMonth),
      quarter: pick(row, '対象四半期') || quarterFor(periodMonth),
      departmentId: department.id,
      projectId: project.id,
      costCategoryId: category.id,
      toolId: tool.id,
      vendorId: vendor.id,
      annualBudget: numberValue(pick(row, '年度予算')),
      monthlyActual: numberValue(pick(row, '月次実績')),
      fullYearForecast: numberValue(pick(row, '通期見込み')),
    })
    result.inserted += 1
  }
  await addAudit(
    c,
    'budget_actuals',
    'import',
    `予実CSVから${result.inserted}件取り込み`,
    null,
    { inserted: result.inserted, selectedRows: selectedRows ?? 'all' },
  )
  return c.json(result)
})

app.get('/api/audit-logs', async (c) => {
  const rows = await db
    .select({
      id: auditLogs.id,
      target: auditLogs.target,
      action: auditLogs.action,
      summary: auditLogs.summary,
      beforeValue: auditLogs.beforeValue,
      afterValue: auditLogs.afterValue,
      changedFields: auditLogs.changedFields,
      createdAt: auditLogs.createdAt,
      userName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(drizzleSql`${auditLogs.createdAt} desc`)
    .limit(30)
  return c.json(rows)
})

app.get('/api/find-budget', async (c) => {
  const periodMonth = c.req.query('periodMonth')
  const departmentId = Number(c.req.query('departmentId'))
  const toolId = Number(c.req.query('toolId'))
  if (!periodMonth || !departmentId || !toolId) return c.json(null)
  const [row] = await db
    .select()
    .from(budgetActuals)
    .where(
      and(
        eq(budgetActuals.periodMonth, periodMonth),
        eq(budgetActuals.departmentId, departmentId),
        eq(budgetActuals.toolId, toolId),
      ),
    )
    .limit(1)
  return c.json(row ?? null)
})

serve({ fetch: app.fetch, port })
console.log(`API server running on http://localhost:${port}`)
