import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Calendar, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

import { orpc } from "@/utils/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getUser } from "../functions/get-user";

export const Route = createFileRoute("/todos")({
  component: TodosRoute,
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

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

function TodosRoute() {
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoBody, setNewTodoBody] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [newTagName, setNewTagName] = useState("");
  const [isManagingTags, setIsManagingTags] = useState(false);
  const [tagCreationError, setTagCreationError] = useState<string | null>(null);

  // Edit state
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editTodoText, setEditTodoText] = useState("");
  const [editTodoBody, setEditTodoBody] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const [editTagIds, setEditTagIds] = useState<number[]>([]);

  const todos = useQuery(orpc.todo.getAll.queryOptions());
  const tags = useQuery(orpc.tag.list.queryOptions());

  const createMutation = useMutation(
    orpc.todo.create.mutationOptions({
      onSuccess: () => {
        todos.refetch();
        setNewTodoText("");
        setNewTodoBody("");
        setDueAt("");
        setSelectedTagIds([]);
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
        setTagCreationError(null); // Clear error on success
      },
      onError: (error) => {
        // Assuming error is an ORPCError or similar with a message
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

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      createMutation.mutate({
        text: newTodoText,
        body: newTodoBody || undefined,
        dueAt: dueAt ? new Date(dueAt) : undefined,
        tags: selectedTagIds,
      });
    }
  };

  const handleUpdateTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTodoId && editTodoText.trim()) {
      updateMutation.mutate({
        id: editingTodoId,
        text: editTodoText,
        body: editTodoBody || null,
        dueAt: editDueAt ? new Date(editDueAt) : null,
        tags: editTagIds,
      });
    }
  };

  const handleEditClick = (todo: any) => {
    setEditingTodoId(todo.id);
    setEditTodoText(todo.text);
    setEditTodoBody(todo.body || "");
    // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
    const formattedDate = todo.dueAt ? new Date(todo.dueAt).toISOString().slice(0, 16) : "";
    setEditDueAt(formattedDate);
    setEditTagIds(todo.tags.map((t: any) => t.id));
  };

  const handleToggleTodo = (id: number, completed: boolean) => {
    toggleMutation.mutate({ id, completed: !completed });
  };

  const handleDeleteTodo = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      const color = stringToColor(newTagName);
      createTagMutation.mutate({ name: newTagName, color });
    }
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
          <CardTitle>Todo List</CardTitle>
          <CardDescription>Manage your tasks efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTodo} className="mb-6 space-y-2">
            <Input
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Task title..."
              disabled={createMutation.isPending}
            />
            <Textarea
              value={newTodoBody}
              onChange={(e) => setNewTodoBody(e.target.value)}
              placeholder="Details (optional)..."
              disabled={createMutation.isPending}
            />
            <div className="flex flex-wrap gap-2">
              {tags.data?.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className={`cursor-pointer border-2 ${selectedTagIds.includes(tag.id) ? "border-primary" : "border-transparent"}`}
                  style={{
                    backgroundColor: tag.color,
                    color: "#fff", // Simplified: always white text
                  }}
                  onClick={() => toggleTagSelection(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setIsManagingTags(!isManagingTags)}
              >
                {isManagingTags ? "Hide Tags" : "Manage Tags"}
              </Button>
            </div>

            {isManagingTags && (
              <div className="rounded-md border p-2 space-y-2 bg-muted/50">
                <div className="flex flex-col gap-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => {
                      setNewTagName(e.target.value);
                      setTagCreationError(null); // Clear error on change
                    }}
                    placeholder="Tag name"
                    className="h-8 focus-visible:ring-blue-500" // Glow effect
                    aria-invalid={!!tagCreationError}
                  />
                  {tagCreationError && (
                    <p className="text-destructive text-xs">{tagCreationError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim()}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Create Tag
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.data?.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                      <button
                        onClick={() => deleteTagMutation.mutate({ id: tag.id })}
                        className="ml-1 hover:text-red-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                disabled={createMutation.isPending}
                className="flex-1"
              />
              <Button type="submit" disabled={createMutation.isPending || !newTodoText.trim()}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </form>

          {todos.isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : todos.data?.length === 0 ? (
            <p className="py-4 text-center">No todos yet. Add one above!</p>
          ) : (
            <ul className="space-y-2">
              {todos.data?.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-start justify-between rounded-md border p-2"
                >
                  {editingTodoId === todo.id ? (
                    <div className="w-full space-y-2">
                      <Input
                        value={editTodoText}
                        onChange={(e) => setEditTodoText(e.target.value)}
                        placeholder="Task title"
                      />
                      <Textarea
                        value={editTodoBody}
                        onChange={(e) => setEditTodoBody(e.target.value)}
                        placeholder="Details"
                      />
                      <div className="flex flex-wrap gap-2">
                        {tags.data?.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className={`cursor-pointer border-2 ${editTagIds.includes(tag.id) ? "border-primary" : "border-transparent"}`}
                            style={{
                              backgroundColor: tag.color,
                              color: "#fff",
                            }}
                            onClick={() => toggleEditTagSelection(tag.id)}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="datetime-local"
                          value={editDueAt}
                          onChange={(e) => setEditDueAt(e.target.value)}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={handleUpdateTodo}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingTodoId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start space-x-2 w-full">
                        <Checkbox
                          checked={todo.completed}
                          onCheckedChange={() => handleToggleTodo(todo.id, todo.completed)}
                          id={`todo-${todo.id}`}
                          className="mt-1"
                        />
                        <div className="flex flex-col gap-1 w-full">
                          <label
                            htmlFor={`todo-${todo.id}`}
                            className={`font-medium ${todo.completed ? "line-through text-muted-foreground" : ""}`}
                          >
                            {todo.text}
                          </label>
                          {todo.body && (
                            <div className="text-sm text-muted-foreground break-words">
                              <ReactMarkdown>{todo.body}</ReactMarkdown>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {todo.tags.map((tag) => (
                              <Badge
                                key={tag.id}
                                style={{
                                  backgroundColor: tag.color,
                                  color: "#fff",
                                }}
                                className="text-[10px] px-1.5 py-0 h-5"
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
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(todo)}
                          aria-label="Edit todo"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTodo(todo.id)}
                          aria-label="Delete todo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
