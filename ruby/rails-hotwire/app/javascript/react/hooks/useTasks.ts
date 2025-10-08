import { useCallback, useEffect, useMemo, useState } from "react"
import { ApiError, createTask, deleteTask, fetchTasks, toggleTask, updateTask } from "../api"
import {
  PaginationMeta,
  Task,
  TaskEndpoints,
  TaskListInitialState,
  TaskPayload,
  TaskStatusFilter
} from "../types"

interface UseTasksOptions {
  endpoints: TaskEndpoints
  initialState?: TaskListInitialState
}

interface UseTasksResult {
  tasks: Task[]
  meta: PaginationMeta | null
  loading: boolean
  error: string | null
  notice: string | null
  status: TaskStatusFilter
  query: string
  page: number
  isCreating: boolean
  togglingId: number | null
  deletingId: number | null
  savingId: number | null
  actions: {
    setStatus: (status: TaskStatusFilter) => void
    setQuery: (query: string) => void
    setPage: (page: number) => void
    createTask: (payload: TaskPayload) => Promise<boolean>
    toggleTask: (taskId: number) => Promise<boolean>
    deleteTask: (taskId: number) => Promise<boolean>
    updateTask: (taskId: number, payload: TaskPayload) => Promise<boolean>
    clearError: () => void
    clearNotice: () => void
    refresh: () => void
  }
}

const DEFAULT_STATE: TaskListInitialState = {
  page: 1,
  status: "all",
  query: ""
}

export const useTasks = ({ endpoints, initialState }: UseTasksOptions): UseTasksResult => {
  const mergedInitial = useMemo(() => ({ ...DEFAULT_STATE, ...initialState }), [initialState])

  const [tasks, setTasks] = useState<Task[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [status, setStatusValue] = useState<TaskStatusFilter>(mergedInitial.status ?? "all")
  const [query, setQueryValue] = useState<string>(mergedInitial.query ?? "")
  const [page, setPageValue] = useState<number>(Math.max(1, mergedInitial.page ?? 1))
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isCreating, setCreating] = useState<boolean>(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState<number>(0)

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1)
  }, [])

  const handleErrorMessage = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      setError(err.message)
    } else if (err instanceof Error) {
      setError(err.message)
    } else {
      setError("予期しないエラーが発生しました")
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetchTasks(endpoints, {
      page,
      status,
      query,
      signal: controller.signal
    })
      .then(({ tasks: nextTasks, meta: nextMeta }) => {
        if (controller.signal.aborted) return
        setTasks(nextTasks)
        setMeta({
          page: nextMeta.page,
          perPage: nextMeta.perPage,
          totalPages: nextMeta.totalPages,
          totalCount: nextMeta.totalCount
        })
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        handleErrorMessage(err)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [endpoints, page, status, query, refreshKey, handleErrorMessage])

  const setStatus = useCallback((nextStatus: TaskStatusFilter) => {
    setStatusValue(nextStatus)
    setPageValue(1)
  }, [])

  const setQuery = useCallback((nextQuery: string) => {
    setQueryValue(nextQuery)
    setPageValue(1)
  }, [])

  const setPage = useCallback((nextPage: number) => {
    setPageValue(Math.max(1, nextPage))
  }, [])

  const clearError = useCallback(() => setError(null), [])
  const clearNotice = useCallback(() => setNotice(null), [])

  const handleCreate = useCallback(
    async (payload: TaskPayload) => {
      setCreating(true)
      setError(null)
      let success = false
      try {
        await createTask(endpoints, payload)
        setNotice("タスクを追加しました")
        setPageValue((current) => {
          if (current === 1) {
            refresh()
            return current
          }
          return 1
        })
        success = true
      } catch (err) {
        handleErrorMessage(err)
      } finally {
        setCreating(false)
      }
      return success
    },
    [endpoints, refresh, handleErrorMessage]
  )

  const handleToggle = useCallback(
    async (taskId: number) => {
      setTogglingId(taskId)
      setError(null)
      let success = false
      try {
        const updated = await toggleTask(endpoints, taskId)
        setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)))
        setNotice(updated.completed ? "タスクを完了にしました" : "タスクを未完了に戻しました")
        success = true
      } catch (err) {
        handleErrorMessage(err)
      } finally {
        setTogglingId(null)
      }
      return success
    },
    [endpoints, handleErrorMessage]
  )

  const handleDelete = useCallback(
    async (taskId: number) => {
      setDeletingId(taskId)
      setError(null)
      let success = false
      try {
        await deleteTask(endpoints, taskId)
        const shouldGoPrev = meta !== null && page > 1 && tasks.length <= 1
        if (shouldGoPrev) {
          setPageValue(page - 1)
        } else {
          refresh()
        }
        setNotice("タスクを削除しました")
        success = true
      } catch (err) {
        handleErrorMessage(err)
      } finally {
        setDeletingId(null)
      }
      return success
    },
    [endpoints, meta, page, tasks.length, refresh, handleErrorMessage]
  )

  const handleUpdate = useCallback(
    async (taskId: number, payload: TaskPayload) => {
      setSavingId(taskId)
      setError(null)
      let success = false
      try {
        const updated = await updateTask(endpoints, taskId, payload)
        setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)))
        setNotice("タスクを更新しました")
        success = true
      } catch (err) {
        handleErrorMessage(err)
      } finally {
        setSavingId(null)
      }
      return success
    },
    [endpoints, handleErrorMessage]
  )

  return {
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
    actions: {
      setStatus,
      setQuery,
      setPage,
      createTask: handleCreate,
      toggleTask: handleToggle,
      deleteTask: handleDelete,
      updateTask: handleUpdate,
      clearError,
      clearNotice,
      refresh
    }
  }
}
