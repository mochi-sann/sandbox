import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { orpc } from "@/utils/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getUser } from "../functions/get-user";
import {
  ProjectFilterBanner,
  TodoCreationForm,
  TodoListSection,
  TodoSearchBar,
} from "./todos/components";
import type { ClearFilterLink } from "./todos/types";

const todosSearchSchema = z.object({
  projectId: z.number().optional(),
});

export interface TodosPageProps {
  projectIdFilter?: number;
  lockProjectSelection?: boolean;
  title?: string;
  description?: string;
  clearFilterLink?: ClearFilterLink | null;
}

export const Route = createFileRoute("/todos")({
  component: TodosRoute,
  validateSearch: (search) => todosSearchSchema.parse(search),
  beforeLoad: async () => {
    const session = await getUser();
    return { session };
  },
  loader: async ({ context }) => {
    if (!context.session) {
      throw redirect({
        to: "/login",
      });
    }
  },
});

function TodosRoute() {
  const { projectId } = Route.useSearch();

  return (
    <TodosPage
      projectIdFilter={projectId}
      clearFilterLink={
        projectId !== undefined
          ? {
              to: "/todos",
              search: {},
              label: "Clear Filter",
            }
          : null
      }
    />
  );
}

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

export function TodosPage({
  projectIdFilter,
  lockProjectSelection = false,
  title = "Todo List",
  description = "Manage your tasks efficiently",
  clearFilterLink = null,
}: TodosPageProps = {}) {
  const [search, setSearch] = useState("");
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoBody, setNewTodoBody] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    projectIdFilter ?? null,
  );

  useEffect(() => {
    if (projectIdFilter !== undefined) {
      setSelectedProjectId(projectIdFilter);
    }
  }, [projectIdFilter]);

  const handleProjectSelection = (projectId: number | null) => {
    if (lockProjectSelection) return;
    setSelectedProjectId(projectId);
  };

  const [newTagName, setNewTagName] = useState("");
  const [isManagingTags, setIsManagingTags] = useState(false);
  const [tagCreationError, setTagCreationError] = useState<string | null>(null);

  // Edit state
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editTodoText, setEditTodoText] = useState("");
  const [editTodoBody, setEditTodoBody] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const [editTagIds, setEditTagIds] = useState<number[]>([]);
  const [editProjectId, setEditProjectId] = useState<number | null>(null);

  const todos = useQuery(
    orpc.todo.getAll.queryOptions({
      input: { search, projectId: projectIdFilter },
    }),
  );
  const tags = useQuery(orpc.tag.list.queryOptions());
  const projects = useQuery(orpc.project.list.queryOptions());

  const filteredProject = projectIdFilter
    ? projects.data?.find((p) => p.id === projectIdFilter)
    : undefined;

  const createMutation = useMutation(
    orpc.todo.create.mutationOptions({
      onSuccess: () => {
        todos.refetch();
        setNewTodoText("");
        setNewTodoBody("");
        setDueAt("");
        setSelectedTagIds([]);
        if (projectIdFilter === undefined) setSelectedProjectId(null);
      },
    }),
  );
  const updateMutation = useMutation(
    orpc.todo.update.mutationOptions({
      onSuccess: () => {
        todos.refetch();
        setEditingTodoId(null);
      },
    }),
  );
  const toggleMutation = useMutation(
    orpc.todo.toggle.mutationOptions({
      onSuccess: () => {
        todos.refetch();
      },
    }),
  );
  const deleteMutation = useMutation(
    orpc.todo.delete.mutationOptions({
      onSuccess: () => {
        todos.refetch();
      },
    }),
  );

  const createTagMutation = useMutation(
    orpc.tag.create.mutationOptions({
      onSuccess: (data) => {
        tags.refetch();
        setNewTagName("");
        setSelectedTagIds((prev) => [...prev, data.id]);
        setTagCreationError(null);
      },
      onError: (error) => {
        setTagCreationError(error.message || "Failed to create tag.");
      },
    }),
  );
  const deleteTagMutation = useMutation(
    orpc.tag.delete.mutationOptions({
      onSuccess: () => {
        tags.refetch();
      },
    }),
  );

  const createSubtaskMutation = useMutation(
    orpc.todo.createSubtask.mutationOptions({
      onSuccess: () => {
        todos.refetch();
      },
    }),
  );

  const toggleSubtaskMutation = useMutation(
    orpc.todo.toggleSubtask.mutationOptions({
      onSuccess: () => {
        todos.refetch();
      },
    }),
  );

  const deleteSubtaskMutation = useMutation(
    orpc.todo.deleteSubtask.mutationOptions({
      onSuccess: () => {
        todos.refetch();
      },
    }),
  );

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      createMutation.mutate({
        text: newTodoText,
        body: newTodoBody || undefined,
        dueAt: dueAt ? new Date(dueAt) : undefined,
        tags: selectedTagIds,
        projectId: selectedProjectId || undefined,
      });
    }
  };

  const handleUpdateTodo = () => {
    if (editingTodoId && editTodoText.trim()) {
      updateMutation.mutate({
        id: editingTodoId,
        text: editTodoText,
        body: editTodoBody || null,
        dueAt: editDueAt ? new Date(editDueAt) : null,
        tags: editTagIds,
        projectId: editProjectId,
      });
    }
  };

  const handleEditClick = (todo: any) => {
    setEditingTodoId(todo.id);
    setEditTodoText(todo.text);
    setEditTodoBody(todo.body || "");
    const formattedDate = todo.dueAt ? new Date(todo.dueAt).toISOString().slice(0, 16) : "";
    setEditDueAt(formattedDate);
    setEditTagIds(todo.tags.map((t: any) => t.id));
    setEditProjectId(todo.projectId);
  };

  const handleToggleTodo = (id: number, completed: boolean) => {
    toggleMutation.mutate({ id, completed: !completed });
  };

  const handleDeleteTodo = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      return;
    }
    const color = stringToColor(newTagName);
    createTagMutation.mutate({ name: newTagName, color });
  };

  const handleCreateSubtask = (todoId: number, text: string) => {
    if (text.trim()) {
      createSubtaskMutation.mutate({ todoId, text });
    }
  };

  const handleToggleSubtaskStatus = (id: number, completed: boolean) => {
    toggleSubtaskMutation.mutate({ id, completed });
  };

  const handleDeleteSubtask = (id: number) => {
    deleteSubtaskMutation.mutate({ id });
  };

  const toggleTagSelection = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const toggleEditTagSelection = (tagId: number) => {
    setEditTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectFilterBanner
            projectIdFilter={projectIdFilter}
            filteredProject={filteredProject}
            clearFilterLink={clearFilterLink}
          />
          <TodoSearchBar value={search} onChange={setSearch} />
          <TodoCreationForm
            newTodoText={newTodoText}
            onNewTodoTextChange={setNewTodoText}
            newTodoBody={newTodoBody}
            onNewTodoBodyChange={setNewTodoBody}
            dueAt={dueAt}
            onDueAtChange={setDueAt}
            onSubmit={handleAddTodo}
            isSubmitting={createMutation.isPending}
            canSubmit={Boolean(newTodoText.trim())}
            projects={projects.data}
            selectedProjectId={selectedProjectId}
            onProjectSelect={handleProjectSelection}
            lockProjectSelection={lockProjectSelection}
            tags={tags.data}
            selectedTagIds={selectedTagIds}
            onToggleTag={toggleTagSelection}
            isManagingTags={isManagingTags}
            onToggleManageTags={() => setIsManagingTags((prev) => !prev)}
            newTagName={newTagName}
            onNewTagNameChange={(value) => {
              setNewTagName(value);
              setTagCreationError(null);
            }}
            onCreateTag={handleCreateTag}
            onDeleteTag={(id) => deleteTagMutation.mutate({ id })}
            tagCreationError={tagCreationError}
          />
          <TodoListSection
            isLoading={todos.isLoading}
            todos={todos.data}
            editingTodoId={editingTodoId}
            editTodoText={editTodoText}
            onEditTodoTextChange={setEditTodoText}
            editTodoBody={editTodoBody}
            onEditTodoBodyChange={setEditTodoBody}
            editDueAt={editDueAt}
            onEditDueAtChange={setEditDueAt}
            editTagIds={editTagIds}
            onToggleEditTag={toggleEditTagSelection}
            editProjectId={editProjectId}
            onEditProjectChange={setEditProjectId}
            projects={projects.data}
            tags={tags.data}
            onEditClick={handleEditClick}
            onCancelEdit={() => setEditingTodoId(null)}
            onUpdateTodo={handleUpdateTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
            onCreateSubtask={handleCreateSubtask}
            onToggleSubtask={handleToggleSubtaskStatus}
            onDeleteSubtask={handleDeleteSubtask}
          />
        </CardContent>
      </Card>
    </div>
  );
}

