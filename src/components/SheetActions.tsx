"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DateTimePicker from "@/components/ui/DateTimePicker";
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

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function SheetActions({
  id,
  status,
  deadlinePassed,
  title: srcTitle,
}: {
  id: number;
  status: string;
  deadlinePassed: boolean;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copying, setCopying] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [err, setErr] = useState("");
  const open = status === "open" && !deadlinePassed;

  // 复制弹窗表单
  const [copyModal, setCopyModal] = useState(false);
  const [copyDate, setCopyDate] = useState("");
  const [copyTitle, setCopyTitle] = useState("");
  const [copyDeadline, setCopyDeadline] = useState("");

  const openCopy = () => {
    const d = new Date();
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = d.getHours() < 20 ? "20:00" : "23:59";
    setCopyDate(today);
    setCopyTitle(srcTitle);
    setCopyDeadline(`${today}T${time}`);
    setErr("");
    setCopyModal(true);
  };

  // 复制供货单：商品原样带过去，库存清零，不复制客户订单
  const doCopy = async () => {
    if (!copyTitle.trim()) {
      setErr("请填写标题");
      return;
    }
    if (!copyDate || !copyDeadline) {
      setErr("请填写供货日期和截止时间");
      return;
    }
    setCopying(true);
    setErr("");
    const res = await fetch(`/api/sheets/${id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: copyDate, title: copyTitle.trim(), deadline: copyDeadline }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(`/admin/sheet/${data.id}`);
    } else {
      setCopying(false);
      setErr(data.error || "复制失败，请重试");
    }
  };

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
        onClick={openCopy}
        disabled={copying}
        title="复制全部商品到新供货单（库存清零，需重新填当日数量）"
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {copying ? "复制中..." : "复制为新供货单"}
      </button>
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
        {err && !copyModal && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </Modal>

      {/* 复制供货单弹窗 */}
      <Modal
        open={copyModal}
        title="复制为新供货单"
        onClose={() => !copying && setCopyModal(false)}
        footer={
          <>
            <button
              onClick={() => setCopyModal(false)}
              disabled={copying}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={doCopy}
              disabled={copying}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {copying ? "复制中..." : "确认复制"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            将复制全部商品（含图片与价格），库存清零；客户订单与链接不复制。
          </p>
          <label className="block text-sm">
            <span className="text-gray-600">供货日期</span>
            <div className="mt-1">
              <DateTimePicker value={copyDate} onChange={setCopyDate} />
            </div>
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">
              标题 <span className="text-red-500">*</span>
            </span>
            <input
              value={copyTitle}
              onChange={(e) => setCopyTitle(e.target.value)}
              placeholder="如：嵩明集货站"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">截止时间</span>
            <div className="mt-1">
              <DateTimePicker value={copyDeadline} onChange={setCopyDeadline} withTime />
            </div>
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
      </Modal>
    </div>
  );
}
