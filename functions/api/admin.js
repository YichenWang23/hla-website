/**
 * 管理端接口：读取收件箱、答复、改状态、删件、公示。
 *
 * 鉴权：请求头 `x-admin-token`（或 Authorization: Bearer ...）里的口令，
 * 其 SHA-256 必须等于 KV 里的 `admin:token`。口令只在生成时显示一次，
 * 服务端只存哈希，泄露了也拿不到原文。
 *
 * GET  /api/admin            列出全部提交（最新的在前）
 * POST /api/admin            { action: "reply"|"status"|"public"|"delete", id, text?, state?, value? }
 *
 * 没设置口令时返回 503 并提示先用工具生成（inbox.py token）。
 */

const RATE_WINDOW_SECONDS = 600;
const RATE_MAX = 60; // 管理端自己用，额度给宽一点

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authorize(request, env) {
  if (!env?.INBOX) return { error: json({ ok: false, error: "inbox_not_configured", message: "收件箱未启用。" }, 503) };
  const stored = await env.INBOX.get("admin:token");
  if (!stored) {
    return {
      error: json(
        {
          ok: false,
          error: "admin_token_missing",
          message: "管理口令还没设置。在本机执行 inbox.py token 生成一个即可。",
        },
        503,
      ),
    };
  }
  const provided = (request.headers.get("x-admin-token") || (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")).trim();
  if (!provided) return { error: json({ ok: false, error: "unauthorized", message: "缺少管理口令。" }, 401) };
  if ((await sha256(provided)) !== stored) {
    return { error: json({ ok: false, error: "unauthorized", message: "口令不正确。" }, 401) };
  }
  return { ok: true };
}

async function rateLimited(env, ip) {
  if (!ip) return false;
  const key = `rl:admin:${ip}`;
  const seen = Number((await env.INBOX.get(key)) || 0);
  if (seen >= RATE_MAX) return true;
  await env.INBOX.put(key, String(seen + 1), { expirationTtl: RATE_WINDOW_SECONDS });
  return false;
}

async function loadAll(env) {
  // KV 支持按前缀列举，省掉维护索引的一致性麻烦
  const listed = await env.INBOX.list({ prefix: "sub:" });
  const records = [];
  for (const item of listed.keys) {
    const raw = await env.INBOX.get(item.name);
    if (raw) {
      const record = JSON.parse(raw);
      record.has_reply = Boolean(record.reply);
      // 管理端需要完整内容，但不需要看到来源指纹细节
      delete record.source;
      records.push(record);
    }
  }
  records.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return records;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = await authorize(request, env);
  if (auth.error) return auth.error;

  const ip = request.headers.get("cf-connecting-ip") || "";
  if (await rateLimited(env, ip)) {
    return json({ ok: false, error: "rate_limited", message: "请求过于频繁，请稍后再试。" }, 429);
  }

  const records = await loadAll(env);
  const pending = records.filter((item) => item.status === "received").length;
  return json({ ok: true, count: records.length, pending, records });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await authorize(request, env);
  if (auth.error) return auth.error;

  const ip = request.headers.get("cf-connecting-ip") || "";
  if (await rateLimited(env, ip)) {
    return json({ ok: false, error: "rate_limited", message: "请求过于频繁，请稍后再试。" }, 429);
  }

  let payload;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return json({ ok: false, error: "bad_json", message: "请求格式不正确。" }, 400);
  }

  const id = String(payload?.id || "").trim().toUpperCase();
  const action = String(payload?.action || "");
  if (!/^HLA-(MB|F)-[A-Z0-9]{6,12}$/.test(id)) {
    return json({ ok: false, error: "bad_id", message: "受理编号格式不正确。" }, 400);
  }

  const key = `sub:${id}`;
  const raw = await env.INBOX.get(key);
  if (!raw) return json({ ok: false, error: "not_found", message: "没有找到该编号。" }, 404);
  const record = JSON.parse(raw);

  if (action === "reply") {
    const text = String(payload.text || "").trim();
    if (!text) return json({ ok: false, error: "empty_reply", message: "答复不能为空。" }, 400);
    if (text.length > 4000) return json({ ok: false, error: "too_long", message: "答复过长（上限 4000 字）。" }, 400);
    record.reply = text;
    record.status = "replied";
    record.replied_at = new Date().toISOString();
    if (payload.public === true) record.public = true;
  } else if (action === "status") {
    const state = String(payload.state || "");
    if (!["received", "processing", "replied", "closed"].includes(state)) {
      return json({ ok: false, error: "bad_state", message: "状态只能是 received/processing/replied/closed。" }, 400);
    }
    record.status = state;
  } else if (action === "public") {
    record.public = payload.value !== false;
  } else if (action === "delete") {
    await env.INBOX.delete(key);
    return json({ ok: true, id, deleted: true });
  } else {
    return json({ ok: false, error: "bad_action", message: "未知操作。" }, 400);
  }

  record.updated_at = new Date().toISOString();
  await env.INBOX.put(key, JSON.stringify(record));
  return json({ ok: true, id, status: record.status, public: Boolean(record.public), has_reply: Boolean(record.reply) });
}
