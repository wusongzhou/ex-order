"use client";

import { useEffect } from "react";

/** 全局浮动提示（顶部居中，CSS 动画进场，自动消失）。message 为空时不渲染 */
export default function Toast({
  message,
  ok,
  onDone,
  duration = 3000,
}: {
  message: string;
  ok?: boolean; // true=绿色成功 / false=红色错误
  onDone?: () => void; // 消失后回调（如清除 error 状态）
  duration?: number;
}) {
  // 定时消失（timer 属于外部系统，在 effect 中合法）
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- duration/onDone 由调用方固定
  }, [message]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-[60] flex justify-center">
      <div
        className={`flex max-w-[90vw] animate-[toast-in_0.3s_ease-out] items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
          ok ? "bg-green-600" : "bg-red-600"
        }`}
      >
        <span>{ok ? "✓" : "⚠"}</span>
        <span className="whitespace-nowrap">{message}</span>
      </div>
    </div>
  );
}
