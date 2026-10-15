/**
 * Bifrost 汉化脚本回归测试（零依赖，Node 内置模块）
 *
 * 做法：用一个最小 DOM 桩把 bifrost-zh.user.js 跑起来，取出暴露的
 * translate()，对「词典命中 / 动态模式 / 幂等 / 不误伤」四类断言。
 *
 * 另含两类**结构断言**（对 src/dict.json 全量校验，能挡住同类新增，而非只锁一个字符串）：
 *   1) 零容忍清单：已逐条统一过的写法，出现即回归；
 *   2) 允许清单（tests/allowlist.json）：中文里本就自然的写法，逐条列出允许出现的**键**，
 *      双向校验——既挡住未授权新增，也挡住「条目已失效但清单没清」的腐烂。
 *
 * 运行：
 *   node tests/test_translate.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "bifrost-zh.user.js");
const DICT = join(HERE, "..", "src", "dict.json");
const ALLOWLIST = join(HERE, "allowlist.json");
const ROUTES = join(HERE, "routes.json");

// ---- 最小 DOM 桩 -------------------------------------------------------
function makeStub() {
	const noop = () => {};
	const fakeWalker = { nextNode: () => null };
	const attrs = {};
	const styleProps = {};
	const documentElement = {
		nodeType: 1, nodeName: "HTML", childNodes: [], parentNode: null,
		getAttribute: (k) => (k in attrs ? attrs[k] : null),
		setAttribute: (k, v) => { attrs[k] = v; },
		hasAttribute: (k) => k in attrs,
		contains: () => false,
		style: {
			getPropertyValue: (k) => styleProps[k] || "",
			setProperty: (k, v) => { styleProps[k] = v; },
		},
	};
	const doc = {
		readyState: "complete",
		title: "Bifrost", // 站点指纹判据之一，具体用例可覆盖
		body: {
			nodeType: 1, nodeName: "BODY", childNodes: [], parentNode: null,
			contains: () => false, getAttribute: () => null, hasAttribute: () => false,
		},
		documentElement,
		head: { appendChild: noop },
		createElement: () => ({ id: "", textContent: "", setAttribute: noop }),
		getElementById: () => null,
		createTreeWalker: () => fakeWalker,
		addEventListener: noop,
	};
	const win = { requestIdleCallback: (cb) => setTimeout(cb, 0) };
	class MutationObserverStub { observe() {} disconnect() {} }
	const NodeFilterStub = { SHOW_TEXT: 4, SHOW_ELEMENT: 1 };
	return { doc, win, MutationObserverStub, NodeFilterStub, attrs, styleProps };
}

function loadApi(title = "Bifrost", globals = {}) {
	const src = readFileSync(SCRIPT, "utf8");
	const { doc, win, MutationObserverStub, NodeFilterStub, attrs, styleProps } = makeStub();
	doc.title = title; // 站点指纹门禁：判为 Bifrost 页面才会注入
	// 用 Function 构造器把脚本跑在受控作用域里，注入桩对象
	const run = new Function("window", "document", "MutationObserver", "NodeFilter", "setTimeout",
		"localStorage", "location", src);
	run(win, doc, MutationObserverStub, NodeFilterStub, setTimeout,
		globals.localStorage, globals.location);
	return { api: win.__BIFROST_ZH__, attrs, styleProps, src };
}

// ---- 迷你 DOM（只为验证「组合文本」这条路径）---------------------------
// 支持元素/文本节点、属性、textContent，以及引擎用到的 TreeWalker。
function makeDom() {
	let idSeq = 0;
	function el(name, attrs, children) {
		const node = {
			nodeType: 1,
			nodeName: name.toUpperCase(),
			childNodes: [],
			parentNode: null,
			isContentEditable: false,
			_attrs: Object.assign({}, attrs || {}),
			style: { getPropertyValue: () => "", setProperty: () => {} },
		};
		node.getAttribute = (k) => (k in node._attrs ? node._attrs[k] : null);
		node.setAttribute = (k, v) => { node._attrs[k] = v; };
		node.hasAttribute = (k) => k in node._attrs;
		Object.defineProperty(node, "attributes", {
			get: () => Object.keys(node._attrs).map((k) => ({ name: k, value: node._attrs[k] })),
		});
		Object.defineProperty(node, "textContent", {
			get: () => node.childNodes.map((c) => (c.nodeType === 3 ? c.nodeValue : c.textContent)).join(""),
		});
		node.appendChild = (c) => { c.parentNode = node; node.childNodes.push(c); return c; };
		node.contains = (o) => { let n = o; while (n) { if (n === node) return true; n = n.parentNode; } return false; };
		for (const c of children || []) node.appendChild(c);
		return node;
	}
	function text(v) { return { nodeType: 3, nodeName: "#text", nodeValue: v, parentNode: null, id: ++idSeq }; }

	// 文档序 DFS（元素与文本都返回）
	function walker(root) {
		const out = [];
		(function dfs(n) { out.push(n); if (n.nodeType === 1) n.childNodes.forEach(dfs); })(root);
		let i = 1;
		return { nextNode: () => (i < out.length ? out[i++] : null) };
	}

	const attrs = {}, styleProps = {};
	const documentElement = el("html");
	documentElement.getAttribute = (k) => (k in attrs ? attrs[k] : null);
	documentElement.setAttribute = (k, v) => { attrs[k] = v; };
	documentElement.hasAttribute = (k) => k in attrs;
	documentElement.style = { getPropertyValue: (k) => styleProps[k] || "", setProperty: (k, v) => { styleProps[k] = v; } };
	const body = el("body");
	documentElement.appendChild(body);
	const doc = {
		readyState: "complete",
		body,
		documentElement,
		head: { appendChild: () => {} },
		createElement: () => ({ nodeType: 1, nodeName: "STYLE", id: "", textContent: "", setAttribute: () => {} }),
		getElementById: () => null,
		createTreeWalker: (root) => walker(root),
		addEventListener: () => {},
	};
	const win = { requestIdleCallback: (cb) => setTimeout(cb, 0) };
	class MO { observe() {} disconnect() {} }
	return { doc, win, MO, NF: { SHOW_TEXT: 4, SHOW_ELEMENT: 1 }, el, text, attrs, styleProps, body };
}

// 把一段 DOM 交给引擎跑一遍（等价于页面加载完成后的首扫）
function runOnDom(build) {
	const src = readFileSync(SCRIPT, "utf8");
	const d = makeDom();
	build(d);
	d.doc.title = "Bifrost"; // 通过站点指纹门禁
	const run = new Function("window", "document", "MutationObserver", "NodeFilter", "setTimeout", src);
	run(d.win, d.doc, d.MO, d.NF, setTimeout);
	d.win.__BIFROST_ZH__.retranslate();
	return d;
}

// ---- 断言 --------------------------------------------------------------
const loaded = loadApi();
const api = loaded.api;
assert.ok(api, "脚本未暴露 __BIFROST_ZH__");
const t = api.translate;

let pass = 0, fail = 0;
function check(name, input, expected) {
	const got = t(input);
	if (got === expected) { pass++; }
	else { fail++; console.error(`✗ ${name}\n    输入: ${JSON.stringify(input)}\n    期望: ${JSON.stringify(expected)}\n    实际: ${JSON.stringify(got)}`); }
}
function checkTrue(name, cond, detail) {
	if (cond) { pass++; }
	else { fail++; console.error(`✗ ${name}${detail ? "\n    " + detail : ""}`); }
}

console.log(`词典条目: ${api.dictSize}，模式: ${api.patterns}\n`);

// 0) 离线自足：产物里不得出现任何网络能力
const FORBIDDEN_NET = [
	["fetch(", /\bfetch\s*\(/],
	["XMLHttpRequest", /\bXMLHttpRequest\b/],
	["WebSocket", /\bnew\s+WebSocket\b/],
	["EventSource", /\bEventSource\b/],
	["sendBeacon", /\bsendBeacon\b/],
	["动态 import()", /\bimport\s*\(/],
	["require()", /\brequire\s*\(/],
	["GM_xmlhttpRequest", /GM_xmlhttpRequest/],
	["@connect", /@connect\b/],
	["@require", /@require\b/],
];
for (const [label, re] of FORBIDDEN_NET) {
	checkTrue(`离线自足-无 ${label}`, !re.test(loaded.src), `产物中出现了 ${label}`);
}
// 除 @match / @namespace 元数据外，不应出现可被当作请求目标的绝对 URL。
// 要求 `//` 后紧跟主机名字符（字母/数字/`*`），避免把正文里「http://；」这类
// 中英混排片段当成真 URL。
const bodyUrls = loaded.src
	.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/, "")
	.match(/https?:\/\/[A-Za-z0-9*][^\s"'`)]*/g) || [];
