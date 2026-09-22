export function sheetStatus(s: { status: string; deadline: Date }) {
  if (s.status === "closed") {
    return { label: "已关闭", cls: "bg-muted text-muted-foreground/80", open: false };
  }
  if (new Date(s.deadline).getTime() <= Date.now()) {
    return { label: "已截止", cls: "bg-warning/15 text-warning", open: false };
  }
  return { label: "进行中", cls: "bg-success/15 text-success", open: true };
}

export function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("zh-CN", { hour12: false });
}
