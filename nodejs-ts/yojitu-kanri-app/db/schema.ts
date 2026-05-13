import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull().unique(),
})

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 160 }).notNull().unique(),
  departmentId: integer('department_id').references(() => departments.id),
})

export const costCategories = pgTable('cost_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull().unique(),
})

export const vendors = pgTable('vendors', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 160 }).notNull().unique(),
})

export const tools = pgTable('tools', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 160 }).notNull().unique(),
  vendorId: integer('vendor_id').references(() => vendors.id),
  category: varchar('category', { length: 120 }).notNull(),
  departmentId: integer('department_id').references(() => departments.id),
  importance: varchar('importance', { length: 40 }).notNull().default('中'),
  securityStatus: varchar('security_status', { length: 80 })
    .notNull()
    .default('確認中'),
})

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 80 }).notNull().unique(),
  description: text('description').notNull(),
  canManageSettings: boolean('can_manage_settings').notNull().default(false),
  canEditContracts: boolean('can_edit_contracts').notNull().default(false),
  canEditFinance: boolean('can_edit_finance').notNull().default(false),
  canEditUsage: boolean('can_edit_usage').notNull().default(false),
})

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 180 }).notNull().unique(),
  departmentId: integer('department_id').references(() => departments.id),
  roleId: integer('role_id')
    .notNull()
    .references(() => roles.id),
})

export const contracts = pgTable('contracts', {
  id: serial('id').primaryKey(),
  toolId: integer('tool_id')
    .notNull()
    .references(() => tools.id),
  vendorId: integer('vendor_id')
    .notNull()
    .references(() => vendors.id),
  departmentId: integer('department_id')
    .notNull()
    .references(() => departments.id),
  contractAmount: integer('contract_amount').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  noticeDate: date('notice_date'),
  autoRenew: boolean('auto_renew').notNull().default(false),
  owner: varchar('owner', { length: 160 }).notNull(),
  status: varchar('status', { length: 80 }).notNull().default('有効'),
  risk: varchar('risk', { length: 40 }).notNull().default('中'),
  memo: text('memo').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const budgetActuals = pgTable('budget_actuals', {
  id: serial('id').primaryKey(),
  periodMonth: varchar('period_month', { length: 7 }).notNull(),
  fiscalYear: integer('fiscal_year').notNull(),
  quarter: varchar('quarter', { length: 20 }).notNull(),
  departmentId: integer('department_id')
    .notNull()
    .references(() => departments.id),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  costCategoryId: integer('cost_category_id')
    .notNull()
    .references(() => costCategories.id),
  toolId: integer('tool_id')
    .notNull()
    .references(() => tools.id),
  vendorId: integer('vendor_id')
    .notNull()
    .references(() => vendors.id),
  annualBudget: integer('annual_budget').notNull(),
  monthlyActual: integer('monthly_actual').notNull(),
  fullYearForecast: integer('full_year_forecast').notNull(),
})

export const usageRecords = pgTable('usage_records', {
  id: serial('id').primaryKey(),
  periodMonth: varchar('period_month', { length: 7 }).notNull(),
  toolId: integer('tool_id')
    .notNull()
    .references(() => tools.id),
  departmentId: integer('department_id')
    .notNull()
    .references(() => departments.id),
  projectId: integer('project_id').references(() => projects.id),
  metric: varchar('metric', { length: 120 }).notNull(),
  quantity: integer('quantity').notNull(),
  unit: varchar('unit', { length: 80 }).notNull(),
  unitPrice: integer('unit_price').notNull(),
  estimatedCost: integer('estimated_cost').notNull(),
  budgetUsageRate: integer('budget_usage_rate').notNull(),
  monthOverMonthRate: integer('month_over_month_rate').notNull(),
})

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  target: varchar('target', { length: 120 }).notNull(),
  action: varchar('action', { length: 80 }).notNull(),
  summary: text('summary').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
