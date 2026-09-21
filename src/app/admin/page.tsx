import Link from "next/link";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sheetStatus } from "@/lib/sheetStatus";

export default async function AdminHome() {
  if (!(await isAdmin())) redirect("/admin/login");

  const sheets = await prisma.supplySheet.findMany({
    orderBy: { id: "desc" },
    include: { orders: { select: { submitted: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <AdminNav />
      <div className="mt-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">供货单</h1>
        <Link
          href="/admin/sheet/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          ＋ 新建供货单
        </Link>
      </div>

      {sheets.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          还没有供货单，点击右上角「新建供货单」创建
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="px-4 py-3">供货日期</th>
                <th className="px-4 py-3">标题</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">提交进度</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((s) => {
                const st = sheetStatus(s);
                const submitted = s.orders.filter((o) => o.submitted).length;
                return (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium">{s.date}</td>
                    <td className="px-4 py-3 text-gray-600">{s.title || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {submitted}/{s.orders.length}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/sheet/${s.id}`} className="text-blue-600 hover:underline">
                        查看详情
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
