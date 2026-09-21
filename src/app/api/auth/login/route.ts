import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, signSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  if (!password || password !== expected) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, signSession(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  return res;
}
