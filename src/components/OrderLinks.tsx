"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CopyLinkButton from "@/components/CopyLinkButton";
import Modal from "@/components/Modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OrderItem = { name: string; price: number; quantity: number; amount: number };

type OrderRow = {
  id: number;
  customerName: string;
  token: string;
  source: string;
  submitted: boolean;
  submittedAt: string | null;
  summary: string;
  amount: number;
  items: OrderItem[];
};

export default function OrderLinks({ sheetId }: { sheetId: number }) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [renameTarget, setRenameTarget] = useState<OrderRow | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<OrderRow | null>(null);
  const [detailTarget, setDetailTarget] = useState<OrderRow | null>(null);
  const [actionErr, setActionErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/sheets/${sheetId}/orders`);
    if (r.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const d = await r.json();
    setOrders(d.orders || []);
    setLoaded(true);
  }, [sheetId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始拉取数据的标准模式（fetch 异步后才 setState）
    load();
  }, [load]);

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
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="输入客户名称，如：小明花卉"
          className="min-w-52 flex-1"
        />
        <Button onClick={add} disabled={busy}>
          {busy ? "生成中..." : "生成专属链接"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {actionErr && <p className="mt-2 text-sm text-destructive">{actionErr}</p>}

      {loaded && orders.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-input bg-card p-6 text-center text-sm text-muted-foreground/80">
          还没有客户。输入客户名称生成专属链接，复制后通过微信发送给对方填写。
        </p>
      )}

      {orders.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 text-xs text-muted-foreground">客户</TableHead>
                <TableHead className="px-4 text-xs text-muted-foreground">状态</TableHead>
                <TableHead className="px-4 text-xs text-muted-foreground">订购内容</TableHead>
                <TableHead className="px-4 text-xs text-muted-foreground">金额</TableHead>
                <TableHead className="px-4 text-xs text-muted-foreground">链接</TableHead>
                <TableHead className="px-4 text-xs text-muted-foreground" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="px-4 py-3">
                    <Button
                      variant="link"
                      className="h-auto px-0 font-medium text-foreground"
                      onClick={() => setDetailTarget(o)}
                      title="查看订购详情"
                    >
                      {o.customerName}
                    </Button>
                    {o.source === "self" && (
                      <Badge
                        variant="secondary"
                        className="ml-1.5 align-[1px]"
                        title="客户通过群链接自助创建"
                      >
                        群自填
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {o.submitted ? (
                      <span className="text-success">已提交</span>
                    ) : (
                      <span className="text-muted-foreground/55">未提交</span>
                    )}
                  </TableCell>
                  <TableCell
                    className="max-w-60 truncate px-4 py-3 text-muted-foreground"
                    title={o.summary}
                  >
                    {o.summary || "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono text-muted-foreground tabular-nums">
                    ¥{o.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <CopyLinkButton token={o.token} />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Button
                      variant="link"
                      className="mr-2 h-auto px-0 text-xs text-muted-foreground"
                      onClick={() => {
                        setRenameTarget(o);
                        setRenameName(o.customerName);
                        setActionErr("");
                      }}
                    >
                      改名
                    </Button>
                    <Button
                      variant="link"
                      className="h-auto px-0 text-xs text-destructive"
                      onClick={() => {
                        setDeleteTarget(o);
                        setActionErr("");
                      }}
                    >
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {orders.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground/55">
          已提交 {orders.filter((o) => o.submitted).length} / {orders.length} ·
          每个客户只能看到和修改自己的数量
        </p>
      )}

      {/* 改名弹窗 */}
      <Modal
        open={!!renameTarget}
        title="修改客户名称"
        onClose={() => setRenameTarget(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              取消
            </Button>
            <Button onClick={doRename}>保存</Button>
          </>
        }
      >
        <Input
          value={renameName}
          onChange={(e) => setRenameName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") doRename();
          }}
          autoFocus
          className="w-full"
          placeholder="客户名称"
        />
        <p className="mt-2 text-xs text-muted-foreground/55">改名不影响客户已填写的订单</p>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        title="删除客户订单"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={doDelete}>
              删除
            </Button>
          </>
        }
      >
        <p>删除「{deleteTarget?.customerName}」？其填写记录将一并删除，不可恢复。</p>
      </Modal>

      {/* 订购详情弹窗 */}
      <Modal
        open={!!detailTarget}
        title={detailTarget ? `${detailTarget.customerName} 的订购详情` : ""}
        onClose={() => setDetailTarget(null)}
        width="sm:max-w-md"
        footer={
          <Button variant="outline" onClick={() => setDetailTarget(null)}>
            关闭
          </Button>
        }
      >
        {detailTarget && (
          <div>
            <p className="text-xs text-muted-foreground/55">
              {detailTarget.submitted
                ? `已提交 · ${detailTarget.submittedAt ? new Date(detailTarget.submittedAt).toLocaleString("zh-CN", { hour12: false }) : ""}`
                : "尚未提交"}
            </p>
            {detailTarget.items.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground/80">该客户还没有订购任何商品</p>
            ) : (
              <Table className="mt-3">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2 text-xs text-muted-foreground">品种</TableHead>
                    <TableHead className="py-2 text-right text-xs text-muted-foreground">
                      单价
                    </TableHead>
                    <TableHead className="py-2 text-right text-xs text-muted-foreground">
                      数量
                    </TableHead>
                    <TableHead className="py-2 text-right text-xs text-muted-foreground">
                      小计
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailTarget.items
                    .filter((it) => it.quantity > 0)
                    .map((it) => (
                      <TableRow key={it.name}>
                        <TableCell className="py-2 font-medium">{it.name}</TableCell>
                        <TableCell className="py-2 text-right font-mono text-muted-foreground tabular-nums">
                          ¥{it.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-muted-foreground tabular-nums">
                          ×{it.quantity}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-foreground tabular-nums">
                          ¥{it.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  <TableRow className="border-b-0 font-medium">
                    <TableCell className="py-2" colSpan={3}>
                      合计
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono tabular-nums">
                      ¥{detailTarget.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
            <p className="mt-3 text-xs text-muted-foreground/55">
              截止前客户仍可通过专属链接修改订购内容
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
