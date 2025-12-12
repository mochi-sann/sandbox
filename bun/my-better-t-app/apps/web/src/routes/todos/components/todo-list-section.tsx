import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  ChevronDown,
  Folder,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

type BasicProject = { id: number; name: string };
type BasicTag = { id: number; name: string; color: string };

interface TodoListSectionProps {
  isLoading: boolean;
  todos: any[] | undefined;
  editingTodoId: number | null;
  editTodoText: string;
  onEditTodoTextChange: (value: string) => void;
  editTodoBody: string;
  onEditTodoBodyChange: (value: string) => void;
  editDueAt: string;
  onEditDueAtChange: (value: string) => void;
  editTagIds: number[];
  onToggleEditTag: (id: number) => void;
  editProjectId: number | null;
  onEditProjectChange: (id: number | null) => void;
  projects: BasicProject[] | undefined;
  tags: BasicTag[] | undefined;
  onEditClick: (todo: any) => void;
  onCancelEdit: () => void;
  onUpdateTodo: () => void;
  onToggleTodo: (id: number, completed: boolean) => void;
  onDeleteTodo: (id: number) => void;
  onCreateSubtask: (todoId: number, text: string) => void;
  onToggleSubtask: (id: number, completed: boolean) => void;
  onDeleteSubtask: (id: number) => void;
}

export function TodoListSection(props: TodoListSectionProps) {
  const { isLoading, todos } = props;

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!todos || todos.length === 0) {
    return <p className="py-4 text-center">No todos yet. Add one above!</p>;
  }

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <TodoListItem key={todo.id} todo={todo} {...props} />
      ))}
    </ul>
  );
}

type TodoListItemProps = TodoListSectionProps & { todo: any };

function TodoListItem({
  todo,
  editingTodoId,
  editTodoText,
  onEditTodoTextChange,
  editTodoBody,
  onEditTodoBodyChange,
  editDueAt,
  onEditDueAtChange,
  editTagIds,
  onToggleEditTag,
  editProjectId,
  onEditProjectChange,
  projects,
  tags,
  onUpdateTodo,
  onCancelEdit,
  onEditClick,
  onToggleTodo,
  onDeleteTodo,
  onCreateSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TodoListItemProps) {
  const isEditing = editingTodoId === todo.id;

  if (isEditing) {
    return (
      <li className="rounded-md border p-2">
        <div className="space-y-2">
          <Input
            value={editTodoText}
            onChange={(e) => onEditTodoTextChange(e.target.value)}
            placeholder="Task title"
          />
          <Textarea
            value={editTodoBody}
            onChange={(e) => onEditTodoBodyChange(e.target.value)}
            placeholder="Details"
          />
          <div className="flex flex-wrap items-center gap-2">
            <ProjectDropdown
              projects={projects}
              selectedProjectId={editProjectId}
              onSelect={onEditProjectChange}
            />
            <TagSelection tags={tags} selectedTagIds={editTagIds} onToggle={onToggleEditTag} />
          </div>
          <div className="flex gap-2">
            <Input
              type="datetime-local"
              value={editDueAt}
              onChange={(e) => onEditDueAtChange(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={onUpdateTodo}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between rounded-md border p-2">
      <div className="flex w-full items-start space-x-2">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => onToggleTodo(todo.id, todo.completed)}
          id={`todo-${todo.id}`}
          className="mt-1"
        />
        <div className="flex w-full flex-col gap-1">
          <label
            htmlFor={`todo-${todo.id}`}
            className={`font-medium ${todo.completed ? "line-through text-muted-foreground" : ""}`}
          >
            {todo.text}
          </label>
          {todo.body && (
            <div className="break-words text-sm text-muted-foreground">
              <ReactMarkdown>{todo.body}</ReactMarkdown>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {todo.project && (
              <div className="flex items-center gap-1 rounded-md bg-secondary/50 px-1.5 py-0.5 text-xs text-muted-foreground">
                <Folder className="h-3 w-3" />
                <span>{todo.project.name}</span>
              </div>
            )}
            {todo.tags.map((tag: any) => (
              <Badge
                key={tag.id}
                style={{
                  backgroundColor: tag.color,
                  color: "#fff",
                }}
                className="h-5 px-1.5 py-0 text-[10px]"
              >
                {tag.name}
              </Badge>
            ))}
            {todo.dueAt && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(todo.dueAt).toLocaleString()}
              </span>
            )}
          </div>
          <SubtaskList
            todo={todo}
            onCreateSubtask={onCreateSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
          />
        </div>
      </div>
      <div className="ml-2 flex flex-col gap-1">
        <Button variant="ghost" size="icon" onClick={() => onEditClick(todo)} aria-label="Edit todo">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDeleteTodo(todo.id)}
          aria-label="Delete todo"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

interface ProjectDropdownProps {
  projects: BasicProject[] | undefined;
  selectedProjectId: number | null;
  onSelect: (id: number | null) => void;
}

function ProjectDropdown({ projects, selectedProjectId, onSelect }: ProjectDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Folder className="h-3.5 w-3.5" />
          {projects?.find((p) => p.id === selectedProjectId)?.name || "Project"}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onSelect(null)}>No Project</DropdownMenuItem>
        {projects?.map((project) => (
          <DropdownMenuItem key={project.id} onClick={() => onSelect(project.id)}>
            {project.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TagSelectionProps {
  tags: BasicTag[] | undefined;
  selectedTagIds: number[];
  onToggle: (id: number) => void;
}

function TagSelection({ tags, selectedTagIds, onToggle }: TagSelectionProps) {
  return (
    <>
      {tags?.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className={`cursor-pointer border-2 ${selectedTagIds.includes(tag.id) ? "border-primary" : "border-transparent"}`}
          style={{
            backgroundColor: tag.color,
            color: "#fff",
          }}
          onClick={() => onToggle(tag.id)}
        >
          {tag.name}
        </Badge>
      ))}
    </>
  );
}

interface SubtaskListProps {
  todo: any;
  onCreateSubtask: (todoId: number, text: string) => void;
  onToggleSubtask: (id: number, completed: boolean) => void;
  onDeleteSubtask: (id: number) => void;
}

function SubtaskList({ todo, onCreateSubtask, onToggleSubtask, onDeleteSubtask }: SubtaskListProps) {
  return (
    <div className="mt-2 w-full">
      {todo.subtasks && todo.subtasks.length > 0 && (
        <ul className="mb-1 space-y-1">
          {todo.subtasks.map((subtask: any) => (
            <li key={subtask.id} className="group flex items-center gap-2 text-sm">
              <Checkbox
                checked={subtask.completed}
                onCheckedChange={(c) => onToggleSubtask(subtask.id, !!c)}
                className="h-3 w-3"
              />
              <span className={subtask.completed ? "line-through text-muted-foreground" : ""}>
                {subtask.text}
              </span>
              <button
                type="button"
                onClick={() => onDeleteSubtask(subtask.id)}
                className="opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Plus className="h-3 w-3 text-muted-foreground" />
        <Input
          className="h-6 border-none p-0 text-xs shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
          placeholder="Add subtask..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const value = e.currentTarget.value.trim();
              if (!value) {
                return;
              }
              onCreateSubtask(todo.id, value);
              e.currentTarget.value = "";
            }
          }}
        />
      </div>
    </div>
  );
}
