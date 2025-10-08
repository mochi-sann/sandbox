import { useState } from "react"
import { TaskPayload } from "../types"

interface TaskFormProps {
  onSubmit: (payload: TaskPayload) => Promise<boolean>
  disabled: boolean
}

export const TaskForm = ({ onSubmit, disabled }: TaskFormProps) => {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) {
      setLocalError("タイトルを入力してください")
      return
    }

    setLocalError(null)
    const success = await onSubmit({ title: title.trim(), description })
    if (success) {
      setTitle("")
      setDescription("")
    }
  }

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-body-secondary fw-semibold">新しいタスク</div>
      <div className="card-body">
        {localError && <div className="alert alert-danger">{localError}</div>}
        <form className="row g-3" onSubmit={handleSubmit}>
          <div className="col-12">
            <label htmlFor="task-title" className="form-label">
              タイトル
            </label>
            <input
              id="task-title"
              className="form-control"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="やることを入力"
              disabled={disabled}
              required
            />
          </div>

          <div className="col-12">
            <label htmlFor="task-description" className="form-label">
              説明 (任意)
            </label>
            <textarea
              id="task-description"
              className="form-control"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              disabled={disabled}
            />
          </div>

          <div className="col-12 d-flex justify-content-end">
            <button type="submit" className="btn btn-primary" disabled={disabled}>
              {disabled ? "送信中..." : "追加"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
