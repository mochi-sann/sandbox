import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import { InputField, SelectField } from '../components/FormFields'
import { LoadingState } from '../components/LoadingState'
import { useAppContext } from '../context/AppContext'
import { useAsync } from '../hooks/useAsync'
import { asNumber, asOptionalString, asString } from '../lib/form'
import { yen } from '../lib/format'
import type { ContractInput, ContractRecord } from '../../shared/types'

export function ContractsPage() {
  const { userId, currentUser, masters } = useAppContext()
  const { data, error, loading, refresh } = useAsync<ContractRecord[]>(
    () => api.contracts({ userId }),
    [userId],
  )
  const [editing, setEditing] = useState<ContractRecord | null>(null)
  const canEdit = Boolean(currentUser?.canEditContracts)

  async function submit(event: FormEvent<HTMLFormElement>) {
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
