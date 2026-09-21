"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Select from "@/components/ui/Select";

/** 历史供货单筛选：关键字 + 状态（URL 参数驱动，可分享/刷新不丢） */
export default function HistoryFilter({ q, status }: { q: string; status: string }) {
  const router = useRouter();
  const [kw, setKw] = useState(q);
  const [st, setSt] = useState(status);

  const apply = () => {
    const params = new URLSearchParams();
    if (kw.trim()) params.set("q", kw.trim());
    if (st !== "all") params.set("status", st);
    const qs = params.toString();
    router.push(qs ? `/admin?${qs}` : "/admin");
  };

  const filtered = q || status !== "all";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <input
        value={kw}
        onChange={(e) => setKw(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && apply()}
        placeholder="搜索标题或供货日期，如：2026-09-22"
        className="min-w-56 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <Select
        value={st}
        onChange={setSt}
        options={[
          { value: "all", label: "全部状态" },
          { value: "open", label: "进行中" },
          { value: "ended", label: "已结束（截止/关闭）" },
        ]}
        className="w-44"
      />
      <button
        onClick={apply}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        筛选
      </button>
      {filtered && (
        <button
          onClick={() => router.push("/admin")}
          className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-900"
        >
          重置
        </button>
      )}
    </div>
  );
}
