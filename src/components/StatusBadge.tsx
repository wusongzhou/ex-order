"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { sheetStatus } from "@/lib/sheetStatus";

/** 供货单状态徽章：单色胶囊 + 进行中绿点，对齐 shadcn 文档站的克制观感 */
export default function StatusBadge({
  sheet,
  className = "",
}: {
  sheet: { status: string; deadline: Date };
  className?: string;
}) {
  const { status, label } = sheetStatus(sheet);
  return (
    <Badge
      variant={status === "open" ? "outline" : "secondary"}
      className={cn("gap-1.5", className)}
    >
      {status === "open" && (
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
      )}
      {label}
    </Badge>
  );
}
