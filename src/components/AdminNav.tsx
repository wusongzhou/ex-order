"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AdminNav() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <span className="font-semibold text-foreground">供货订购 · 商家后台</span>
      <span className="flex-1" />
      <Link href="/admin" className="text-muted-foreground hover:text-foreground">
        供货单
      </Link>
      <Button variant="link" className="h-auto px-0 text-muted-foreground" onClick={logout}>
        退出
      </Button>
    </nav>
  );
}
