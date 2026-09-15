# 海特洛市劳动管理局 · 网站

> **非官方二创**：本站是《异环》（Neverness to Everness）玩家自制内容，海特洛市为游戏中的虚构城市，
"海特洛市劳动管理局"为玩家自创设定，与现实中的任何政府机构、企事业单位无关，也与游戏官方无关。

一个纯静态的"政务网站"：5 个正式页面 + 404 页，无构建步骤、无依赖，直接把 HTML 丢到任意静态托管即可。

线上地址：<https://hla-website.pages.dev>

## 页面

| 文件 | 内容 |
| --- | --- |
| `index.html` | 首页：紧急公告滚动条、本局要闻、通告公示侧栏、办事入口 |
| `announcements.html` | 通告公示列表（文号 `No.2026-00X` 与 `劳社字〔2026〕XX号` 混排） |
| `notice-2026-013.html` | 通告 劳社字〔2026〕13号：委托作业最低报酬指导价（2026 年度，以方斯计） |
| `notice-2026-001.html` | 通告 No.2026-001：新媒体账号入驻公告（认证标识、谨防冒充） |
| `notice-2026-002.html` | 通告 No.2026-002：调查「一咖舍·ORIGEN」用工备案情况 |
| `notice-2026-003.html` | 通告 No.2026-003：开展「泊暮区」新设经营场所用工备案集中办理工作（最新） |
| `regulations.html` | 政策法规：《海特洛市劳动事务管理条例》与第 17 号补充条例（异质接触岗位） |
| `about.html` | 机构介绍：职能、组织架构（办公室、用工备案稽查科、异质接触事务科、劳动者权益保障科、政策法规科、就业促进科、宣传科） |
| `services.html` | 办事服务：八项事项的办理对象、材料、时限与依据 |
| `online-filing.html` | 在线备案：用工备案预填报表单（前端演示）+ 备案材料清单 |
| `mailbox.html` | 局长信箱：来信须知、受理范围、办理时限 + 来信表单（前端演示） |
| `mailbox-replies.html` | **互动交流**：已答复来信的公开选登（按咨询/建议/投诉筛选、分页、问答卡片）+ 凭受理编号的办理进度查询 |
| `forms.html` | 表格与模板：可打印的三张表（备案登记表 / 从业声明 / 队伍名册） |
| `search.html` | 站内检索：页面内置索引，支持关键词高亮与热门检索 |
| `feed.xml` | 通告公示 RSS（订阅用） |
| `404.html` | 页面不存在（Vercel 会自动使用根目录的 `404.html`） |

## 资源

| 文件 | 用途 |
| --- | --- |
| `logo.jpg` | 原始徽章（1024×1024），保留用于印刷或再生成其它尺寸 |
| `logo-512.jpg` | 页面头部实际加载的徽章（512×512，约 39 KB，比原图小 78%） |
| `favicon-32.png` / `favicon-16.png` | 浏览器标签图标 |
| `apple-touch-icon.png` | iOS 添加到主屏幕时的图标（180×180） |
| `og-image.png` | 分享卡片图（1200×630），供 `og:image` / `twitter:image` 使用 |
| `styles.css` | 全部样式（设计基底、头部、导航、列表页、文章页、页脚印章；含 900px 断点） |
| `sitemap.xml` / `robots.txt` | 站点地图与爬虫规则 |

## 本地预览

直接双击 `index.html` 即可（站点没有用到 fetch 之类的跨域请求）。想更接近线上行为：

```powershell
cd F:\My-Project\代码区\hla-website
python -m http.server 8080
# 浏览器打开 http://localhost:8080/
```

## 部署

仓库连的是 Vercel，推送到 `main` 即自动发布；`404.html` 会被当作自定义 404 页面。
没有构建步骤，仓库根目录就是发布目录。

## 新增一篇通告的步骤

**文号规则**：`No.2026-00X` 用于通告、调查与专项（001 新媒体账号、002 一咖舍调查、003 泊暮区集中办理）；
`劳社字〔2026〕XX号` 用于常规文号（现有 06–18 号：假期安排、夜间地下作业、季度总结、权益保障卡、
联合协议公示、灵活用工、异质猎人摸底、最低报酬指导价、从业声明系统、游乐园片区、夏季高温、
九百九十九夜工时提示、来历不明委托风险提示）。文件名统一 `notice-2026-0XX.html`，与文号数字一致。

1. 复制最新一篇通告（如 `notice-2026-003.html`）另存为 `notice-2026-0XX.html`；
2. 改这几处：`<title>`、`<meta name="description">`、`<link rel="canonical">`、`og:*`/`twitter:*`、
   面包屑里的文号、`notice-id`、`<h1>`、`article-meta` 四行（发布部门 / 发布日期 / 公告类型 / 适用对象）、
   正文、落款，以及页脚印章里的 `No. 2026-0XX` 和归档号；
