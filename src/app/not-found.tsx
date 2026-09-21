import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-medium">链接无效或已失效</p>
        <p className="mt-2 text-sm text-gray-500">请联系供货方获取新的订购链接</p>
        <Link href="/" className="mt-4 inline-block text-sm text-gray-400 hover:text-gray-600">
          返回首页
        </Link>
      </div>
    </main>
  );
}
