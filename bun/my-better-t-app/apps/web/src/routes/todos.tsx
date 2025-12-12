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
