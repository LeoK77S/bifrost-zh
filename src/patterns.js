[
	// ---- 带变量的 UI 标签 / 无障碍标签（源码里是模板字面量 `${}` 拼接）----
	// 这些串在渲染前才拼出来，词典里放不下；捕获组内再递归翻译一次。
	[/^Remove (.{1,60}) from library$/, function (m, p1) { return "从库中移除 " + (translate(p1) || p1); }],
	[/^Open (.{1,60}) documentation$/, function (m, p1) { return "打开 " + (translate(p1) || p1) + " 文档"; }],
	[/^Enable key (.{1,60})$/, function (m, p1) { return "启用密钥 " + (translate(p1) || p1); }],
	[/^Select virtual key (.{1,60})$/, function (m, p1) { return "选择虚拟密钥 " + (translate(p1) || p1); }],
	[/^Disable virtual key (.{1,60})$/, function (m, p1) { return "禁用虚拟密钥 " + (translate(p1) || p1); }],
	[/^Install (.{1,60})$/, function (m, p1) { return "安装 " + (translate(p1) || p1); }],
	[/^Open (.{1,60})$/, function (m, p1) { return "打开 " + (translate(p1) || p1); }],
	[/^About (.{1,80})$/, function (m, p1) { const t1 = translate(p1); return t1 ? "关于" + t1 : "关于 " + p1; }],
	[/^Filter by (.{1,40})$/, function (m, p1) { return "按 " + (translate(p1) || p1) + " 筛选"; }],
	[/^Refresh model list for (.{1,60})$/, function (m, p1) { return "刷新 " + (translate(p1) || p1) + " 的模型列表"; }],
	[/^Refresh model list for$/, "刷新模型列表"],
	[/^Copy request ID (.+)$/, function (m, p1) { return "复制请求 ID " + p1; }],
	[/^Copy skill ID (.+)$/, function (m, p1) { return "复制技能 ID " + p1; }],
	[/^Copy (.{1,40}) URL$/, function (m, p1) { return "复制 " + (translate(p1) || p1) + " URL"; }],
	[/^Copy (.{1,40}) ID$/, function (m, p1) { return "复制 " + (translate(p1) || p1) + " ID"; }],
	[/^Copy (.{1,40})$/, function (m, p1) { return "复制 " + (translate(p1) || p1); }],
	[/^Dismiss (.{1,80})$/, function (m, p1) { return "关闭 " + (translate(p1) || p1); }],
	[/^Notifications, (\d+) unread, (\d+) running$/, "通知，$1 条未读，$2 个运行中"],
	[/^Notifications, (\d+) unread$/, "通知，$1 条未读"],
	// 安装/移除 MCP 服务器后的 toast
	[/^(.{1,80}) MCP server installed\.$/, function (m, p1) { return p1 + " MCP 服务器已安装。"; }],
	[/^(.{1,80}) MCP server connected with OAuth\.$/, function (m, p1) { return p1 + " MCP 服务器已通过 OAuth 连接。"; }],
	[/^(.{1,80}) MCP server connected with per-user headers\.$/, function (m, p1) { return p1 + " MCP 服务器已通过按用户区分的请求头连接。"; }],
	[/^"(.{1,80})" removed from the library\.$/, function (m, p1) { return "已从库中移除「" + p1 + "」。"; }],
	// 代码模式限额的两条说明（阈值是常量插值）
	[/^Size budget for each tool payload and converted result\. Must be at least (\d+)\.$/, "每个工具负载及转换结果的大小上限。至少为 $1。"],
	[/^Nesting depth of values crossing the tool boundary\. At most (\d+)\.$/, "跨工具边界的值嵌套深度。最多为 $1。"],
	// 带名词的分页计数（`0-0 of 0 deliveries`）：中文分页惯例不带名词
	[/^([\d,]+)\s*[–-]\s*([\d,]+) of ([\d,]+) .+$/, "第 $1–$2 条，共 $3 条"],

	// ---- 带变量的错误/提示长句（值多为供应商名、计数、常量，不递归翻译）----
	[/^"(.+)" is also in the (.+) list\. Each phrase must belong to exactly one tier\.$/, "「$1」也出现在 $2 列表中。每个短语只能属于一个层级。"],
	[/^Semantic routing has (.+) phrases \(Simple=(.+), Medium=(.+), Complex=(.+)\); the maximum is (.+) across all tiers\.$/, "语义路由共有 $1 个短语（简单=$2，中等=$3，复杂=$4）；所有层级合计上限为 $5。"],
	[/^The decision model runs through the (.+) provider, and it is not set up yet\.$/, "决策模型经由 $1 供应商运行，但该供应商尚未配置完成。"],
	[/^The (.+) provider is failing its checks, so decision-model calls will fail\. Check its key and settings\.$/, "$1 供应商检查失败，因此决策模型调用会失败。请检查其密钥与设置。"],
	[/^The (.+) provider has no enabled key, so decision-model calls will fail\.$/, "$1 供应商没有已启用的密钥，因此决策模型调用会失败。"],
	[/^Invalid origins: (.+)\. Origins must be valid URLs like https:\/\/example\.com, wildcard patterns like https:\/\/\*\.example\.com, or "\*" to allow all origins$/, "无效的来源：$1。来源必须是有效的 URL（例如 https://example.com）、通配符模式（例如 https://*.example.com），或用「*」允许所有来源"],
	[/^(.+) to (.+)\. Lower gives more consistent answers, which suits a tool that reports numbers\.$/, "$1 到 $2。数值越低答案越稳定，适合需要报告数字的工具。"],
	[/^Days after the last message\. 0 uses the default of (.+)\. Separate from log retention\.$/, "最后一条消息之后的天数。0 表示使用默认值 $1。与日志保留无关。"],
	[/^The provider returned an error \(HTTP (.+)\) without a message\.$/, "供应商返回了错误（HTTP $1），但未附消息。"],
	[/^Session of (.+) requests sharing a session_id\. Expand to see the other (.+)\.$/, "共享同一 session_id 的 $1 个请求。展开可查看其余 $2 个。"],
	[/^No admin credential on file, so the tool list is not refreshed automatically\. Use (.+) from the server's actions menu to add one\.$/, "未保存管理员凭据，因此不会自动刷新工具列表。请从服务器操作菜单中使用 $1 添加一个。"],
	[/^The provider rejected the refresh token\. Use (.+) from the actions menu\. User sessions are not affected\.$/, "供应商拒绝了刷新令牌。请从操作菜单中使用 $1。用户会话不受影响。"],
	[/^This provider did not return a refresh token\. Use (.+) once the access token expires\.$/, "此供应商未返回刷新令牌。请在访问令牌过期后使用 $1。"],
	[/^The identity provider rejected the refresh token\. Use (.+) from the actions menu\. Callers' tool calls are not affected\.$/, "身份提供商拒绝了刷新令牌。请从操作菜单中使用 $1。调用方的工具调用不受影响。"],
	[/^The identity provider did not return a refresh token\. Add offline_access to the exchange scopes where it is supported so the credential renews itself, then use (.+)\.$/, "身份提供商未返回刷新令牌。在支持的情况下把 offline_access 加入交换作用域，让凭据自行续期，然后使用 $1。"],
	[/^The shared token every caller of this server uses\. Read-only\. Use (.+) from the server's actions menu to replace it\.$/, "此服务器所有调用方共用的令牌。只读。请从服务器操作菜单中使用 $1 替换。"],
	[/^The provider rejected the refresh token\. Use (.+) from the server's actions menu\.$/, "供应商拒绝了刷新令牌。请从服务器操作菜单中使用 $1。"],
	[/^Bifrost's last connection check failed (.+) ago while (.+)\. Tool calls are still attempted normally; the next check runs within about 10 seconds\.$/, function (m, p1, p2) {
		const dur = translate(p1 + " ago") || (p1 + " ago");
		const st = translate(p2) || p2;
		return "Bifrost 上次连接检查在 " + dur + "失败，当时" + st + "。工具调用仍会正常尝试；下一次检查约在 10 秒内运行。";
	}],
	[/^Header each caller supplies, forwarded as is; its value is the full credential, e\.g\. "(.+)"\. It is added to Required Headers\.$/, "每个调用方提供的请求头，按原样转发；其值为完整凭据，例如「$1」。它会加入必填请求头。"],
	[/^The OAuth credential for (.+) is already stored\. You can close this tab\.$/, "$1 的 OAuth 凭据已保存。你可以关闭此标签页。"],
	[/^(.+) is not configured yet\. Save its configuration before configuring plugin tracing\.$/, "$1 尚未配置。请先保存其配置，再配置插件追踪。"],
	[/^Follows the workspace default \((.+)\), set under Settings → Security\.$/, "跟随工作区默认值（$1），可在「设置 → 安全」中修改。"],
	[/^(.+) (.+) budget has (.+) usage, which meets or exceeds the new (.+) limit\.$/, "$1 $2 预算的用量为 $3，已达到或超过新的 $4 上限。"],
	[/^(.+) quarterly budget has (.+) of usage\. Changing the fiscal quarter moves the reset date and carries that spend into the new quarter\.$/, "$1 季度预算的用量为 $2。更改财季后，重置日期随之移动，该支出会结转到新季度。"],
	[/^(.+) (.+) budget will inherit (.+) from the (.+) budget, which meets or exceeds the new (.+) limit\.$/, "$1 $2 预算将继承 $3 预算的 $4，已达到或超过新的 $5 上限。"],
	[/^Virtual key rotated successfully\. The previous key remains valid until (.+)\.$/, "虚拟密钥轮换成功。旧密钥在 $1 之前仍然有效。"],
	[/^this (.+)'s access profile governs the providers, budgets, rate limits and MCP access of every key it owns\.$/, "此 $1 的访问配置文件管辖其名下每个密钥的供应商、预算、速率限制与 MCP 访问权限。"],
	[/^(.+) long-waiting and (.+) stuck goroutines \(background workers filtered\)$/, "$1 个长时间等待、$2 个卡住的 Goroutine（已过滤后台工作线程）"],
	[/^MultiSelect: Option with value "(.+)" not found in options list$/, "多选：选项列表中找不到值为「$1」的选项"],
	[/^Dropdown opened\. (.+) options available\. Use arrow keys to navigate\.$/, "下拉菜单已打开，有 $1 个可用选项。使用方向键浏览。"],
	[/^"(.+)" and its messages are removed permanently\. This cannot be undone\.$/, "「$1」及其消息将被永久删除。此操作无法撤销。"],
	[/^"(.+)" was converted to the official Cloudflare provider, but a later step failed: (.+)\. Nothing was deleted; finish the setup on the provider page\.$/, "已将「$1」转换为官方 Cloudflare 供应商，但后续步骤失败：$2。没有任何内容被删除；请在供应商页面完成设置。"],
	[/^Migration failed: (.+)\. Nothing was deleted, and "(.+)" still works as a custom provider\.$/, "迁移失败：$1。没有任何内容被删除，「$2」仍可作为自定义供应商使用。"],
	[/^Converted "(.+)" to the official Cloudflare provider\. Its keys, access settings, budgets and limits were kept\.$/, "已将「$1」转换为官方 Cloudflare 供应商。其密钥、访问设置、预算与限制均已保留。"],
	[/^Base URL used http:\/\/; the workspace URL will use https:\/\/ \((.+)\)\.$/, "基础 URL 使用了 http://；工作区 URL 将使用 https://（$1）。"],
	[/^Unrecognized base URL path "(.+)"; inference surface set to auto-detect\.$/, "无法识别的 base URL 路径「$1」；推理界面已设为自动检测。"],
	[/^(.+) is stored as a literal secret and cannot be copied; re-enter it on the Databricks provider after migrating\.$/, "$1 以明文密钥形式存储，无法复制；迁移后请在 Databricks 供应商上重新输入。"],
	[/^A key named "(.+)" already exists on the Databricks provider; the migrated key will be created as "(.+)"\.$/, "Databricks 供应商上已存在名为「$1」的密钥；迁移的密钥将创建为「$2」。"],
	[/^Key "(.+)" could not be restored: its secret is masked\. Re-create it manually\.$/, "无法恢复密钥「$1」：其密钥已被遮蔽。请手动重新创建。"],
	[/^Could not delete custom provider "(.+)": (.+)\. Delete it manually\.$/, "无法删除自定义供应商「$1」：$2。请手动删除。"],
	[/^(.+)\. The Databricks provider was kept; delete "(.+)" manually\.$/, "$1。Databricks 供应商已保留；请手动删除「$2」。"],
	[/^Databricks provider created with (.+) key\(s\), but cleanup did not fully complete\. (.+)$/, "Databricks 供应商已创建（$1 个密钥），但清理未完全完成。$2"],
	[/^Version must be different from (.+)\. Bump at least one of: major \((.+)\.x\.x\), minor \((.+)\.(.+)\.x\), patch \((.+)\.(.+)\.(.+)\), or change the suffix \(e\.g\., -beta\.1\)\.$/, "版本必须与 $1 不同。请至少提升其中一项：主版本（$2.x.x）、次版本（$3.$4.x）、修订版本（$5.$6.$7），或更改后缀（例如 -beta.1）。"],

	// ---- 动态组合串（含数字/变量，按具体到通用排序）----
	[/^(\d+) of (\d+) steps complete$/, "已完成 $1 / $2 步"],
	[/^(\d+) setup steps? left\. (.*)$/, function (m, p1, p2) {
		const tail = translate(p2);
		return "还剩 " + p1 + " 个设置步骤。" + (tail || p2);
	}],
	[/^(\d+) options? selected\. (\d+) of (\d+) total selected\.$/, "已选择 $1 项。共已选 $2 / $3。"],
	[/^Option removed\. (\d+) of (\d+) options selected\.$/, "已移除选项。已选择 $1 / $2 项。"],
	[/^(\d+) of (\d+) options selected\.$/, "已选择 $1 / $2 项。"],
	[/^Multi-select: (\d+) of (\d+) options selected\. (.*)$/, function (m, p1, p2, p3) {
		const tail = translate(p3);
		return "多选：已选择 " + p1 + " / " + p2 + " 项。" + (tail || p3);
	}],
	[/^Show (\d+) more tabs?$/, "再显示 $1 个标签页"],
	[/^Show (\d+) more$/, "再显示 $1 个"],
	[/^and (\d+) more$/, "以及另外 $1 个"],
	[/^(\d+) results?$/, "$1 条结果"],
	[/^([\d,]+)\s*[–-]\s*([\d,]+) of ([\d,]+) entries$/, "第 $1–$2 条，共 $3 条"],
	[/^([\d,]+)\s*[–-]\s*([\d,]+) of ([\d,]+)$/, "第 $1–$2 条，共 $3 条"],
	[/^Showing ([\d,]+)\s*[–-]\s*([\d,]+) of ([\d,]+)$/, "显示第 $1–$2 条，共 $3 条"],
	[/^Page (\d+) of (\d+)$/, "第 $1 页，共 $2 页"],
	[/^(\d+) selected$/, "已选择 $1 项"],
	[/^Select all (\d+)$/, "全选 $1 项"],
	[/^↗ rising$/, "↗ 上升"],
	[/^↘ falling$/, "↘ 下降"],
	[/^→ steady$/, "→ 持平"],
	[/^(\d+) min ago$/, "$1 分钟前"],
	[/^(\d+)m ago$/, "$1 分钟前"],
	[/^(\d+)h ago$/, "$1 小时前"],
	[/^(\d+)d ago$/, "$1 天前"],

	// ---- 相对时间（date-fns 风格，英文输出）----
	[/^just now$/, "刚刚"],
	[/^less than a minute ago$/, "不到 1 分钟前"],
	[/^about a minute ago$/, "约 1 分钟前"],
	[/^about an hour ago$/, "约 1 小时前"],
	[/^about a day ago$/, "约 1 天前"],
	[/^about a month ago$/, "约 1 个月前"],
	[/^about a year ago$/, "约 1 年前"],
	[/^over a year ago$/, "1 年多前"],
	[/^almost (\d+) years? ago$/, "将近 $1 年前"],
	[/^about (\d+) (minutes?|hours?|days?|weeks?|months?|years?) ago$/, function (m, p1, p2) {
		return "约 " + p1 + " " + UNIT[p2] + "前";
	}],
	[/^half a minute ago$/, "半分钟前"],
	[/^(\d+) (minutes?|hours?|days?|weeks?|months?|years?) ago$/, function (m, p1, p2) {
		return p1 + " " + UNIT[p2] + "前";
	}],
	[/^in less than a minute$/, "不到 1 分钟后"],
	[/^in about a minute$/, "约 1 分钟后"],
	[/^in about an hour$/, "约 1 小时后"],
	[/^in about (\d+) (minutes?|hours?|days?|weeks?|months?|years?)$/, function (m, p1, p2) {
		return "约 " + p1 + " " + UNIT[p2] + "后";
	}],
	[/^in (\d+) (minutes?|hours?|days?|weeks?|months?|years?)$/, function (m, p1, p2) {
		return p1 + " " + UNIT[p2] + "后";
	}],
	// 裸时长（供应商配置里把毫秒/秒数换算成人话的提示，如 `0 seconds` / `2 minutes`）
	[/^(\d+(?:\.\d+)?) (milliseconds?|seconds?|minutes?|hours?|days?|weeks?|months?|years?)$/, function (m, p1, p2) {
		return p1 + " " + UNIT[p2];
	}],
	// 「刷新模型列表」后的 toast：`Re-checked every enabled key for openai.`
	[/^Re-checked every enabled key for (.+)\.$/, function (m, p1) {
		return "已重新检查 " + (translate(p1) || p1) + " 的所有启用密钥。";
	}],

	// ---- 日志时间列的 aria-label：`<date> <relative>, open log details` ----
	[/^(.*), open log details$/, function (m, p1) {
		const inner = translate(p1);
		return (inner || p1) + "，打开日志详情";
	}],
	[/^open log details$/, "打开日志详情"],

	// ---- 日期（MMM dd HH:mm:ss / MMM dd, yyyy）----
	// 注意：String.replace(re, fn) 的回调签名为 (match, p1, p2, ...)
	// 「日期 + 相对时间」拼接串（日志时间列的 aria-label 内层）
	[/^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(.+)$/, function (m, p1, p2) {
		const dt = translate(p1);
		const rel = translate(p2);
		return (dt || p1) + " " + (rel || p2);
	}],
	[/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})$/, function (m, p1, p2, p3) {
		return MONTHS[p1] + "月" + Number(p2) + "日 " + p3;
	}],
	[/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s*(\d{4})$/, function (m, p1, p2, p3) {
		return p3 + "年" + MONTHS[p1] + "月" + Number(p2) + "日";
	}],
	[/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/, function (m, p1, p2) {
		return MONTHS[p1] + "月" + Number(p2) + "日";
	}],

	// ---- 日历（react-day-picker）运行时生成的月份标题 ----
	// 全称月份 + 年份，源码里没有这条串（date-fns 生成）
	[/^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})$/, function (m, p1, p2) {
		return p2 + "年" + MONTH_CN[p1] + "月";
	}],

	// ---- 多选组件（multiSelect）运行时拼出来的串 ----
	// 都是模板字面量：静态抽取只拿到骨架、拿不到渲染值
	[/^-\s*(\d+) options$/, "共 $1 项"],
	[/^Select all (\d+) options$/, "全选 $1 项"],
	[/^\+ (\d+) more$/, "+ 还有 $1 项"],
	[/^Remove (.{1,60}) from selection$/, function (m, p1) { return "从选择中移除 " + (translate(p1) || p1); }],
	[/^Clear all (\d+) selected options$/, "清空已选的 $1 项"],
	[/^(\d+) options? found for "(.{1,60})"$/, "找到 $1 个匹配「$2」的选项"],
	[/^(\d+) options? selected: (.{1,120})$/, "已选择 $1 项：$2"],
	[/^(.{1,60}) selected\. (\d+) of (\d+) options selected\.$/, function (m, p1, p2, p3) {
		return (translate(p1) || p1) + " 已选中。已选择 " + p2 + " / " + p3 + " 项。";
	}],
	// 选项的 aria-label：`${label}, selected` / `, not selected` / `, disabled`
	[/^(.{1,60}), (not )?selected, disabled$/, function (m, p1, p2) { return (translate(p1) || p1) + (p2 ? "（未选中，已禁用）" : "（已选中，已禁用）"); }],
	[/^(.{1,60}), (not )?selected$/, function (m, p1, p2) { return (translate(p1) || p1) + (p2 ? "（未选中）" : "（已选中）"); }]
]
