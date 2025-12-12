import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import {
	Calendar,
	ChevronDown,
	Folder,
	Loader2,
	Pencil,
	Plus,
	Search,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { z } from "zod";

import { orpc } from "@/utils/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getUser } from "../functions/get-user";

const todosSearchSchema = z.object({
	projectId: z.number().optional(),
});

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

function stringToColor(str: string) {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	const c = (hash & 0x00ffffff).toString(16).toUpperCase();
	return "#" + "00000".substring(0, 6 - c.length) + c;
}

function TodosRoute() {
	const { projectId } = Route.useSearch();
	const [search, setSearch] = useState("");
	const [newTodoText, setNewTodoText] = useState("");
	const [newTodoBody, setNewTodoBody] = useState("");
	const [dueAt, setDueAt] = useState("");
	const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
	const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
		projectId || null,
	);

	useEffect(() => {
		if (projectId !== undefined) {
			setSelectedProjectId(projectId);
		}
	}, [projectId]);

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
		orpc.todo.getAll.queryOptions({ input: { search, projectId } }),
	);
	const tags = useQuery(orpc.tag.list.queryOptions());
	const projects = useQuery(orpc.project.list.queryOptions());

	const filteredProject = projects.data?.find((p) => p.id === projectId);

	const createMutation = useMutation(
		orpc.todo.create.mutationOptions({
			onSuccess: () => {
				todos.refetch();
				setNewTodoText("");
				setNewTodoBody("");
				setDueAt("");
				setSelectedTagIds([]);
				// Keep project selected if filtered, otherwise reset
				if (!projectId) setSelectedProjectId(null);
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

	const handleUpdateTodo = (e: React.FormEvent) => {
		e.preventDefault();
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
		const formattedDate = todo.dueAt
			? new Date(todo.dueAt).toISOString().slice(0, 16)
			: "";
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

	const handleCreateTag = (e: React.FormEvent) => {
		e.preventDefault();
		if (newTagName.trim()) {
			const color = stringToColor(newTagName);
			createTagMutation.mutate({ name: newTagName, color });
		}
	};

	const handleCreateSubtask = (todoId: number, text: string) => {
		if (text.trim()) {
			createSubtaskMutation.mutate({ todoId, text });
		}
	};

	const toggleTagSelection = (tagId: number) => {
		setSelectedTagIds((prev) =>
			prev.includes(tagId)
				? prev.filter((id) => id !== tagId) : [...prev, tagId],
		);
	};

	const toggleEditTagSelection = (tagId: number) => {
		setEditTagIds((prev) =>
			prev.includes(tagId)
				? prev.filter((id) => id !== tagId) : [...prev, tagId],
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
					{filteredProject && (
						<div className="mb-4 flex items-center gap-2 p-2 bg-muted/20 rounded-md border border-muted">
							<Folder className="h-4 w-4 text-primary" />
							<span className="text-sm font-medium">
								Project: {filteredProject.name}
							</span>
							<Link
								to="/todos"
								search={{}}
								className="text-xs text-muted-foreground hover:underline ml-auto"
							>
								Clear Filter
							</Link>
						</div>
					)}

					<div className="mb-6 relative">
						<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							type="search"
							placeholder="Search todos..."
							className="pl-9"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>

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
						<div className="flex flex-wrap gap-2 items-center">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" className="h-8 gap-1">
										<Folder className="h-3.5 w-3.5" />
										{projects.data?.find((p) => p.id === selectedProjectId)
											?.name || "Project"}
										<ChevronDown className="h-3 w-3 opacity-50" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem onClick={() => setSelectedProjectId(null)}>
										No Project
									</DropdownMenuItem>
									{projects.data?.map((project) => (
										<DropdownMenuItem
											key={project.id}
											onClick={() => setSelectedProjectId(project.id)}
										>
											{project.name}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
							{tags.data?.map((tag) => (
								<Badge
									key={tag.id}
									variant="outline"
									className={`cursor-pointer border-2 ${selectedTagIds.includes(tag.id) ? "border-primary" : "border-transparent"}`}
									style={{
										backgroundColor: tag.color,
										color: "#fff",
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
											setTagCreationError(null);
										}}
										placeholder="Tag name"
										className="h-8 focus-visible:ring-blue-500"
										aria-invalid={!!tagCreationError}
									/>
									{tagCreationError && (
										<p className="text-destructive text-xs">
											{tagCreationError}
										</p>
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
							<Button
								type="submit"
								disabled={createMutation.isPending || !newTodoText.trim()}
							>
								{createMutation.isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									"Add"
								)}
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
											<div className="flex flex-wrap gap-2 items-center">
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="outline"
															size="sm"
															className="h-8 gap-1"
														>
															<Folder className="h-3.5 w-3.5" />
															{projects.data?.find(
																(p) => p.id === editProjectId,
															)?.name || "Project"}
															<ChevronDown className="h-3 w-3 opacity-50" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="start">
														<DropdownMenuItem
															onClick={() => setEditProjectId(null)}
														>
															No Project
														</DropdownMenuItem>
														{projects.data?.map((project) => (
															<DropdownMenuItem
																key={project.id}
																onClick={() => setEditProjectId(project.id)}
															>
																{project.name}
															</DropdownMenuItem>
														))}
													</DropdownMenuContent>
												</DropdownMenu>
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
												<Button
													size="sm"
													variant="ghost"
													onClick={() => setEditingTodoId(null)}
												>
													Cancel
												</Button>
											</div>
										</div>
									) : (
										<>
											<div className="flex items-start space-x-2 w-full">
												<Checkbox
													checked={todo.completed}
													onCheckedChange={() =>
														handleToggleTodo(todo.id, todo.completed)
													}
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
													<div className="flex flex-wrap gap-2 items-center">
														{todo.project && (
															<div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded-md">
																<Folder className="h-3 w-3" />
																<span>{todo.project.name}</span>
															</div>
														)}
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

													<div className="mt-2 w-full">
														{todo.subtasks && todo.subtasks.length > 0 && (
															<ul className="space-y-1 mb-1">
																{todo.subtasks.map((subtask: any) => (
																	<li
																		key={subtask.id}
																		className="flex items-center gap-2 group text-sm"
																	>
																		<Checkbox
																			checked={subtask.completed}
																			onCheckedChange={(c) =>
																				toggleSubtaskMutation.mutate({
																					id: subtask.id,
																					completed: !!c,
																				})
																			}
																			className="h-3 w-3"
																		/>
																		<span
																			className={`${subtask.completed ? "line-through text-muted-foreground" : ""}`}
																		>
																			{subtask.text}
																		</span>
																		<button
																			onClick={() =>
																				deleteSubtaskMutation.mutate({
																					id: subtask.id,
																				})
																			}
																			className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
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
																className="h-6 text-xs border-none shadow-none focus-visible:ring-0 p-0 placeholder:text-muted-foreground/70"
																placeholder="Add subtask..."
																onKeyDown={(e) => {
																	if (e.key === "Enter") {
																		e.preventDefault();
																		handleCreateSubtask(
																			todo.id,
																			e.currentTarget.value,
																		);
																		e.currentTarget.value = "";
																	}
																}}
															/>
														</div>
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

