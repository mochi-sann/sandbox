import { Link } from "@tanstack/react-router";
import { Folder } from "lucide-react";
import type { ClearFilterLink } from "../types";

interface ProjectFilterBannerProps {
  projectIdFilter?: number;
  filteredProject?: { name: string } | undefined;
  clearFilterLink: ClearFilterLink | null;
}

export function ProjectFilterBanner({
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
