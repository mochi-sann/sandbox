import { application } from "./application"
import HelloController from "./hello_controller"
import TaskListController from "./task_list_controller"

application.register("hello", HelloController)
application.register("task-list", TaskListController)
