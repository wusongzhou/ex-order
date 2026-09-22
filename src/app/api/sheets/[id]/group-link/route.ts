import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

function genToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

function genPasscode(): string {
  return String(crypto.randomInt(0, 10000)).padStart(4, "0");
}

/** 生成群填单链接（幂等：已存在则原样返回） */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  const sheetId = Number(id);
  const sheet = await prisma.supplySheet.findUnique({ where: { id: sheetId } });
  if (!sheet) {
    return NextResponse.json({ error: "供货单不存在" }, { status: 404 });
  }
  if (sheet.publicToken && sheet.passcode) {
    return NextResponse.json({ token: sheet.publicToken, passcode: sheet.passcode });
  }
  const updated = await prisma.supplySheet.update({
    where: { id: sheetId },
    data: {
      publicToken: sheet.publicToken ?? genToken(),
      passcode: sheet.passcode ?? genPasscode(),
    },
  });
  return NextResponse.json({ token: updated.publicToken, passcode: updated.passcode });
}

/** 重新生成（旧链接与旧口令立即失效） */
export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  const sheetId = Number(id);
  const updated = await prisma.supplySheet.update({
    where: { id: sheetId },
    data: { publicToken: genToken(), passcode: genPasscode() },
  });
  return NextResponse.json({ token: updated.publicToken, passcode: updated.passcode });
}

/** 停用群填单链接（客户已自助创建的订单不受影响） */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.supplySheet.update({
    where: { id: Number(id) },
    data: { publicToken: null, passcode: null },
  });
  return NextResponse.json({ ok: true });
}
