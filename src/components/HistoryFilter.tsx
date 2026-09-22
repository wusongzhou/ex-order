"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DateTimePicker from "@/components/ui/DateTimePicker";

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "open", label: "进行中" },
  { value: "ended", label: "已结束（截止/关闭）" },
];

/** 历史供货单筛选：标题模糊搜索 + 供货日期 + 状态（URL 参数驱动，可分享/刷新不丢） */
export default function HistoryFilter({
  q,
  status,
  date,
}: {
  q: string;
  status: string;
  date: string;
}) {
  const router = useRouter();
  const [kw, setKw] = useState(q);
  const [st, setSt] = useState(status);
  const [dt, setDt] = useState(date);

  const apply = () => {
    const params = new URLSearchParams();
    if (kw.trim()) params.set("q", kw.trim());
    if (dt) params.set("date", dt);
    if (st !== "all") params.set("status", st);
    const qs = params.toString();
    router.push(qs ? `/admin?${qs}` : "/admin");
  };

  const filtered = q || status !== "all" || date;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <input
        value={kw}
        onChange={(e) => setKw(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && apply()}
        placeholder="模糊搜索标题"
        className="min-w-44 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <DateTimePicker value={dt} onChange={setDt} placeholder="供货日期" className="w-40" />
      <Select value={st} onValueChange={(v) => setSt(String(v))}>
        <SelectTrigger className="h-9 w-44">
          <SelectValue placeholder="全部状态">
            {(v: string) => STATUS_OPTIONS.find((o) => o.value === v)?.label ?? "全部状态"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
