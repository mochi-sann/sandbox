import { useEffect, useState } from "react"
import { TaskStatusFilter } from "../types"

interface TaskFiltersProps {
  status: TaskStatusFilter
  query: string
  onStatusChange: (status: TaskStatusFilter) => void
  onQuerySubmit: (query: string) => void
  loading: boolean
}

const STATUS_OPTIONS: { label: string; value: TaskStatusFilter }[] = [
  { label: "すべて", value: "all" },
  { label: "未完了", value: "active" },
  { label: "完了", value: "completed" }
]

export const TaskFilters = ({ status, query, onStatusChange, onQuerySubmit, loading }: TaskFiltersProps) => {
  const [draftQuery, setDraftQuery] = useState(query)

  useEffect(() => {
    setDraftQuery(query)
  }, [query])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onQuerySubmit(draftQuery)
  }

  const handleReset = () => {
    setDraftQuery("")
    onQuerySubmit("")
  }

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-body-secondary fw-semibold">絞り込み</div>
      <div className="card-body">
        <form className="row g-3" onSubmit={handleSubmit}>
          <div className="col-md-6">
            <label htmlFor="task-query" className="form-label">
              キーワード
            </label>
            <input
              id="task-query"
              type="search"
              className="form-control"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="タイトルまたは説明で検索"
              disabled={loading}
            />
          </div>

          <div className="col-md-3">
            <label htmlFor="task-status" className="form-label">
              ステータス
            </label>
            <select
              id="task-status"
              className="form-select"
              value={status}
              onChange={(event) => onStatusChange(event.target.value as TaskStatusFilter)}
              disabled={loading}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3 d-flex align-items-end gap-2">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              検索
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={handleReset} disabled={loading}>
              クリア
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
