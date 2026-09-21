// 启动前为 SQLite 开启 WAL 模式：提升并发读写稳定性
// 失败不阻塞服务启动（WAL 只是优化项）
const { PrismaClient } = require("@prisma/client");

const p = new PrismaClient();
p.$queryRawUnsafe("PRAGMA journal_mode=WAL;")
  .then((r) => {
    console.log("SQLite WAL:", JSON.stringify(r));
    return p.$disconnect();
  })
  .catch((e) => {
    console.error("WAL 初始化失败(不阻塞启动):", e.message);
    process.exit(0);
  });
