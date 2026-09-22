import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * 复制供货单：全部商品（含图片/价格/属性）原样复制，库存清零，
 * 客户订单不复制。适用于"明天品种一样，只改数量"的日常场景。
 * 可选 body：{ date: "YYYY-MM-DD", title: string, deadline: "YYYY-MM-DDTHH:mm" }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { id } = await params;
  const sheetId = Number(id);
  if (!Number.isInteger(sheetId)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  // 读取可选参数（兼容旧调用：不带 body 时用默认值）
  let body: { date?: unknown; title?: unknown; deadline?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* 空 body，走默认值 */
  }

  const src = await prisma.supplySheet.findUnique({
    where: { id: sheetId },
    include: { items: true },
  });
  if (!src) {
    return NextResponse.json({ error: "原供货单不存在" }, { status: 404 });
  }
  if (src.items.length === 0) {
    return NextResponse.json({ error: "原供货单没有商品，无需复制" }, { status: 400 });
  }

  // 供货日期：传入则校验，否则默认今天
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const date =
    typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date.trim())
      ? body.date.trim()
      : today;

  // 标题：必填
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "请填写标题" }, { status: 400 });
  }

  // 截止时间：传入则解析，否则默认当日 23:59（当日截止）
  let deadline: Date;
  if (typeof body.deadline === "string" && body.deadline.trim()) {
    const d = new Date(body.deadline.trim());
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "截止时间格式错误" }, { status: 400 });
    }
    deadline = d;
  } else {
    deadline = new Date(now);
    deadline.setHours(23, 59, 0, 0);
  }

  const sheet = await prisma.supplySheet.create({
    data: {
      date,
      title,
      deadline,
      status: "open",
      items: {
        create: src.items.map((it) => ({
          name: it.name,
          size: it.size,
          flowerType: it.flowerType,
          color: it.color,
          grade: it.grade,
          price: it.price,
          rawStock: 0, // 复制后库存清零，等商家填当日数量
          stock: 0,
          sort: it.sort,
          image1: it.image1,
          image2: it.image2,
        })),
      },
    },
  });

  return NextResponse.json({ id: sheet.id, itemCount: src.items.length });
}
