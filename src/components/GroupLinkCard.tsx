"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  sheetId: number;
  publicToken: string | null;
  passcode: string | null;
};

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

/** 商家详情页：群填单链接管理（生成 / 复制 / 重新生成 / 停用） */
export default function GroupLinkCard({ sheetId, publicToken, passcode }: Props) {
  const [token, setToken] = useState(publicToken);
  const [code, setCode] = useState(passcode);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  // 完整 URL 的域名部分仅浏览器端可知，挂载后补齐（避免 SSR 水合不一致）
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 浏览器环境值挂载后一次性同步（SSR 渲染空串保持水合一致）
    setOrigin(window.location.origin);
  }, []);

  const call = async (method: "POST" | "PUT" | "DELETE") => {
    setBusy(true);
    setErr("");
    const r = await fetch(`/api/sheets/${sheetId}/group-link`, { method });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setErr(d.error || "操作失败，请重试");
      return;
    }
    if (method === "DELETE") {
      setToken(null);
      setCode(null);
      return;
    }
    const d = await r.json();
    setToken(d.token);
    setCode(d.passcode);
  };

  const doCopyLink = async () => {
    if (!token) return;
    await copyText(`${window.location.origin}/join/${token}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const doCopyCode = async () => {
    if (!code) return;
    await copyText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!token || !code) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-input bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground/80">
          未开启。开启后获得一个群链接，发到微信群里，客户点击自行输入姓名订购
        </p>
        <Button className="mt-3" onClick={() => call("POST")} disabled={busy}>
          {busy ? "生成中..." : "生成群链接"}
        </Button>
        {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <div className="flex h-9 min-w-52 flex-1 items-center rounded-lg border border-input px-3 text-sm text-muted-foreground select-all">
          <span className="truncate">
            {origin}/join/{token}
          </span>
        </div>
        <Button size="lg" onClick={doCopyLink}>
          {copiedLink ? "已复制 ✓" : "复制链接"}
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <div className="flex h-9 min-w-52 flex-1 items-center gap-3 rounded-lg border border-input px-3">
          <span className="text-sm text-muted-foreground/80">口令</span>
          <span className="text-base font-bold tracking-[0.3em] text-foreground">{code}</span>
        </div>
        <Button variant="outline" size="lg" onClick={doCopyCode}>
          {copiedCode ? "已复制 ✓" : "复制口令"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground/55">
        链接发到群里；口令建议单独发给群成员（或下一句话发），用于防止外人乱填。同名会被拒绝，
        客户换手机或清缓存后重新输入姓名会被提示「已被使用」，可联系你从下方列表删除其旧订单。
      </p>
      <div className="mt-2 flex items-center gap-4">
        <Button
          variant="link"
          className="h-auto px-0 text-xs text-muted-foreground"
          onClick={() => {
            if (confirm("重新生成后旧链接与旧口令立即失效，确定？")) call("PUT");
          }}
          disabled={busy}
        >
          重新生成
        </Button>
        <Button
          variant="link"
          className="h-auto px-0 text-xs text-destructive"
          onClick={() => {
            if (confirm("停用后群里将无法再通过链接加入（已自助创建的订单保留），确定？"))
              call("DELETE");
          }}
          disabled={busy}
        >
          停用
        </Button>
        {err && <span className="text-xs text-destructive">{err}</span>}
      </div>
    </div>
  );
}
