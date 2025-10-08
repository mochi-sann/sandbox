import { useEffect, useState } from "react"
import { useTasks } from "../hooks/useTasks"
import {
  TaskEndpoints,
  TaskListInitialState,
  TaskPayload,
  TaskStatusFilter
} from "../types"
import { TaskFilters } from "./TaskFilters"
import { TaskForm } from "./TaskForm"
import { TaskItem } from "./TaskItem"
import { TaskPagination } from "./TaskPagination"

interface TaskListProps {
  endpoints: TaskEndpoints
  initialState?: TaskListInitialState
}

interface EditingState {
  id: number
  title: string
  description: string
}

export const TaskList = ({ endpoints, initialState }: TaskListProps) => {
  const {
    tasks,
    meta,
    loading,
    error,
    notice,
    status,
    query,
    page,
    isCreating,
    togglingId,
    deletingId,
    savingId,
    actions
  } = useTasks({ endpoints, initialState })

  const [editing, setEditing] = useState<EditingState | null>(null)

  useEffect(() => {
    if (editing && !tasks.some((task) => task.id === editing.id)) {
      setEditing(null)
    }
  }, [editing, tasks])

  const handleCreate = (payload: TaskPayload) => {
    return actions.createTask(payload)
  }

  const handleEditClick = (taskId: number) => {
    const target = tasks.find((task) => task.id === taskId)
    if (!target) return
    setEditing({ id: target.id, title: target.title, description: target.description ?? "" })
  }

  const handleEditChange = (payload: TaskPayload) => {
    if (!editing) return
    setEditing({ ...editing, ...payload })
  }

  const handleEditSubmit = async () => {
    if (!editing) return false
    if (!editing.title.trim()) {
      actions.clearError()
      actions.clearNotice()
      return false
    }
    const success = await actions.updateTask(editing.id, {
      title: editing.title.trim(),
      description: editing.description
    })
    if (success) {
      setEditing(null)
    }
    return success
  }

  const handleStatusChange = (nextStatus: TaskStatusFilter) => {
    setEditing(null)
    actions.setStatus(nextStatus)
  }

  const handleQuerySubmit = (nextQuery: string) => {
    setEditing(null)
    actions.setQuery(nextQuery)
  }

  const handlePageChange = (nextPage: number) => {
    setEditing(null)
    actions.setPage(nextPage)
  }

  const handleToggle = (taskId: number) => {
    setEditing((current) => (current?.id === taskId ? null : current))
    return actions.toggleTask(taskId)
  }

  const handleDelete = (taskId: number) => {
    if (!window.confirm("削除しますか？")) {
      return Promise.resolve(false)
    }
    setEditing((current) => (current?.id === taskId ? null : current))
    return actions.deleteTask(taskId)
  }

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="p-4 bg-white rounded-4 shadow-sm">
          <h1 className="h3 mb-2">TODOリスト</h1>
          <p className="text-muted mb-0">React + TypeScriptでタスクを管理しましょう。</p>
        </div>
      </div>

      {notice && (
        <div className="col-12">
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            {notice}
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={actions.clearNotice}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="col-12">
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={actions.clearError}
            />
          </div>
        </div>
      )}

      <div className="col-12">
        <TaskForm onSubmit={handleCreate} disabled={isCreating} />
      </div>

      <div className="col-12">
        <TaskFilters
          status={status}
          query={query}
          onStatusChange={handleStatusChange}
          onQuerySubmit={handleQuerySubmit}
          loading={loading}
        />
      </div>

      <div className="col-12">
        <div className="card shadow-sm">
          <div className="card-header bg-body-secondary fw-semibold d-flex justify-content-between align-items-center">
            <span>タスク一覧</span>
            <small className="text-muted">
              {meta ? `全${meta.totalCount}件` : "読み込み中"}
            </small>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="py-5 d-flex justify-content-center" aria-live="polite">
                <div className="spinner-border text-secondary" role="status">
                  <span className="visually-hidden">読み込み中...</span>
                </div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-5 text-center text-muted">
                条件に一致するタスクがありません。
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {tasks.map((task) => {
                  const isEditing = editing?.id === task.id
                  const editingValues = isEditing
                    ? { title: editing.title, description: editing.description }
                    : { title: task.title, description: task.description ?? "" }

                  return (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isToggling={togglingId === task.id}
                      isDeleting={deletingId === task.id}
                      isSaving={savingId === task.id}
                      isEditing={isEditing}
                      editingValues={editingValues}
                      onToggle={() => handleToggle(task.id)}
                      onDelete={() => handleDelete(task.id)}
                      onEditClick={() => handleEditClick(task.id)}
                      onEditCancel={() => setEditing(null)}
                      onEditChange={handleEditChange}
                      onEditSubmit={handleEditSubmit}
                    />
                  )
                })}
              </div>
            )}
          </div>
          <div className="card-footer bg-white">
            <TaskPagination meta={meta} onPageChange={handlePageChange} disabled={loading} />
          </div>
        </div>
      </div>
    </div>
  )
}
