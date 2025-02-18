#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as cheerio from "cheerio";
import { proxyGetUrl } from "./proxyGetUrl";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// —— Brave API 类型定义 ——

interface BraveWeb {
  web?: {
    results?: Array<{
      title: string;
      description: string;
      url: string;
      language?: string;
      published?: string;
      rank?: number;
    }>;
  };
}

function isBraveWebSearchArgs(
  args: unknown
): args is { query: string; count?: number; offset?: number } {
  return (
    typeof args === "object" &&
    args !== null &&
    "query" in args &&
    typeof (args as { query: string }).query === "string"
  );
}

// —— 工具定义 ——

const WEB_SEARCH_TOOL: Tool = {
  name: "brave_web_search",
  description:
    "执行Brave Web搜索，适用于宽泛信息查询和多源数据获取，可支持分页。最大返回20条结果。",
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

const HTML_FETCH_TOOL: Tool = {
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

const CONTENT_EXTRACT_TOOL: Tool = {
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

const BING_SEARCH_TOOL: Tool = {
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

const GOOGLE_SEARCH_TOOL: Tool = {
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

// —— 创建 MCP Server 实例 ——

const server = new Server(
  {
    name: "example-servers/mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// —— 环境变量配置 ——

const BRAVE_API_KEY = process.env.BRAVE_API_KEY!;
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
  if (
    requestCount.second >= RATE_LIMIT.perSecond ||
    requestCount.month >= RATE_LIMIT.perMonth
  ) {
    throw new Error("达到速率限制");
  }
  requestCount.second++;
  requestCount.month++;
}

// —— 网络请求相关函数 ——

export async function performWebSearch(
  query: string,
  count: number = 10,
  offset: number = 0
) {
  checkRateLimit();
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", Math.min(count, 20).toString());
  url.searchParams.set("offset", offset.toString());

  const response = await proxyGetUrl<BraveWeb>(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY,
    }
  });

  const data = response.data;
  const results = (data.web?.results || []).map((result) => ({
    title: result.title || "",
    description: result.description || "",
    url: result.url || "",
  }));

  return results
    .map(
      (r) =>
        `标题: ${r.title}\n描述: ${r.description}\n链接: ${r.url}`
    )
    .join("\n\n");
}

/**
 * 获取网页原始HTML内容
 */
export async function fetchHTML(url: string, timeout: number = 5000): Promise<string> {
  checkRateLimit();
  const response = await proxyGetUrl<string>(url, {
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
export async function extractContent(
  url: string,
  selector: string = "body"
): Promise<string> {
  const html = await fetchHTML(url, 5000);
  const $ = cheerio.load(html);
  const content = $(selector).text().replace(/\s+/g, " ").trim();
  return content;//.substring(0, 5000);
}

/**
 * 使用 Bing 搜索并解析搜索结果
 */
export async function searchBing(query: string, count: number = 10): Promise<string> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(
    query
  )}&count=${count}`;
  const html = await fetchHTML(url, 8000);
  const $ = cheerio.load(html);
  const results = $("li.b_algo")
    .map((i: number, el: any) => {
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
export async function searchGoogle(query: string, count: number = 10): Promise<string> {
  const url = `https://www.google.com/search?q=${encodeURIComponent(
    query
  )}&num=${count}`;
  const html = await fetchHTML(url, 10000);
  const $ = cheerio.load(html);
  const results = $("div.g")
    .map((i: number, el: any) => {
      const title = $(el).find("h3").text().trim();
      const link = $(el).find("a").attr("href") || "";
      const snippet = $(el).find(".IsZvec").text().trim();
      return `${i + 1}. [${title}](${link})\n${snippet}`;
    })
    .get()
    .join("\n\n");
  return results || "未找到Google搜索结果";
}

// —— 注册 MCP 工具列表 ——

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    WEB_SEARCH_TOOL,
    HTML_FETCH_TOOL,
    CONTENT_EXTRACT_TOOL,
    BING_SEARCH_TOOL,
    GOOGLE_SEARCH_TOOL,
  ],
}));

// —— 处理工具调用请求 ——

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    console.error(
      "收到请求:",
      JSON.stringify({ tool: name, arguments: args }, null, 2)
    );

    if (!args) {
      throw new Error("未提供参数");
    }

    let results: string = "";
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
        const { url, timeout = 5000 } = args as { url: string; timeout?: number };
        results = await fetchHTML(url, timeout);
        break;
      }
      case "fetchContent": {
        const { url, selector = "body" } = args as {
          url: string;
          selector?: string;
        };
        results = await extractContent(url, selector);
        break;
      }
      case "bing": {
        const { query, count = 10 } = args as { query: string; count?: number };
        results = await searchBing(query, count);
        break;
      }
      case "google": {
        const { query, count = 10 } = args as { query: string; count?: number };
        results = await searchGoogle(query, count);
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

    console.error(
      "返回结果:",
      JSON.stringify(
        {
          tool: name,
          results:
            results.substring(0, 500) +
            (results.length > 500 ? "..." : ""),
        },
        null,
        2
      )
    );

    return {
      content: [{ type: "text", text: results }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server 正在通过 stdio 运行");
}

runServer().catch((error) => {
  console.error("启动服务器时发生致命错误:", error);
  process.exit(1);
});
