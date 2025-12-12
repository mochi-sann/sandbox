import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getUser } from "../../functions/get-user";
import { TodosPage } from "../todos";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectTodosRoute,
  beforeLoad: async () => {
    const session = await getUser();
    return { session };
  },
  loader: async ({ context }) => {
    if (!context.session) {
      throw redirect({ to: "/login" });
    }
  },
});

function ProjectTodosRoute() {
  const { projectId } = Route.useParams();
  const numericProjectId = Number(projectId);

  const projectQuery = useQuery(
    orpc.project.get.queryOptions({
      input: { id: numericProjectId },
    }),
  );

  if (projectQuery.isLoading) {
    return (
      <div className="mx-auto flex h-[60vh] w-full max-w-4xl items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="mx-auto w-full max-w-2xl py-10 px-4 text-center">
        <p className="text-lg font-semibold text-destructive">Project not found.</p>
        <p className="text-muted-foreground">It may have been deleted or you lack access.</p>
        <Button asChild className="mt-4">
          <Link to="/projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  const projectData = projectQuery.data;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 py-10 px-4">
      <div className="space-y-2">
        <Button variant="ghost" asChild className="w-fit gap-2 px-0 text-muted-foreground">
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-semibold">{projectData.name}</h1>
          <p className="text-muted-foreground">
            {projectData.description || "Tasks assigned to this project"}
          </p>
        </div>
      </div>

      <TodosPage
        projectIdFilter={projectData.id}
        lockProjectSelection
        title="Project Todo List"
        description={projectData.description || "Manage tasks scoped to this project"}
        clearFilterLink={{
          to: "/projects",
          label: "Back to Projects",
        }}
      />
    </div>
  );
}
