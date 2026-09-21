"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 汇总表中的剩余数量单元格：点击可调整库存（不能小于已订购数量） */
export default function StockCell({
  itemId,
  stock,
  orderedQty,
  remain,
}: {
  itemId: number;
  stock: number;
  orderedQty: number;
  remain: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(stock));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const cls =
    remain < 0
      ? "text-red-600"
      : remain === 0
        ? "text-amber-600"
        : "text-green-700";

  const save = async () => {
    const n = Math.floor(Number(val));
    if (isNaN(n) || n < 0) {
      setErr("请输入不小于 0 的整数");
      return;
    }
    if (n === stock) {
      setEditing(false);
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
      setEditing(false);
      router.refresh();
    } else {
      const d = await r.json().catch(() => ({}));
      setErr(d.error || "保存失败");
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => {
          setVal(String(stock));
          setEditing(true);
          setErr("");
        }}
        title={`点击调整库存（当前库存 ${stock}，已订 ${orderedQty}）`}
        className={`font-medium hover:underline decoration-dotted underline-offset-4 ${cls}`}
      >
        {remain}
      </button>
    );
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <input
        type="number"
        min={orderedQty}
        value={val}
        autoFocus
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-16 rounded border border-gray-900 px-2 py-1 text-sm"
      />
      <span className="flex gap-2 text-[11px] leading-none">
        <button onClick={save} disabled={busy} className="text-gray-900 hover:underline disabled:opacity-50">
          保存
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:underline">
          取消
        </button>
      </span>
      <span className="text-[11px] text-gray-400">已订 {orderedQty}，不能小于它</span>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </span>
  );
}
