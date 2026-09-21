import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { itemShortLabel } from "@/lib/itemLabel";

/** 供货单下的客户订单列表（含汇总信息） */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  const sheet = await prisma.supplySheet.findUnique({
    where: { id: Number(id) },
    include: {
      items: { orderBy: { sort: "asc" }, select: { id: true, name: true, grade: true, color: true, price: true } },
      orders: { include: { items: true }, orderBy: { id: "asc" } },
    },
  });
  if (!sheet) {
    return NextResponse.json({ error: "供货单不存在" }, { status: 404 });
  }
  const itemMap = new Map(sheet.items.map((it) => [it.id, it]));
  return NextResponse.json({
    orders: sheet.orders.map((o) => {
      const amount = o.items.reduce(
        (s, oi) => s + oi.quantity * (itemMap.get(oi.sheetItemId)?.price ?? 0),
        0
      );
      const summary = o.items.length
        ? o.items.map((oi) => `${itemShortLabel(itemMap.get(oi.sheetItemId) ?? { name: "?" })}×${oi.quantity}`).join("、")
        : "";
      return {
        id: o.id,
        customerName: o.customerName,
        token: o.token,
        submitted: o.submitted,
        submittedAt: o.submittedAt ? o.submittedAt.toISOString() : null,
        summary,
        amount: +amount.toFixed(2),
      };
    }),
  });
}

/** 输入客户名称，生成该客户的专属订购链接 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  const sheetId = Number(id);
  const body = await req.json().catch(() => ({}));
  const customerName = String(body?.name ?? "").trim();
  if (!customerName) {
    return NextResponse.json({ error: "请填写客户名称" }, { status: 400 });
  }
  const sheet = await prisma.supplySheet.findUnique({ where: { id: sheetId } });
  if (!sheet) {
    return NextResponse.json({ error: "供货单不存在" }, { status: 404 });
  }
  const exists = await prisma.order.findFirst({ where: { sheetId, customerName } });
  if (exists) {
    return NextResponse.json({ error: `「${customerName}」已存在` }, { status: 400 });
  }
  const order = await prisma.order.create({
    data: {
      sheetId,
      customerName,
      token: crypto.randomBytes(16).toString("hex"),
    },
  });
  return NextResponse.json({ id: order.id, token: order.token });
}
