import { notFound } from "next/navigation";
import type { Metadata } from "next";
import OrderForm from "@/components/OrderForm";
import { prisma } from "@/lib/db";

/** 分享卡片 meta：微信/浏览器里发链接时显示标题与描述，而不是裸 URL */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const order = await prisma.order.findUnique({
    where: { token },
    select: {
      customerName: true,
      sheet: { select: { date: true, title: true, deadline: true, status: true } },
    },
  });
  if (!order) {
    return { title: "订购单", description: "链接无效或已失效" };
  }
  const expired = order.sheet.status !== "open" || order.sheet.deadline.getTime() <= Date.now();
  const title = `${order.sheet.title || "供货订购"} · ${order.sheet.date}`;
  const description = expired
    ? "本次订购已截止"
    : `${order.customerName}，点击填写您今日需要的订购数量`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await prisma.order.findUnique({
    where: { token },
    include: {
      items: true,
      sheet: { include: { items: { orderBy: { sort: "asc" } } } },
    },
  });

  if (!order) notFound();

  const editable = order.sheet.status === "open" && order.sheet.deadline.getTime() > Date.now();

  // 实时剩余 = 库存 - 全部已提交（含自己）
  const agg = await prisma.orderItem.groupBy({
    by: ["sheetItemId"],
    where: { order: { sheetId: order.sheetId } },
    _sum: { quantity: true },
  });
  const orderedMap = new Map(agg.map((g) => [g.sheetItemId, g._sum.quantity ?? 0]));

  return (
    <OrderForm
      token={order.token}
      customerName={order.customerName}
      sheet={{
        date: order.sheet.date,
        title: order.sheet.title,
        deadline: order.sheet.deadline.toISOString(),
        status: order.sheet.status,
      }}
      editable={editable}
      submitted={order.submitted}
      submittedAt={order.submittedAt ? order.submittedAt.toISOString() : null}
      items={order.sheet.items.map((it) => {
        const remain =
          it.stock >= 9999 ? null : Math.max(0, it.stock - (orderedMap.get(it.id) ?? 0));
        return {
          id: it.id,
          name: it.name,
          size: it.size,
          flowerType: it.flowerType,
          color: it.color,
          grade: it.grade,
          price: it.price,
          stock: it.stock,
          remain,
          quantity: order.items.find((oi) => oi.sheetItemId === it.id)?.quantity ?? 0,
          hasImage1: Boolean(it.image1),
          hasImage2: Boolean(it.image2),
        };
      })}
    />
  );
}
