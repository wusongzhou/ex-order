"use client";

import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * 通用弹窗：基于 shadcn Dialog（Base UI）实现，保持原有 props 接口不变。
 * 由底层组件提供遮罩点击关闭、Esc 关闭、滚动锁定、焦点圈定与开合动画。
 */
export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  // 只声明 sm 以上的宽度；小屏由 DialogContent 内置的 max-w-[calc(100%-2rem)] 留出 1rem 边距
  width = "sm:max-w-sm",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className={cn(width)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
