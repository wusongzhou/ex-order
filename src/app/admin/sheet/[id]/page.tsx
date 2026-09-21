import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import OrderLinks from "@/components/OrderLinks";
import RefreshButton from "@/components/RefreshButton";
import SheetActions from "@/components/SheetActions";
import StockCell from "@/components/StockCell";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDateTime, sheetStatus } from "@/lib/sheetStatus";

export default async function SheetDetail({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { id } = await params;
  const sheetId = Number(id);
  if (!Number.isInteger(sheetId)) notFound();

  const sheet = await prisma.supplySheet.findUnique({
    where: { id: sheetId },
    include: {
      items: { orderBy: { sort: "asc" } },
      orders: { include: { items: true }, orderBy: { id: "asc" } },
    },
  });
  if (!sheet) notFound();

  const status = sheetStatus(sheet);

  // 汇总：订购总量 + 实时剩余 + 每个客户的订购数量（透视）
  const totalRows = sheet.items.map((it) => {
    const qty = sheet.orders.reduce(
      (s, o) => s + (o.items.find((oi) => oi.sheetItemId === it.id)?.quantity ?? 0),
      0
    );
    const remain = it.stock >= 9999 ? null : it.stock - qty;
    return { it, qty, remain, amount: qty * it.price };
  });
  const grand = totalRows.reduce((s, t) => s + t.amount, 0);
  const submittedCount = sheet.orders.filter((o) => o.submitted).length;
  const customerCols = sheet.orders.map((o) => ({
    id: o.id,
    name: o.customerName,
    qtyOf: (sheetItemId: number) => o.items.find((oi) => oi.sheetItemId === sheetItemId)?.quantity ?? 0,
  }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <AdminNav />
      <div className="mt-5">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">
          ← 返回列表
        </Link>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          {sheet.date} 供货单{sheet.title ? ` · ${sheet.title}` : ""}
        </h1>
        <span className="flex items-center gap-3">
          <RefreshButton />
          <span className={`rounded-full px-3 py-1 text-xs ${status.cls}`}>{status.label}</span>
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">截止时间：{fmtDateTime(sheet.deadline)}</p>

      <SheetActions
        id={sheet.id}
        status={sheet.status}
        deadlinePassed={new Date(sheet.deadline).getTime() <= Date.now()}
        title={sheet.title}
      />

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">客户与专属链接</h2>
          <span className="text-sm text-gray-500">
            已提交 {submittedCount} / {sheet.orders.length}
          </span>
        </div>
        <OrderLinks sheetId={sheet.id} />
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">按商品汇总</h2>
          <a
            href={`/api/sheets/${sheet.id}/export`}
            className="rounded-lg bg-gray-900 px-4 py-2 text-xs text-white hover:bg-gray-700"
          >
            导出 Excel
          </a>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="px-4 py-3">图片</th>
                <th className="px-4 py-3">品种名</th>
                <th className="px-4 py-3">花径</th>
                <th className="px-4 py-3">花型</th>
                <th className="px-4 py-3">颜色</th>
                <th className="px-4 py-3">等级</th>
                <th className="px-4 py-3">原始库存</th>
                <th className="px-4 py-3">剩余数量</th>
                <th className="px-4 py-3">单价</th>
                <th className="px-4 py-3">订购总量</th>
                {customerCols.map((c) => (
                  <th key={c.id} className="px-4 py-3" title={c.name}>
                    {c.name}
                  </th>
                ))}
                <th className="px-4 py-3">金额</th>
              </tr>
            </thead>
            <tbody>
              {totalRows.map(({ it, qty, remain, amount }) => (
                <tr key={it.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2">
                    {it.image1 ? (
                      <img
                        src={`/api/item-image/${it.id}?n=1`}
                        alt={it.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{it.name}</td>
                  <td className="px-4 py-3 text-gray-600">{it.size || "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{it.flowerType || "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{it.color || "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{it.grade || "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{it.rawStock}</td>
                  <td className="px-4 py-3">
                    {remain === null ? (
                      <span className="text-gray-600">不限</span>
                    ) : (
                      <StockCell itemId={it.id} stock={it.stock} orderedQty={qty} remain={remain} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">¥{it.price.toFixed(2)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{qty}</td>
                  {customerCols.map((c) => (
                    <td key={c.id} className="px-4 py-3 text-gray-600">
                      {c.qtyOf(it.id) || "-"}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-gray-600">¥{amount.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium">
                <td className="px-4 py-3" colSpan={10 + customerCols.length}>
                  合计
                </td>
                <td className="px-4 py-3">¥{grand.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
