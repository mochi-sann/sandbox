import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import { InputField, SelectField } from '../components/FormFields'
import { LoadingState } from '../components/LoadingState'
import { useAppContext } from '../context/AppContext'
import { useAsync } from '../hooks/useAsync'
import { asNumber, asString } from '../lib/form'
import { numberFormat, yen } from '../lib/format'
import type { UsageInput, UsageRecord } from '../../shared/types'

export function UsagePage() {
  const { userId, currentUser, masters } = useAppContext()
  const { data, error, loading, refresh } = useAsync<UsageRecord[]>(
    () => api.usageRecords({ userId }),
    [userId],
  )
  const [editing, setEditing] = useState<UsageRecord | null>(null)
  const canEdit = Boolean(currentUser?.canEditUsage)

  async function submit(event: FormEvent<HTMLFormElement>) {
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
