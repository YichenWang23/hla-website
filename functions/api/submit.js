/**
 * POST /api/submit — 受理两类提交：
 *   kind = "filing"   在线备案预填报
 *   kind = "mailbox"  局长信箱来信
 *
 * 存储：KV 绑定 INBOX，键为 sub:<受理编号>，值为 JSON 记录。
 * 可选：环境变量 NOTIFY_WEBHOOK（把新提交用 POST 转发到你自己的群机器人/邮箱网关）。
 *
 * 这是站点唯一的写入接口，所以做得比较谨慎：
 *   - 只接受白名单字段，长度受限，超限即拒；
 *   - 蜜罐字段（website）被填 = 机器人，直接返回"成功"但不落库；
 *   - 按来源 IP 限流（KV 计数，10 分钟最多 6 次）；
 *   - 不记录 IP 明文，只存哈希后缀，用于排查滥用；
 *   - KV 未绑定或写入失败时返回 503，让前端提示"请改走电话/邮箱"，绝不假装成功。
 */

const MAX_BODY_BYTES = 16 * 1024;
const RATE_WINDOW_SECONDS = 600;
const RATE_MAX = 6;

const FIELDS = {
  filing: {
    unit: 80,
    district: 20,
    address: 120,
    regno: 40,
    contact: 40,
    phone: 40,
    headcount: 6,
    post: 40,
    night: 1,
    lake: 1,
    note: 500,
  },
  mailbox: {
    type: 20,
    name: 40,
    contact: 60,
    title: 80,
    body: 2000,
  },
};

const REQUIRED = {
  filing: ["unit", "district", "address", "contact", "phone", "headcount"],
  mailbox: ["type", "title", "body"],
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function receiptId(kind) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${kind === "filing" ? "HLA-F" : "HLA-MB"}-${stamp}${rand}`;
}

function clean(kind, raw) {
  const allowed = FIELDS[kind];
  const out = {};
  const problems = [];
  for (const [key, limit] of Object.entries(allowed)) {
    const value = raw?.[key];
    if (value === undefined || value === null || value === "") {
      if (key === "night" || key === "lake") out[key] = false;
      continue;
    }
    if (typeof value === "boolean") {
      out[key] = value;
      continue;
    }
    const text = String(value).replace(/\s+/g, " ").trim();
    if (text.length > limit) {
      problems.push(`${key} 超过 ${limit} 字`);
      continue;
    }
    out[key] = text;
  }
  for (const key of REQUIRED[kind]) {
    if (!out[key]) problems.push(`缺少必填项 ${key}`);
  }
  return { record: out, problems };
}

async function rateLimited(env, ip) {
  if (!env?.INBOX || !ip) return false;
  const key = `rl:${ip}`;
  const seen = Number((await env.INBOX.get(key)) || 0);
  if (seen >= RATE_MAX) return true;
  await env.INBOX.put(key, String(seen + 1), { expirationTtl: RATE_WINDOW_SECONDS });
  return false;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) {
    return json({ ok: false, error: "too_large", message: "提交内容过大。" }, 413);
  }

  // content-length 可以缺失或不准，所以读出来之后再按真实长度判断一次
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ ok: false, error: "too_large", message: "提交内容过大。" }, 413);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "bad_json", message: "请求格式不正确。" }, 400);
  }

  const kind = String(payload?.kind || "");
  if (!FIELDS[kind]) {
    return json({ ok: false, error: "bad_kind", message: "未知的提交类型。" }, 400);
  }

  // 蜜罐：真人看不到这个字段
  if (payload?.website) {
    return json({ ok: true, id: receiptId(kind), status: "received", note: "accepted" });
  }

  if (!env?.INBOX) {
    return json(
      {
        ok: false,
        error: "inbox_not_configured",
        message: "受理系统尚未启用，请拨打 12333-HLA 或使用邮箱 service@hla.hytheloo 提交。",
      },
      503,
    );
  }

  const ip = request.headers.get("cf-connecting-ip") || "";
  if (await rateLimited(env, ip)) {
    return json(
      { ok: false, error: "rate_limited", message: "提交过于频繁，请稍后再试。" },
      429,
    );
  }

  const { record, problems } = clean(kind, payload.fields || {});
  if (problems.length) {
    return json(
      { ok: false, error: "invalid", message: "请检查填写内容。", problems },
      400,
    );
  }

  const id = receiptId(kind);
  const now = new Date().toISOString();
  const entry = {
    id,
    kind,
    status: "received",
    created_at: now,
    updated_at: now,
    reply: "",
    replied_at: "",
    public: false,
    source: {
      ip_hash: ip ? (await shortHash(ip)) : "",
      ua: (request.headers.get("user-agent") || "").slice(0, 120),
      country: request.headers.get("cf-ipcountry") || "",
    },
    fields: record,
  };

  try {
    await env.INBOX.put(`sub:${id}`, JSON.stringify(entry));
  } catch (error) {
    return json(
      {
        ok: false,
        error: "store_failed",
        message: "暂时无法保存提交，请稍后再试或改走电话/邮箱。",
      },
      503,
    );
  }

  if (env.NOTIFY_WEBHOOK) {
    context.waitUntil(
      fetch(env.NOTIFY_WEBHOOK, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: `【${kind === "filing" ? "在线备案" : "局长信箱"}】${id}：${
            record.title || record.unit || ""
          }`,
          entry,
        }),
      }).catch(() => {}),
    );
  }

  return json({
    ok: true,
    id,
    status: "received",
    message:
      kind === "filing"
        ? "预填报已受理。请于十五日内携带材料原件到服务点核验。"
        : "来信已登记。咨询与建议类一般在十五个工作日内答复。",
  });
}

async function shortHash(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .slice(0, 6)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestGet() {
  return json({ ok: false, error: "method_not_allowed", message: "请使用 POST 提交。" }, 405);
}
