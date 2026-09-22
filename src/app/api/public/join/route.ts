import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * 客户自助加入（群填单）：凭供货单的群链接 token + 口令创建自己的订单。
 * 与商家手动生成专属链接共用 Order 模型，source = "self"。
 */

// ---------- 内存级口令限流（同登录接口，单实例部署足够）----------
// 口令仅 4 位数字，防止爆破：同一 IP 连续错 8 次 → 锁 10 分钟
const MAX_FAILS = 8;
const LOCK_MS = 10 * 60 * 1000;
const fails = new Map<string, { count: number; lockUntil: number }>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const now = Date.now();
  if (fails.size > 1000) {
    for (const [k, v] of fails) {
      if (v.count === 0 && v.lockUntil < now) fails.delete(k);
    }
  }
  const rec = fails.get(ip);
  if (rec && rec.lockUntil > now) {
    const waitMin = Math.ceil((rec.lockUntil - now) / 60000);
    return NextResponse.json({ error: `尝试次数过多，请 ${waitMin} 分钟后再试` }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const sheetToken = String(body?.sheetToken ?? "");
  const name = String(body?.name ?? "").trim();
  const passcode = String(body?.passcode ?? "").trim();

  if (!sheetToken || !name) {
    return NextResponse.json({ error: "请填写姓名" }, { status: 400 });
  }
  if (name.length > 30) {
    return NextResponse.json({ error: "姓名过长（最多 30 字）" }, { status: 400 });
  }

  const sheet = await prisma.supplySheet.findUnique({ where: { publicToken: sheetToken } });
  if (!sheet) {
    return NextResponse.json({ error: "链接无效或已失效" }, { status: 404 });
  }
  if (sheet.status !== "open" || sheet.deadline.getTime() <= Date.now()) {
    return NextResponse.json({ error: "本次订购已截止" }, { status: 403 });
  }

  if (sheet.passcode && passcode !== sheet.passcode) {
    const count = (rec?.count ?? 0) + 1;
    if (count >= MAX_FAILS) {
      fails.set(ip, { count: 0, lockUntil: now + LOCK_MS });
      return NextResponse.json({ error: "口令错误次数过多，已锁定 10 分钟" }, { status: 429 });
    }
    fails.set(ip, { count, lockUntil: 0 });
    return NextResponse.json(
      { error: `口令不正确（再错 ${MAX_FAILS - count} 次将锁定 10 分钟）` },
      { status: 401 }
    );
  }
  fails.delete(ip);

  // 同名互斥：防止后来者顶掉已有客户的身份
  const exists = await prisma.order.findFirst({ where: { sheetId: sheet.id, customerName: name } });
  if (exists) {
    return NextResponse.json(
      { error: `「${name}」已被使用，若这是您的名字请联系供货方` },
      { status: 409 }
    );
  }

  const order = await prisma.order
    .create({
      data: {
        sheetId: sheet.id,
        customerName: name,
        token: crypto.randomBytes(16).toString("hex"),
        source: "self",
      },
    })
    .catch((e) => {
      // 并发兜底：同名唯一约束（sheetId+customerName）在检查后仍可能被并发请求抢先
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return null;
      throw e;
    });
  if (!order) {
    return NextResponse.json(
      { error: `「${name}」已被使用，若这是您的名字请联系供货方` },
      { status: 409 }
    );
  }
  return NextResponse.json({ token: order.token });
}
