"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DateTimePicker from "@/components/ui/DateTimePicker";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const HEADS = ["图片", "品种名", "花径", "花型", "颜色", "等级", "库存", "单价", ""];

export default function NewSheetPage() {
  const router = useRouter();
  const [items, setItems] = useState<ItemRow[]>([]);
  const [date, setDate] = useState(localISODate());
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState(`${localISODate()}T23:59`);
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
      <PageHeader className="mt-3" title="新建供货单" />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>
            创建后到详情页输入客户名称，即可生成专属订购链接发给对方填写
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm">
              <span className="text-muted-foreground">
                供货日期 <span className="text-destructive">*</span>
              </span>
              <div className="mt-1">
                <DateTimePicker value={date} onChange={setDate} />
              </div>
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">
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
              <span className="text-muted-foreground">
                截止时间 <span className="text-destructive">*</span>
              </span>
              <div className="mt-1">
                <DateTimePicker value={deadline} onChange={setDeadline} withTime />
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 border-2 border-dashed border-input ring-0">
        <CardHeader>
          <CardTitle>上传今日商品表（Excel）</CardTitle>
          <CardDescription>
            按表头识别列：品种名 / 花径 / 花型 / 颜色 / 等级 / 价格 /
            原始库存（作为本期库存，可在清单中调整，留空表示不限）
          </CardDescription>
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href="/muban.xlsx" download="供货模板.xlsx" />}
            >
              ⬇ 下载模板
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
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
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>当日商品清单（共 {count} 项）</CardTitle>
          <CardDescription>上传 Excel 后按模板列显示，每行均可直接编辑或删除</CardDescription>
          <CardAction>
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
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div>
            {items.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground/55">
                上传 Excel 后商品会按模板列显示在这里；也可以手动添加。每行均可直接编辑或删除。
              </p>
            ) : (
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    {HEADS.map((h, i) => (
                      <TableHead key={i} className="px-2 py-2 text-xs text-muted-foreground">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell className="px-1 py-1.5">
                        {c.image1 ? (
                          <img
                            src={`data:image/png;base64,${c.image1}`}
                            alt={c.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        <Input
                          value={c.name}
                          onChange={(e) => setRow(i, { name: e.target.value })}
                          className="w-28"
                        />
                      </TableCell>
                      {(["size", "flowerType", "color", "grade"] as const).map((f) => (
                        <TableCell key={f} className="px-1 py-1.5">
                          <Input
                            value={c[f]}
                            onChange={(e) => setRow(i, { [f]: e.target.value })}
                            className="w-16"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="px-1 py-1.5">
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
                          className="w-16 font-mono tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        <Input
                          type="number"
                          min={0}
                          step="0.1"
                          value={c.price}
                          onChange={(e) => setRow(i, { price: Number(e.target.value) })}
                          className="w-20 font-mono tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        <Button
                          variant="link"
                          className="h-auto px-0 text-xs text-destructive"
                          onClick={() => setItems((p) => p.filter((_, j) => j !== i))}
                        >
                          删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Button size="lg" className="mt-5 w-full" onClick={submit} disabled={saving}>
        {saving ? "创建中..." : "创建供货单"}
      </Button>
    </main>
  );
}
