import { cookies } from "next/headers";
import crypto from "crypto";

export const ADMIN_COOKIE = "so_admin";

function secret(): string {
  return process.env.SESSION_SECRET || "dev-secret-change-me";
}

/** 生成 "过期时间戳.HMAC" 形式的会话令牌 */
export function signSession(ttlMs: number = 7 * 24 * 3600 * 1000): string {
  const exp = Date.now() + ttlMs;
  const sig = crypto.createHmac("sha256", secret()).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

/** 校验会话令牌 */
export function verifySession(value: string | null | undefined): boolean {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Date.now()) return false;
  const expect = crypto.createHmac("sha256", secret()).update(exp).digest("hex");
  if (sig.length !== expect.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expect, "utf8"));
}

/** 当前请求是否为已登录商家（用于服务端组件与 API 鉴权） */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(ADMIN_COOKIE)?.value);
}
