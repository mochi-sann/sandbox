import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Calendar, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

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

function TodosRoute() {
	const [newTodoText, setNewTodoText] = useState("");
	const [dueAt, setDueAt] = useState("");

	const todos = useQuery(orpc.todo.getAll.queryOptions());
	const createMutation = useMutation(
		orpc.todo.create.mutationOptions({
			onSuccess: () => {
				todos.refetch();
				setNewTodoText("");
				setDueAt("");
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

	const handleAddTodo = (e: React.FormEvent) => {
		e.preventDefault();
		if (newTodoText.trim()) {
			createMutation.mutate({
				text: newTodoText,
				dueAt: dueAt ? new Date(dueAt) : undefined,
			});
		}
	};

	const handleToggleTodo = (id: number, completed: boolean) => {
		toggleMutation.mutate({ id, completed: !completed });
	};

	const handleDeleteTodo = (id: number) => {
		deleteMutation.mutate({ id });
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
						<div className="flex items-center space-x-2">
							<Input
								value={newTodoText}
								onChange={(e) => setNewTodoText(e.target.value)}
								placeholder="Add a new task..."
								disabled={createMutation.isPending}
								className="flex-1"
							/>
						</div>
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
									className="flex items-center justify-between rounded-md border p-2"
								>
									<div className="flex items-center space-x-2">
										<Checkbox
											checked={todo.completed}
											onCheckedChange={() =>
												handleToggleTodo(todo.id, todo.completed)
											}
											id={`todo-${todo.id}`}
										/>
										<div className="flex flex-col">
											<label
												htmlFor={`todo-${todo.id}`}
												className={`${todo.completed ? "line-through text-muted-foreground" : ""}`}
											>
												{todo.text}
											</label>
											{todo.dueAt && (
												<span className="flex items-center gap-1 text-xs text-muted-foreground">
													<Calendar className="h-3 w-3" />
													{new Date(todo.dueAt).toLocaleString()}
												</span>
											)}
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleDeleteTodo(todo.id)}
										aria-label="Delete todo"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
