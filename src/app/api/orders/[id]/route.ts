import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** 修改客户名称（打错字可改名，不影响客户已填的订单） */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const customerName = String(body?.name ?? "").trim();
  if (!customerName) {
    return NextResponse.json({ error: "客户名称不能为空" }, { status: 400 });
  }
  await prisma.order.update({ where: { id: Number(id) }, data: { customerName } });
  return NextResponse.json({ ok: true });
}

/** 删除客户订单（客户的填写记录一并删除） */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.order.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
