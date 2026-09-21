import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * 客户端接口：凭 token 获取自己的订购页数据。
 * 只返回该 token 关联订单的数据，其他客户的数量绝不出现。
 * 库存为实时剩余 = 库存总量 - 该商品全部已提交数量（含自己）。
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await prisma.order.findUnique({
    where: { token },
    include: {
      items: true,
      sheet: { include: { items: { orderBy: { sort: "asc" } } } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "链接无效或已失效" }, { status: 404 });
  }

  const agg = await prisma.orderItem.groupBy({
    by: ["sheetItemId"],
    where: { order: { sheetId: order.sheetId } },
    _sum: { quantity: true },
  });
  const orderedMap = new Map(agg.map((g) => [g.sheetItemId, g._sum.quantity ?? 0]));

  return NextResponse.json({
    customerName: order.customerName,
    sheet: {
      date: order.sheet.date,
      title: order.sheet.title,
      deadline: order.sheet.deadline.toISOString(),
      status: order.sheet.status,
    },
    editable: order.sheet.status === "open" && order.sheet.deadline.getTime() > Date.now(),
    submitted: order.submitted,
    submittedAt: order.submittedAt ? order.submittedAt.toISOString() : null,
    items: order.sheet.items.map((it) => {
      const stock = it.stock;
      const remain = stock >= 9999 ? null : Math.max(0, stock - (orderedMap.get(it.id) ?? 0));
      return {
        id: it.id,
        name: it.name,
        size: it.size,
        flowerType: it.flowerType,
        color: it.color,
        grade: it.grade,
        price: it.price,
        stock,
        remain,
        quantity: order.items.find((oi) => oi.sheetItemId === it.id)?.quantity ?? 0,
      };
    }),
  });
}

/**
 * 客户提交/修改订购数量（截止前有效）。
 * 库存校验在事务内完成：其他人已订 + 本次数量 ≤ 库存，先到先得，防止超卖。
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await prisma.order.findUnique({ where: { token }, include: { sheet: true } });
  if (!order) {
    return NextResponse.json({ error: "链接无效或已失效" }, { status: 404 });
  }
  if (order.sheet.status !== "open" || order.sheet.deadline.getTime() <= Date.now()) {
    return NextResponse.json({ error: "订购已截止，无法修改" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const rawItems = Array.isArray(body?.items) ? body.items : null;
  if (!rawItems) {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const sheetItems = await prisma.sheetItem.findMany({
    where: { sheetId: order.sheetId },
    select: { id: true },
  });
  const validIds = new Set(sheetItems.map((i) => i.id));

  const rows: { orderId: number; sheetItemId: number; quantity: number }[] = [];
  for (const raw of rawItems) {
    const sheetItemId = Number(raw?.sheetItemId);
    const quantity = Number(raw?.quantity);
    if (!validIds.has(sheetItemId)) continue;
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99999) {
      return NextResponse.json({ error: "订购数量无效" }, { status: 400 });
    }
    if (quantity > 0) {
      rows.push({ orderId: order.id, sheetItemId, quantity });
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // 其他人（不含自己）已提交的数量
    const others = await tx.orderItem.findMany({
      where: { order: { sheetId: order.sheetId, id: { not: order.id } } },
      select: { sheetItemId: true, quantity: true },
    });
    const othersMap = new Map<number, number>();
    for (const oi of others) {
      othersMap.set(oi.sheetItemId, (othersMap.get(oi.sheetItemId) ?? 0) + oi.quantity);
    }
    const itemMap = new Map(
      (await tx.sheetItem.findMany({ where: { sheetId: order.sheetId } })).map((i) => [i.id, i])
    );

    // 库存校验：先到先得
    for (const r of rows) {
      const it = itemMap.get(r.sheetItemId);
      if (!it || it.stock >= 9999) continue;
      const left = it.stock - (othersMap.get(r.sheetItemId) ?? 0);
      if (r.quantity > left) {
        return { conflict: { name: it.name, left: Math.max(0, left) } };
      }
    }

    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    if (rows.length > 0) {
      await tx.orderItem.createMany({ data: rows });
    }
    await tx.order.update({
      where: { id: order.id },
      data: { submitted: true, submittedAt: new Date() },
    });
    return { ok: true };
  });

  if ("conflict" in result && result.conflict) {
    return NextResponse.json(
      { error: `库存不足：「${result.conflict.name}」仅剩 ${result.conflict.left} 个，请调整数量` },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
