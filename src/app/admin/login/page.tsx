"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const REMEMBER_KEY = "so_remember_pwd";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 挂载后读取本地记住的密码（避免 hydration 不一致，localStorage 只在客户端存在）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 水合安全的标准模式
        setPassword(saved);
        setRemember(true);
      }
    } catch {
      /* localStorage 不可用时忽略 */
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      // 记住密码（仅存在本机浏览器）
      try {
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, password);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        /* 忽略 */
      }
      router.push("/admin");
    } else {
      setError(data.error || "密码错误");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-sm">
        <h1 className="text-lg font-semibold">供货订购 · 商家登录</h1>
        <p className="mt-1 text-sm text-muted-foreground/80">仅供货方使用，客户无需登录</p>

        {/* 密码输入 + 小眼睛 */}
        <div className="relative mt-6">
          <Input
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            autoFocus
            className="w-full pr-10"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            aria-label={showPwd ? "隐藏密码" : "显示密码"}
            className="absolute inset-y-0 right-0 text-muted-foreground/55 hover:text-foreground"
          >
            {showPwd ? (
              <svg className="h-4.5 w-4.5" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            ) : (
              <svg className="h-4.5 w-4.5" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M4 20 20 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </Button>
        </div>

        {/* 记住密码 */}
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={remember}
            onCheckedChange={(c) => setRemember(c === true)}
            aria-label="记住密码"
          />
          记住密码
        </label>

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="mt-4 w-full" disabled={loading || !password}>
          {loading ? "登录中..." : "登录"}
        </Button>
      </form>
    </main>
  );
}
