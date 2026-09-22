import Link from "next/link";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import HistoryFilter from "@/components/HistoryFilter";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sheetStatus } from "@/lib/sheetStatus";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; date?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { q = "", status = "all", date = "" } = await searchParams;

  const sheets = await prisma.supplySheet.findMany({
    orderBy: { id: "desc" },
    include: { orders: { select: { submitted: true } } },
  });

  // 历史筛选：关键字（模糊匹配标题）+ 供货日期 + 状态
  const filtered = sheets.filter((s) => {
    if (q && !s.title.includes(q)) return false;
    if (date && s.date !== date) return false;
    if (status === "open" && !sheetStatus(s).open) return false;
    if (status === "ended" && sheetStatus(s).open) return false;
    return true;
  });

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <PageHeader
          title="供货单"
          description="创建供货单、生成客户专属链接，实时跟踪提交进度"
          actions={
            // 渲染目标是 Link（非 button），需声明 nativeButton=false
            <Button nativeButton={false} render={<Link href="/admin/sheet/new" />}>
              ＋ 新建供货单
            </Button>
          }
        />

        {/* 历史查询筛选 */}
        <HistoryFilter q={q} status={status} date={date} />

        {sheets.length === 0 ? (
          <Card className="mt-6 items-center justify-center py-14">
            <p className="text-sm text-muted-foreground">
              还没有供货单，点击右上角「新建供货单」创建
            </p>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="mt-6 items-center justify-center py-14">
            <p className="text-sm text-muted-foreground">没有符合条件的历史供货单</p>
          </Card>
        ) : (
          <Card className="mt-6 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 text-xs text-muted-foreground">供货日期</TableHead>
                  <TableHead className="px-4 text-xs text-muted-foreground">标题</TableHead>
                  <TableHead className="px-4 text-xs text-muted-foreground">状态</TableHead>
                  <TableHead className="px-4 text-xs text-muted-foreground">提交进度</TableHead>
                  <TableHead className="px-4 text-xs text-muted-foreground">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const submitted = s.orders.filter((o) => o.submitted).length;
                  return (
                    <TableRow key={s.id} className="hover:bg-transparent">
                      <TableCell className="px-4 py-3 font-mono font-medium tabular-nums">
                        {s.date}
                      </TableCell>
                      <TableCell className="max-w-48 truncate px-4 py-3 text-muted-foreground">
                        {s.title || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <StatusBadge sheet={s} />
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-muted-foreground tabular-nums">
                        {submitted}/{s.orders.length}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Link
                          href={`/admin/sheet/${s.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          查看详情
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </>
  );
}
