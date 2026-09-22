# 供货订购收集工具

商家发布当日供货商品，客户每人一个专属链接填写订购数量，**互相看不到别人的数量**，商家后台汇总并导出 Excel。

## 功能

- **商家后台**（密码登录）：上传 Excel 创建供货单（自动解析商品与嵌入图片，可逐行改名/改价/删行）、按客户名称生成专属链接、实时汇总、导出 Excel；支持按标题关键字 / 供货日期 / 状态筛选历史供货单
- **一键复制供货单**：商品（含图片、价格、属性）原样复制，库存清零、订单不复制，适合"明天品种一样，只改数量"的日常场景
- **群填单链接**（可选）：每张供货单可生成一个群链接 + 4 位数字口令，发到微信群后客户自行输入姓名订购；同名互斥，防口令爆破限流
- **客户填写页**（免登录，移动端优先）：打开链接直接填数量，截止前可反复修改，自动倒计时；商品以 1:1 方图 + 规格标签的电商卡片展示
- **数据隔离**：每个链接携带唯一 token，接口只返回该客户自己的数据；汇总接口仅商家可用
- **截止控制**：到截止时间或商家手动关闭后，客户只能查看不能修改

## 技术栈

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui（Base UI）+ Prisma + SQLite + xlsx + adm-zip

## 本地开发

需要 Node.js 20+。

```bash
npm install
npm run db:push     # 初始化 SQLite 表结构
npm run dev         # http://localhost:49632
```

登录：访问 `/admin`，默认密码 `admin123`（见 `.env` 中 `ADMIN_PASSWORD`，务必修改）。

常用脚本：

```bash
npm run lint        # ESLint 检查
npm run lint:fix    # ESLint 自动修复
npm run format      # Prettier 格式化（含 Tailwind 类名排序）
npm run build       # 构建生产产物（先 prisma generate）
```

## 使用流程

**每日主流程：上传 Excel 生成供货单**

1. 每天在你的 Excel 模板里改好价格、原始库存（可在品种旁插入嵌入图片）
2. 「新建供货单」：**上传 Excel** → 自动解析出商品清单（含图片，可逐行改名/改价/删行）→ 填写标题（必填）→ 确认截止时间 → 创建
   - Excel 结构约定：第一个 sheet，前 10 行内有一行第一列为「品种名」的表头，**按表头文字识别列**（品种名/花径/花型/颜色/等级/价格/原始库存），列顺序调整不影响解析；非模板表头会明确报错
   - **图片**：自动提取 Excel 中嵌入的浮动图片（按锚点单元格对应到品种行，最多 2 张/品种）
   - **库存**：从模板的「原始库存」列读取（新的一天从头卖），清单中可调整、留空表示不限；详情页可随时点击调整（不能小于已订量），原始与可售同步，剩余数量 = 库存 − 已订购
   - 供货日期自动从簿记行的「9月22」样式文本识别；**标题为必填项**，若 Excel 有商家名（如「嵩明集货站」）会自动填入，没有则手动填写
3. 进入详情页，两种方式让客户开始订购（可并用，订单列表中「群自填」标记区分来源）：
   - **逐个发**：输入客户名称 → 生成专属链接 → 复制后微信发给对方（名称打错可点击改名，客户填错了可删除重来）
   - **发群里**：「群填单链接」→ 生成群链接 + 4 位口令 → 链接发群、口令另行告知；客户点开自行输入姓名和口令进入填写（同设备再次打开链接自动回到自己的订购单；同名会被拒绝）
4. 客户打开链接填写数量提交；截止后（或手动关闭）不可再改
5. 详情页实时查看汇总，点击「导出 Excel」获得「按商品汇总」+「按客户明细」两个 Sheet

**隔日快捷路径：复制供货单**

品种与昨天一样时，在详情页点「复制供货单」→ 选日期、改标题和截止时间 → 商品原样带过，只需调整价格和库存。

## 部署（Docker）

```bash
# 1. 修改 docker-compose.yml 中的 ADMIN_PASSWORD 和 SESSION_SECRET
# 2. 构建并启动
docker compose up -d --build
```

- 服务器上也可用一键部署脚本 `./deploy.sh`（本地同步代码 → 远程重建 → 健康检查；`--sync` 仅同步不重建），服务器地址与密钥路径在脚本头部配置
- 数据（SQLite）持久化在 `ex-order-data` 卷中，重建容器不丢数据；启动时自动 `prisma db push` 同步表结构并开启 WAL
- 容器时区已设为 Asia/Shanghai，截止时间按北京时间处理
- 生产环境建议前置 Nginx/Caddy 反向代理并开启 HTTPS（微信内打开 + 「复制链接」功能依赖安全上下文）

## 安全说明

- 客户链接含 32 位随机 token，不可猜测；但**免登录链接一旦被本人转发，他人也可查看/修改**
- 群填单链接同样为随机 token，另有 4 位数字口令；口令连错 8 次锁 IP 10 分钟。群链接可在详情页重新生成（旧链接立即失效）或停用
- 商家后台密码与会话密钥通过环境变量注入，会话 cookie 为 HttpOnly + HMAC 签名，有效期 7 天
- 数据库文件：本地开发在 `prisma/dev.db`，Docker 部署在数据卷 `/app/data/app.db`，注意备份

## 项目结构

```
prisma/schema.prisma        # 数据模型：SupplySheet / SheetItem（含图片）/ Order / OrderItem
scripts/wal.cjs             # 启动时开启 SQLite WAL 模式
src/app/admin/              # 商家后台：列表、登录、新建、详情
src/app/join/[token]/       # 群填单入口（姓名 + 口令）
src/app/order/[token]/      # 客户订购页（免登录）
src/app/api/                # REST 接口（见下）
src/components/             # 业务组件（OrderForm / GroupLinkCard / SheetActions 等）
src/components/ui/          # shadcn/ui 基础组件（Base UI 封装）
src/lib/                    # auth（会话）/ db（Prisma）/ workbook（Excel 解析）/ sheetStatus
docs/llms.txt               # shadcn/ui 官方 LLM 文档索引（配合根目录 AGENTS.md 供 AI 辅助开发）
```

主要接口：`/api/sheets`（供货单 CRUD、复制、群链接）、`/api/order/[token]`（客户读写自己的订单）、`/api/public/join`（群填单自助进入，含限流）、`/api/parse-workbook`（Excel 解析）、`/api/item-image/[id]`（商品图片输出）、`/api/sheets/[id]/export`（Excel 导出）。

## 已知限制

- 供货单创建后暂不支持追加商品（可用「复制供货单」重建，或关闭后新建）
- 商品清单以每日上传的 Excel 为准，网站内不维护商品库
