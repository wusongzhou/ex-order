"use client";

import { useEffect, useState } from "react";
import CopyLinkButton from "@/components/CopyLinkButton";
import Modal from "@/components/Modal";

type OrderRow = {
  id: number;
  customerName: string;
  token: string;
  submitted: boolean;
  submittedAt: string | null;
  summary: string;
  amount: number;
};

export default function OrderLinks({ sheetId }: { sheetId: number }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [renameTarget, setRenameTarget] = useState<OrderRow | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<OrderRow | null>(null);
  const [actionErr, setActionErr] = useState("");

  const load = async () => {
    const r = await fetch(`/api/sheets/${sheetId}/orders`);
    if (r.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const d = await r.json();
    setOrders(d.orders || []);
    setLoaded(true);
  };

  useEffect(() => {
    load();
  }, [sheetId]);

  const add = async () => {
    const n = name.trim();
    if (!n) {
      setError("请填写客户名称");
      return;
    }
    setBusy(true);
    setError("");
    const r = await fetch(`/api/sheets/${sheetId}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: n }),
    });
    setBusy(false);
    if (r.ok) {
      setName("");
      load();
    } else {
      const d = await r.json();
      setError(d.error || "生成失败");
    }
  };

  const doRename = async () => {
    if (!renameTarget) return;
    const n = renameName.trim();
    if (!n || n === renameTarget.customerName) {
      setRenameTarget(null);
      return;
    }
    const r = await fetch(`/api/orders/${renameTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: n }),
    });
    if (r.ok) {
      setRenameTarget(null);
      load();
    } else {
      const d = await r.json();
      setActionErr(d.error || "改名失败");
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const r = await fetch(`/api/orders/${deleteTarget.id}`, { method: "DELETE" });
    if (r.ok) {
      setDeleteTarget(null);
      setActionErr("");
      load();
    } else {
      setActionErr("删除失败，请重试");
    }
  };

  return (
    <div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="输入客户名称，如：张三饭店"
          className="min-w-52 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
        <button
          onClick={add}
          disabled={busy}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {busy ? "生成中..." : "生成专属链接"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {actionErr && <p className="mt-2 text-sm text-red-600">{actionErr}</p>}

      {loaded && orders.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          还没有客户。输入客户名称生成专属链接，复制后通过微信发送给对方填写。
        </p>
      )}

      {orders.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="px-4 py-3">客户</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">订购内容</th>
                <th className="px-4 py-3">金额</th>
                <th className="px-4 py-3">链接</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setRenameTarget(o);
                        setRenameName(o.customerName);
                        setActionErr("");
                      }}
                      title="点击改名"
                      className="font-medium hover:underline"
                    >
                      {o.customerName}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {o.submitted ? (
                      <span className="text-green-700">已提交</span>
                    ) : (
                      <span className="text-gray-400">未提交</span>
                    )}
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-gray-600" title={o.summary}>
                    {o.summary || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">¥{o.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <CopyLinkButton token={o.token} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setDeleteTarget(o);
                        setActionErr("");
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {orders.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          已提交 {orders.filter((o) => o.submitted).length} / {orders.length} · 每个客户只能看到和修改自己的数量
        </p>
      )}

      {/* 改名弹窗 */}
      <Modal
        open={!!renameTarget}
        title="修改客户名称"
        onClose={() => setRenameTarget(null)}
        footer={
          <>
            <button
              onClick={() => setRenameTarget(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={doRename}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
            >
              保存
            </button>
          </>
        }
      >
        <input
          value={renameName}
          onChange={(e) => setRenameName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") doRename();
          }}
          autoFocus
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="客户名称"
        />
        <p className="mt-2 text-xs text-gray-400">改名不影响客户已填写的订单</p>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        title="删除客户订单"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={doDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
            >
              删除
            </button>
          </>
        }
      >
        <p>
          删除「{deleteTarget?.customerName}」？其填写记录将一并删除，不可恢复。
        </p>
      </Modal>
    </div>
  );
}
