"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DateTimePicker from "@/components/ui/DateTimePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  const [saving, setSaving] = useState(false);

  // 上传 Excel
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
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
      toast.error("请上传 Excel 或至少填写一个商品");
      return;
    }
    if (!date || !deadline) {
      toast.error("请填写供货日期和截止时间");
      return;
    }
    if (!title.trim()) {
      toast.error("请填写标题");
      return;
    }
    setSaving(true);
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
      toast.error(data.error || "创建失败");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <nav className="text-sm">
        <Button
          variant="link"
          className="h-auto px-0 text-muted-foreground"
          onClick={() => router.push("/admin")}
        >
          ← 返回列表
        </Button>
      </nav>
      <h1 className="mt-3 text-xl font-semibold">新建供货单</h1>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-secondary-foreground">基本信息</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-muted-foreground/80">
              供货日期 <span className="text-destructive">*</span>
            </span>
            <div className="mt-1">
              <DateTimePicker value={date} onChange={setDate} />
            </div>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground/80">
              标题 <span className="text-destructive">*</span>
            </span>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="必填，如：嵩明集货站"
              className="mt-1 w-full"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground/80">
              截止时间 <span className="text-destructive">*</span>
            </span>
            <div className="mt-1">
              <DateTimePicker value={deadline} onChange={setDeadline} withTime />
            </div>
          </label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground/55">
          创建后到详情页输入客户名称，即可生成专属订购链接发给对方填写
        </p>
      </section>

      <section className="mt-4 rounded-xl border-2 border-dashed border-input bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-secondary-foreground">
              上传今日商品表（Excel）
            </h2>
            <p className="mt-1 text-xs text-muted-foreground/55">
              按表头识别列：品种名 / 花径 / 花型 / 颜色 / 等级 / 价格 / 原始库存（作为本期库存，
              可在清单中调整，留空表示不限）
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            nativeButton={false}
            render={<a href="/muban.xlsx" download="供货模板.xlsx" />}
          >
            ⬇ 下载模板
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
          <Button variant="outline" type="button" onClick={() => fileRef.current?.click()}>
            选择文件
          </Button>
          {fileName ? (
            <span className="max-w-48 truncate text-sm text-muted-foreground">{fileName}</span>
          ) : (
            <span className="text-sm text-muted-foreground/55">未选择文件</span>
          )}
          <Button onClick={upload} disabled={uploading}>
            {uploading ? "解析中..." : "上传并解析"}
          </Button>
        </div>
        {uploadInfo && (
          <p className={`mt-2 text-sm ${uploadInfoError ? "text-destructive" : "text-success"}`}>
            {uploadInfo}
          </p>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-secondary-foreground">
            当日商品清单（共 {count} 项）
          </h2>
          <Button
            variant="outline"
            size="sm"
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
                  rawStock: 9999,
                  stock: 9999,
                },
              ])
            }
          >
            ＋ 手动加一行
          </Button>{" "}
        </div>
        <div className="mt-3 overflow-x-auto">
          {items.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground/55">
              上传 Excel 后商品会按模板列显示在这里；也可以手动添加。每行均可直接编辑或删除。
            </p>
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground/80">
                  <th className="px-2 py-2">图片</th>
                  <th className="px-2 py-2">品种名</th>
                  <th className="px-2 py-2">花径</th>
                  <th className="px-2 py-2">花型</th>
                  <th className="px-2 py-2">颜色</th>
                  <th className="px-2 py-2">等级</th>
                  <th className="px-2 py-2">库存</th>
                  <th className="px-2 py-2">单价</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="px-1 py-1.5">
                      {c.image1 ? (
                        <img
                          src={`data:image/png;base64,${c.image1}`}
                          alt={c.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-1 py-1.5">
                      <Input
                        value={c.name}
                        onChange={(e) => setRow(i, { name: e.target.value })}
                        className="w-28"
                      />
                    </td>
                    {(["size", "flowerType", "color", "grade"] as const).map((f) => (
                      <td key={f} className="px-1 py-1.5">
                        <Input
                          value={c[f]}
                          onChange={(e) => setRow(i, { [f]: e.target.value })}
                          className="w-16"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        value={c.stock >= 9999 ? "" : c.stock}
                        placeholder="不限"
                        onChange={(e) => {
                          const n =
                            e.target.value === ""
                              ? 9999
                              : Math.max(0, Math.floor(Number(e.target.value) || 0));
                          setRow(i, { stock: n, rawStock: n });
                        }}
                        className="w-16"
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={c.price}
                        onChange={(e) => setRow(i, { price: Number(e.target.value) })}
                        className="w-20"
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <Button
                        variant="link"
                        className="h-auto px-0 text-xs text-destructive"
                        onClick={() => setItems((p) => p.filter((_, j) => j !== i))}
                      >
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <Button size="lg" className="mt-5 w-full" onClick={submit} disabled={saving}>
        {saving ? "创建中..." : "创建供货单"}
      </Button>
    </main>
  );
}
