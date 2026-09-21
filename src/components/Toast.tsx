"use client";

import { useEffect, useState } from "react";

/** 全局浮动提示（顶部居中，自动消失）。message 为空时不渲染 */
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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (!message) return null;

  return (
    <div
      className={`fixed left-1/2 top-6 z-[60] -translate-x-1/2 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      <div
        className={`flex max-w-[90vw] items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
          ok ? "bg-green-600" : "bg-red-600"
        }`}
      >
        <span>{ok ? "✓" : "⚠"}</span>
        <span className="whitespace-nowrap">{message}</span>
      </div>
    </div>
  );
}
