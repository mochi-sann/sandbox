import { Controller } from "@hotwired/stimulus"
import { mountTaskList, TaskListMountHandle } from "../react/entrypoints/task_list"
import { TaskEndpoints, TaskListInitialState } from "../react/types"

export default class extends Controller<HTMLDivElement> {
  static values = {
    endpoints: Object,
    initialState: Object
  } as const

  declare readonly endpointsValue: TaskEndpoints
  declare readonly initialStateValue: TaskListInitialState
  declare readonly hasInitialStateValue: boolean

  private mountHandle?: TaskListMountHandle
  private readonly beforeCacheHandler = () => {
    this.unmountReact()
  }

  connect() {
    this.mountReact()
    document.addEventListener("turbo:before-cache", this.beforeCacheHandler)
  }

  disconnect() {
    document.removeEventListener("turbo:before-cache", this.beforeCacheHandler)
    this.unmountReact()
  }

  private mountReact() {
    this.mountHandle = mountTaskList(this.element, {
      endpoints: this.endpointsValue,
      initialState: this.hasInitialStateValue ? this.initialStateValue : undefined
    })
  }

  private unmountReact() {
    if (this.mountHandle) {
      this.mountHandle.unmount()
      this.mountHandle = undefined
    }
  }
}
