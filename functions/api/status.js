/**
 * GET /api/status?id=HLA-MB-XXXX — 办理进度查询
 *
 * 只按受理编号取回那一条记录，并且只回给提交者该看的东西：
 * 状态、受理时间、答复时间与答复正文。提交的原始内容不回显（避免编号被猜到后泄露信息）。
 * 已答复且标记 public 的记录，会出现在站点的答复公示页（取自 /data/replies.json）。
 */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const id = (new URL(request.url).searchParams.get("id") || "").trim().toUpperCase();

  if (!/^HLA-(MB|F)-[A-Z0-9]{6,12}$/.test(id)) {
    return json(
      { ok: false, error: "bad_id", message: "受理编号格式不正确（形如 HLA-MB-XXXXXX）。" },
      400,
    );
  }
  if (!env?.INBOX) {
    return json(
      { ok: false, error: "inbox_not_configured", message: "受理系统尚未启用。" },
      503,
    );
  }

  const raw = await env.INBOX.get(`sub:${id}`);
  if (!raw) {
    return json(
      { ok: false, error: "not_found", message: "没有找到该受理编号，请核对是否完整。" },
      404,
    );
  }

  let entry;
  try {
    entry = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "broken_record", message: "记录损坏，请联系本局。" }, 500);
  }

  const kind = entry.kind === "filing" ? "在线备案" : "局长信箱";
  const statusText =
    {
      received: "已受理，待办理",
      processing: "办理中",
      replied: "已答复",
      closed: "已办结",
    }[entry.status] || "已受理";

  return json({
    ok: true,
    id: entry.id,
    kind,
    type: entry.kind,
    status: entry.status,
    status_text: statusText,
    created_at: entry.created_at,
    replied_at: entry.replied_at || "",
    reply: entry.reply || "",
    title: entry.fields?.title || entry.fields?.unit || "",
  });
}

export async function onRequestPost() {
  return json({ ok: false, error: "method_not_allowed", message: "请使用 GET 查询。" }, 405);
}
