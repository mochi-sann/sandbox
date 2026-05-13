import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import { InputField, SelectField } from '../components/FormFields'
import { LoadingState } from '../components/LoadingState'
import { useAppContext } from '../context/AppContext'
import { useAsync } from '../hooks/useAsync'
import { asNumber, asString } from '../lib/form'
import type { AppUser, AuditLogRecord } from '../../shared/types'

export function PermissionsPage() {
  const { userId, currentUser, masters, refreshMasters } = useAppContext()
  const { data, error, loading, refresh } = useAsync<AppUser[]>(() => api.users({ userId }), [
    userId,
    masters,
  ])
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const canEdit = Boolean(currentUser?.canManageSettings)

  useEffect(() => {
    void api
      .auditLogs({ userId })
      .then(setLogs)
      .catch(() => setLogs([]))
  }, [userId, data])

  async function submit(event: FormEvent<HTMLFormElement>) {
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
          <thead>
            <tr>
              <th>日時</th>
              <th>ユーザー</th>
              <th>操作</th>
              <th>変更項目</th>
              <th>変更前</th>
              <th>変更後</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString('ja-JP')}</td>
                <td>{log.userName ?? '-'}</td>
                <td>{log.summary}</td>
                <td>{log.changedFields || '-'}</td>
                <td className="audit-json">{formatAuditValue(log.beforeValue)}</td>
                <td className="audit-json">{formatAuditValue(log.afterValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  )
}

function formatAuditValue(value: unknown): string {
  if (value == null) return '-'
  if (typeof value !== 'object') return String(value)
  return JSON.stringify(value)
}
