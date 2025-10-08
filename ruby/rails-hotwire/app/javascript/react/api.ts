import { Task, TaskEndpoints, TaskListResponse, TaskPayload, TaskStatusFilter } from "./types"

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
  }
}

const withId = (template: string, id: number) => template.replace("__ID__", String(id))

const getCsrfToken = () => {
  const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content
  if (!token) {
    throw new Error("CSRFトークンを取得できませんでした")
  }
  return token
}

interface FetchTasksOptions {
  page: number
  status: TaskStatusFilter
  query: string
  signal?: AbortSignal
}

export const fetchTasks = async (
  endpoints: TaskEndpoints,
  options: FetchTasksOptions
): Promise<TaskListResponse> => {
  const url = new URL(endpoints.index, window.location.origin)
  url.searchParams.set("page", String(options.page))
  url.searchParams.set("status", options.status)
  if (options.query.trim()) {
    url.searchParams.set("query", options.query.trim())
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: options.signal
  })

  if (!response.ok) {
    throw new ApiError("タスク一覧の取得に失敗しました", response.status)
  }

  const data = (await response.json()) as { tasks: Task[]; meta: TaskListResponse["meta"] }
  return {
    tasks: data.tasks.map(normalizeTask),
    meta: normalizeMeta(data.meta)
  }
}

export const createTask = async (endpoints: TaskEndpoints, payload: TaskPayload): Promise<Task> => {
  const response = await fetch(endpoints.create, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-CSRF-Token": getCsrfToken()
    },
    body: JSON.stringify({ task: payload })
  })

  if (!response.ok) {
    const data = await safeJson(response)
    const message = data?.errors?.join("\n") || "タスクの作成に失敗しました"
    throw new ApiError(message, response.status)
  }

  const data = (await response.json()) as Task
  return normalizeTask(data)
}

export const updateTask = async (
  endpoints: TaskEndpoints,
  taskId: number,
  payload: TaskPayload
): Promise<Task> => {
  const response = await fetch(withId(endpoints.update, taskId), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-CSRF-Token": getCsrfToken()
    },
    body: JSON.stringify({ task: payload })
  })

  if (!response.ok) {
    const data = await safeJson(response)
    const message = data?.errors?.join("\n") || "タスクの更新に失敗しました"
    throw new ApiError(message, response.status)
  }

  const data = (await response.json()) as Task
  return normalizeTask(data)
}

export const toggleTask = async (endpoints: TaskEndpoints, taskId: number): Promise<Task> => {
  const response = await fetch(withId(endpoints.toggle, taskId), {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "X-CSRF-Token": getCsrfToken()
    }
  })

  if (!response.ok) {
    const data = await safeJson(response)
    const message = data?.errors?.join("\n") || "タスクの更新に失敗しました"
    throw new ApiError(message, response.status)
  }

  const data = (await response.json()) as Task
  return normalizeTask(data)
}

export const deleteTask = async (endpoints: TaskEndpoints, taskId: number): Promise<void> => {
  const response = await fetch(withId(endpoints.destroy, taskId), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "X-CSRF-Token": getCsrfToken()
    }
  })

  if (!response.ok && response.status !== 204) {
    throw new ApiError("タスクの削除に失敗しました", response.status)
  }
}

const safeJson = async (response: Response) => {
  try {
    return await response.json()
  } catch (_error) {
    return null
  }
}

const normalizeTask = (task: Task): Task => ({
  id: task.id,
  title: task.title,
  description: task.description ?? null,
  completed: task.completed,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt
})

const normalizeMeta = (meta: TaskListResponse["meta"]): TaskListResponse["meta"] => ({
  page: meta.page,
  perPage: meta.perPage,
  totalPages: meta.totalPages,
  totalCount: meta.totalCount
})
