"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** 汇总表中的「库存」单元格：点击弹出气泡确认框调整本期库存（不能小于已订购数量）。stock >= 9999 视为不限 */
export default function StockCell({
  itemId,
  stock,
  orderedQty,
}: {
  itemId: number;
  stock: number;
  orderedQty: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(String(stock));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const unlimited = stock >= 9999;

  const save = async () => {
    const n = Math.floor(Number(val));
    if (isNaN(n) || n < 0) {
      setErr("请输入不小于 0 的整数");
      return;
    }
    if (n === stock) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setErr("");
    const r = await fetch(`/api/sheet-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: n }),
    });
    setBusy(false);
    if (r.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const d = await r.json().catch(() => ({}));
      setErr(d.error || "保存失败");
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setVal(unlimited ? "" : String(stock));
          setErr("");
        }
      }}
    >
      <PopoverTrigger
        render={
          <button
            title={`点击调整库存（当前 ${unlimited ? "不限" : stock}，已订 ${orderedQty}）`}
            className="inline-flex items-center gap-1 font-medium text-gray-900 hover:underline"
          />
        }
      >
        {unlimited ? "不限" : stock}
        <Pencil className="h-3 w-3 text-gray-400" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-0 p-3">
        <p className="text-sm font-medium text-gray-900">调整库存</p>
        <p className="mt-0.5 text-xs text-gray-400">
          {unlimited ? "当前不限，填写数字后转为限量" : `已订 ${orderedQty}，不能小于它`}
        </p>
        <Input
          type="number"
          min={0}
          value={val}
          autoFocus
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          className="mt-2"
        />
        {err && <p className="mt-1.5 text-xs text-red-600">{err}</p>}
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setVal(String(orderedQty))}
            title={`库存设为已订购量（${orderedQty}），剩余归零`}
            className="text-xs text-red-500 hover:underline"
          >
            售罄
          </button>
          <span className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? "保存中..." : "确定"}
            </Button>
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
