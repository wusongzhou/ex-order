# AGENTS.md

## 技术栈

- Next.js 15（App Router）+ React 19 + TypeScript
- Tailwind CSS v4（语义 token 定义在 `src/app/globals.css` 的 `@theme inline`）
- shadcn/ui 4.x，底层组件为 **Base UI（`@base-ui/react`）**，不是 Radix；组件源码在 `src/components/ui/`
- Prisma + SQLite（`prisma/schema.prisma`）

## shadcn/ui 文档参考规则

在回答 shadcn/ui 相关问题或生成涉及组件 API、用法、主题化的代码时，必须先查文档，不要凭记忆写：

1. 本地索引：`docs/llms.txt`（下载自 https://ui.shadcn.com/llms.txt ，按主题分组的全部文档页链接）。
2. 取单页正文：在文档 URL 末尾加 `.md` 即得 Markdown 源文件，
   如 `https://ui.shadcn.com/docs/components/popover.md`。
3. 也可用已配置的 shadcn MCP 工具（search / view / examples），或 CLI `npx shadcn docs <组件>`。

注意：本项目组件基于 **Base UI**（Trigger 用 `render` prop、`open`/`onOpenChange` 受控等），
与文档/网上资料的 Radix 写法（`asChild` 等）不兼容，以 `src/components/ui/` 内现有组件写法为准，
不要照搬 Radix 代码。

## 其他约定

- 新增 shadcn 组件用 `npx shadcn add <组件>`，不要手工复制网上代码。
- 提交信息用中文，一行概括本次改动要点（与 git log 现有风格一致）。
