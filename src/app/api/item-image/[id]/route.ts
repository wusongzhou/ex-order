import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** 输出供货单商品图片（?n=1|2 对应 品种图片1/2） */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const which = new URL(req.url).searchParams.get("n") === "2" ? "image2" : "image1";

  const item = await prisma.sheetItem.findUnique({
    where: { id: Number(id) },
    select: { image1: true, image2: true },
  });
  const raw = item?.[which];
  if (!raw) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Prisma v6 的 Bytes 类型为 Uint8Array，这里转 Buffer 以使用 subarray
  const buf = Buffer.from(raw);
  const head = buf.subarray(0, 3).toString("hex").toLowerCase();
  const type = head === "ffd8ff" ? "image/jpeg" : "image/png";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
