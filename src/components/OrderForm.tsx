"use client";

import { useCallback, useEffect, useState } from "react";

type ItemView = {
  id: number;
  name: string;
  size: string;
  flowerType: string;
  color: string;
  grade: string;
  price: number;
  stock: number;
  remain: number | null; // 实时剩余 = 库存 - 全部已提交；null 表示不限
  quantity: number;
  hasImage1: boolean;
  hasImage2: boolean;
};

type Props = {
  token: string;
  customerName: string;
  sheet: { date: string; title: string; deadline: string; status: string };
  editable: boolean;
  submitted: boolean;
  submittedAt: string | null;
  items: ItemView[];
};

function fmtRemaining(ms: number): string {
  if (ms <= 0) return "已截止";
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `剩余 ${d} 天 ${h} 小时`;
  if (h > 0) return `剩余 ${h} 小时 ${m} 分`;
  return `剩余 ${m} 分钟`;
}

export default function OrderForm({ token, customerName, sheet, editable, submitted, submittedAt, items }: Props) {
  const [qtys, setQtys] = useState<Record<number, number>>(
    () => Object.fromEntries(items.map((i) => [i.id, i.quantity])) as Record<number, number>
  );
  // 实时剩余（可被轮询更新，不覆盖用户正在输入的数量）
  const [remainMap, setRemainMap] = useState<Record<number, number | null>>(
    () => Object.fromEntries(items.map((i) => [i.id, i.remain])) as Record<number, number | null>
  );
  // now 为 null 表示尚未挂载（避免 SSR/客户端时间差导致 hydration 不一致）
  const [now, setNow] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(submittedAt);

  // 每秒 tick：挂载后驱动截止倒计时与刷新按钮冷却显示
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 刷新剩余：提交成功/失败后自动触发（手动按钮见头部，60 秒冷却）
  const refreshRemain = useCallback(async () => {
    try {
      const res = await fetch(`/api/order/${token}`);
      if (!res.ok) return;
      const d = await res.json();
      setRemainMap(
        Object.fromEntries(d.items.map((i: { id: number; remain: number | null }) => [i.id, i.remain]))
      );
    } catch {
      /* 网络异常时保持当前显示 */
    }
  }, [token]);

  // 手动刷新剩余库存（60 秒冷却）
  const [lastRefresh, setLastRefresh] = useState(0);
  const refreshCooldown =
    now === null ? 0 : Math.max(0, 60 - Math.floor((now - lastRefresh) / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const manualRefresh = useCallback(async () => {
    if (refreshCooldown > 0) return;
    setLastRefresh(Date.now());
    await refreshRemain();
  }, [refreshCooldown, refreshRemain]);

  const deadline = new Date(sheet.deadline);
  const remaining = now === null ? null : deadline.getTime() - now;
  const canEdit = editable && (remaining === null || remaining > 0);

  const totalAmount = items.reduce((s, it) => s + (qtys[it.id] || 0) * it.price, 0);
  const totalCount = items.reduce((s, it) => s + (qtys[it.id] || 0), 0);

  const remainOf = (it: ItemView) => (it.remain === null ? null : remainMap[it.id] ?? it.remain);

  const setQty = (id: number, v: string) => {
    const n = Math.min(Math.max(Math.floor(Number(v) || 0), 0), 99999);
    setQtys((prev) => ({ ...prev, [id]: n }));
  };

  const save = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/order/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((it) => ({ sheetItemId: it.id, quantity: qtys[it.id] || 0 })) }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedAt(new Date().toISOString());
      setMsgOk(true);
      setMsg("提交成功，截止前可继续修改");
      refreshRemain();
    } else {
      const d = await res.json().catch(() => ({}));
      setMsgOk(false);
      setMsg(d.error || "提交失败，请重试");
      // 提交失败（如库存不足）时立即刷新最新剩余
      refreshRemain();
    }
  };

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-8">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            {sheet.date} 供货单{sheet.title ? ` · ${sheet.title}` : ""}
          </h1>
          {savedAt && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-700">已提交</span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-600">{customerName}，请填写您今日需要的订购数量</p>
        <p className={`mt-2 text-xs ${remaining !== null && remaining <= 0 ? "text-amber-600" : "text-gray-400"}`}>
          截止时间 {deadline.toLocaleString("zh-CN", { hour12: false })}
          {remaining !== null && `（${fmtRemaining(remaining)}）`}
        </p>
        {canEdit && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={manualRefresh}
              disabled={refreshCooldown > 0}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              title="刷新最新库存"
            >
              ↻ 刷新库存{refreshCooldown > 0 ? `（${refreshCooldown}s）` : ""}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {items.map((it) => {
          const attrs = [it.size, it.flowerType, it.color, it.grade].filter(Boolean).join(" · ");
          const remain = remainOf(it);
          const soldOut = canEdit && remain !== null && remain <= 0 && (qtys[it.id] || 0) === 0;
          return (
            <div key={it.id} className={`rounded-xl bg-white p-4 shadow-sm ${soldOut ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {(it.hasImage1 || it.hasImage2) && (
                    <div className="flex shrink-0 gap-1">
                      {it.hasImage1 && (
                        <img
                          src={`/api/item-image/${it.id}?n=1`}
                          alt={it.name}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                      )}
                      {it.hasImage2 && (
                        <img
                          src={`/api/item-image/${it.id}?n=2`}
                          alt={it.name}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {it.name}
                      {it.grade && <span className="ml-1 text-sm font-normal text-gray-500">{it.grade}级</span>}
                    </p>
                    {attrs && <p className="mt-0.5 text-xs text-gray-500">{attrs}</p>}
                    <p className="mt-0.5 text-xs text-gray-500">
                      ¥{it.price.toFixed(2)}
                      {remain !== null && (
                        <span className={`ml-2 font-medium ${remain <= 0 ? "text-red-500" : "text-amber-600"}`}>
                          {remain <= 0 ? "已订完" : `库存 ${remain}`}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {canEdit && !soldOut ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={qtys[it.id] || 0}
                    onChange={(e) => setQty(it.id, e.target.value)}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-center text-base"
                  />
                ) : (
                  <span className="text-lg font-semibold">{qtys[it.id] || 0}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {msg && <p className={`mt-3 text-sm ${msgOk ? "text-green-700" : "text-red-600"}`}>{msg}</p>}

      {canEdit && (
        <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              共 <span className="font-semibold text-gray-900">{totalCount}</span> 件 · 合计{" "}
              <span className="text-lg font-semibold text-gray-900">¥{totalAmount.toFixed(2)}</span>
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-gray-900 px-8 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? "提交中..." : savedAt ? "更新订购" : "提交订购"}
            </button>
          </div>
        </div>
      )}

      {!canEdit && (
        <p className="mt-4 text-center text-sm text-gray-400">
          {sheet.status === "closed" ? "本单已关闭，如需调整请联系供货方" : "已截止，如需调整请联系供货方"}
        </p>
      )}
    </main>
  );
}
