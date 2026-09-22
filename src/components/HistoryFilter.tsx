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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <Input
        value={kw}
        onChange={(e) => setKw(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && apply()}
        placeholder="模糊搜索标题"
        className="min-w-44 flex-1"
      />
      <DateTimePicker value={dt} onChange={setDt} placeholder="供货日期" className="w-40" />
      <Select value={st} onValueChange={(v) => setSt(String(v))}>
        <SelectTrigger className="w-44">
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
      <Button variant="outline" onClick={apply}>
        筛选
      </Button>
      {filtered && (
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => router.push("/admin")}
        >
          重置
        </Button>
      )}
    </div>
  );
}
