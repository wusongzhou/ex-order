import { notFound } from "next/navigation";
import OrderForm from "@/components/OrderForm";
import { prisma } from "@/lib/db";

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
