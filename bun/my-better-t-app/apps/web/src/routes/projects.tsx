import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link, Outlet, createFileRoute, redirect, useLocation } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { orpc } from "@/utils/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getUser } from "../functions/get-user";

export const Route = createFileRoute("/projects")({
  component: ProjectsRoute,
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

function ProjectsRoute() {
  const location = useLocation();
  const isViewingProject = location.pathname !== "/projects";

  if (isViewingProject) {
    return <Outlet />;
  }

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const projects = useQuery(orpc.project.list.queryOptions());

  const createMutation = useMutation(
    orpc.project.create.mutationOptions({
      onSuccess: () => {
        projects.refetch();
        setName("");
        setDescription("");
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.project.delete.mutationOptions({
      onSuccess: () => {
        projects.refetch();
      },
    }),
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createMutation.mutate({ name, description: description || undefined });
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl py-10 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create Project</CardTitle>
          <CardDescription>Organize your tasks into projects</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Project Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={createMutation.isPending}
              />
              <Textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>
            <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Project
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.isLoading ? (
          <div className="col-span-full flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : projects.data?.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-8">
            No projects found. Create one above!
          </div>
        ) : (
          projects.data?.map((project) => (
            <Card key={project.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">{project.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate({ id: project.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground flex-1">
                  {project.description || "No description"}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: project.id.toString() }}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    View Tasks
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
