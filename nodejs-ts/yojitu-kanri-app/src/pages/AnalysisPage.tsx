import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import { InputField, SelectField } from '../components/FormFields'
import { LoadingState } from '../components/LoadingState'
import { useAppContext } from '../context/AppContext'
import { useAsync } from '../hooks/useAsync'
import { asNumber, asString } from '../lib/form'
import { yen } from '../lib/format'
import type { BudgetActualInput, BudgetActualRecord } from '../../shared/types'

export function AnalysisPage() {
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
      const periodLabel =
        period === 'month'
          ? item.periodMonth
          : period === 'quarter'
            ? item.quarter
            : `${item.fiscalYear}年度`
      const axisLabel = String(item[axis as keyof BudgetActualRecord] ?? '未分類')
      const key = `${periodLabel} / ${axisLabel}`
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
  }, [axis, data, period])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit) return
    const form = new FormData(event.currentTarget)
    const body: BudgetActualInput = {
      periodMonth: asString(form.get('periodMonth')),
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
        <span className="pill">
          {period === 'month' ? '月次' : period === 'quarter' ? '四半期' : '年度'}で集計
        </span>
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
