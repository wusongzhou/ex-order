import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, signSession } from "@/lib/auth";

// ---------- 内存级登录限流（单实例部署足够）----------
// 同一 IP 连续失败 5 次 → 锁 10 分钟
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;
const fails = new Map<string, { count: number; lockUntil: number }>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function pruneLocked(now: number) {
  // 顺手清理过期条目，防 Map 无限增长
  if (fails.size > 1000) {
    for (const [k, v] of fails) {
      if (v.count === 0 && v.lockUntil < now) fails.delete(k);
    }
  }
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const now = Date.now();
  pruneLocked(now);

  const rec = fails.get(ip);
  if (rec && rec.lockUntil > now) {
    const waitMin = Math.ceil((rec.lockUntil - now) / 60000);
    return NextResponse.json(
      { error: `尝试次数过多，请 ${waitMin} 分钟后再试` },
      { status: 429 }
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD || "admin123";
  if (!password || password !== expected) {
    const count = (rec?.count ?? 0) + 1;
    if (count >= MAX_FAILS) {
      fails.set(ip, { count: 0, lockUntil: now + LOCK_MS });
      return NextResponse.json(
        { error: "密码错误次数过多，已锁定 10 分钟" },
        { status: 429 }
      );
    }
    fails.set(ip, { count, lockUntil: 0 });
    return NextResponse.json(
      { error: `密码错误（再错 ${MAX_FAILS - count} 次将锁定 10 分钟）` },
      { status: 401 }
    );
  }

  // 登录成功，清除该 IP 的失败记录
  fails.delete(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, signSession(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  return res;
}
