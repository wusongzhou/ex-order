"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminNav() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <span className="font-semibold text-gray-900">供货订购 · 商家后台</span>
      <span className="flex-1" />
      <Link href="/admin" className="text-gray-600 hover:text-gray-900">
        供货单
      </Link>
      <button onClick={logout} className="text-gray-400 hover:text-gray-900">
        退出
      </button>
    </nav>
  );
}
