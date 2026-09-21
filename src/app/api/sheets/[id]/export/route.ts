import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { itemShortLabel } from "@/lib/itemLabel";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  const sheet = await prisma.supplySheet.findUnique({
    where: { id: Number(id) },
    include: {
      items: { orderBy: { sort: "asc" } },
      orders: { include: { items: true }, orderBy: { id: "asc" } },
    },
  });
  if (!sheet) {
    return NextResponse.json({ error: "供货单不存在" }, { status: 404 });
  }

  const qtyOf = (orderId: number, sheetItemId: number) =>
    sheet.orders.find((o) => o.id === orderId)?.items.find((oi) => oi.sheetItemId === sheetItemId)
      ?.quantity ?? 0;

  // Sheet 1：按商品汇总（与页面透视表一致：实时剩余 + 每个客户一列）
  const customerNames = sheet.orders.map((o) => o.customerName);
  const summaryAoa: (string | number)[][] = [
    [
      "品种名",
      "花径",
      "花型",
      "颜色",
      "等级",
      "原始库存",
      "剩余数量",
      "单价(元)",
      "订购总量",
      ...customerNames,
      "金额(元)",
    ],
  ];
  let grandTotal = 0;
  for (const it of sheet.items) {
    const qty = sheet.orders.reduce((s, o) => s + qtyOf(o.id, it.id), 0);
    const amount = +(qty * it.price).toFixed(2);
    grandTotal += amount;
    const remain = it.stock >= 9999 ? "不限" : it.stock - qty;
    summaryAoa.push([
      it.name,
      it.size,
      it.flowerType,
      it.color,
      it.grade,
      it.rawStock,
      remain,
      it.price,
      qty,
      ...sheet.orders.map((o) => qtyOf(o.id, it.id) || ""),
      amount,
    ]);
  }
  summaryAoa.push([
    "合计",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    ...sheet.orders.map(() => ""),
    +grandTotal.toFixed(2),
  ]);

  // Sheet 2：按客户明细
  const detailAoa: (string | number)[][] = [
    ["客户", "状态", ...sheet.items.map((i) => itemShortLabel(i)), "合计金额(元)"],
  ];
  for (const o of sheet.orders) {
    const rowAmount = o.items.reduce(
      (s, oi) => s + oi.quantity * (sheet.items.find((it) => it.id === oi.sheetItemId)?.price ?? 0),
      0
    );
    detailAoa.push([
      o.customerName,
      o.submitted ? "已提交" : "未提交",
      ...sheet.items.map((it) => qtyOf(o.id, it.id)),
      +rowAmount.toFixed(2),
    ]);
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryAoa), "按商品汇总");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailAoa), "按客户明细");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="supply-${sheet.date}.xlsx"`,
    },
  });
}