3. 同步更新两处列表：`announcements.html` 顶部插入一条 `No.2026-0XX`，`index.html` 的
   「通告公示」侧栏插入同一条；必要时改滚动条里的「紧急公告」文案；
4. 内容尽量落在劳动管理局的管辖范围内（就业促进、用工登记与合同备案、劳动纠纷与工伤、最低报酬保障、
   灵活用工规范、异质接触岗位与维特海默值检测等），保持公文语气：先「事由」「依据」，再「现告知如下」分条。

## 维护备忘

- 页面头部超链接目前是相对路径（`styles.css`、`logo-512.jpg` 等），所以**不能**把这些资源挪进子目录而不改 HTML。
- 语言：站点为简体中文（`lang="zh-CN"`），顶部"繁體 / English / 无障碍"三个入口目前是占位链接（`#`）。
- 二创声明在每一页的顶部窄条与页脚都有，新增页面时请一并保留。
- 站内检索的索引写在 `search.html` 底部脚本的 `INDEX` 数组里（`[文件, 标题, 摘要, 关键词]`），**新增页面后要手动补一条**，
  否则搜不到。
- 顶部搜索框在每一页都是同一段 `<form class="search-box" action="search.html">`，改的时候记得全站一起改。

## 在线备案与局长信箱（真的能收到）

这两个表单**不是**演示，是真的会落到本局收件箱：

| 部分 | 文件 | 作用 |
| --- | --- | --- |
| 受理接口 | `functions/api/submit.js` | 接收两类提交（`filing` / `mailbox`），校验、限流、落库、返回受理编号；配了 `NOTIFY_WEBHOOK` 时还会把新件转发到你的群机器人/邮件网关 |
| 进度查询 | `functions/api/status.js` | `GET /api/status?id=HLA-MB-XXXXXX`，只回该编号的状态与答复正文，不回显提交内容 |
| 收件箱 | KV 命名空间绑定 `INBOX` | 每条记录键为 `sub:<受理编号>`，值含提交内容、时间、状态、答复 |
| 答复公示 | `data/replies.json` | 选登的问答（问 + 答 + 日期），页面直接读取；空数组也没问题 |

**已内置的防护**：字段白名单与长度上限、蜜罐字段（机器人填了就假装成功但不落库）、
按来源 IP 限流（10 分钟 6 次）、不存 IP 明文（只存哈希前 6 字节）、KV 不可用时返回 503
并提示改走电话/邮箱，**绝不假装受理成功**。

**2026-09-15 已启用**：KV 命名空间 `HLA_INBOX`（id `b02b1c29431c48d190e0239797111014`）已创建，
并通过仓库里的 `wrangler.jsonc` 绑定为函数环境变量 **`INBOX`**（Git 构建会读这份配置）。
可选还有 `NOTIFY_WEBHOOK`（环境变量），填群机器人地址后新件会即时推送——目前未配置。

绑定之前，接口会返回 503 并提示"受理系统尚未启用，请拨打 12333-HLA 或使用邮箱"——
即玩家不会看到"提交成功"这种假象。

### 我们怎么读件、怎么答复

本机有个小工具（在工作区 `构建区\site_tools\inbox.py`，不在本仓库里）：

```powershell
& 'F:\My-Project\ai-webui\.venv\Scripts\python.exe' F:\My-Project\构建区\site_tools\inbox.py list
& ... inbox.py show HLA-MB-XXXXXX
& ... inbox.py reply HLA-MB-XXXXXX --text "答复正文" [--public]
& ... inbox.py status HLA-MB-XXXXXX processing
& ... inbox.py publish        # 把 --public 的答复汇总进 data/replies.json
& ... inbox.py delete HLA-MB-XXXXXX
```

不带工具也行：Cloudflare 控制台 → Storage & Databases → KV → `HLA_INBOX`，
键名以 `sub:` 开头的就是提交记录，直接编辑其中的 `status` / `reply` / `replied_at` 即可。
改完后，玩家用受理编号在"办理进度查询"页就能看到答复。

### 互动交流栏目（公开问答）

`mailbox-replies.html` 同时也是对外公开的问答栏目：它读 `/api/replies`，只展示
**已答复 + 已标记公示**的来信（问与答），并自动剔除联系方式等个人信息；页面顶部有
已答复/咨询/建议/投诉的计数，可按类型筛选、分页（每页 5 条）。

要把某条来信选登上去：在收件箱里点「标记为可公示」，或用命令行
`inbox.py reply <受理编号> --text "答复正文" --public`；玩家看到的公示区会立即更新。
样板数据可以用工作区的 `seed_qa.py` 写入或清除：

```powershell
& 'F:\My-Project\ai-webui\.venv\Scripts\python.exe' F:\My-Project\构建区\site_tools\seed_qa.py          # 写入三条样板
& 'F:\My-Project\ai-webui\.venv\Scripts\python.exe' F:\My-Project\构建区\site_tools\seed_qa.py --clear  # 删除它们
```
