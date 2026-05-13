import { useMemo } from 'react'
import { api } from '../api'
import { LoadingState } from '../components/LoadingState'
import { useAppContext } from '../context/AppContext'
import { useAsync } from '../hooks/useAsync'
import { yen } from '../lib/format'
import type { BudgetActualRecord, ContractRecord, UsageRecord } from '../../shared/types'

type AlertRow = {
  severity: '高' | '中' | '低'
  title: string
  detail: string
  owner: string
}

export function AlertsPage() {
  const { userId } = useAppContext()
  const {
    data,
    error,
    loading,
  } = useAsync<{
    contracts: ContractRecord[]
    budgetActuals: BudgetActualRecord[]
    usageRecords: UsageRecord[]
  }>(
    async () => ({
      contracts: await api.contracts({ userId }),
      budgetActuals: await api.budgetActuals({ userId }),
      usageRecords: await api.usageRecords({ userId }),
    }),
    [userId],
  )

  const alerts = useMemo(() => {
    if (!data) return { renewal: [], budget: [], usage: [] }
    return {
      renewal: renewalAlerts(data.contracts),
      budget: budgetAlerts(data.budgetActuals),
      usage: usageAlerts(data.usageRecords),
    }
  }, [data])

  if (loading || error || !data) return <LoadingState loading={loading} error={error} />

  return (
    <section className="page-grid">
      <div className="kpi-grid">
        <article className="kpi">
          <span>更新・契約リスク</span>
          <strong>{alerts.renewal.length}件</strong>
        </article>
        <article className="kpi">
          <span>予算アラート</span>
          <strong>{alerts.budget.length}件</strong>
        </article>
        <article className="kpi">
          <span>従量課金急増</span>
          <strong>{alerts.usage.length}件</strong>
        </article>
      </div>
      <AlertTable title="更新アラート" rows={alerts.renewal} />
      <AlertTable title="予算超過アラート" rows={alerts.budget} />
      <AlertTable title="従量課金急増アラート" rows={alerts.usage} />
    </section>
  )
}

function renewalAlerts(contracts: ContractRecord[]): AlertRow[] {
  const now = new Date()
  return contracts.flatMap((contract) => {
    const rows: AlertRow[] = []
    const daysToEnd = daysBetween(now, new Date(contract.endDate))
    const daysToNotice = contract.noticeDate ? daysBetween(now, new Date(contract.noticeDate)) : null
    if (daysToEnd >= 0 && daysToEnd <= 90) {
      rows.push({
        severity: daysToEnd <= 30 ? '高' : daysToEnd <= 60 ? '中' : '低',
        title: `${contract.toolName} の契約更新が近い`,
        detail: `${contract.endDate} まで ${daysToEnd}日。90/60/30日の更新確認対象です。`,
        owner: contract.owner,
      })
    }
    if (daysToNotice !== null && daysToNotice < 0) {
      rows.push({
        severity: '高',
        title: `${contract.toolName} の解約通知期限切れ`,
        detail: `${contract.noticeDate} が解約通知期限でした。`,
        owner: contract.owner,
      })
    }
    if (contract.autoRenew && contract.risk === '高') {
      rows.push({
        severity: '高',
        title: `${contract.toolName} は自動更新あり・高リスク`,
        detail: `${yen.format(contract.contractAmount)} の契約が自動更新対象です。`,
        owner: contract.owner,
      })
    }
    return rows
  })
}

function budgetAlerts(records: BudgetActualRecord[]): AlertRow[] {
  return records.flatMap((record) => {
    const rows: AlertRow[] = []
    const forecastRate =
      record.annualBudget > 0 ? Math.round((record.fullYearForecast / record.annualBudget) * 100) : 0
    if (forecastRate >= 80) {
      rows.push({
        severity: forecastRate >= 100 ? '高' : '中',
        title: `${record.toolName} の予算消化率が高い`,
        detail: `${record.departmentName} / ${record.periodMonth}: 通期見込み ${forecastRate}%`,
        owner: record.projectName,
      })
    }
    if (record.fullYearForecast > record.annualBudget) {
      rows.push({
        severity: '高',
        title: `${record.toolName} が年度予算を超過見込み`,
        detail: `予算 ${yen.format(record.annualBudget)} に対し見込み ${yen.format(record.fullYearForecast)}`,
        owner: record.departmentName,
      })
    }
    return rows
  })
}

function usageAlerts(records: UsageRecord[]): AlertRow[] {
  return records
    .filter((record) => record.monthOverMonthRate >= 15)
    .map((record) => ({
      severity: record.monthOverMonthRate >= 30 ? '高' : '中',
      title: `${record.toolName} の従量課金が急増`,
      detail: `${record.metric}: 前月比 +${record.monthOverMonthRate}% / 見込み ${yen.format(record.estimatedCost)}`,
      owner: record.departmentName,
    }))
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000)
}

function AlertTable({ title, rows }: { title: string; rows: AlertRow[] }) {
  return (
    <section className="panel table-panel">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            <th>重要度</th>
            <th>内容</th>
            <th>詳細</th>
            <th>担当/分類</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4}>該当するアラートはありません。</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={`${row.title}-${row.detail}`}>
                <td>
                  <span className={`badge risk-${row.severity}`}>{row.severity}</span>
                </td>
                <td>{row.title}</td>
                <td>{row.detail}</td>
                <td>{row.owner}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}
