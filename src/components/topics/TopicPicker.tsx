"use client";

import { TOPIC_NAMES, ALL_TOPIC_SLUGS } from "@/lib/topics";

interface TopicPickerProps {
  selected: string | null;
  onSelect: (slug: string) => void;
  showLeadOption?: boolean;
  onSelectLead?: () => void;
  leadSelected?: boolean;
}

export function TopicPicker({
  selected,
  onSelect,
  showLeadOption,
  onSelectLead,
  leadSelected,
}: TopicPickerProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {ALL_TOPIC_SLUGS.map((slug) => {
        const isActive = selected === slug && !leadSelected;
        return (
          <button
            key={slug}
            onClick={() => onSelect(slug)}
            className={`rounded-lg border p-4 text-left transition-colors ${
              isActive
                ? "border-primary bg-surface-2"
                : "border-border bg-background hover:border-border-strong"
            }`}
          >
            <span className="text-[15px] font-medium text-foreground">
              {TOPIC_NAMES[slug]}
            </span>
          </button>
        );
      })}
      {showLeadOption && onSelectLead && (
        <button
          onClick={onSelectLead}
          className={`col-span-full rounded-lg border p-4 text-left transition-colors ${
            leadSelected
              ? "border-primary bg-surface-2"
              : "border-border bg-background hover:border-border-strong"
          }`}
        >
          <span className="text-[15px] font-medium text-foreground">
            Let Echo lead
          </span>
        </button>
      )}
    </div>
  );
}