const nonExample = bodyUrls.filter((u) => !/example\.com|example\.org|10\.0\.0\.100|127\.0\.0\.1|localhost|github\.com\/LeoK77S|cognitiveservices\.azure\.com|databricks\.com|vllm-server|pushgateway/.test(u));
checkTrue("离线自足-正文无外部 URL", nonExample.length === 0, `发现: ${nonExample.slice(0, 3).join(", ")}`);

// 0a-2) 元数据可安装性：@match 必须合法，否则 Tampermonkey 直接拒绝安装
// 实测踩过：`@match http://localhost:*/*` 里的端口 `*` 不是合法 match pattern，
// TM 会报 "Bad pattern ... top-level domain with '*'"，整个脚本装不上。
{
	const header = (loaded.src.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/) || [""])[0];
	const matches = [...header.matchAll(/^\/\/\s*@match\s+(\S+)\s*$/gm)].map((m) => m[1]);
	const includes = [...header.matchAll(/^\/\/\s*@include\s+(\S+)\s*$/gm)].map((m) => m[1]);
	checkTrue("元数据-至少一条 @match/@include", matches.length + includes.length > 0,
		`@match ${matches.length} 条 / @include ${includes.length} 条`);
	// 端口位出现 `*` 即非法（TM/Chrome 都不接受）；端口要么省略、要么是数字
	const badPort = matches.filter((p) => /:\*(\/|$)/.test(p));
	checkTrue("元数据-@match 端口不得用 *", badPort.length === 0,
		`非法: ${badPort.join(" / ")}`);
	const badShape = matches.filter((p) => !/^(https?|file|ftp|\*):\/\/[^/]+\/.*$/.test(p));
	checkTrue("元数据-@match 形状合法", badShape.length === 0, `可疑: ${badShape.join(" / ")}`);
	// 端口只能出现在 @include 的正则里，且必须是 (:\d+)? 这种数字形式
	const badInclude = includes.filter((p) => /\(\s*:\\?\*/.test(p) || /:\*/.test(p));
	checkTrue("元数据-@include 不用端口通配", badInclude.length === 0, `可疑: ${badInclude.join(" / ")}`);

	// @include 正则必须真的能匹配本机地址，且**不能**误匹配外部域名
	// （写成 /localhost/ 这类松正则会顺带命中 evil-localhost.com）
	const includeRes = includes.filter((p) => /^\/.*\/$/.test(p)).map((p) => new RegExp(p.slice(1, -1)));
	const shouldMatch = [
		"http://localhost:8080/workspace/dashboard",
		"http://localhost/",
		"http://127.0.0.1:8080/",
		"http://127.0.0.1/",
	];
	const shouldNot = [
		"http://evil-localhost.com/",
		"http://127.0.0.1.evil.com/",
		"https://example.com/",
		"http://notlocalhost:8080/",
	];
	const missMatch = shouldMatch.filter((u) => !includeRes.some((re) => re.test(u)));
	const falseMatch = shouldNot.filter((u) => includeRes.some((re) => re.test(u)));
	checkTrue("元数据-@include 命中本机地址", missMatch.length === 0, `未命中: ${missMatch.join(" / ")}`);
	checkTrue("元数据-@include 不误命中外部域名", falseMatch.length === 0, `误命中: ${falseMatch.join(" / ")}`);

	// 头部 @version 与引擎里的 SCRIPT_VERSION 必须一致——否则「页面里跑的是哪一版」
	// 这个判断会自相矛盾（版本标记写进 <html data-bf-zh>，用来排查装的是不是最新版）
	const metaVer = (header.match(/^\/\/\s*@version\s+(\S+)\s*$/m) || [])[1];
	const constVer = (loaded.src.match(/SCRIPT_VERSION\s*=\s*"([^"]+)"/) || [])[1];
	checkTrue("元数据-@version 与 SCRIPT_VERSION 一致",
		!!metaVer && metaVer === constVer, `@version=${metaVer} / SCRIPT_VERSION=${constVer}`);
	checkTrue("元数据-@version 是语义化版本", /^\d+\.\d+\.\d+$/.test(metaVer || ""), `实际: ${metaVer}`);
}

