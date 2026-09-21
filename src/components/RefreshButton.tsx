"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 详情页手动刷新：router.refresh() 重新拉服务端数据，不整页白屏 */
export default function RefreshButton() {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);
  const [at, setAt] = useState("");

  const refresh = () => {
    setSpinning(true);
    router.refresh();
    setTimeout(() => {
      setSpinning(false);
      setAt(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
    }, 600);
  };

  return (
    <span className="inline-flex items-center gap-2 text-xs text-gray-500">
      <button
        onClick={refresh}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
      >
        <span className={spinning ? "inline-block animate-spin" : "inline-block"}>↻</span> 刷新数据
      </button>
      {at && <span>更新于 {at}</span>}
    </span>
  );
}
