// ==UserScript==
// @name         Bifrost 仪表盘汉化
// @namespace    https://github.com/LeoK77S/bifrost-zh
// @version      1.2.0
// @description  将 Bifrost（LLM 网关）仪表盘界面汉化为简体中文：导航、按钮、表格、表单、提示与告警。纯前端 DOM 翻译，只读、不改动 Bifrost 本体与后端数据。
// @author       LeoK77S
// @homepageURL  https://github.com/LeoK77S/bifrost-zh
// @supportURL   https://github.com/LeoK77S/bifrost-zh/issues
// @match        *://*/*
// 说明：Bifrost 仪表盘在根路径、端口任意，没有可用的窄匹配（`@match` 的端口也不能写
// `*`，Chrome match pattern 不允许，Tampermonkey 会直接判为 "Bad pattern" 拒绝安装）。
// 因此用 `*://*/*` 覆盖任意主机，再由运行时的站点指纹门禁确认「这确实是 Bifrost」，
// 不是就立即静默退出、不碰页面。要收窄到自己的部署，把这行 `@match` 换成你的地址即可。
// @include      /^http:\/\/localhost(:\d+)?\//
// @include      /^http:\/\/127\.0\.0\.1(:\d+)?\//
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==
// ↑ 改 @version 时同步改下面的 SCRIPT_VERSION（回归测试会校验两者一致）

/*
 * Bifrost 汉化引擎
 * ------------------------------------------------------------------
 * 原理：Bifrost 仪表盘是 React SPA，UI 文案硬编码为英文。本脚本用
 * 「精确词典 + 少量正则模式」把 DOM 中的文本节点与常见属性
 * （placeholder / title / aria-label / alt）替换为中文，并用
 * MutationObserver 跟踪 React 的重新渲染，保证动态内容也被翻译。
 *
 * 只读：不改动页面逻辑、不发网络请求、不碰后端数据。
 * 幂等：译文不含英文键，重复运行不会二次替换。
 */

