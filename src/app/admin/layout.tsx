import type { ReactNode } from "react";

/** admin 段统一基础字号：对齐 shadcn 组件的 text-sm 规格（正文不再走浏览器默认 16px） */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="text-sm">{children}</div>;
}
