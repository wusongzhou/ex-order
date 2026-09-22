"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  width = "max-w-sm",
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
      <DialogContent className={`${width} gap-0 rounded-2xl p-5 sm:max-w-none`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-3 text-sm text-gray-600">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}
