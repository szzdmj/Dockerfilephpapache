import { Container, getContainer } from "@cloudflare/containers";

// 与 wrangler.jsonc 一致的 DO 类名；默认端口固定为 80
export class MyContainerdPhpa extends Container {
  defaultPort = 80;
  sleepAfter = "3m";
}

type Env = {
  MY_CONTAINER: DurableObjectNamespace<MyContainerdPhpa>;
  INSTANCE_COUNT?: string; // 默认 1
};

function parseCookie(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  header.split(/;\s*/).forEach((kv) => {
    const i = kv.indexOf("=");
    if (i > 0) out[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1));
  });
  return out;
}

function chooseStickyName(req: Request, count: number): { name: string; setCookie?: string } {
  const cookies = parseCookie(req.headers.get("cookie"));
  const key = "SZZD_CONTAINER";
  let shard = cookies[key];
  if (!shard) {
    const n = Math.max(1, count | 0);
    shard = String(Math.floor(Math.random() * n));
    const cookie = `${key}=${encodeURIComponent(shard)}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax`;
    return { name: `client-${shard}`, setCookie: cookie };
  }
  return { name: `client-${shard}` };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const count = Number(env.INSTANCE_COUNT ?? "1");
    const { name, setCookie } = chooseStickyName(request, count);
    const stub = getContainer(env.MY_CONTAINER, name);

    try {
      await stub.start(); // defaultPort=80
    } catch {}

    const resp = await stub.fetch(request);
    if (setCookie) {
      const h = new Headers(resp.headers);
      h.append("Set-Cookie", setCookie);
      return new Response(resp.body, { status: resp.status, headers: h });
    }
    return resp;
  },
};