// 0a-3) 站点指纹门禁：@match 是宽匹配（*://*/*），运行时必须再确认「这确实是 Bifrost」。
// 不是就静默退出 —— 不翻译、不挂 __BIFROST_ZH__、不碰 DOM。锁住两条判据与逃生口。
{
	const nonBifrost = loadApi("Some Random Site");
	checkTrue("指纹-非 Bifrost 页面不注入", nonBifrost.api === undefined,
		"不应挂 window.__BIFROST_ZH__");
	const byTitle = loadApi("Bifrost Dashboard");
	checkTrue("指纹-title 含 Bifrost ⇒ 注入", !!(byTitle.api && byTitle.api.version),
		"应挂 __BIFROST_ZH__ 并带 version");
	const forced = loadApi("Some Random Site", {
		localStorage: { getItem: (k) => (k === "bifrost-zh-force" ? "1" : null) },
	});
	checkTrue("指纹-强制开关可越过指纹", !!(forced.api && forced.api.version),
		"localStorage 强制开关应生效");
}

// 0b) 原生中文观感
checkTrue("原生中文-lang", loaded.attrs.lang === "zh-CN", `实际: ${loaded.attrs.lang}`);
checkTrue("原生中文-中文字体链", /PingFang SC/.test(loaded.styleProps["--font-sans"] || "") && /Microsoft YaHei/.test(loaded.styleProps["--font-sans"] || ""), `实际: ${loaded.styleProps["--font-sans"]}`);
// 版本标记：`<html data-bf-zh="1.1.0/5407">`，用于一眼确认页面里跑的是哪一版
checkTrue("版本标记-data-bf-zh 形如 版本/词典条数",
	/^\d+\.\d+\.\d+\/\d+$/.test(loaded.attrs["data-bf-zh"] || ""), `实际: ${loaded.attrs["data-bf-zh"]}`);
checkTrue("版本标记-API 暴露 version",
	loaded.api && typeof loaded.api.version === "string" && loaded.api.version === (loaded.attrs["data-bf-zh"] || "").split("/")[0],
	`API: ${loaded.api && loaded.api.version}`);

