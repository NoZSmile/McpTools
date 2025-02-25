#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performWebSearch = performWebSearch;
exports.fetchHTML = fetchHTML;
exports.extractContent = extractContent;
exports.searchBing = searchBing;
exports.searchGoogle = searchGoogle;
exports.browsePage = browsePage;
exports.searchBaidu = searchBaidu;
exports.search360 = search360;
exports.getNowTime = getNowTime;
exports.runServer = runServer;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const cheerio = __importStar(require("cheerio"));
const proxyGetUrl_1 = require("./proxyGetUrl");
const browser_1 = __importDefault(require("./browser"));
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
function isBraveWebSearchArgs(args) {
    return (typeof args === "object" &&
        args !== null &&
        "query" in args &&
        typeof args.query === "string");
}
// —— 工具定义 ——
const WEB_SEARCH_TOOL = {
    name: "brave_web_search",
    description: "执行Brave Web搜索，适用于宽泛信息查询和多源数据获取，可支持分页。最大返回20条结果。",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "搜索关键词 (最多400字符，50个单词)",
            },
            count: {
                type: "number",
                description: "返回结果数量 (1-20，默认10)",
                default: 10,
            },
            offset: {
                type: "number",
                description: "分页偏移量 (默认0)",
                default: 0,
            },
        },
        required: ["query"],
    },
};
const HTML_FETCH_TOOL = {
    name: "fetch",
    description: "获取目标网页的原始HTML内容，适用于完整页面结构分析。",
    inputSchema: {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "目标网页URL（必须包含http/https协议）",
            },
            timeout: {
                type: "number",
                description: "请求超时时间（毫秒，默认5000）",
                default: 5000,
            },
        },
        required: ["url"],
    },
};
const CONTENT_EXTRACT_TOOL = {
    name: "fetchContent",
    description: "提取目标网页正文内容，自动去除HTML标签和多余空白。",
    inputSchema: {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "目标网页URL（必须包含http/https协议）",
            },
            selector: {
                type: "string",
                description: "CSS选择器（默认为body）",
                default: "body",
            },
        },
        required: ["url"],
    },
};
const BING_SEARCH_TOOL = {
    name: "bing",
    description: "使用Bing搜索引擎获取网页搜索结果，模拟浏览器访问。",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "搜索关键词（支持Bing高级搜索语法）",
            },
            count: {
                type: "number",
                description: "返回结果数量 (1-50，默认10)",
                default: 10,
            },
            region: {
                type: "string",
                description: "地区代码（如zh-CN、en-US，可选）",
            },
        },
        required: ["query"],
    },
};
const GOOGLE_SEARCH_TOOL = {
    name: "google",
    description: "使用Google搜索引擎获取网页搜索结果（需代理支持）。",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "搜索关键词（支持Google搜索运算符）",
            },
            count: {
                type: "number",
                description: "返回结果数量 (1-50，默认10)",
                default: 10,
            },
            tbm: {
                type: "string",
                description: "搜索类型（例如：nws-新闻, isch-图片等，可选）",
            },
        },
        required: ["query"],
    },
};
const BROWSE_TOOL = {
    name: "browse",
    description: "使用浏览器方式获取网页内容，支持动态渲染的页面。",
    inputSchema: {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "目标网页URL（必须包含http/https协议）",
            },
            timeout: {
                type: "number",
                description: "请求超时时间（毫秒，默认30000）",
                default: 30000,
            },
        },
        required: ["url"],
    },
};
const BAIDU_SEARCH_TOOL = {
    name: "baidu",
    description: "使用百度搜索引擎获取网页搜索结果。",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "搜索关键词",
            },
            count: {
                type: "number",
                description: "返回结果数量 (1-50，默认10)",
                default: 10,
            }
        },
        required: ["query"],
    },
};
const SO_SEARCH_TOOL = {
    name: "360",
    description: "使用360搜索引擎获取网页搜索结果。",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "搜索关键词",
            },
            count: {
                type: "number",
                description: "返回结果数量 (1-50，默认10)",
                default: 10,
            }
        },
        required: ["query"],
    },
};
const NOW_TOOL = {
    name: "now",
    description: "获取当前时间，返回格式化的日期时间字符串。支持指定UTC时区偏移值。",
    inputSchema: {
        type: "object",
        properties: {
            offset: {
                type: "number",
                description: "UTC时区偏移值（如：8表示UTC+8，-5表示UTC-5，0表示UTC），默认为8。例如：当前时间（UTC+8）：2024-01-01 14:30:45",
                default: 8,
                minimum: -12,
                maximum: 14
            }
        },
        required: [],
    },
};
// —— 创建 MCP Server 实例 ——
const server = new index_js_1.Server({
    name: "example-servers/mcp",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
// —— 环境变量配置 ——
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
if (!BRAVE_API_KEY) {
    console.error("错误：BRAVE_API_KEY环境变量必须设置");
    process.exit(1);
}
// —— 全局速率限制 —— 
const RATE_LIMIT = {
    perSecond: 1,
    perMonth: 15000,
};
let requestCount = {
    second: 0,
    month: 0,
    lastReset: Date.now(),
};
function checkRateLimit() {
    const now = Date.now();
    if (now - requestCount.lastReset > 1000) {
        requestCount.second = 0;
        requestCount.lastReset = now;
    }
    if (requestCount.second >= RATE_LIMIT.perSecond ||
        requestCount.month >= RATE_LIMIT.perMonth) {
        throw new Error("达到速率限制");
    }
    requestCount.second++;
    requestCount.month++;
}
// —— 网络请求相关函数 ——
async function performWebSearch(query, count = 10, offset = 0) {
    var _a;
    checkRateLimit();
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", Math.min(count, 20).toString());
    url.searchParams.set("offset", offset.toString());
    const response = await (0, proxyGetUrl_1.proxyGetUrl)(url.toString(), {
        headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': BRAVE_API_KEY,
        }
    });
    const data = response.data;
    const results = (((_a = data.web) === null || _a === void 0 ? void 0 : _a.results) || []).map((result) => ({
        title: result.title || "",
        description: result.description || "",
        url: result.url || "",
    }));
    return results
        .map((r) => `标题: ${r.title}\n描述: ${r.description}\n链接: ${r.url}`)
        .join("\n\n");
}
/**
 * 获取网页原始HTML内容
 */
async function fetchHTML(url, timeout = 5000) {
    checkRateLimit();
    const response = await (0, proxyGetUrl_1.proxyGetUrl)(url, {
        timeout,
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
    });
    return response.data;
}
/**
 * 提取网页正文内容，并清理多余空白
 */
async function extractContent(url, selector = "body") {
    const html = await fetchHTML(url, 5000);
    const $ = cheerio.load(html);
    const content = $(selector).text().replace(/\s+/g, " ").trim();
    return content; //.substring(0, 5000);
}
/**
 * 使用 Bing 搜索并解析搜索结果
 */
async function searchBing(query, count = 10) {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${count}`;
    const html = await fetchHTML(url, 8000);
    const $ = cheerio.load(html);
    const results = $("li.b_algo")
        .map((i, el) => {
        const title = $(el).find("h2").text().trim();
        const link = $(el).find("a").attr("href") || "";
        const snippet = $(el).find(".b_caption p").text().trim();
        return `${i + 1}. [${title}](${link})\n${snippet}`;
    })
        .get()
        .join("\n\n");
    return results || "未找到Bing搜索结果";
}
/**
 * 使用 Google 搜索并解析搜索结果
 */
async function searchGoogle(query, count = 10) {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${count}`;
    try {
        const html = await browser_1.default.getPageContent(url);
        const $ = cheerio.load(html);
        // 更新选择器以适应可能的结构变化
        const results = $("div.g, div[data-hveid]")
            .map((i, el) => {
            const title = $(el).find("h3, a > div").first().text().trim();
            const link = $(el).find("a").first().attr("href") || "";
            const snippet = $(el).find("div.VwiC3b, div[data-snf], div[data-sncf]").text().trim();
            // 只返回有效的搜索结果
            if (title && link && snippet && link.startsWith('http')) {
                return `${i + 1}. [${title}](${link})\n${snippet}`;
            }
            return null;
        })
            .get()
            .filter(Boolean) // 过滤掉空值
            .slice(0, count) // 限制结果数量
            .join("\n\n");
        return results || "未找到Google搜索结果";
    }
    catch (error) {
        console.error('Google搜索出错:', error);
        throw new Error(`Google搜索失败: ${error}`);
    }
    finally {
        // 确保关闭浏览器实例
        //await browser.close();
    }
}
/**
 * 使用浏览器方式获取网页内容
 */
async function browsePage(url, timeout = 30000) {
    try {
        const content = await browser_1.default.getPageContent(url);
        return content;
    }
    catch (error) {
        console.error('浏览器访问出错:', error);
        throw new Error(`浏览器访问失败: ${error}`);
    }
    finally {
        await browser_1.default.close();
    }
}
/**
 * 使用百度搜索并解析搜索结果
 */
async function searchBaidu(query, count = 10) {
    const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=${count}`;
    try {
        const html = await browser_1.default.getPageContent(url);
        const $ = cheerio.load(html);
        // 解析百度搜索结果
        const results = $("div.result, div.c-container")
            .map((i, el) => {
            const title = $(el).find("h3.t, .c-title").text().trim();
            const link = $(el).find("h3.t a, .c-title a").attr("href") || "";
            const snippet = $(el).find(".c-abstract, .content-abstract").text().trim();
            // 只返回有效的搜索结果
            if (title && link && snippet) {
                return `${i + 1}. [${title}](${link})\n${snippet}`;
            }
            return null;
        })
            .get()
            .filter(Boolean) // 过滤掉空值
            .slice(0, count) // 限制结果数量
            .join("\n\n");
        return results || "未找到百度搜索结果";
    }
    catch (error) {
        console.error('百度搜索出错:', error);
        throw new Error(`百度搜索失败: ${error}`);
    }
}
/**
 * 使用360搜索并解析搜索结果
 */
async function search360(query, count = 10) {
    const url = `https://www.so.com/s?q=${encodeURIComponent(query)}&pn=1&ps=${count}`;
    try {
        const html = await browser_1.default.getPageContent(url);
        const $ = cheerio.load(html);
        // 解析360搜索结果
        const results = $(".result li")
            .map((i, el) => {
            // 提取标题和链接
            const titleEl = $(el).find("h3");
            const title = titleEl.text().trim();
            const link = titleEl.find("a").attr("href") || "";
            // 提取摘要，尝试多个可能的选择器
            let snippet = "";
            const possibleSnippetSelectors = [
                "p.res-desc", // 普通结果
                ".res-rich-content", // 富文本结果
                ".res-comm-con" // 通用结果
            ];
            for (const selector of possibleSnippetSelectors) {
                const text = $(el).find(selector).text().trim();
                if (text) {
                    snippet = text;
                    break;
                }
            }
            console.error(`调试: 找到结果 #${i + 1}:`, { title, link, snippet });
            // 只返回有效的搜索结果
            if (title && (link || snippet)) {
                return `${i + 1}. [${title}](${link})\n${snippet}`;
            }
            return null;
        })
            .get()
            .filter(Boolean) // 过滤掉空值
            .slice(0, count) // 限制结果数量
            .join("\n\n");
        if (!results) {
            console.error('调试: DOM结构:', $('.result li').length, '个结果元素');
            return "未找到360搜索结果";
        }
        return results;
    }
    catch (error) {
        console.error('360搜索出错:', error);
        throw new Error(`360搜索失败: ${error}`);
    }
}
/**
 * 获取当前时间的格式化字符串
 */
function getNowTime(offset = 8) {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const targetTime = new Date(utc + (3600000 * offset));
    const timeStr = targetTime.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const sign = offset >= 0 ? '+' : '';
    return `当前时间（UTC${sign}${offset}）：${timeStr}`;
}
// —— 注册 MCP 工具列表 ——
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools: [
        WEB_SEARCH_TOOL,
        HTML_FETCH_TOOL,
        CONTENT_EXTRACT_TOOL,
        BING_SEARCH_TOOL,
        GOOGLE_SEARCH_TOOL,
        BROWSE_TOOL,
        BAIDU_SEARCH_TOOL,
        SO_SEARCH_TOOL,
        NOW_TOOL,
    ],
}));
// —— 处理工具调用请求 ——
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;
        console.error("收到请求:", JSON.stringify({ tool: name, arguments: args }, null, 2));
        if (!args) {
            throw new Error("未提供参数");
        }
        let results = "";
        switch (name) {
            case "brave_web_search": {
                if (!isBraveWebSearchArgs(args)) {
                    throw new Error("brave_web_search 参数无效");
                }
                const { query, count = 10, offset = 0 } = args;
                results = await performWebSearch(query, count, offset);
                break;
            }
            case "fetch": {
                const { url, timeout = 5000 } = args;
                results = await fetchHTML(url, timeout);
                break;
            }
            case "fetchContent": {
                const { url, selector = "body" } = args;
                results = await extractContent(url, selector);
                break;
            }
            case "bing": {
                const { query, count = 10 } = args;
                results = await searchBing(query, count);
                break;
            }
            case "google": {
                const { query, count = 10 } = args;
                results = await searchGoogle(query, count);
                break;
            }
            case "browse": {
                const { url, timeout = 30000 } = args;
                results = await browsePage(url, timeout);
                break;
            }
            case "baidu": {
                const { query, count = 10 } = args;
                results = await searchBaidu(query, count);
                break;
            }
            case "360": {
                const { query, count = 10 } = args;
                results = await search360(query, count);
                break;
            }
            case "now": {
                const { offset = 8 } = args;
                results = getNowTime(offset);
                break;
            }
            default: {
                results = `未知工具: ${name}`;
                return {
                    content: [{ type: "text", text: results }],
                    isError: true,
                };
            }
        }
        console.error("返回结果:", JSON.stringify({
            tool: name,
            results: results.substring(0, 500) +
                (results.length > 500 ? "..." : ""),
        }, null, 2));
        return {
            content: [{ type: "text", text: results }],
            isError: false,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error
            ? `${error.message}\n${error.stack || ""}`
            : String(error);
        console.error("发生错误:", errorMessage);
        return {
            content: [{ type: "text", text: `错误: ${errorMessage}` }],
            isError: true,
        };
    }
});
// —— 启动 MCP Server ——
async function runServer() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server 正在通过 stdio 运行");
}
