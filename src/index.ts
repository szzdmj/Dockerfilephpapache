import { Container, getContainer } from "@cloudflare/containers";

// 与 wrangler.jsonc 一致；固定默认端口为 80
export class MyContainerdPhpa extends Container {
  defaultPort = 80;
  // 可调更长，避免频繁冷启
  sleepAfter = "5m";
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 启动容器并等待可用（探针访问“/”，避免 race）
async function ensureContainerReady(stub: ReturnType<typeof getContainer>, timeoutMs = 15000) {
  const startT = Date.now();
  // 触发启动（若已在跑会快速返回）
  await stub.start();

  // 轮询探测可用（HEAD 有些镜像不支持，统一用 GET /）
  let lastErr: unknown;
  const probe = new Request("http://container/", { method: "GET" });
  while (Date.now() - startT < timeoutMs) {
    try {
      const r = await stub.fetch(probe);
      // 任何 2xx/3xx 视为已就绪（常见镜像 GET / 返回 200/403/404 也说明已监听）
      if (r && (r.ok || (r.status >= 200 && r.status < 500))) return;
    } catch (e) {
      lastErr = e;
    }
    await sleep(500);
  }
  // 超时也抛出，交给上层处理
  throw new Error(`Container not ready within ${timeoutMs}ms${lastErr ? `, last error: ${String(lastErr)}` : ""}`);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const count = Number(env.INSTANCE_COUNT ?? "1");
    const { name, setCookie } = chooseStickyName(request, count);
    const stub = getContainer(env.MY_CONTAINER, name);

    try {
      await ensureContainerReady(stub, 20000);
    } catch (e) {
      // 明确返回 503，便于前端/监控识别；附带错误信息
      return new Response(`Service warming up: ${String(e)}`, {
        status: 503,
        headers: { "Cache-Control": "no-store", "X-Container-State": "starting" },
      });
    }

    // 转发原始请求
    const resp = await stub.fetch(request);

    if (setCookie) {
      const h = new Headers(resp.headers);
      h.append("Set-Cookie", setCookie);
      return new Response(resp.body, { status: resp.status, headers: h });
    }
    return resp;
  },
};