// 0c) 中文排版 / 本土化：全量结构断言（对 src/dict.json）
{
	const dict = JSON.parse(readFileSync(DICT, "utf8"));
	const ent = Object.entries(dict).filter(([k, v]) => k !== v);
	const hits = (re) => ent.filter(([k, v]) => re.test(v));
	const brief = (rows, n = 3) => rows.slice(0, n).map(([, v]) => v.slice(0, 34)).join(" / ");

	// --- (A) 零容忍清单：以下写法已逐条统一，新增即回归 ---
	const ZERO = [
		["半角省略号 ...", /\.\.\./],
		["「将被」冗余被动", /将被/],
		["ASCII/弯引号", /["“”]/],
		["破折号非「——」", /(?<!—)—(?!—)|[\u4e00-\u9fff] - | - [\u4e00-\u9fff]| —— |—— | ——/],
		["术语异译「提供方」", /提供方/],
		["术语异译「用户代理」", /用户代理/],
		["identity provider 异译「身份供应商」", /身份供应商/],
		["blocked 异译「已屏蔽/被阻止」", /已屏蔽|被阻止/],
		["disabled 异译「停用」", /停用/],
		["expire 异译「到期」", /到期/],
		["account 异译「账户」", /账户/],
		["chat 异译「聊天」", /聊天/],
		["transcription 异译「转写」", /转写/],
		["issuer 异译「签发方」", /签发方/],
		["secret 异译「机密」", /机密/],
		["request body 异译「请求正文」", /请求正文/],
		["No prompts 异译「没有提示词」", /没有提示词/],
		["Base URL 未译", /Base URL/],
		["「以下对象/以下内容」未统一", /以下对象|以下内容/],
		["Quick Start 异译「快速开始」", /快速开始/],
		["mask 异译「遮盖」", /遮盖/],
		["private network 异译「专用网络」", /专用网络/],
		["认证 token 误作英文 Token", /Token 交换|令牌限制/],
		["Exact 异译「确切回调」", /确切回调/],
		["「可以」未精简为「可」", /可以/],
		["汉字后接半角冒号", /[\u4e00-\u9fff]:/],
		["中文标点前多余空格", /[\u4e00-\u9fff] [「（、。，]|」 [\u4e00-\u9fff]/],
		["数字区间用半角连字符", /\d\s?-\s?\d+\s*(MB|ms|秒|个)/],
	];
	for (const [label, re] of ZERO) {
		const rows = hits(re);
		checkTrue(`排版-无${label}`, rows.length === 0, `仍有 ${rows.length} 条: ${brief(rows)}`);
	}

	// 「进行 + 动词」是典型翻译腔；只有「正在进行」「进行中」是自然用法
	const jinxing = ent.filter(([k, v]) => v.replace(/正在进行|进行中/g, "").includes("进行"));
	checkTrue("语气-无「进行+动词」翻译腔", jinxing.length === 0, `仍有 ${jinxing.length} 条: ${brief(jinxing)}`);

	// --- (B) 允许清单：中文里本就自然、不能一刀切清零的写法 ---
	// 双向校验：①值里出现该模式但键不在清单里 → 未授权新增；②清单里的键已不含该模式 → 清单腐烂
	const allowlist = JSON.parse(readFileSync(ALLOWLIST, "utf8"));
	for (const [pat, keys] of Object.entries(allowlist)) {
		const allowed = new Set(keys);
		const rows = ent.filter(([k, v]) => v.includes(pat));
		const unauthorized = rows.filter(([k]) => !allowed.has(k));
		checkTrue(`允许清单-「${pat}」无未授权新增`, unauthorized.length === 0,
			`新增 ${unauthorized.length} 条: ${unauthorized.slice(0, 2).map(([k]) => k).join(" / ")}`);
		const stale = keys.filter((k) => !(k in dict) || !dict[k].includes(pat));
		checkTrue(`允许清单-「${pat}」无失效条目`, stale.length === 0,
			`失效 ${stale.length} 条: ${stale.slice(0, 2).join(" / ")}`);
	}

	// --- (C) 顶栏标题：由路由 slug 推导出来的标题 ---
	// 上游 ui/components/topbar.utils.ts 的 deriveTitleFromPathname()：优先查
	// routeTitleOverrides，否则把末段 slug 按「连字符分词 + 首字母大写（缩略词表例外）」
	// 拼成标题。这条路径**不经过源码字面量**，静态抽取天然抓不到；而页面在 loading /
	// 空态分支上没有渲染 <PageTitle> 时，顶栏显示的就是它。故按路由表逐个校验。
	const TITLE_ACRONYMS = {
		a2a: "A2A", ai: "AI", api: "API", llm: "LLM", mcp: "MCP",
		oauth: "OAuth", rbac: "RBAC", scim: "SCIM", sdk: "SDK", sso: "SSO",
	};
	const TITLE_OVERRIDES = {
		"/workspace/adaptive-routing/settings": "Adaptive Routing Settings",
		"/workspace/agent-logs": "Agent Logs",
		"/workspace/alerting/channels": "Alert Channels",
		"/workspace/alerting/history": "Alert History",
		"/workspace/alerting/rules": "Alert Rules",
		"/workspace/cluster": "Cluster Config",
		"/workspace/config": "Settings",
		"/workspace/config/license": "License Info",
		"/workspace/edge-control/config": "Edge Settings",
		"/workspace/edge-control/devices": "Edge Devices",
		"/workspace/edge-control/inventory": "Edge Approvals",
		"/workspace/governance/rbac": "Roles & Permissions",
		"/workspace/guardrails/configuration": "Guardrail Rules",
		"/workspace/guardrails/providers": "Guardrail Providers",
		"/workspace/logs": "LLM Logs",
		"/workspace/logs/connectors": "Log Connectors",
		"/workspace/observability": "Observability Connectors",
		"/workspace/prompt-repo": "Prompt Repository",
		"/workspace/providers": "Model Providers",
		"/workspace/routing-rules/tree": "Routing Tree",
		"/workspace/scim": "User Provisioning",
	};
	// 推导出来就该保留英文的（缩写 / 专有工具名），不是漏译
	const KEEP_EN_TITLE = new Set(["RBAC", "Pprof"]);
	const fmtPart = (p) => TITLE_ACRONYMS[p.toLowerCase()] ?? p.charAt(0).toUpperCase() + p.slice(1);
	const deriveTitle = (pathname) => {
		const segs = pathname.split("?")[0].split("/").filter(Boolean);
		const override = TITLE_OVERRIDES[`/${segs.join("/")}`];
		if (override) return override;
		return (segs.at(-1) ?? "Dashboard").split("-").map(fmtPart).join(" ");
	};
	const routes = JSON.parse(readFileSync(ROUTES, "utf8"));
	const uncovered = routes
		.map((r) => [r, deriveTitle(r)])
		.filter(([, title]) => !(title in dict) && !KEEP_EN_TITLE.has(title));
	checkTrue("顶栏标题-slug 推导标题全部可译", uncovered.length === 0,
		`未覆盖 ${uncovered.length} 条: ${uncovered.slice(0, 3).map(([r, s]) => r + "→" + s).join(" / ")}`);
}

// 1) 词典精确命中
check("导航", "Dashboard", "仪表盘");
check("按钮", "Save Changes", "保存更改");
check("术语", "Virtual Key", "虚拟密钥");
check("术语", "Provider", "供应商");
check("空态", "No data available", "暂无数据");
check("长句", "You don't have permission to perform this action", "你没有执行此操作的权限");
check("带引号片段", 'Are you sure you want to delete "', "确定要删除「");

// 1b) 本土化改写（口语自然、去掉机翻腔）
check("登录页", "Sign in to your account to continue", "登录以继续");
check("登录页占位", "Enter your username", "请输入用户名");
check("营销文案", "This feature is a part of the Bifrost enterprise license. We would love to know more about your use case and how we can help you.",
	"此功能需要 Bifrost 企业版授权。如需了解，欢迎联系我们。");
check("营销文案前缀", "This feature is a part of the Bifrost enterprise license. Create access profiles to control access to your resources.",
	"此功能需要 Bifrost 企业版授权。创建访问配置文件以控制对资源的访问。");
check("被动改主动", "Headers in the denylist are always blocked from forwarding", "拒绝列表中的请求头一律阻止转发");

// 1c) 中文排版：省略号用 …（R1 加固轮）
check("省略号-等待中", "Waiting for new logs...", "正在等待新的日志…");
check("省略号-搜索", "Search for a model...", "搜索模型…");
check("省略号-加载中", "Loading keys...", "正在加载密钥…");

// 1d) 去「进行+动词」翻译腔（R2 加固轮）
check("进行-认证", "OAuth setup verified successfully. Each user will authenticate individually.",
	"OAuth 设置验证成功。每个用户将单独认证。");
check("进行-路由", "Route through Replicate's deployments endpoint instead of the models endpoint.",
	"通过 Replicate 的部署端点而非模型端点路由。");
check("进行-脱敏", "Redact thinking blocks in responses", "对响应中的思考块脱敏");

// 1e) 去「将被」冗余被动（R3 加固轮）
check("将被-禁用", "OAuth discovery will be disabled", "OAuth 发现将禁用");
check("将被-删除", "Number of days to retain logs in the database. Minimum is 1 day. Older logs will be automatically deleted.",
	"日志在数据库中的保留天数。最小值为 1 天。更早的日志会自动删除。");
check("将被-重定向", "You'll be redirected to the provider to sign in and grant access. Bifrost stores the resulting credential against the binding below so this request and future ones can proceed automatically.",
	"你将跳转到该供应商登录并授予访问权限。Bifrost 会把生成的凭据保存到下方绑定，以便本次及后续请求自动完成。");

// 1l) 「可以」精简为「可」（R10 加固轮）
check("可以-关闭", "You can close this dialog.", "可关闭此对话框。");
check("可以-访问", "No virtual keys have access to this MCP server", "没有虚拟密钥可访问此 MCP 服务器");

// 1k) 破折号统一（R9 加固轮）
check("破折号", "This is a keyless provider - no API keys are required.", "这是无密钥供应商——无需 API 密钥。");

// 1j) 去冗余「一个」（R8 加固轮）
check("一个-共享连接", "Enable to keep one shared connection open and reused across every caller. Disable to connect fresh on every call instead, same as per-user auth types. Only applies to HTTP connections; SSE and STDIO always keep a persistent connection.",
	"启用则保持共享连接打开，在所有调用方之间复用。禁用则每次调用都重新建立连接，与按用户区分的认证类型相同。仅适用于 HTTP 连接；SSE 和 STDIO 始终保持持久连接。");

// 1i) 术语一致性（R7 加固轮）
check("术语-供应商", "Served By (fallback)", "服务供应商（回退）");
check("术语-UserAgent", "Add User Agent Mapping", "添加 User-Agent 映射");

// 1h) 去「你的」冗余所有格（R6 加固轮）
check("你的-config", "To enable the UI, please add the database settings to your config.json (see", "要启用 UI，请将数据库设置添加到 config.json（参见");
check("你的-搜索", "No skills match your search", "没有技能符合搜索条件");
check("你的-试用", "Your Bifrost Enterprise Trial has expired.", "Bifrost 企业版试用已过期。");

// 1g) 去「会被」冗余被动（R5 加固轮）
check("会被-转发", "prefixed headers are forwarded (default behavior)", "带前缀的请求头会转发（默认行为）");
check("会被-清理", "Default time-to-live for async job results in seconds. Results are automatically cleaned up after expiry.",
	"异步任务结果的默认生存时间（秒）。过期后结果会自动清理。");

// 1f) 引号统一为「」（R4 加固轮）
check("引号-对话框", 'Are you sure you want to delete "', "确定要删除「");
check("引号-术语", '"Invalid redirect URI"', "「无效的重定向 URI」");

// 1m) 术语一致性补齐（R11 加固轮）
check("术语-身份提供商", "Require identity-provider login", "要求身份提供商登录");
check("术语-令牌交换", "Token Exchange (On-Behalf-Of)", "令牌交换（代表他人）");
check("术语-账号", "Account ID (Required)", "账号 ID（必填）");
check("术语-对话", "Chat history retention (days)", "对话历史保留时长（天）");
check("术语-转录", "Transcription Input", "转录输入");
check("术语-签发者", "Issuer is required for JWT bearer", "JWT bearer 需要提供签发者");
check("术语-请求体", "Copy request body", "复制请求体");
check("术语-基础URL", "Base URL is required", "基础 URL 为必填");
check("术语-阻止", "No models blocked", "未阻止任何模型");
check("术语-私有网络", "Private network", "私有网络");
check("术语-公共", "Public Agent Card fetched", "已获取公共智能体卡片");
check("术语-限制", "Limit created successfully", "限制创建成功");
check("术语-遮蔽", "Stored secrets are masked and cannot be copied; enter it again.", "已存储的密钥会被遮蔽且无法复制；请重新输入。");
check("术语-精确", "Exact callback URIs remote MCP clients may use, e.g.", "远程 MCP 客户端可使用的精确回调 URI，例如");
check("术语-必填请求头", "Required Headers", "必填请求头");
check("校验-为必填", "Proxy URL is required when using HTTP or SOCKS5 proxy", "使用 HTTP 或 SOCKS5 代理时，代理 URL 为必填");
check("LLM-token 保留英文", "Note: Ensure token limits, request limits, and budget are configured in", "注意：请确保 Token 限制、请求限制和预算已配置在");
check("口语-不妨试试", "What to try:", "不妨试试：");
check("数字区间-破折", "How often to push (1-300s)", "推送频率（1–300 秒）");
check("文件行号-全角冒号", "File:Line", "文件：行");

// 1n) 带变量的 UI 标签与漏译页面标题（R12 加固轮）
check("标题-日志连接器", "Log Connectors", "日志连接器");
check("标题-护栏规则", "Guardrail Rules", "护栏规则");
check("标题-告警渠道", "Alert Channels", "告警渠道");
check("标题-边缘审批", "Edge Approvals", "边缘审批");
check("枚举-推理强度", "Minimal", "最低");
check("枚举-无认证", "No auth", "无认证");
check("筛选-按供应商", "Filter by provider", "按供应商筛选");
check("标签-About", "About Provider", "关于供应商");
check("标签-About 复合", "About Chat history retention (days)", "关于对话历史保留时长（天）");
check("标签-安装", "Install Adobe Journey Optimizer", "安装 Adobe Journey Optimizer");
check("标签-从库移除", "Remove Ahrefs from library", "从库中移除 Ahrefs");
check("标签-打开文档", "Open Ahrefs documentation", "打开 Ahrefs 文档");
check("标签-选择虚拟密钥", "Select virtual key local", "选择虚拟密钥 local");
check("标签-禁用虚拟密钥", "Disable virtual key local", "禁用虚拟密钥 local");
check("标签-刷新模型列表", "Refresh model list for OpenAI", "刷新 OpenAI 的模型列表");
check("标签-通知快捷键", "Notifications alt+T", "通知 alt+T");
check("标签-通知未读", "Notifications, 3 unread", "通知，3 条未读");
check("分页-带名词", "0-0 of 0 deliveries", "第 0–0 条，共 0 条");
check("说明-大小上限", "Size budget for each tool payload and converted result. Must be at least 1024.",
	"每个工具负载及转换结果的大小上限。至少为 1024。");
check("说明-嵌套深度", "Nesting depth of values crossing the tool boundary. At most 1000.",
	"跨工具边界的值嵌套深度。最多为 1000。");
check("模板-决策模型供应商", "The OpenAI provider has no enabled key, so decision-model calls will fail.",
	"OpenAI 供应商没有已启用的密钥，因此决策模型调用会失败。");
check("模板-刷新令牌", "The provider rejected the refresh token. Use Reauthorize from the server's actions menu.",
	"供应商拒绝了刷新令牌。请从服务器操作菜单中使用 Reauthorize。");
check("模板-下拉已打开", "Dropdown opened. 12 options available. Use arrow keys to navigate.",
	"下拉菜单已打开，有 12 个可用选项。使用方向键浏览。");
check("模板-轮换成功", "Virtual key rotated successfully. The previous key remains valid until 2026-10-16 12:00.",
	"虚拟密钥轮换成功。旧密钥在 2026-10-16 12:00 之前仍然有效。");
check("模板-连接检查失败", "Bifrost's last connection check failed 3 minutes ago while listing tools. Tool calls are still attempted normally; the next check runs within about 10 seconds.",
	"Bifrost 上次连接检查在 3 分钟前失败，当时正在列出工具。工具调用仍会正常尝试；下一次检查约在 10 秒内运行。");
check("模板-来源无效", 'Invalid origins: ftp://x. Origins must be valid URLs like https://example.com, wildcard patterns like https://*.example.com, or "*" to allow all origins',
	"无效的来源：ftp://x。来源必须是有效的 URL（例如 https://example.com）、通配符模式（例如 https://*.example.com），或用「*」允许所有来源");

// 2) 动态模式
check("onboarding", "3 of 4 steps complete", "已完成 3 / 4 步");
check("分页 entries", "1-9 of 9 entries", "第 1–9 条，共 9 条");
check("更多标签页", "Show 8 more tabs", "再显示 8 个标签页");
check("相对时间-分钟", "27 minutes ago", "27 分钟前");
check("相对时间-小时", "2 hours ago", "2 小时前");
check("相对时间-天", "3 days ago", "3 天前");
check("相对时间-刚刚", "just now", "刚刚");
check("相对时间-约", "about 2 hours ago", "约 2 小时前");
check("简写分钟", "5 min ago", "5 分钟前");
check("简写小时", "3h ago", "3 小时前");
check("日期", "Oct 14 23:36:22", "10月14日 23:36:22");
check("日期-双空格", "Oct 14  23:36:22", "10月14日 23:36:22");
check("日期-短", "Oct 14", "10月14日");
check("日期+相对时间", "Oct 14 23:36:22 33 minutes ago", "10月14日 23:36:22 33 分钟前");
check("日志详情 aria", "Oct 14 23:36:22 33 minutes ago, open log details", "10月14日 23:36:22 33 分钟前，打开日志详情");
check("涨跌", "↗ rising", "↗ 上升");
check("涨跌", "↘ falling", "↘ 下降");
check("多选公告", "Multi-select: 0 of 65 options selected. All request types are visible",
	"多选：已选择 0 / 65 项。所有请求类型均可见");

// 3) 幂等：中文输入不再变化
check("幂等-中文", "仪表盘", null);
check("幂等-空", "", null);
check("幂等-纯数字", "12345", null);

// 4) 不误伤：保留英文标识符 / 代码 / 专有名词
check("保留-模型名", "openai/gpt-4o", null);
check("保留-单位", "15.1 tok/s", null);
check("保留-环境变量", "env.BEDROCK_PROJECT_ID", null);
check("保留-代码", "import openai", null);
check("保留-UA", "curl/8.5.0", null);
check("保留-未知英文", "some totally unknown sentence", null);

// 5) 组合文本：React 把一句插值拆成多个节点（R12 加固轮）
{
	// 5a) 分页条：`<span>Page</span><span>0</span><span>of 0</span>`，
	//     三个 span 在 DOM 里没有空格（间距靠 flex gap），拼接时需补虚拟空格
	{
		const d = runOnDom(({ el, text, body }) => {
			const box = el("div", { class: "flex items-center gap-1" }, [
				el("span", null, [text("Page")]),
				el("span", null, [text("0")]),
				el("span", null, [text("of 0")]),
			]);
			body.appendChild(box);
		});
		checkTrue("组合-分页条（裸 span）", d.body.textContent === "第 0 页，共 0 页", `实际: ${JSON.stringify(d.body.textContent)}`);
	}

	// 5b) 同一父元素下直接相邻的文本节点
	{
		const d = runOnDom(({ el, text, body }) => {
			body.appendChild(el("div", null, [text("3"), text(" of "), text("4"), text(" steps complete")]));
		});
		checkTrue("组合-直接相邻文本", d.body.textContent === "已完成 3 / 4 步", `实际: ${JSON.stringify(d.body.textContent)}`);
	}

	// 5c) 子树里带属性的元素 → 放弃（避免把带样式的富文本压成一句、丢格式）
	//     这里只锁定「没有压平」这一行为：两个 span 各自仍持有自己的文本
	{
		const d = runOnDom(({ el, text, body }) => {
			body.appendChild(el("div", null, [
				el("span", { class: "font-bold" }, [text("Save")]),
				text(" "),
				el("span", { class: "text-muted" }, [text("Changes")]),
			]));
		});
		const box = d.body.childNodes[0];
		checkTrue("组合-带属性元素不压平（结构保留）",
			box.childNodes.length === 3 && box.childNodes[2].textContent === "Changes",
			`实际: ${JSON.stringify(box.textContent)} / 子节点数 ${box.childNodes.length}`);
	}

	// 5d) 跳过区（<code>）内不翻译
	{
		const d = runOnDom(({ el, text, body }) => {
			body.appendChild(el("div", null, [el("code", null, [text("import openai")])]));
		});
		checkTrue("组合-code 内不动", d.body.textContent === "import openai", `实际: ${JSON.stringify(d.body.textContent)}`);
	}

	// 5e) textarea 的文本内容要跳过，但 placeholder 属 UI 文案，必须翻译
	{
		const d = runOnDom(({ el, text, body }) => {
			body.appendChild(el("textarea", { placeholder: "Costs are in USD. Team IDs map to squads in Notion." }, [text("draft text")]));
		});
		const ta = d.body.childNodes[0];
		checkTrue("组合-textarea placeholder 译",
			ta.getAttribute("placeholder") === "成本以美元计。团队 ID 对应 Notion 中的小组。",
			`实际: ${JSON.stringify(ta.getAttribute("placeholder"))}`);
		checkTrue("组合-textarea 正文不译", ta.textContent === "draft text", `实际: ${JSON.stringify(ta.textContent)}`);
	}

	// 5f) contentEditable 编辑器：内容跳过，但 aria-label 要译
	{
		const d = runOnDom(({ el, text, body }) => {
			const ed = el("div", { "aria-label": "Editor content", contenteditable: "true" }, [text("const a = 1;")]);
			ed.isContentEditable = true;
			body.appendChild(ed);
		});
		const ed = d.body.childNodes[0];
		checkTrue("组合-contentEditable aria-label 译",
			ed.getAttribute("aria-label") === "编辑器内容", `实际: ${JSON.stringify(ed.getAttribute("aria-label"))}`);
		checkTrue("组合-contentEditable 内容不译", ed.textContent === "const a = 1;", `实际: ${JSON.stringify(ed.textContent)}`);
	}

	// 5g) 幂等：跑两遍结果不变
	{
		const d = runOnDom(({ el, text, body }) => {
			body.appendChild(el("div", { class: "flex gap-1" }, [
				el("span", null, [text("Page")]),
				el("span", null, [text("1")]),
				el("span", null, [text("of 3")]),
			]));
		});
		const first = d.body.textContent;
		d.win.__BIFROST_ZH__.retranslate();
		checkTrue("组合-幂等", d.body.textContent === first, `两次结果不同: ${JSON.stringify(first)} vs ${JSON.stringify(d.body.textContent)}`);
	}

	// 5h) 日历星期缩写：只在表头 TH 里译（两个字母太短，别处会误伤正文）
	{
		const d = runOnDom(({ el, text, body }) => {
			body.appendChild(el("table", null, [
				el("tr", { class: "rdp-weekdays" }, [
					el("th", { "aria-label": "Sunday" }, [text("Su")]),
					el("th", { "aria-label": "Monday" }, [text("Mo")]),
				]),
				// 同样两个字母的正文（如句首的 "We"）：父元素不是 TH，必须原样保留
				el("tr", null, [el("td", null, [text("We")])]),
			]));
		});
		const ths = d.body.childNodes[0].childNodes[0].childNodes;
		checkTrue("日历-表头星期缩写译", ths[0].textContent === "日" && ths[1].textContent === "一",
			`实际: ${JSON.stringify(ths[0].textContent)} / ${JSON.stringify(ths[1].textContent)}`);
		checkTrue("日历-表头星期 aria-label 译", ths[0].getAttribute("aria-label") === "星期日",
			`实际: ${JSON.stringify(ths[0].getAttribute("aria-label"))}`);
		checkTrue("日历-非表头同形词不动", d.body.childNodes[0].childNodes[1].textContent === "We",
			`实际: ${JSON.stringify(d.body.childNodes[0].childNodes[1].textContent)}`);
	}

	// 5i) Monaco 在 <body> 上加的工具类不得让整页文本被判成「代码」
	//     实测根因：Bifrost 的 <body class="font-sans antialiased monaco-enable-motion ...">。
	//     shouldSkip 会一路向上走到 body，宽泛的 /monaco/ 一命中就把整页（含侧边栏）
	//     文本全部跳过；而且这个类只在 Monaco 初始化之后才出现，所以表现为
	//     「页面刚打开是中文、一交互（打开编辑器）就成片退回英文」。
	{
		const d = runOnDom(({ el, text, body }) => {
			body._attrs.class = "font-sans antialiased monaco-enable-motion underline-links";
			body.appendChild(el("span", null, [text("Observability")]));
		});
		checkTrue("跳过判据-body 工具类不封杀整页", d.body.textContent === "可观测性",
			`实际: ${JSON.stringify(d.body.textContent)}`);
	}

	// 5j) 真正的编辑器容器仍要跳过（收紧正则后不能把该能力一起弄丢）
	{
		const d = runOnDom(({ el, text, body }) => {
			body.appendChild(el("div", { class: "monaco-editor" }, [text("Save")]));
		});
		checkTrue("跳过判据-编辑器容器内不动", d.body.textContent === "Save",
			`实际: ${JSON.stringify(d.body.textContent)}`);
	}

	// 5k) body/html 上即使挂了编辑器类名，也不得封杀整页
	//     （编辑器永远不可能包住整个应用外壳；把 body/html 纳入类名判定只会误伤）
	{
		const d = runOnDom(({ el, text, body }) => {
			body._attrs.class = "monaco-editor";
			body.appendChild(el("span", null, [text("Observability")]));
		});
		checkTrue("跳过判据-body/html 不参与类名判定", d.body.textContent === "可观测性",
			`实际: ${JSON.stringify(d.body.textContent)}`);
	}

	// 5l) 只有真正的编辑器根（monaco-editor / cm-editor / …）才封杀子树；
	//     Monaco 那串 `monaco-*` 工具类（如 monaco-enable-motion）落在普通容器上时不能误伤
	{
		const d = runOnDom(({ el, text, body }) => {
			body.appendChild(el("div", { class: "monaco-enable-motion" }, [text("Observability")]));
		});
		checkTrue("跳过判据-非编辑器根的 monaco-* 工具类不封杀", d.body.textContent === "可观测性",
			`实际: ${JSON.stringify(d.body.textContent)}`);
	}
}

// 6) 日历与多选：运行时拼出来的串（源码里没有固定字面量）
check("日历-月份标题", "October 2026", "2026年10月");
check("日历-月份标题", "March 2027", "2027年3月");
check("日历-时间制式", "PM", "下午");
check("日历-星期全称", "Sunday", "星期日");
check("多选-选项数后缀", "- 65 options", "共 65 项");
check("多选-全选", "Select all 65 options", "全选 65 项");
check("多选-更多", "+ 3 more", "+ 还有 3 项");
check("多选-清除已选", "Clear all 3 selected options", "清空已选的 3 项");
check("多选-选项 aria 已选", "OpenAI, selected", "OpenAI（已选中）");
check("多选-选项 aria 未选禁用", "OpenAI, not selected, disabled", "OpenAI（未选中，已禁用）");
check("多选-从选择中移除", "Remove OpenAI from selection", "从选择中移除 OpenAI");

// 7) 只在数据加载后才渲染的串（固定等待的页面级扫描会漏；靠「等文本节点数稳定」才捞到）
check("功能开关-Warp 说明",
	"Warp, the in-dashboard agent that answers questions about this deployment's logs, spend and configuration. While off, the Warp API and UI are hidden and new logs are not indexed for Warp's semantic search.",
	"Warp 是仪表盘内的智能体，可就本部署的日志、支出与配置回答问题。关闭后，Warp 的 API 与界面一并隐藏，新日志也不再进入索引供 Warp 做语义搜索。");
// 部署构建独有（上游克隆里搜不到）：仪表盘「团队排行」页的排行卡标题
check("仪表盘-排行卡标题", "Top Teams", "热门团队");

// 8) 供应商密钥面板（Sheet）+ 时长提示 + 刷新模型列表 toast
//    面板标题在 DOM 里是 `{供应商} : {标题}` 三个独立文本节点，故按片段建键
check("密钥面板-新建标题", "Add new key", "添加新密钥");
check("密钥面板-编辑标题", "Edit key", "编辑密钥");
check("时长-秒", "0 seconds", "0 秒");
check("时长-分钟", "2 minutes", "2 分钟");
check("时长-毫秒", "1500 milliseconds", "1500 毫秒");
check("toast-刷新模型列表", "Re-checked every enabled key for openai.", "已重新检查 openai 的所有启用密钥。");

console.log(`\n通过 ${pass} 项，失败 ${fail} 项`);
process.exit(fail === 0 ? 0 : 1);