interface ProjectFilterBannerProps {
  projectIdFilter?: number;
  filteredProject?: { name: string } | undefined;
  clearFilterLink: ClearFilterLink | null;
}

function ProjectFilterBanner({
  projectIdFilter,
  filteredProject,
  clearFilterLink,
}: ProjectFilterBannerProps) {
  if (projectIdFilter === undefined) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-muted bg-muted/20 p-2">
      <Folder className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">
        Project: {filteredProject?.name ?? `#${projectIdFilter}`}
      </span>
      {clearFilterLink && (
        <Link
          to={clearFilterLink.to}
          search={clearFilterLink.search ?? {}}
          className="ml-auto text-xs text-muted-foreground hover:underline"
        >
          {clearFilterLink.label ?? "Clear Filter"}
        </Link>
      )}
    </div>
  );
}

interface TodoSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}
function TodoSearchBar({ value, onChange }: TodoSearchBarProps) {
  return (
    <div className="relative mb-6">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search todos..."
        className="pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface TodoCreationFormProps {
  newTodoText: string;
  onNewTodoTextChange: (value: string) => void;
  newTodoBody: string;
  onNewTodoBodyChange: (value: string) => void;
  dueAt: string;
  onDueAtChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  projects: any[] | undefined;
  selectedProjectId: number | null;
  onProjectSelect: (id: number | null) => void;
  lockProjectSelection: boolean;
  tags: any[] | undefined;
  selectedTagIds: number[];
  onToggleTag: (id: number) => void;
  isManagingTags: boolean;
  onToggleManageTags: () => void;
  newTagName: string;
  onNewTagNameChange: (value: string) => void;
  onCreateTag: () => void;
  onDeleteTag: (id: number) => void;
  tagCreationError: string | null;
}

function TodoCreationForm({
  newTodoText,
  onNewTodoTextChange,
  newTodoBody,
  onNewTodoBodyChange,
  dueAt,
  onDueAtChange,
  onSubmit,
  isSubmitting,
  canSubmit,
  projects,
  selectedProjectId,
  onProjectSelect,
  lockProjectSelection,
  tags,
  selectedTagIds,
  onToggleTag,
  isManagingTags,
  onToggleManageTags,
  newTagName,
  onNewTagNameChange,
  onCreateTag,
  onDeleteTag,
  tagCreationError,
}: TodoCreationFormProps) {
  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-2">
      <Input
        value={newTodoText}
        onChange={(e) => onNewTodoTextChange(e.target.value)}
        placeholder="Task title..."
        disabled={isSubmitting}
      />
      <Textarea
        value={newTodoBody}
        onChange={(e) => onNewTodoBodyChange(e.target.value)}
        placeholder="Details (optional)..."
        disabled={isSubmitting}
      />
      <div className="flex flex-wrap items-center gap-2">
        <ProjectDropdown
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelect={onProjectSelect}
          disabled={lockProjectSelection}
        />
        <TagSelection tags={tags} selectedTagIds={selectedTagIds} onToggle={onToggleTag} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={onToggleManageTags}
        >
          {isManagingTags ? "Hide Tags" : "Manage Tags"}
        </Button>
      </div>

      {isManagingTags && (
        <TagManagementPanel
          tags={tags}
          newTagName={newTagName}
          onNewTagNameChange={onNewTagNameChange}
          tagCreationError={tagCreationError}
          onCreateTag={onCreateTag}
          onDeleteTag={onDeleteTag}
        />
      )}

      <div className="flex items-center space-x-2">
        <Input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => onDueAtChange(e.target.value)}
          disabled={isSubmitting}
          className="flex-1"
        />
        <Button type="submit" disabled={isSubmitting || !canSubmit}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
        </Button>
      </div>
    </form>
  );
}

