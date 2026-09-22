"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

/** 移动端步进器：紧凑款，36px 高，电商卡片底排对齐用 */
function Stepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || value <= 0}
        onClick={() => onChange(value - 1)}
        className="size-9 rounded-lg text-lg text-secondary-foreground"
        aria-label="减少"
      >
        −
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) =>
          onChange(Math.min(Math.max(Math.floor(Number(e.target.value) || 0), 0), 99999))
        }
        className="h-9 w-12 rounded-lg text-center text-base font-medium md:text-base"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        className="size-9 rounded-lg text-lg text-secondary-foreground"
        aria-label="增加"
      >
        ＋
      </Button>
    </div>
  );
}

export default function OrderForm({
  token,
  customerName,
  sheet,
  editable,
  submitted: _submitted, // 预留字段（savedAt 已表达提交状态）
  submittedAt,
  items,
}: Props) {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 水合安全的标准模式（SSR 渲染 null，挂载后才有时间）
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
        Object.fromEntries(
          d.items.map((i: { id: number; remain: number | null }) => [i.id, i.remain])
        )
      );
    } catch {
      /* 网络异常时保持当前显示 */
    }
  }, [token]);

  // 手动刷新剩余库存（60 秒冷却）
  const [lastRefresh, setLastRefresh] = useState(0);
  const refreshCooldown =
    now === null ? 0 : Math.max(0, 60 - Math.floor((now - lastRefresh) / 1000));

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

  const remainOf = (it: ItemView) => (it.remain === null ? null : (remainMap[it.id] ?? it.remain));

  const setQty = (id: number, n: number) => setQtys((prev) => ({ ...prev, [id]: n }));

  const save = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/order/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((it) => ({ sheetItemId: it.id, quantity: qtys[it.id] || 0 })),
      }),
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
    <main className="mx-auto max-w-lg px-4 pt-6 pb-36">
      {/* 头部信息卡 */}
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            {sheet.date} 供货单{sheet.title ? ` · ${sheet.title}` : ""}
          </h1>
          {savedAt && (
            <span className="rounded-full bg-success/15 px-2.5 py-1 text-sm text-success">
              已提交
            </span>
          )}
        </div>
        <p className="mt-1.5 text-base text-muted-foreground">
          {customerName}，请填写您今日需要的订购数量
        </p>
        <p
          className={`mt-2 text-sm ${remaining !== null && remaining <= 0 ? "text-warning" : "text-muted-foreground/55"}`}
        >
          截止时间{" "}
          <span className="font-mono tabular-nums">
            {deadline.toLocaleString("zh-CN", { hour12: false })}
          </span>
          {remaining !== null && `（${fmtRemaining(remaining)}）`}
        </p>
      </div>

      {/* 商品卡片列表：电商标准卡片 = 左 1:1 方图 + 右名称/属性 + 底排 红价左、步进器右 */}
      <div className="mt-4 space-y-2">
        {items.map((it) => {
          const remain = remainOf(it);
          const soldOut = canEdit && remain !== null && remain <= 0 && (qtys[it.id] || 0) === 0;
          return (
            <div
              key={it.id}
              className={`rounded-xl bg-card p-3 shadow-sm ${soldOut ? "opacity-60" : ""}`}
            >
              <div className="flex gap-3">
                {(it.hasImage1 || it.hasImage2) && (
                  <div className="flex shrink-0 gap-2">
                    {it.hasImage1 && (
                      <img
                        src={`/api/item-image/${it.id}?n=1`}
                        alt={it.name}
                        className="h-24 w-24 rounded-lg object-cover"
                      />
                    )}
                    {it.hasImage2 && (
                      <img
                        src={`/api/item-image/${it.id}?n=2`}
                        alt={it.name}
                        className="h-24 w-24 rounded-lg object-cover"
                      />
                    )}
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="line-clamp-2 text-base leading-snug font-medium">{it.name}</p>
                  {/* 规格标签 + 库存标签（不与步进器抢空间） */}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {[it.size, it.flowerType, it.color].filter(Boolean).map((a) => (
                      <span
                        key={a}
                        className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground/80"
                      >
                        {a}
                      </span>
                    ))}
                    {it.grade && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground/80">
                        {it.grade}级
                      </span>
                    )}
                    {remain !== null &&
                      (remain <= 0 ? (
                        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                          已订完
                        </span>
                      ) : (
                        <span className="rounded bg-warning/10 px-1.5 py-0.5 text-xs font-medium text-warning">
                          库存{remain}
                        </span>
                      ))}
                  </div>
                  {/* 底排：左红价右步进器，各自不收缩不变形 */}
                  <div className="mt-auto flex items-end justify-between gap-2 pt-1">
                    <span className="shrink-0 text-lg leading-none font-bold whitespace-nowrap text-destructive">
                      <span className="text-sm">¥</span>
                      {it.price.toFixed(2)}
                    </span>
                    {canEdit && !soldOut ? (
                      <Stepper value={qtys[it.id] || 0} onChange={(v) => setQty(it.id, v)} />
                    ) : (
                      <span className="shrink-0 text-base text-muted-foreground/80">
                        ×
                        <span className="text-lg font-semibold text-foreground">
                          {qtys[it.id] || 0}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!canEdit && (
        <p className="mt-4 text-center text-sm text-muted-foreground/55">
          {sheet.status === "closed"
            ? "本单已关闭，如需调整请联系供货方"
            : "已截止，如需调整请联系供货方"}
        </p>
      )}

      {/* 底部固定提交栏（含结果提示 + 刷新按钮在提交右侧） */}
      {canEdit && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 px-4 pt-3 pb-4 backdrop-blur">
          <div className="mx-auto max-w-lg">
            {msg && (
              <p
                className={`mb-2 text-center text-sm ${msgOk ? "text-success" : "text-destructive"}`}
              >
                {msg}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                共 <span className="font-semibold text-foreground">{totalCount}</span> 件
                <span className="ml-2 font-mono text-lg font-semibold text-foreground tabular-nums">
                  ¥{totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="xl"
                  className="px-3 text-sm text-muted-foreground"
                  onClick={manualRefresh}
                  disabled={refreshCooldown > 0}
                  title="刷新最新库存"
                >
                  ↻{refreshCooldown > 0 ? ` ${refreshCooldown}s` : " 刷新"}
                </Button>
                <Button size="xl" className="font-medium" onClick={save} disabled={saving}>
                  {saving ? "提交中..." : savedAt ? "更新订购" : "提交订购"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
