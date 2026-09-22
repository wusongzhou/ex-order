"use client";

import { useEffect, useState } from "react";

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
      <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
        <p className="text-sm text-gray-500">
          未开启。开启后获得一个群链接，发到微信群里，客户点击自行输入姓名订购
        </p>
        <button
          onClick={() => call("POST")}
          disabled={busy}
          className="mt-3 rounded-lg bg-gray-900 px-5 py-2.5 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {busy ? "生成中..." : "生成群链接"}
        </button>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <div className="flex h-10 min-w-52 flex-1 items-center rounded-lg border border-gray-300 px-3 text-sm text-gray-600 select-all">
          <span className="truncate">
            {origin}/join/{token}
          </span>
        </div>
        <button
          onClick={doCopyLink}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm text-white hover:bg-gray-700"
        >
          {copiedLink ? "已复制 ✓" : "复制链接"}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <div className="flex h-10 min-w-52 flex-1 items-center gap-3 rounded-lg border border-gray-300 px-3">
          <span className="text-sm text-gray-500">口令</span>
          <span className="text-base font-bold tracking-[0.3em] text-gray-900">{code}</span>
        </div>
        <button
          onClick={doCopyCode}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          {copiedCode ? "已复制 ✓" : "复制口令"}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        链接发到群里；口令建议单独发给群成员（或下一句话发），用于防止外人乱填。同名会被拒绝，
        客户换手机或清缓存后重新输入姓名会被提示「已被使用」，可联系你从下方列表删除其旧订单。
      </p>
      <div className="mt-2 flex items-center gap-4">
        <button
          onClick={() => {
            if (confirm("重新生成后旧链接与旧口令立即失效，确定？")) call("PUT");
          }}
          disabled={busy}
          className="text-xs text-gray-600 hover:underline disabled:opacity-50"
        >
          重新生成
        </button>
        <button
          onClick={() => {
            if (confirm("停用后群里将无法再通过链接加入（已自助创建的订单保留），确定？"))
              call("DELETE");
          }}
          disabled={busy}
          className="text-xs text-red-500 hover:underline disabled:opacity-50"
        >
          停用
        </button>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  );
}
