"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ItemRow = {
  name: string;
  size: string;
  flowerType: string;
  color: string;
  grade: string;
  price: number;
  rawStock: number;
  stock: number;
  image1?: string | null; // base64
  image2?: string | null;
};

function localISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function NewSheetPage() {
  const router = useRouter();
  const [items, setItems] = useState<ItemRow[]>([]);
  const [date, setDate] = useState(localISODate());
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState(`${localISODate()}T20:00`);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // 上传 Excel
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState("");
  const [uploadInfoError, setUploadInfoError] = useState(false);

  const upload = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) {
      setUploadInfoError(true);
      setUploadInfo("请先选择 Excel 文件");
      return;
    }
    setUploading(true);
    setUploadInfoError(false);
    setUploadInfo("");
    const fd = new FormData();
    fd.append("file", f);
    try {
      const res = await fetch("/api/parse-workbook", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setItems(data.items);
        if (data.dateGuess) setDate(data.dateGuess);
        if (data.titleGuess && !title) setTitle(data.titleGuess);
        setUploadInfo(
          `已解析 ${data.items.length} 项商品（来自 ${f.name}），保留全部属性列，可在下方调整后提交`
        );
      } else {
        setUploadInfoError(true);
        setUploadInfo(data.error || "解析失败");
      }
    } catch {
      setUploadInfoError(true);
      setUploadInfo("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const setRow = (i: number, patch: Partial<ItemRow>) =>
    setItems((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const count = items.filter((c) => c.name.trim()).length;

  const submit = async () => {
    if (count === 0) {
      setError("请上传 Excel 或至少填写一个商品");
      return;
    }
    if (!date || !deadline) {
      setError("请填写供货日期和截止时间");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        title,
        deadline,
        items: items.filter((c) => c.name.trim()),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      router.push(`/admin/sheet/${data.id}`);
    } else {
      setError(data.error || "创建失败");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <nav className="text-sm">
        <button onClick={() => router.push("/admin")} className="text-gray-500 hover:text-gray-900">
          ← 返回列表
        </button>
      </nav>
      <h1 className="mt-3 text-xl font-semibold">新建供货单</h1>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-medium text-gray-700">基本信息</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-gray-500">供货日期</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="text-gray-500">标题（可选）</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="自动识别，可修改"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="text-gray-500">截止时间</span>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          创建后到详情页输入客户名称，即可生成专属订购链接发给对方填写
        </p>
      </section>

      <section className="mt-4 rounded-xl border-2 border-dashed border-gray-300 bg-white p-5">
        <h2 className="text-sm font-medium text-gray-700">上传今日商品表（Excel）</h2>
        <p className="mt-1 text-xs text-gray-400">
          按表头识别列：品种名 / 花径 / 花型 / 颜色 / 等级 / 价格 / 原始库存。剩余数量自动生成 = 原始库存，可手动调整
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:text-gray-700 hover:file:bg-gray-200"
          />
          <button
            onClick={upload}
            disabled={uploading}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {uploading ? "解析中..." : "上传并解析"}
          </button>
        </div>
        {uploadInfo && (
          <p className={`mt-2 text-sm ${uploadInfoError ? "text-red-600" : "text-green-700"}`}>{uploadInfo}</p>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">当日商品清单（共 {count} 项）</h2>
          <button
            onClick={() =>
              setItems((p) => [
                ...p,
                {
                  name: "",
                  size: "",
                  flowerType: "",
                  color: "",
                  grade: "",
                  price: 0,
                  rawStock: 0,
                  stock: 9999,
                },
              ])
            }
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
          >
            ＋ 手动加一行
          </button>
        </div>
        <div className="mt-3 overflow-x-auto">
          {items.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400">
              上传 Excel 后商品会按模板列显示在这里；也可以手动添加。每行均可直接编辑或删除。
            </p>
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="px-2 py-2">图片</th>
                  <th className="px-2 py-2">品种名</th>
                  <th className="px-2 py-2">花径</th>
                  <th className="px-2 py-2">花型</th>
                  <th className="px-2 py-2">颜色</th>
                  <th className="px-2 py-2">等级</th>
                  <th className="px-2 py-2">原始库存</th>
                  <th className="px-2 py-2">剩余数量</th>
                  <th className="px-2 py-2">单价</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-1 py-1.5">
                      {c.image1 ? (
                        <img
                          src={`data:image/png;base64,${c.image1}`}
                          alt={c.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-1 py-1.5">
                      <input
                        value={c.name}
                        onChange={(e) => setRow(i, { name: e.target.value })}
                        className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </td>
                    {(["size", "flowerType", "color", "grade"] as const).map((f) => (
                      <td key={f} className="px-1 py-1.5">
                        <input
                          value={c[f]}
                          onChange={(e) => setRow(i, { [f]: e.target.value })}
                          className="w-16 rounded border border-gray-300 px-2 py-1.5 text-sm"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1.5">
                      <input
                        type="number"
                        min={0}
                        value={c.rawStock}
                        onChange={(e) => setRow(i, { rawStock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                        className="w-16 rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <input
                        type="number"
                        min={0}
                        value={c.stock >= 9999 ? "" : c.stock}
                        placeholder="不限"
                        onChange={(e) =>
                          setRow(i, { stock: e.target.value === "" ? 9999 : Number(e.target.value) })
                        }
                        className="w-16 rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={c.price}
                        onChange={(e) => setRow(i, { price: Number(e.target.value) })}
                        className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <button
                        onClick={() => setItems((p) => p.filter((_, j) => j !== i))}
                        className="text-xs text-red-500 hover:underline"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={saving}
        className="mt-5 w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {saving ? "创建中..." : "创建供货单"}
      </button>
    </main>
  );
}
