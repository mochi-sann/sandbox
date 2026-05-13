import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import type {
  AppUser,
  BudgetActualInput,
  BudgetActualRecord,
  ContractInput,
  ContractRecord,
  Dashboard,
  ImportResult,
  Masters,
  UsageInput,
  UsageRecord,
} from '../shared/types'
import './App.css'

type AppContextValue = {
  userId: number
  setUserId: (userId: number) => void
  currentUser: AppUser | null
  masters: Masters | null
  refreshMasters: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

const yen = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

const numberFormat = new Intl.NumberFormat('ja-JP')

function useAppContext() {
  const context = useContext(AppContext)
  if (!context) throw new Error('AppContext is missing')
  return context
}

function useAsync<T>(load: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setData(await load())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, deps)

  return { data, error, loading, refresh }
}

function asNumber(value: FormDataEntryValue | null): number {
  return Number(String(value ?? '0').replace(/[,\s]/g, '')) || 0
}

function asString(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim()
}

function asOptionalString(value: FormDataEntryValue | null): string | null {
  const result = asString(value)
  return result.length > 0 ? result : null
}

function AppShell() {
  const [userId, setUserId] = useState(1)
  const [masters, setMasters] = useState<Masters | null>(null)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function refreshMasters() {
    try {
      const [mastersResult, userResult] = await Promise.all([
        api.masters({ userId }),
        api.me({ userId }),
      ])
      setMasters(mastersResult)
      setCurrentUser(userResult)
      setLoadError(null)
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : 'APIに接続できません')
    }
  }

  useEffect(() => {
    void refreshMasters()
  }, [userId])

  const context = useMemo(
    () => ({ userId, setUserId, currentUser, masters, refreshMasters }),
    [userId, currentUser, masters],
  )

  return (
    <AppContext.Provider value={context}>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">予</span>
            <div>
              <strong>予実管理</strong>
              <small>SaaS & IT Cost Ops</small>
            </div>
          </div>
          <nav>
            <Link to="/">ダッシュボード</Link>
            <Link to="/contracts">契約台帳</Link>
            <Link to="/analysis">予実分析</Link>
            <Link to="/usage">従量課金</Link>
            <Link to="/import">CSV取り込み</Link>
            <Link to="/permissions">権限管理</Link>
          </nav>
        </aside>
        <main className="workspace">
          <header className="topbar">
            <div>
              <p className="eyebrow">2026年度 / プロトタイプ</p>
              <h1>ITツールの契約・予実・利用量を一元管理</h1>
            </div>
            <label className="role-switcher">
              操作ユーザー
              <select value={userId} onChange={(event) => setUserId(Number(event.target.value))}>
                {(masters?.users ?? []).map((user) => (
                  <option value={user.id} key={user.id}>
                    {user.name} / {user.roleName}
                  </option>
                ))}
              </select>
            </label>
          </header>
          {currentUser ? (
            <div className="permission-banner">
              <strong>{currentUser.roleName}</strong>
              <span>{currentUser.departmentName ?? '全社'} の権限で表示中</span>
              <span>
                契約 {currentUser.canEditContracts ? '編集可' : '閲覧のみ'} / 予実{' '}
                {currentUser.canEditFinance ? '編集可' : '閲覧のみ'} / 利用量{' '}
                {currentUser.canEditUsage ? '編集可' : '閲覧のみ'}
              </span>
            </div>
          ) : null}
          {loadError ? <div className="alert">{loadError}</div> : <Outlet />}
        </main>
      </div>
    </AppContext.Provider>
  )
}

function LoadingState({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) return <div className="panel">読み込み中...</div>
  if (error) return <div className="alert">{error}</div>
  return null
}

