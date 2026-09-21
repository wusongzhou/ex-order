"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";

type ModalType = "close" | "reopen" | "delete" | null;

const META: Record<
  Exclude<ModalType, null>,
  { title: string; text: string; confirm: string; danger: boolean }
> = {
  close: {
    title: "关闭订购",
    text: "确认关闭订购？关闭后客户将无法再填写。",
    confirm: "关闭订购",
    danger: false,
  },
  reopen: {
    title: "重新开放",
    text: "重新开放将把截止时间延长到今天 23:59，确认？",
    confirm: "重新开放",
    danger: false,
  },
  delete: {
    title: "删除供货单",
    text: "删除供货单将同时删除所有客户的填写记录，不可恢复。确认删除？",
    confirm: "删除",
    danger: true,
  },
};

export default function SheetActions({
  id,
  status,
  deadlinePassed,
}: {
  id: number;
  status: string;
  deadlinePassed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [err, setErr] = useState("");
  const open = status === "open" && !deadlinePassed;

  const doAction = async () => {
    if (!modal) return;
    setBusy(true);
    setErr("");
    if (modal === "close") {
      await fetch(`/api/sheets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      setBusy(false);
      setModal(null);
      router.refresh();
    } else if (modal === "reopen") {
      const d = new Date();
      d.setHours(23, 59, 0, 0);
      await fetch(`/api/sheets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "open", deadline: d.toISOString() }),
      });
      setBusy(false);
      setModal(null);
      router.refresh();
    } else {
      const res = await fetch(`/api/sheets/${id}`, { method: "DELETE" });
      setBusy(false);
      if (res.ok) {
        setModal(null);
        router.push("/admin");
      } else {
        setErr("删除失败，请重试");
      }
    }
  };

  const meta = modal ? META[modal] : null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {open ? (
        <button
          onClick={() => setModal("close")}
          disabled={busy}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          关闭订购
        </button>
      ) : (
        <button
          onClick={() => setModal("reopen")}
          disabled={busy}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          重新开放
        </button>
      )}
      <button
        onClick={() => setModal("delete")}
        disabled={busy}
        className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        删除供货单
      </button>

      <Modal
        open={!!meta}
        title={meta?.title ?? ""}
        onClose={() => setModal(null)}
        footer={
          <>
            <button
              onClick={() => setModal(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={doAction}
              disabled={busy}
              className={`rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50 ${
                meta?.danger ? "bg-red-600 hover:bg-red-500" : "bg-gray-900 hover:bg-gray-700"
              }`}
            >
              {busy ? "处理中..." : meta?.confirm}
            </button>
          </>
        }
      >
        <p>{meta?.text}</p>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </Modal>
    </div>
  );
}
