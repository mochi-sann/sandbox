import { Task, TaskPayload } from "../types"

interface TaskItemProps {
  task: Task
  isToggling: boolean
  isDeleting: boolean
  isSaving: boolean
  isEditing: boolean
  editingValues: { title: string; description: string }
  onToggle: () => Promise<boolean>
  onDelete: () => Promise<boolean>
  onEditClick: () => void
  onEditCancel: () => void
  onEditChange: (values: TaskPayload) => void
  onEditSubmit: () => Promise<boolean>
}

export const TaskItem = ({
  task,
  isToggling,
  isDeleting,
  isSaving,
  isEditing,
  editingValues,
  onToggle,
  onDelete,
  onEditClick,
  onEditCancel,
  onEditChange,
  onEditSubmit
}: TaskItemProps) => {
  const disableActions = isToggling || isDeleting || isSaving || isEditing

  return (
    <div className="list-group-item list-group-item-action">
      {isEditing ? (
        <form
          className="mb-2"
          onSubmit={async (event) => {
            event.preventDefault()
            await onEditSubmit()
          }}
        >
          <div className="mb-2">
            <label className="form-label" htmlFor={`task-title-${task.id}`}>
              タイトル
            </label>
            <input
              id={`task-title-${task.id}`}
              className="form-control"
              value={editingValues.title}
              onChange={(event) => onEditChange({ title: event.target.value, description: editingValues.description })}
              disabled={isSaving}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor={`task-description-${task.id}`}>
              説明 (任意)
            </label>
            <textarea
              id={`task-description-${task.id}`}
              className="form-control"
              value={editingValues.description}
              onChange={(event) => onEditChange({ title: editingValues.title, description: event.target.value })}
              rows={3}
              disabled={isSaving}
            />
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-sm btn-primary" disabled={isSaving}>
              {isSaving ? "保存中..." : "保存"}
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onEditCancel} disabled={isSaving}>
              キャンセル
            </button>
          </div>
        </form>
      ) : (
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h3 className={`h5 mb-1 ${task.completed ? "text-decoration-line-through text-secondary" : ""}`}>
            {task.title}
          </h3>
          <span
            className={`badge rounded-pill ${
              task.completed ? "bg-success-subtle text-success-emphasis" : "bg-warning-subtle text-warning-emphasis"
            }`}
          >
            {task.completed ? "完了" : "未完了"}
          </span>
        </div>
      )}

      {!isEditing && task.description && (
        <p className="mb-2 text-muted" style={{ whiteSpace: "pre-wrap" }}>
          {task.description}
        </p>
      )}

      <div className="d-flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm ${task.completed ? "btn-outline-warning" : "btn-outline-success"}`}
          onClick={onToggle}
          disabled={disableActions}
        >
          {isToggling ? "更新中..." : task.completed ? "未完了に戻す" : "完了にする"}
        </button>

        {!isEditing ? (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onEditClick} disabled={disableActions}>
            編集
          </button>
        ) : null}

        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onDelete} disabled={disableActions}>
          {isDeleting ? "削除中..." : "削除"}
        </button>
      </div>
    </div>
  )
}
