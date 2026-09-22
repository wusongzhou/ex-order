"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** 站点头部：sticky + 底部细边框 + 毛玻璃，对齐 shadcn 文档站导航形态 */
export default function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const linkCls = (active: boolean) =>
    active
      ? "rounded-md bg-muted px-2.5 py-1 font-medium text-foreground"
      : "rounded-md px-2.5 py-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-x-5 gap-y-2 px-4 text-sm">
        <Link href="/admin" className="font-semibold text-foreground">
          管理后台
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/admin" className={linkCls(pathname === "/admin")}>
            供货单
          </Link>
        </nav>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={logout}>
          退出
        </Button>
      </div>
    </header>
  );
}
