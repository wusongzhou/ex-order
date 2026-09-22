import { notFound } from "next/navigation";
import type { Metadata } from "next";
import JoinForm from "@/components/JoinForm";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/sheetStatus";

/** 分享卡片 meta：群里发链接时显示供货单信息，而不是裸 URL */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const sheet = await prisma.supplySheet.findUnique({
    where: { publicToken: token },
    select: { date: true, title: true },
  });
  if (!sheet) {
    return { title: "供货订购", description: "链接无效或已失效" };
  }
  const title = `${sheet.title || "供货订购"} · ${sheet.date}`;
  const description = "点击输入姓名，填写您今日需要的订购数量";
  return { title, description, openGraph: { title, description, type: "website" } };
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sheet = await prisma.supplySheet.findUnique({
    where: { publicToken: token },
    include: { items: { select: { id: true } } },
  });
  if (!sheet) notFound();

  // eslint-disable-next-line react-hooks/purity -- 服务器组件按请求时刻计算，无水合问题
  const open = sheet.status === "open" && sheet.deadline.getTime() > Date.now();

  return (
    <main className="mx-auto max-w-lg px-4 pt-6">
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <h1 className="text-xl font-semibold">
          {sheet.date} 供货单{sheet.title ? ` · ${sheet.title}` : ""}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground/55">
          截止时间 {fmtDateTime(sheet.deadline)}
        </p>
        {open ? (
          <JoinForm
            sheetToken={token}
            sheetId={sheet.id}
            deadline={sheet.deadline.toISOString()}
            itemCount={sheet.items.length}
            passcodeRequired={Boolean(sheet.passcode)}
          />
        ) : (
          <p className="mt-4 rounded-xl bg-background p-4 text-center text-sm text-muted-foreground/80">
            {sheet.status === "closed" ? "本单已关闭" : "本次订购已截止"}
            {"，如需订购请联系供货方"}
          </p>
        )}
      </div>
    </main>
  );
}
