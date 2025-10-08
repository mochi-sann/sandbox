export type TaskStatusFilter = "all" | "active" | "completed"

export interface Task {
  id: number
  title: string
  description: string | null
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface PaginationMeta {
  page: number
  perPage: number
  totalPages: number
  totalCount: number
}

export interface TaskListResponse {
  tasks: Task[]
  meta: PaginationMeta
}

export interface TaskPayload {
  title: string
  description: string
}

export interface TaskEndpoints {
  index: string
  create: string
  update: string
  destroy: string
  toggle: string
}

export interface TaskListInitialState {
  page?: number
  status?: TaskStatusFilter
  query?: string | null
}