function DashboardPage() {
  const { userId } = useAppContext()
  const { data, error, loading } = useAsync<Dashboard>(() => api.dashboard({ userId }), [userId])
  if (loading || error || !data) return <LoadingState loading={loading} error={error} />

  const cards = [
    ['年間予算', yen.format(data.annualBudget)],
    ['累計実績', yen.format(data.actualTotal)],
    ['予算消化率', `${data.budgetUsageRate}%`],
    ['予算超過見込み', yen.format(data.overrunForecast)],
    ['90日以内の更新', `${data.renewalWithin90Days}件`],
    ['削減候補', yen.format(data.reductionCandidate)],
    ['従量課金見込み', yen.format(data.usageForecast)],
    ['利用量急増', `${data.usageSpikeCount}件`],
  ]

  return (
    <section className="page-grid">
      <div className="kpi-grid">
        {cards.map(([label, value]) => (
          <article className="kpi" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="panel">
        <h2>今月の重点確認</h2>
        <div className="stacked-bars">
          <div>
            <span>予算消化</span>
            <progress max="100" value={Math.min(data.budgetUsageRate, 100)} />
          </div>
          <div>
            <span>従量課金アラート</span>
            <progress max="10" value={Math.min(data.usageSpikeCount, 10)} />
          </div>
        </div>
      </section>
    </section>
  )
}

function ContractsPage() {
  const { userId, currentUser, masters } = useAppContext()
  const { data, error, loading, refresh } = useAsync<ContractRecord[]>(
    () => api.contracts({ userId }),
    [userId],
  )
  const [editing, setEditing] = useState<ContractRecord | null>(null)
  const canEdit = Boolean(currentUser?.canEditContracts)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit) return
    const form = new FormData(event.currentTarget)
    const body: ContractInput = {
      toolId: asNumber(form.get('toolId')),
      vendorId: asNumber(form.get('vendorId')),
      departmentId: asNumber(form.get('departmentId')),
      contractAmount: asNumber(form.get('contractAmount')),
      startDate: asString(form.get('startDate')),
      endDate: asString(form.get('endDate')),
      noticeDate: asOptionalString(form.get('noticeDate')),
      autoRenew: form.get('autoRenew') === 'on',
      owner: asString(form.get('owner')),
      status: asString(form.get('status')),
      risk: asString(form.get('risk')),
      memo: asString(form.get('memo')),
    }
    if (editing) await api.updateContract({ userId }, editing.id, body)
    else await api.createContract({ userId }, body)
    setEditing(null)
    event.currentTarget.reset()
    await refresh()
  }

  return (
    <section className="page-grid two-column">
      <form className="panel form-grid" onSubmit={submit}>
        <h2>{editing ? '契約を編集' : '契約を追加'}</h2>
        <SelectField name="toolId" label="ツール" value={editing?.toolId} items={masters?.tools} />
        <SelectField
          name="vendorId"
          label="ベンダー"
          value={editing?.vendorId}
          items={masters?.vendors}
        />
        <SelectField
          name="departmentId"
          label="担当部門"
          value={editing?.departmentId}
          items={masters?.departments}
        />
        <InputField name="contractAmount" label="契約金額" value={editing?.contractAmount} />
        <InputField name="startDate" label="契約開始日" type="date" value={editing?.startDate} />
        <InputField name="endDate" label="契約終了日" type="date" value={editing?.endDate} />
        <InputField name="noticeDate" label="解約通知期限" type="date" value={editing?.noticeDate} />
        <InputField name="owner" label="契約責任者" value={editing?.owner ?? '情シス SaaS管理チーム'} />
        <SelectField
          name="status"
          label="契約ステータス"
          value={editing?.status}
          items={['有効', '更新検討中', '解約予定', '終了済み']}
        />
        <SelectField name="risk" label="リスク" value={editing?.risk} items={['低', '中', '高']} />
        <label className="checkbox">
          <input name="autoRenew" type="checkbox" defaultChecked={editing?.autoRenew} />
          自動更新あり
        </label>
        <label>
          更新判断メモ
          <textarea name="memo" defaultValue={editing?.memo} />
        </label>
        <button disabled={!canEdit}>{editing ? '更新' : '追加'}</button>
      </form>
      <section className="panel table-panel">
        <h2>契約台帳</h2>
        <LoadingState loading={loading} error={error} />
        <table>
          <thead>
            <tr>
              <th>ツール</th>
              <th>部門</th>
              <th>金額</th>
              <th>終了日</th>
              <th>リスク</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((record) => (
              <tr key={record.id}>
                <td>{record.toolName}</td>
                <td>{record.departmentName}</td>
                <td>{yen.format(record.contractAmount)}</td>
                <td>{record.endDate}</td>
                <td>
                  <span className={`badge risk-${record.risk}`}>{record.risk}</span>
                </td>
                <td className="actions">
                  <button type="button" disabled={!canEdit} onClick={() => setEditing(record)}>
                    編集
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => void api.deleteContract({ userId }, record.id).then(refresh)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  )
}

function AnalysisPage() {
  const { userId, currentUser, masters } = useAppContext()
  const { data, error, loading, refresh } = useAsync<BudgetActualRecord[]>(
    () => api.budgetActuals({ userId }),
    [userId],
  )
  const [period, setPeriod] = useState('month')
  const [axis, setAxis] = useState('departmentName')
  const [editing, setEditing] = useState<BudgetActualRecord | null>(null)
  const canEdit = Boolean(currentUser?.canEditFinance)

  const rows = useMemo(() => {
    const grouped = new Map<string, { budget: number; actual: number; forecast: number }>()
    for (const item of data ?? []) {
      const key = String(item[axis as keyof BudgetActualRecord] ?? '未分類')
      const current = grouped.get(key) ?? { budget: 0, actual: 0, forecast: 0 }
      current.budget += item.annualBudget
      current.actual += item.monthlyActual
      current.forecast += item.fullYearForecast
      grouped.set(key, current)
    }
    return [...grouped.entries()]
      .map(([label, value]) => ({
        label,
        ...value,
        variance: value.budget - value.forecast,
        varianceRate:
          value.budget > 0 ? Math.round(((value.budget - value.forecast) / value.budget) * 100) : 0,
      }))
      .sort((a, b) => b.actual - a.actual)
  }, [axis, data])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit) return
    const form = new FormData(event.currentTarget)
    const periodMonth = asString(form.get('periodMonth'))
    const body: BudgetActualInput = {
      periodMonth,
      fiscalYear: asNumber(form.get('fiscalYear')),
      quarter: asString(form.get('quarter')),
      departmentId: asNumber(form.get('departmentId')),
      projectId: asNumber(form.get('projectId')),
      costCategoryId: asNumber(form.get('costCategoryId')),
      toolId: asNumber(form.get('toolId')),
      vendorId: asNumber(form.get('vendorId')),
      annualBudget: asNumber(form.get('annualBudget')),
      monthlyActual: asNumber(form.get('monthlyActual')),
      fullYearForecast: asNumber(form.get('fullYearForecast')),
    }
    if (editing) await api.updateBudgetActual({ userId }, editing.id, body)
    else await api.createBudgetActual({ userId }, body)
    setEditing(null)
    event.currentTarget.reset()
    await refresh()
  }

  return (
    <section className="page-grid">
      <section className="panel controls">
        <label>
          期間粒度
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="month">月次</option>
            <option value="quarter">四半期</option>
            <option value="year">年度</option>
          </select>
        </label>
        <label>
          分析軸
          <select value={axis} onChange={(event) => setAxis(event.target.value)}>
            <option value="departmentName">部門</option>
            <option value="projectName">プロジェクト</option>
            <option value="costCategoryName">費目</option>
            <option value="toolName">ツール</option>
            <option value="vendorName">ベンダー</option>
          </select>
        </label>
        <span className="pill">{period === 'month' ? '月次' : period === 'quarter' ? '四半期' : '年度'}で集計</span>
      </section>
      <section className="panel table-panel">
        <h2>予実比較ランキング</h2>
        <LoadingState loading={loading} error={error} />
        <table>
          <thead>
            <tr>
              <th>分類</th>
              <th>予算</th>
              <th>実績</th>
              <th>見込み</th>
              <th>差異</th>
              <th>差異率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{yen.format(row.budget)}</td>
                <td>{yen.format(row.actual)}</td>
                <td>{yen.format(row.forecast)}</td>
                <td>{yen.format(row.variance)}</td>
                <td>{row.varianceRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <form className="panel form-grid wide-form" onSubmit={submit}>
        <h2>{editing ? '予実データを編集' : '予実データを追加'}</h2>
        <InputField name="periodMonth" label="対象年月" type="month" value={editing?.periodMonth} />
        <InputField name="fiscalYear" label="対象年度" value={editing?.fiscalYear ?? 2026} />
        <InputField name="quarter" label="四半期" value={editing?.quarter ?? '2026年度Q1'} />
        <SelectField
          name="departmentId"
          label="部門"
          value={editing?.departmentId}
          items={masters?.departments}
        />
        <SelectField name="projectId" label="プロジェクト" value={editing?.projectId} items={masters?.projects} />
        <SelectField
          name="costCategoryId"
          label="費目"
          value={editing?.costCategoryId}
          items={masters?.costCategories}
        />
        <SelectField name="toolId" label="ツール" value={editing?.toolId} items={masters?.tools} />
        <SelectField name="vendorId" label="ベンダー" value={editing?.vendorId} items={masters?.vendors} />
        <InputField name="annualBudget" label="年度予算" value={editing?.annualBudget} />
        <InputField name="monthlyActual" label="月次実績" value={editing?.monthlyActual} />
        <InputField name="fullYearForecast" label="通期見込み" value={editing?.fullYearForecast} />
        <button disabled={!canEdit}>{editing ? '更新' : '追加'}</button>
      </form>
      <section className="panel table-panel">
        <h2>予実データ</h2>
        <table>
          <tbody>
            {(data ?? []).map((record) => (
              <tr key={record.id}>
                <td>{record.periodMonth}</td>
                <td>{record.departmentName}</td>
                <td>{record.toolName}</td>
                <td>{yen.format(record.monthlyActual)}</td>
                <td className="actions">
                  <button disabled={!canEdit} onClick={() => setEditing(record)}>
                    編集
                  </button>
                  <button
                    disabled={!canEdit}
                    onClick={() => void api.deleteBudgetActual({ userId }, record.id).then(refresh)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  )
}

function UsagePage() {
  const { userId, currentUser, masters } = useAppContext()
  const { data, error, loading, refresh } = useAsync<UsageRecord[]>(
    () => api.usageRecords({ userId }),
    [userId],
  )
  const [editing, setEditing] = useState<UsageRecord | null>(null)
  const canEdit = Boolean(currentUser?.canEditUsage)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit) return
    const form = new FormData(event.currentTarget)
    const quantity = asNumber(form.get('quantity'))
    const unitPrice = asNumber(form.get('unitPrice'))
    const body: UsageInput = {
      periodMonth: asString(form.get('periodMonth')),
      toolId: asNumber(form.get('toolId')),
      departmentId: asNumber(form.get('departmentId')),
      projectId: asNumber(form.get('projectId')) || null,
      metric: asString(form.get('metric')),
      quantity,
      unit: asString(form.get('unit')),
      unitPrice,
      estimatedCost: asNumber(form.get('estimatedCost')) || Math.round((quantity / 1000) * unitPrice),
      budgetUsageRate: asNumber(form.get('budgetUsageRate')),
      monthOverMonthRate: asNumber(form.get('monthOverMonthRate')),
    }
    if (editing) await api.updateUsageRecord({ userId }, editing.id, body)
    else await api.createUsageRecord({ userId }, body)
    setEditing(null)
    event.currentTarget.reset()
    await refresh()
  }

  return (
    <section className="page-grid two-column">
      <form className="panel form-grid" onSubmit={submit}>
        <h2>{editing ? '利用量を編集' : '従量課金を追加'}</h2>
        <InputField name="periodMonth" label="対象年月" type="month" value={editing?.periodMonth} />
        <SelectField name="toolId" label="ツール" value={editing?.toolId} items={masters?.tools} />
        <SelectField
          name="departmentId"
          label="部門"
          value={editing?.departmentId}
          items={masters?.departments}
        />
        <SelectField name="projectId" label="プロジェクト" value={editing?.projectId} items={masters?.projects} />
        <InputField name="metric" label="課金メトリクス" value={editing?.metric ?? 'APIコール数'} />
        <InputField name="quantity" label="利用量" value={editing?.quantity} />
        <InputField name="unit" label="課金単位" value={editing?.unit ?? '1,000コール'} />
        <InputField name="unitPrice" label="単価" value={editing?.unitPrice} />
        <InputField name="estimatedCost" label="当月請求見込み" value={editing?.estimatedCost} />
        <InputField name="budgetUsageRate" label="予算消化率" value={editing?.budgetUsageRate} />
        <InputField name="monthOverMonthRate" label="前月比" value={editing?.monthOverMonthRate} />
        <button disabled={!canEdit}>{editing ? '更新' : '追加'}</button>
      </form>
      <section className="panel table-panel">
        <h2>従量課金・利用状況</h2>
        <LoadingState loading={loading} error={error} />
        <table>
          <thead>
            <tr>
              <th>年月</th>
              <th>ツール</th>
              <th>利用量</th>
              <th>見込み</th>
              <th>前月比</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((record) => (
              <tr key={record.id}>
                <td>{record.periodMonth}</td>
                <td>{record.toolName}</td>
                <td>
                  {numberFormat.format(record.quantity)} / {record.unit}
                </td>
                <td>{yen.format(record.estimatedCost)}</td>
                <td>
                  <span className={record.monthOverMonthRate >= 15 ? 'badge risk-高' : 'badge'}>
                    {record.monthOverMonthRate > 0 ? '+' : ''}
                    {record.monthOverMonthRate}%
                  </span>
                </td>
                <td className="actions">
                  <button disabled={!canEdit} onClick={() => setEditing(record)}>
                    編集
                  </button>
                  <button
                    disabled={!canEdit}
                    onClick={() => void api.deleteUsageRecord({ userId }, record.id).then(refresh)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  )
}

function ImportPage() {
  const { userId, currentUser, refreshMasters } = useAppContext()
  const [mode, setMode] = useState<'contracts' | 'budget'>('contracts')
  const [csv, setCsv] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const canImport = mode === 'contracts' ? currentUser?.canEditContracts : currentUser?.canEditFinance

  async function readFile(file: File | null) {
    if (!file) return
    setCsv(await file.text())
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canImport) return
    const importResult =
      mode === 'contracts'
        ? await api.importContracts({ userId }, csv)
        : await api.importBudgetActuals({ userId }, csv)
    setResult(importResult)
    await refreshMasters()
  }

  const sample =
    mode === 'contracts'
      ? 'ツール名,ベンダー,カテゴリ,契約金額,契約開始日,契約終了日,自動更新,契約責任者,担当部門\nSalesforce,Salesforce Inc.,CRM,24000000,2026-04-01,2027-03-31,あり,情シス SaaS管理チーム,営業本部'
      : '対象年月,部門,プロジェクト,費目,ツール,ベンダー,年度予算,月次実績,通期見込み\n2026-05,営業本部,顧客管理刷新,SaaS利用料,Salesforce,Salesforce Inc.,30000000,2100000,25200000'

  return (
    <section className="page-grid">
      <form className="panel import-panel" onSubmit={submit}>
        <h2>CSV取り込み</h2>
        <div className="controls">
          <label>
            取り込み対象
            <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
              <option value="contracts">契約台帳</option>
              <option value="budget">予実データ</option>
            </select>
          </label>
          <label>
            CSVファイル
            <input type="file" accept=".csv,text/csv" onChange={(event) => void readFile(event.target.files?.[0] ?? null)} />
          </label>
          <button type="button" onClick={() => setCsv(sample)}>
            サンプルを入れる
          </button>
        </div>
        <textarea className="csv-area" value={csv} onChange={(event) => setCsv(event.target.value)} />
        <button disabled={!canImport || csv.length === 0}>取り込む</button>
      </form>
      {result ? (
        <section className="panel">
          <h2>取り込み結果</h2>
          <p>{result.inserted}件を登録しました。</p>
          {result.warnings.length > 0 ? (
            <ul className="warning-list">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </section>
  )
}

function PermissionsPage() {
  const { userId, currentUser, masters, refreshMasters } = useAppContext()
  const { data, error, loading, refresh } = useAsync<AppUser[]>(() => api.users({ userId }), [
    userId,
    masters,
  ])
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [logs, setLogs] = useState<
    { id: number; target: string; action: string; summary: string; createdAt: string; userName: string | null }[]
  >([])
  const canEdit = Boolean(currentUser?.canManageSettings)

  useEffect(() => {
    void api.auditLogs({ userId }).then(setLogs).catch(() => setLogs([]))
  }, [userId, data])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit) return
    const form = new FormData(event.currentTarget)
    const body = {
      name: asString(form.get('name')),
      email: asString(form.get('email')),
      departmentId: asNumber(form.get('departmentId')) || null,
      roleId: asNumber(form.get('roleId')),
    }
    if (editing) await api.updateUser({ userId }, editing.id, body)
    else await api.createUser({ userId }, body)
    setEditing(null)
    event.currentTarget.reset()
    await refresh()
    await refreshMasters()
  }

  return (
    <section className="page-grid two-column">
      <form className="panel form-grid" onSubmit={submit}>
        <h2>{editing ? 'ユーザー権限を編集' : 'ユーザーを追加'}</h2>
        <InputField name="name" label="ユーザー名" value={editing?.name} />
        <InputField name="email" label="メール" value={editing?.email} />
        <SelectField
          name="departmentId"
          label="所属部門"
          value={editing?.departmentId}
          items={masters?.departments}
        />
        <SelectField name="roleId" label="ロール" value={editing?.roleId} items={masters?.roles} />
        <button disabled={!canEdit}>{editing ? '更新' : '追加'}</button>
      </form>
      <section className="panel table-panel">
        <h2>権限一覧</h2>
        <LoadingState loading={loading} error={error} />
        <table>
          <tbody>
            {(data ?? []).map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.departmentName}</td>
                <td>{user.roleName}</td>
                <td className="actions">
                  <button disabled={!canEdit} onClick={() => setEditing(user)}>
                    編集
                  </button>
                  <button
                    disabled={!canEdit}
                    onClick={() => void api.deleteUser({ userId }, user.id).then(refreshMasters).then(refresh)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel table-panel">
        <h2>変更履歴</h2>
        <table>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString('ja-JP')}</td>
                <td>{log.userName ?? '-'}</td>
                <td>{log.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  )
}

function InputField({
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

function SelectField({
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

const rootRoute = createRootRoute({ component: AppShell })
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})
const contractsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contracts',
  component: ContractsPage,
})
const analysisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analysis',
  component: AnalysisPage,
})
const usageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/usage',
  component: UsagePage,
})
const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/import',
  component: ImportPage,
})
const permissionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/permissions',
  component: PermissionsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  contractsRoute,
  analysisRoute,
  usageRoute,
  importRoute,
  permissionsRoute,
])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  return <RouterProvider router={router} />
}

export default App
