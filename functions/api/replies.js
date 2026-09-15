/**
 * GET /api/replies — 答复公示（公开数据）
 *
 * 只返回「已答复 + 标记 public」的记录，且只给提问与答复，
 * 不带受理编号、联系方式、来源信息等任何可定位到个人的字段。
 */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env?.INBOX) return json({ ok: false, items: [], message: "收件箱未启用。" }, 503);

  const listed = await env.INBOX.list({ prefix: "sub:" });
  const items = [];
  for (const item of listed.keys) {
    const raw = await env.INBOX.get(item.name);
    if (!raw) continue;
    let record;
    try {
      record = JSON.parse(raw);
    } catch {
      continue;
    }
    if (record.status !== "replied" || !record.public || !record.reply) continue;
    const fields = record.fields || {};
    items.push({
      type: fields.type || (record.kind === "filing" ? "备案" : "来信"),
      title: fields.title || fields.unit || "来信",
      date: (record.replied_at || record.created_at || "").slice(0, 10),
      question: fields.body || fields.note || fields.title || "",
      answer: record.reply,
    });
  }
  items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return json({ ok: true, items });
}
