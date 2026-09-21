import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: { status?: string; deadline?: Date } = {};
  if (body?.status === "open" || body?.status === "closed") {
    data.status = body.status;
  }
  if (body?.deadline) {
    const d = new Date(body.deadline);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "截止时间无效" }, { status: 400 });
    }
    data.deadline = d;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }
  await prisma.supplySheet.update({ where: { id: Number(id) }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.supplySheet.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
