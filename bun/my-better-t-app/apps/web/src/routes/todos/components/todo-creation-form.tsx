import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Folder, Loader2, Plus, X } from "lucide-react";

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
  projects: Array<{ id: number; name: string }> | undefined;
  selectedProjectId: number | null;
  onProjectSelect: (id: number | null) => void;
  lockProjectSelection: boolean;
  tags: Array<{ id: number; name: string; color: string }> | undefined;
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

export function TodoCreationForm({
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
  projects: Array<{ id: number; name: string }> | undefined;
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
  tags: Array<{ id: number; name: string; color: string }> | undefined;
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
  tags: Array<{ id: number; name: string; color: string }> | undefined;
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
