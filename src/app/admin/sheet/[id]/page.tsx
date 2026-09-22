import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import GroupLinkCard from "@/components/GroupLinkCard";
import OrderLinks from "@/components/OrderLinks";
import PageHeader from "@/components/PageHeader";
import RefreshButton from "@/components/RefreshButton";
import SheetActions from "@/components/SheetActions";
import StatusBadge from "@/components/StatusBadge";
import StockCell from "@/components/StockCell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/sheetStatus";

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
    qtyOf: (sheetItemId: number) =>
      o.items.find((oi) => oi.sheetItemId === sheetItemId)?.quantity ?? 0,
  }));

  const num = "font-mono tabular-nums";
  const head = "px-4 text-xs text-muted-foreground";
  const cell = "px-4 py-3";

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            ← 返回列表
          </Link>
        </div>

        <PageHeader
          className="mt-3"
          title={
            <>
              <span className={num}>{sheet.date}</span> 供货单
              {sheet.title ? ` · ${sheet.title}` : ""}
            </>
          }
          description={
            <>
              截止时间：<span className={num}>{fmtDateTime(sheet.deadline)}</span>
            </>
          }
          actions={
            <>
              <RefreshButton />
              <StatusBadge sheet={sheet} />
            </>
          }
        />

        <SheetActions
          id={sheet.id}
          status={sheet.status}
          deadlinePassed={
            // eslint-disable-next-line react-hooks/purity -- 服务器组件按请求时刻计算，无水合问题
            new Date(sheet.deadline).getTime() <= Date.now()
          }
          title={sheet.title}
        />

        <section className="mt-8">
          <h2 className="text-base font-semibold tracking-tight">群填单链接（可选）</h2>
          <GroupLinkCard
            sheetId={sheet.id}
            publicToken={sheet.publicToken}
            passcode={sheet.passcode}
          />
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold tracking-tight">客户与专属链接</h2>
            <span className="text-sm text-muted-foreground">
              已提交 <span className={num}>{submittedCount}</span> /{" "}
              <span className={num}>{sheet.orders.length}</span>
            </span>
          </div>
          <OrderLinks sheetId={sheet.id} />
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold tracking-tight">按商品汇总</h2>
            <Button
              size="sm"
              nativeButton={false}
              render={<a href={`/api/sheets/${sheet.id}/export`} />}
            >
              导出 Excel
            </Button>
          </div>
          <Card className="mt-3 py-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    className={`${head} sticky left-0 z-10 min-w-48 border-r border-border bg-card`}
                  >
                    产品
                  </TableHead>
                  <TableHead className={head}>库存</TableHead>
                  <TableHead className={head}>剩余数量</TableHead>
                  <TableHead className={head}>单价</TableHead>
                  <TableHead className={head}>订购总量</TableHead>
                  {customerCols.map((c) => (
                    <TableHead key={c.id} className={head} title={c.name}>
                      {c.name}
                    </TableHead>
                  ))}
                  <TableHead
                    className={`${head} sticky right-0 z-10 border-l border-border bg-card`}
                  >
                    金额
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalRows.map(({ it, qty, remain, amount }) => {
                  const specs = [it.size, it.flowerType, it.color, it.grade ? `${it.grade}级` : ""]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <TableRow key={it.id} className="hover:bg-transparent">
                      <TableCell className="sticky left-0 z-10 border-r border-border bg-card px-4 py-2">
                        <div className="flex items-center gap-3">
                          {it.image1 ? (
                            <img
                              src={`/api/item-image/${it.id}?n=1`}
                              alt={it.name}
                              className="h-10 w-10 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground/40">
                              —
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">{it.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{specs || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={cell}>
                        <StockCell itemId={it.id} stock={it.stock} orderedQty={qty} />
                      </TableCell>
                      <TableCell className={cell}>
                        {remain === null ? (
                          <span className="text-muted-foreground">不限</span>
                        ) : (
                          <span
                            className={`font-medium ${remain < 0 ? "text-destructive" : remain === 0 ? "text-warning" : "text-success"}`}
                          >
                            {remain}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={`${cell} ${num} text-muted-foreground`}>
                        ¥{it.price.toFixed(2)}
                      </TableCell>
                      <TableCell className={`${cell} ${num} font-medium`}>{qty}</TableCell>
                      {customerCols.map((c) => (
                        <TableCell key={c.id} className={`${cell} ${num} text-muted-foreground`}>
                          {c.qtyOf(it.id) || "-"}
                        </TableCell>
                      ))}
                      <TableCell
                        className={`${cell} ${num} sticky right-0 z-10 border-l border-border bg-card font-medium`}
                      >
                        ¥{amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    className={`${cell} sticky left-0 z-10 border-r border-border bg-muted`}
                    colSpan={5 + customerCols.length}
                  >
                    合计
                  </TableCell>
                  <TableCell
                    className={`${cell} ${num} sticky right-0 z-10 border-l border-border bg-muted`}
                  >
                    ¥{grand.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>
        </section>
      </main>
    </>
  );
}
