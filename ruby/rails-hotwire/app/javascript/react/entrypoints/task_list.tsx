import { createRoot, Root } from "react-dom/client"
import { TaskList } from "../components/TaskList"
import { TaskEndpoints, TaskListInitialState } from "../types"

export interface TaskListMountOptions {
  endpoints: TaskEndpoints
  initialState?: TaskListInitialState
}

export interface TaskListMountHandle {
  unmount: () => void
}

export const mountTaskList = (element: HTMLElement, options: TaskListMountOptions): TaskListMountHandle => {
  const root: Root = createRoot(element)
  root.render(<TaskList endpoints={options.endpoints} initialState={options.initialState} />)

  return {
    unmount: () => root.unmount()
  }
}
