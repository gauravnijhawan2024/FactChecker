import { FileImage, Link, TextCursorInput } from "lucide-react";
import type { InputMode } from "../types/analysis";

interface ModeTabsProps {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
}

const modes = [
  { id: "url", label: "URL", icon: Link },
  { id: "text", label: "Text", icon: TextCursorInput },
  { id: "image", label: "Image", icon: FileImage }
] as const;

export function ModeTabs({ mode, onChange }: ModeTabsProps) {
  return (
    <div className="grid grid-cols-3 rounded-md border border-line bg-white p-1">
      {modes.map((item) => {
        const Icon = item.icon;
        const active = mode === item.id;

        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => onChange(item.id)}
            className={`flex h-10 items-center justify-center gap-2 rounded px-3 text-sm font-medium transition ${
              active ? "bg-ink text-white" : "text-ink hover:bg-paper"
            }`}
          >
            <Icon size={17} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

