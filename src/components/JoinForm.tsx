"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  sheetToken: string;
  sheetId: number;
  deadline: string;
  itemCount: number;
  passcodeRequired: boolean;
};

/** 本机身份记忆：再次打开群链接时直接回到自己的订购单（订单被商家删除则重新填） */
function storageKey(sheetId: number): string {
  return `ex-order:join-sheet:${sheetId}`;
}

/**
 * 进入订购单用浏览器原生跳转而非 Next 客户端路由：
 * dev 首次访问需现场编译、微信内置浏览器路由可能停滞，原生跳转保证一定能到达；
 * replace 使后退键不回到填名页，避免客户误触重新加入。
 */
function gotoOrder(token: string): void {
  window.location.replace(`/order/${token}`);
}

export default function JoinForm({
  sheetToken,
  sheetId,
  deadline,
  itemCount,
  passcodeRequired,
}: Props) {
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // 加入成功后先展示专属链接（可复制保存），客户再手动进入订购
  const [joinedToken, setJoinedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const stored = window.localStorage.getItem(storageKey(sheetId));
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage 同步读取，无记忆身份时直接放行表单（fetch 分支异步后才 setState）
      setChecking(false);
      return;
    }
    // 校验记忆的订单仍存在（商家可能已删除）
    fetch(`/api/order/${stored}`)
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          gotoOrder(stored);
        } else {
          window.localStorage.removeItem(storageKey(sheetId));
          setChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sheetId]);

  const submit = async () => {
    const n = name.trim();
    if (!n) {
      setError("请填写您的姓名");
      return;
    }
    if (passcodeRequired && !/^\d{4}$/.test(passcode.trim())) {
      setError("请填写 4 位数字口令");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/public/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetToken, name: n, passcode: passcode.trim() }),
      });
      if (r.ok) {
        const d = await r.json();
        window.localStorage.setItem(storageKey(sheetId), d.token);
        setJoinedToken(d.token);
        return;
      }
      const d = await r.json().catch(() => ({}));
      setError(d.error || "进入失败，请重试");
    } catch {
      setError("网络异常，请重试");
    }
    setBusy(false);
  };

  const copyLink = async () => {
    if (!joinedToken) return;
    const url = `${window.location.origin}/order/${joinedToken}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (checking) {
    return <p className="mt-6 text-center text-sm text-muted-foreground/55">正在进入您的订购单…</p>;
  }

  if (joinedToken) {
    const url = `${window.location.origin}/order/${joinedToken}`;
    return (
      <div className="mt-4">
        <p className="text-base font-medium text-foreground">
          {name.trim()}，您的专属订购链接已生成
        </p>
        <p className="mt-1 text-sm text-muted-foreground/80">
          建议复制保存或收藏本页，下次可直接打开，不必再从群里找链接
        </p>
        <p className="mt-3 rounded-xl bg-background px-3 py-2.5 text-sm break-all text-muted-foreground select-all">
          {url}
        </p>
        <div className="mt-4 flex gap-3">
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-xl text-base font-medium"
            onClick={copyLink}
          >
            {copied ? "已复制 ✓" : "复制链接"}
          </Button>
          <Button
            className="h-12 flex-1 rounded-xl text-base font-medium"
            onClick={() => gotoOrder(joinedToken)}
          >
            进入订购
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-base text-muted-foreground">
        本期共 {itemCount} 个品种。输入您的姓名{passcodeRequired ? "和群内公布的口令" : ""}，
        开始填写订购数量
      </p>
      <div className="mt-4 space-y-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !passcodeRequired) submit();
          }}
          autoFocus
          maxLength={30}
          placeholder="您的姓名或店名，如：小明花卉"
          className="h-12 w-full rounded-xl px-4 text-base md:text-base"
        />
        {passcodeRequired && (
          <Input
            value={passcode}
            onChange={(e) => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            inputMode="numeric"
            autoComplete="off"
            placeholder="4 位数字口令（见群内通知）"
            className="h-12 w-full rounded-xl px-4 text-base tracking-[0.5em] md:text-base"
          />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          className="h-12 w-full rounded-xl text-base font-medium"
          onClick={submit}
          disabled={busy}
        >
          {busy ? "正在进入..." : "开始订购"}
        </Button>
        <p className="text-xs text-muted-foreground/55">
          截止时间 {new Date(deadline).toLocaleString("zh-CN", { hour12: false })}，截止前可反复修改
        </p>
      </div>
    </div>
  );
}
