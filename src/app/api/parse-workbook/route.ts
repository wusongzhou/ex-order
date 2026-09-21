import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { parseWorkbook } from "@/lib/workbook";

export const runtime = "nodejs";

/** 商家上传每日商品 Excel，解析出商品清单（名称/花径/花型/颜色/等级/单价/限量）供确认后创建供货单 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择要上传的 Excel 文件" }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = parseWorkbook(buf);
    return NextResponse.json({
      ...result,
      items: result.items.map(({ image1, image2, ...rest }) => ({
        ...rest,
        image1: image1 ? image1.toString("base64") : null,
        image2: image2 ? image2.toString("base64") : null,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "解析失败，请检查文件是否为有效的 Excel" },
      { status: 400 }
    );
  }
}
