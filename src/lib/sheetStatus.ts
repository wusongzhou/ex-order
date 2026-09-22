export type SheetStatusInfo = {
  /** 语义状态，样式交给 StatusBadge / 调用方 */
  status: "open" | "expired" | "closed";
  label: string;
  open: boolean;
};

export function sheetStatus(s: { status: string; deadline: Date }): SheetStatusInfo {
  if (s.status === "closed") {
    return { status: "closed", label: "已关闭", open: false };
  }
  if (new Date(s.deadline).getTime() <= Date.now()) {
    return { status: "expired", label: "已截止", open: false };
  }
  return { status: "open", label: "进行中", open: true };
}

export function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("zh-CN", { hour12: false });
}
