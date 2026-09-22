"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground/80">
      <Button variant="outline" onClick={refresh} className="text-xs">
        <RefreshCw className={spinning ? "animate-spin" : ""} />
        刷新数据
      </Button>
      {at && <span className="font-mono tabular-nums">更新于 {at}</span>}
    </span>
  );
}