interface ProjectDropdownProps {
  projects: any[] | undefined;
  selectedProjectId: number | null;
  onSelect: (id: number | null) => void;
  disabled?: boolean;
}

function ProjectDropdown({ projects, selectedProjectId, onSelect, disabled = false }: ProjectDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1" disabled={disabled}>
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
  tags: any[] | undefined;
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

interface TagManagementPanelProps {
  tags: any[] | undefined;
  newTagName: string;
  onNewTagNameChange: (value: string) => void;
  tagCreationError: string | null;
  onCreateTag: () => void;
  onDeleteTag: (id: number) => void;
}

function TagManagementPanel({
  tags,
  newTagName,
  onNewTagNameChange,
  tagCreationError,
  onCreateTag,
  onDeleteTag,
}: TagManagementPanelProps) {
  return (
    <div className="space-y-2 rounded-md border bg-muted/50 p-2">
      <div className="flex flex-col gap-2">
        <Input
          value={newTagName}
          onChange={(e) => onNewTagNameChange(e.target.value)}
          placeholder="Tag name"
          className="h-8 focus-visible:ring-blue-500"
          aria-invalid={!!tagCreationError}
        />
        {tagCreationError && <p className="text-xs text-destructive">{tagCreationError}</p>}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onCreateTag}
            disabled={!newTagName.trim()}
            className="w-full"
          >
            <Plus className="mr-1 h-4 w-4" /> Create Tag
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags?.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => onDeleteTag(tag.id)}
              className="ml-1 hover:text-red-200"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  projects: any[] | undefined;
  tags: any[] | undefined;
  onEditClick: (todo: any) => void;
  onCancelEdit: () => void;
  onUpdateTodo: () => void;
  onToggleTodo: (id: number, completed: boolean) => void;
  onDeleteTodo: (id: number) => void;
  onCreateSubtask: (todoId: number, text: string) => void;
  onToggleSubtask: (id: number, completed: boolean) => void;
  onDeleteSubtask: (id: number) => void;
}

