import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** 商家调整本期供货量：原始库存与可售上限同步更新（保持 原始 = 已订购 + 剩余 恒成立）。校验：不能小于已订购数量。 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  const itemId = Number(id);

  const body = await req.json().catch(() => ({}));
  const stock = Number(body?.stock);
  if (!Number.isInteger(stock) || stock < 0 || stock > 99998) {
    return NextResponse.json({ error: "库存必须是不小于 0 的整数" }, { status: 400 });
  }

  const item = await prisma.sheetItem.findUnique({
    where: { id: itemId },
    include: { sheet: true, orderItems: true },
  });
  if (!item) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  const ordered = item.orderItems.reduce((s, oi) => s + oi.quantity, 0);
  if (stock < ordered) {
    return NextResponse.json(
      { error: `「${item.name}」已订购 ${ordered} 个，库存不能小于 ${ordered}` },
      { status: 400 }
    );
  }
  // 不限量标记（9999）只允许原值就是不限量的商品保持，不接受改成都限量 9999
  if (stock > 9998 && item.stock < 9999) {
    return NextResponse.json({ error: "库存上限为 9998" }, { status: 400 });
  }

  await prisma.sheetItem.update({ where: { id: itemId }, data: { stock, rawStock: stock } });
  return NextResponse.json({ ok: true });
}
