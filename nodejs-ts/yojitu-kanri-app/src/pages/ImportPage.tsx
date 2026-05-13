import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import { useAppContext } from '../context/AppContext'
import type { ImportPreview, ImportResult } from '../../shared/types'

export function ImportPage() {
  const { userId, currentUser, refreshMasters } = useAppContext()
  const [mode, setMode] = useState<'contracts' | 'budget'>('contracts')
  const [csv, setCsv] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const canImport = mode === 'contracts' ? currentUser?.canEditContracts : currentUser?.canEditFinance

  async function readFile(file: File | null) {
    if (!file) return
    setCsv(await file.text())
    setPreview(null)
    setResult(null)
  }

  async function previewCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!csv) return
    const previewResult =
      mode === 'contracts'
        ? await api.previewContractsImport({ userId }, csv)
        : await api.previewBudgetActualsImport({ userId }, csv)
    setPreview(previewResult)
    setSelectedRows(previewResult.rows.filter((row) => row.valid).map((row) => row.rowNumber))
    setResult(null)
  }

  async function importSelected() {
    if (!canImport) return
    const importResult =
      mode === 'contracts'
        ? await api.importContracts({ userId }, csv, selectedRows)
        : await api.importBudgetActuals({ userId }, csv, selectedRows)
    setResult(importResult)
    await refreshMasters()
  }

  const sample =
    mode === 'contracts'
      ? 'ツール名,ベンダー,カテゴリ,契約金額,契約開始日,契約終了日,自動更新,契約責任者,担当部門\nSalesforce,"Salesforce, Inc.",CRM,24000000,2026-04-01,2027-03-31,あり,情シス SaaS管理チーム,営業本部'
      : '対象年月,部門,プロジェクト,費目,ツール,ベンダー,年度予算,月次実績,通期見込み\n2026-05,営業本部,顧客管理刷新,SaaS利用料,Salesforce,"Salesforce, Inc.",30000000,2100000,25200000'

  return (
    <section className="page-grid">
      <form className="panel import-panel" onSubmit={previewCsv}>
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
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void readFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button type="button" onClick={() => setCsv(sample)}>
            サンプルを入れる
          </button>
        </div>
        <textarea className="csv-area" value={csv} onChange={(event) => setCsv(event.target.value)} />
        <button disabled={csv.length === 0}>プレビュー</button>
      </form>
      {preview ? (
        <section className="panel table-panel">
          <div className="section-heading">
            <h2>取り込みプレビュー</h2>
            <button type="button" disabled={!canImport || selectedRows.length === 0} onClick={importSelected}>
              選択した{selectedRows.length}件を取り込む
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>対象</th>
                <th>行</th>
                <th>状態</th>
                <th>値</th>
                <th>新規マスタ</th>
                <th>警告</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.rowNumber}>
                  <td>
                    <input
                      type="checkbox"
                      disabled={!row.valid}
                      checked={selectedRows.includes(row.rowNumber)}
                      onChange={(event) => {
                        setSelectedRows((current) =>
                          event.target.checked
                            ? [...current, row.rowNumber]
                            : current.filter((rowNumber) => rowNumber !== row.rowNumber),
                        )
                      }}
                    />
                  </td>
                  <td>{row.rowNumber}</td>
                  <td>
                    <span className={row.valid ? 'badge risk-低' : 'badge risk-高'}>
                      {row.valid ? '取込可' : '要確認'}
                    </span>
                  </td>
                  <td>{Object.entries(row.values).map(([key, value]) => `${key}: ${value ?? '-'}`).join(' / ')}</td>
                  <td>{row.creates.length > 0 ? row.creates.join(' / ') : '-'}</td>
                  <td>{row.warnings.length > 0 ? row.warnings.join(' / ') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
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
