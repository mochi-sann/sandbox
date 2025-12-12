import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TodoSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function TodoSearchBar({ value, onChange }: TodoSearchBarProps) {
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
