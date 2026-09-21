import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

type ItemInput = {
  name: string;
  size?: string;
  flowerType?: string;
  color?: string;
  grade?: string;
  price?: number;
  rawStock?: number;
  stock?: number;
  image1?: string | null; // base64
  image2?: string | null;
};

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const { date, title, deadline, items } = (body ?? {}) as {
    date?: string;
    title?: string;
    deadline?: string;
    items?: ItemInput[];
  };
  if (!date || !deadline || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "日期、截止时间和至少一个商品为必填" }, { status: 400 });
  }
  const titleTrim = String(title ?? "").trim();
  if (!titleTrim) {
    return NextResponse.json({ error: "请填写标题" }, { status: 400 });
  }
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    return NextResponse.json({ error: "截止时间无效" }, { status: 400 });
  }
  const cleaned = items
    .map((it) => ({
      name: String(it?.name ?? "").trim(),
      size: String(it?.size ?? "").trim(),
      flowerType: String(it?.flowerType ?? "").trim(),
      color: String(it?.color ?? "").trim(),
      grade: String(it?.grade ?? "").trim(),
      price: Number(it?.price) || 0,
      rawStock: Number.isInteger(Number(it?.rawStock)) && Number(it?.rawStock) >= 0 ? Number(it?.rawStock) : 0,
      stock: Number.isInteger(Number(it?.stock)) && Number(it?.stock) > 0 ? Number(it?.stock) : 9999,
      image1:
        typeof it?.image1 === "string" && it.image1 ? Buffer.from(it.image1, "base64") : undefined,
      image2:
        typeof it?.image2 === "string" && it.image2 ? Buffer.from(it.image2, "base64") : undefined,
    }))
    .filter((it) => it.name);
  if (cleaned.length === 0) {
    return NextResponse.json({ error: "商品名称不能为空" }, { status: 400 });
  }

  const sheet = await prisma.supplySheet.create({
    data: {
      date,
      title: titleTrim,
      deadline: deadlineDate,
      items: { create: cleaned.map((it, i) => ({ ...it, sort: i })) },
    },
  });

  return NextResponse.json({ id: sheet.id });
}
