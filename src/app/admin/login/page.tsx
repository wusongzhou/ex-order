"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold">供货订购 · 商家登录</h1>
        <p className="mt-1 text-sm text-gray-500">仅供货方使用，客户无需登录</p>

        {/* 密码输入 + 小眼睛 */}
        <div className="relative mt-6">
          <input
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm outline-none focus:border-gray-900"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            aria-label={showPwd ? "隐藏密码" : "显示密码"}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-400 hover:text-gray-600"
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
          </button>
        </div>

        {/* 记住密码 */}
        <button
          type="button"
          onClick={() => setRemember((v) => !v)}
          className="mt-3 flex items-center gap-2 text-sm text-gray-600"
        >
          <span
            className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
              remember ? "border-gray-900 bg-gray-900" : "border-gray-300 bg-white"
            }`}
          >
            {remember && (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6.2 4.8 9 10 3.4"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          记住密码
        </button>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 w-full rounded-lg bg-gray-900 py-2.5 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>
    </main>
  );
}
