export function sheetStatus(s: { status: string; deadline: Date }) {
  if (s.status === "closed") {
    return { label: "已关闭", cls: "bg-gray-100 text-gray-500", open: false };
  }
  if (new Date(s.deadline).getTime() <= Date.now()) {
    return { label: "已截止", cls: "bg-amber-100 text-amber-700", open: false };
  }
  return { label: "进行中", cls: "bg-green-100 text-green-700", open: true };
}

export function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("zh-CN", { hour12: false });
}
