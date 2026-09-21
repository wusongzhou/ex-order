import Link from "next/link";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sheetStatus } from "@/lib/sheetStatus";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { q = "", status = "all" } = await searchParams;

  const sheets = await prisma.supplySheet.findMany({
    orderBy: { id: "desc" },
    include: { orders: { select: { submitted: true } } },
  });

  // 历史筛选：关键字（标题/日期）+ 状态
  const filtered = sheets.filter((s) => {
    if (q && !(s.title.includes(q) || s.date.includes(q))) return false;
    if (status === "open" && !sheetStatus(s).open) return false;
    if (status === "ended" && sheetStatus(s).open) return false;
    return true;
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

      {/* 历史查询筛选 */}
      <form className="mt-4 flex flex-wrap gap-2" action="/admin">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索标题或供货日期，如：2026-09-22"
          className="min-w-56 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">全部状态</option>
          <option value="open">进行中</option>
          <option value="ended">已结束（截止/关闭）</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          筛选
        </button>
        {(q || status !== "all") && (
          <Link
            href="/admin"
            className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-900"
          >
            重置
          </Link>
        )}
      </form>

      {sheets.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          还没有供货单，点击右上角「新建供货单」创建
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          没有符合条件的历史供货单
        </p>
      ) : (
        <>
          <p className="mt-4 text-xs text-gray-400">
            共 {filtered.length} 张{sheets.length !== filtered.length && `（总计 ${sheets.length} 张）`}
          </p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
                {filtered.map((s) => {
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
        </>
      )}
    </main>
  );
}