function TodoListSection({
  isLoading,
  todos,
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
  onEditClick,
  onCancelEdit,
  onUpdateTodo,
  onToggleTodo,
  onDeleteTodo,
  onCreateSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TodoListSectionProps) {
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
        <TodoListItem
          key={todo.id}
          todo={todo}
          isEditing={editingTodoId === todo.id}
          editTodoText={editTodoText}
          onEditTodoTextChange={onEditTodoTextChange}
          editTodoBody={editTodoBody}
          onEditTodoBodyChange={onEditTodoBodyChange}
          editDueAt={editDueAt}
          onEditDueAtChange={onEditDueAtChange}
          editTagIds={editTagIds}
          onToggleEditTag={onToggleEditTag}
          editProjectId={editProjectId}
          onEditProjectChange={onEditProjectChange}
          projects={projects}
          tags={tags}
          onSave={onUpdateTodo}
          onCancel={onCancelEdit}
          onEditClick={onEditClick}
          onToggleTodo={onToggleTodo}
          onDeleteTodo={onDeleteTodo}
          onCreateSubtask={onCreateSubtask}
          onToggleSubtask={onToggleSubtask}
          onDeleteSubtask={onDeleteSubtask}
        />
      ))}
    </ul>
  );
}

interface TodoListItemProps {
  todo: any;
  isEditing: boolean;
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
  projects: any[] | undefined;
  tags: any[] | undefined;
  onSave: () => void;
  onCancel: () => void;
  onEditClick: (todo: any) => void;
  onToggleTodo: (id: number, completed: boolean) => void;
  onDeleteTodo: (id: number) => void;
  onCreateSubtask: (todoId: number, text: string) => void;
  onToggleSubtask: (id: number, completed: boolean) => void;
  onDeleteSubtask: (id: number) => void;
}

function TodoListItem({
  todo,
  isEditing,
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
  onSave,
  onCancel,
  onEditClick,
  onToggleTodo,
  onDeleteTodo,
  onCreateSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TodoListItemProps) {
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
            <Button size="sm" onClick={onSave}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
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