(function () {
	"use strict";

	// 与头部 @version 一致；同时写进 <html data-bf-zh>，便于一眼确认「页面里跑的是哪一版」
	const SCRIPT_VERSION = "1.2.0";

	// ==== 词典（英文 → 中文） ==========================================
	const DICT = /*__DICT__*/ {};

	// ==== 月份缩写（供日期模式使用） ====================================
	const MONTHS = {
		Jan: "1", Feb: "2", Mar: "3", Apr: "4", May: "5", Jun: "6",
		Jul: "7", Aug: "8", Sep: "9", Oct: "10", Nov: "11", Dec: "12",
	};

	// ==== 时间单位（供相对时间模式使用） ================================
	const UNIT = {
		millisecond: "毫秒", milliseconds: "毫秒", ms: "毫秒",
		second: "秒", seconds: "秒", sec: "秒",
		minute: "分钟", minutes: "分钟", min: "分钟",
		hour: "小时", hours: "小时",
		day: "天", days: "天",
		week: "周", weeks: "周",
		month: "个月", months: "个月",
		year: "年", years: "年",
	};

	// ==== 动态字符串模式（顺序敏感，长/具体优先） =======================
	const PATTERNS = /*__PATTERNS__*/ [];

	// ==== 不翻译的区域 ================================================
	const SKIP_TAGS = new Set([
		"SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "KBD", "SAMP",
		"TEXTAREA", "SVG", "PATH", "CANVAS", "IFRAME",
	]);
	// 编辑器容器类名：只认真正的编辑器根节点。
	// 注意**不能用宽泛的 /monaco/**——Monaco 会在 <body> 上加工具类
	// `monaco-enable-motion`，而 shouldSkip 会一路向上走到 body，
	// 结果整页文本都被当成代码跳过：任何初始化过 Monaco 的页面
	// （mcp-logs / agent-logs 等），交互后新增或重渲染的文案全部保持英文。
	const EDITOR_CLASS = /monaco-editor|cm-editor|code-?editor|CodeMirror|ace_editor/;

	// 属性白名单
	const ATTRS = ["placeholder", "title", "aria-label", "alt", "data-placeholder", "label"];

	// ==== 日历词汇 ====================================================
	// 日期选择器（react-day-picker + date-fns）的文案是**运行时拼出来的**，
	// 既不在 Bifrost 源码里、也不是固定串，静态抽取与词典都覆盖不到。
	// 月份标题形如 "October 2026" → 走 PATTERNS；星期缩写只有两个字母，
	// 直接进词典会误伤正文里的同形词（句首的 "We"），故只在父元素是表头
	// TH 时才译——日历的星期行就是 <th class="rdp-weekday">Su</th>。
	const MONTH_CN = {
		January: "1", February: "2", March: "3", April: "4", May: "5", June: "6",
		July: "7", August: "8", September: "9", October: "10", November: "11", December: "12",
	};
	const WEEKDAY_ABBR = { Su: "日", Mo: "一", Tu: "二", We: "三", Th: "四", Fr: "五", Sa: "六" };

	// ==== 原生中文观感 ================================================
	// 1) `lang="zh-CN"`：让浏览器按中文处理字体选择、断行与读屏发音
	// 2) 字体链：Bifrost 主字体 Geist 是纯拉丁字体、没有中文字形，中文原本
	//    只能靠系统兜底（不同机器字形/字重不一致）；补上中文字体回退链，
	//    拉丁字符仍走 Geist，中文走思源/苹方/雅黑，跨机器一致
	// 3) 标题上的负字距是为拉丁文设计的，中文会挤在一起，改回 normal
	const CJK_SANS =
		'"Geist", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", ' +
		'"Hiragino Sans GB", "WenQuanYi Micro Hei", ui-sans-serif, system-ui, -apple-system, ' +
		'"Segoe UI", "Roboto", sans-serif';

	function applyNativeChinese() {
		const html = document.documentElement;
		if (!html) return;
		if (html.getAttribute("lang") !== "zh-CN") html.setAttribute("lang", "zh-CN");
		// 用内联样式写 CSS 变量：优先级高于样式表里的 :root，重渲染也压得住
		const st = html.style;
		if (st.getPropertyValue("--font-sans") !== CJK_SANS) {
			st.setProperty("--font-sans", CJK_SANS);
			st.setProperty("--font-geist-sans", CJK_SANS);
		}
		if (!document.getElementById("bf-zh-native")) {
			const s = document.createElement("style");
			s.id = "bf-zh-native";
			s.textContent = 'html[lang="zh-CN"] :is(h1,h2,h3,h4){letter-spacing:normal}';
			(document.head || html).appendChild(s);
		}
	}

	// ==== 核心：翻译一个字符串 =========================================
	function translate(raw) {
		const key = raw.trim();
		if (!key) return null;
		// 没有英文字母 → 无需翻译（纯数字/符号/中文）
		if (!/[A-Za-z]/.test(key)) return null;
		// 已含中文 → 已翻译过，跳过（幂等）
		if (/[\u4e00-\u9fff]/.test(key)) return null;

		const hit = DICT[key];
		if (hit !== undefined) return hit === key ? null : hit;

		for (let i = 0; i < PATTERNS.length; i++) {
			const p = PATTERNS[i];
			if (p[0].test(key)) return key.replace(p[0], p[1]);
		}
		return null;
	}

	// ==== 文本节点 ====================================================
	function translateTextNode(node) {
		const parent = node.parentNode;
		if (!parent || parent.nodeType !== 1) return;
		if (shouldSkip(parent)) return;
		const cur = node.nodeValue;
		if (!cur || !/[A-Za-z]/.test(cur)) return;
		// 日历星期缩写：只在表头单元格里译（原因见 WEEKDAY_ABBR 处的注释）
		if (parent.nodeName === "TH") {
			const abbr = WEEKDAY_ABBR[cur.trim()];
			if (abbr !== undefined) {
				node.nodeValue = cur.replace(cur.trim(), abbr);
				return;
			}
		}
		// 先尝试把父元素当整句翻译（应对 React 把插值拆成多个文本节点）
		if (translateComposite(parent)) return;
		const out = translate(cur);
		if (out === null) return;
		const lead = cur.match(/^\s*/)[0];
		const trail = cur.match(/\s*$/)[0];
		const next = lead + out + trail;
		if (next !== cur) node.nodeValue = next;
	}

	// ==== 属性 ========================================================
	function translateAttributes(el) {
		if (!el.getAttribute) return;
		for (let i = 0; i < ATTRS.length; i++) {
			const a = ATTRS[i];
			const v = el.getAttribute(a);
			if (!v) continue;
			const out = translate(v);
			if (out !== null && out !== v) el.setAttribute(a, out);
		}
	}

	// ==== 组合文本 ====================================================
	// React 会把 `{n} of {m} steps complete`、`Page {n} of {m}` 之类的插值渲染成
	// 多个相邻文本节点（有时还夹一层无属性的 <span>），单独看每个节点都不成句。
	// 这里把「子树里只有文本节点，外加若干无属性元素」的元素当整句匹配：命中后把
	// 译文写进第一个文本节点、清空其余文本节点。
	// 注意：跨元素边界的相邻文本节点在 DOM 里往往**没有空格**（间距由 flex gap 撑开），
	// 所以拼接时要在边界处补一个虚拟空格，否则 `Page`+`0`+`of 0` 会拼成 `Page0of 0`。
	// 只动 nodeValue，不增删节点，避免破坏 React 的协调（reconcile）；
	// 「元素带属性就放弃」是为了不把带样式/代码块的富文本压成一句（会丢格式）。
	function collectTextNodes(el, out, limit) {
		const kids = el.childNodes;
		for (let i = 0; i < kids.length; i++) {
			const k = kids[i];
			if (k.nodeType === 3) {
				out.push({ node: k, owner: el });
				if (out.length > limit) return false;
			} else if (k.nodeType === 1) {
				if (SKIP_TAGS.has(k.nodeName)) return false;
				if (k.attributes && k.attributes.length) return false;
				if (!collectTextNodes(k, out, limit)) return false;
			} else {
				return false;
			}
		}
		return true;
	}

	function joinTextNodes(texts) {
		let full = texts[0].node.nodeValue;
		for (let i = 1; i < texts.length; i++) {
			const prev = texts[i - 1], cur = texts[i];
			const needSpace = prev.owner !== cur.owner &&
				!/\s$/.test(prev.node.nodeValue) && !/^\s/.test(cur.node.nodeValue);
			full += (needSpace ? " " : "") + cur.node.nodeValue;
		}
		return full;
	}

	function translateComposite(el) {
		const kids = el.childNodes;
		if (!kids || kids.length < 2) return false;
		let direct = true;
		for (let i = 0; i < kids.length; i++) {
			if (kids[i].nodeType !== 3) { direct = false; break; }
		}
		let texts;
		if (direct) {
			texts = [];
			for (let i = 0; i < kids.length; i++) texts.push({ node: kids[i], owner: el });
		} else {
			texts = [];
			if (!collectTextNodes(el, texts, 24)) return false;
		}
		if (texts.length < 2) return false;
		const full = joinTextNodes(texts);
		if (!full || full.length > 220) return false;
		if (!/[A-Za-z]/.test(full)) return false;
		if (/[\u4e00-\u9fff]/.test(full)) return false;
		const out = translate(full);
		if (out === null) return false;
		const lead = full.match(/^\s*/)[0];
		const trail = full.match(/\s*$/)[0];
		texts[0].node.nodeValue = lead + out + trail;
		for (let i = 1; i < texts.length; i++) texts[i].node.nodeValue = "";
		return true;
	}

	// ==== 跳过判定 ====================================================
	// 跳过的是**内容**（代码、用户输入、图标路径），不是标签文案：
	// placeholder / title / aria-label 这类属性无论落在哪个元素上都照译
	// （textarea 的 placeholder、contentEditable 编辑器的 aria-label 都属 UI 文案）。
	function shouldSkip(el) {
		let n = el;
		while (n && n.nodeType === 1) {
			const tag = n.nodeName;
			if (SKIP_TAGS.has(tag)) return true;
			if (n.isContentEditable) return true;
			if (n.getAttribute) {
				if (n.getAttribute("translate") === "no") return true;
				if (n.hasAttribute && n.hasAttribute("data-bf-zh-skip")) return true;
				// body/html 上挂的是页面级工具类，不能据此判定「这块是代码」
				if (n !== document.body && n !== document.documentElement) {
					const cls = n.getAttribute("class");
					if (cls && EDITOR_CLASS.test(cls)) return true;
				}
			}
			n = n.parentNode;
		}
		return false;
	}

	// 显式退出翻译（作者标了 translate="no" / data-bf-zh-skip）：连属性也不动
	function shouldSkipAll(el) {
		let n = el;
		while (n && n.nodeType === 1) {
			if (n.getAttribute) {
				if (n.getAttribute("translate") === "no") return true;
				if (n.hasAttribute && n.hasAttribute("data-bf-zh-skip")) return true;
			}
			n = n.parentNode;
		}
		return false;
	}

	// ==== 遍历一棵子树 =================================================
	function walk(root) {
		if (!root) return;
		if (root.nodeType === 3) {
			translateTextNode(root);
			return;
		}
		if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
		if (root.nodeType === 1) {
			if (!shouldSkipAll(root)) translateAttributes(root);
			if (shouldSkip(root)) return;
			translateComposite(root);
		}
		const walker = document.createTreeWalker(
			root,
			NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
		);
		let n = walker.nextNode();
		while (n) {
			if (n.nodeType === 3) {
				translateTextNode(n);
			} else {
				if (!shouldSkipAll(n)) translateAttributes(n);
				if (shouldSkip(n)) {
					// 跳过整个子树（属性已在上面译过）
					n = skipSubtree(walker, n);
					continue;
				}
				translateComposite(n);
			}
			n = walker.nextNode();
		}
	}

	// 让 walker 跳过以 el 为根的整个子树
	function skipSubtree(walker, el) {
		let n = walker.nextNode();
		while (n && el.contains(n)) n = walker.nextNode();
		return n;
	}

	// ==== MutationObserver ============================================
	let scheduled = false;
	const pending = [];

	function schedule(nodes) {
		for (let i = 0; i < nodes.length; i++) pending.push(nodes[i]);
		if (scheduled) return;
		scheduled = true;
		(window.requestIdleCallback || function (cb) { setTimeout(cb, 16); })(function () {
			scheduled = false;
			const batch = pending.splice(0, pending.length);
			for (let i = 0; i < batch.length; i++) {
				try { walk(batch[i]); } catch (e) { /* 忽略单个节点错误 */ }
			}
		});
	}

	function onMutations(muts) {
		const targets = [];
		for (let i = 0; i < muts.length; i++) {
			const m = muts[i];
			if (m.type === "characterData") {
				targets.push(m.target);
			} else if (m.type === "childList") {
				for (let j = 0; j < m.addedNodes.length; j++) targets.push(m.addedNodes[j]);
			} else if (m.type === "attributes") {
				if (m.attributeName === "lang") applyNativeChinese();
				if (!shouldSkipAll(m.target)) translateAttributes(m.target);
			}
		}
		if (targets.length) schedule(targets);
	}

	// —— 站点指纹门禁 ——
	// @match 用宽匹配（*://*/*）覆盖任意主机/端口的 Bifrost 仪表盘，代价是每个页面
	// 都会被注入一次。这里用页面自身已有的信息确认「这确实是 Bifrost」：不是就立即
	// 静默退出 —— 不翻译、不写版本标记、不挂 MutationObserver、不碰 DOM。
	// 判据只读页面已有信息，不发任何网络请求（保持「运行时零第三方调用」）。
	function isBifrostDashboard() {
		try {
			if (/Bifrost/i.test(document.title || "")) return true;
			// Bifrost 前端启动后会挂上这个全局标记（实测 v2.3.0）
			if (typeof window.__bifrostBooted !== "undefined") return true;
		} catch (e) { /* 忽略 */ }
		return false;
	}
	// 指纹判错时的逃生口（用法见 README「作用域与逃生口」）
	function forceEnabled() {
		try { if (localStorage.getItem("bifrost-zh-force") === "1") return true; } catch (e) { /* 忽略 */ }
		try { if (/[?&]bifrost-zh=force\b/.test(location.search || "")) return true; } catch (e) { /* 忽略 */ }
		return false;
	}

	function start() {
		if (!forceEnabled() && !isBifrostDashboard()) return;
		applyNativeChinese();
		walk(document.body);
		const obs = new MutationObserver(onMutations);
		obs.observe(document.documentElement, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true,
			attributeFilter: ATTRS.concat(["lang"]),
		});
		// 版本标记：控制台里 `document.documentElement.dataset.bfZh` 或
		// `window.__BIFROST_ZH__.version` 就能确认装的是哪一版、词典多大
		try { document.documentElement.setAttribute("data-bf-zh", SCRIPT_VERSION + "/" + Object.keys(DICT).length); } catch (e) { /* 忽略 */ }
		window.__BIFROST_ZH__ = {
			version: SCRIPT_VERSION,
			dictSize: Object.keys(DICT).length,
			patterns: PATTERNS.length,
			translate: translate,
			nativeChinese: applyNativeChinese,
			retranslate: function () { walk(document.body); },
			stats: function () {
				let total = 0, cn = 0, en = 0;
				const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
				let n;
				while ((n = w.nextNode())) {
					const t = n.nodeValue.trim();
					if (!t) continue;
					if (/[\u4e00-\u9fff]/.test(t)) { cn++; total++; }
					else if (/[A-Za-z]{2}/.test(t)) { en++; total++; }
				}
				return { totalTextNodes: total, chinese: cn, englishRemaining: en };
			},
		};
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", start, { once: true });
	} else {
		start();
	}
})();
