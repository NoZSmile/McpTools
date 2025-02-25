#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const proxy_agent_1 = require("proxy-agent");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const WEB_SEARCH_TOOL = {
    name: "brave_web_search",
    description: "Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. " +
        "Use this for broad information gathering, recent events, or when you need diverse web sources. " +
        "Supports pagination, content filtering, and freshness controls. " +
        "Maximum 20 results per request, with offset for pagination. ",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Search query (max 400 chars, 50 words)"
            },
            count: {
                type: "number",
                description: "Number of results (1-20, default 10)",
                default: 10
            },
            offset: {
                type: "number",
                description: "Pagination offset (max 9, default 0)",
                default: 0
            },
        },
        required: ["query"],
    },
};
const LOCAL_SEARCH_TOOL = {
    name: "brave_local_search",
    description: "Searches for local businesses and places using Brave's Local Search API. " +
        "Best for queries related to physical locations, businesses, restaurants, services, etc. " +
        "Returns detailed information including:\n" +
        "- Business names and addresses\n" +
        "- Ratings and review counts\n" +
        "- Phone numbers and opening hours\n" +
        "Use this when the query implies 'near me' or mentions specific locations. " +
        "Automatically falls back to web search if no local results are found.",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Local search query (e.g. 'pizza near Central Park')"
            },
            count: {
                type: "number",
                description: "Number of results (1-20, default 5)",
                default: 5
            },
        },
        required: ["query"]
    }
};
// Server implementation
const server = new index_js_1.Server({
    name: "example-servers/brave-search",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Check for API key
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
if (!BRAVE_API_KEY) {
    console.error("Error: BRAVE_API_KEY environment variable is required");
    process.exit(1);
}
// 使用 axios 替代 node-fetch，支持代理配置
const PROXY_URL = process.env.http_proxy || process.env.HTTP_PROXY;
const axiosConfig = {
    headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
    }
};
if (PROXY_URL) {
    console.error(`Using proxy: ${PROXY_URL}`);
    axiosConfig.httpAgent = new proxy_agent_1.ProxyAgent(PROXY_URL);
    axiosConfig.httpsAgent = new proxy_agent_1.ProxyAgent(PROXY_URL);
    axiosConfig.proxy = false; // disable axios internal proxy handling
}
const axiosClient = axios_1.default.create(axiosConfig);
const RATE_LIMIT = {
    perSecond: 1,
    perMonth: 15000
};
let requestCount = {
    second: 0,
    month: 0,
    lastReset: Date.now()
};
function checkRateLimit() {
    const now = Date.now();
    if (now - requestCount.lastReset > 1000) {
        requestCount.second = 0;
        requestCount.lastReset = now;
    }
    if (requestCount.second >= RATE_LIMIT.perSecond ||
        requestCount.month >= RATE_LIMIT.perMonth) {
        throw new Error('Rate limit exceeded');
    }
    requestCount.second++;
    requestCount.month++;
}
function isBraveWebSearchArgs(args) {
    return (typeof args === "object" &&
        args !== null &&
        "query" in args &&
        typeof args.query === "string");
}
function isBraveLocalSearchArgs(args) {
    return (typeof args === "object" &&
        args !== null &&
        "query" in args &&
        typeof args.query === "string");
}
async function performWebSearch(query, count = 10, offset = 0) {
    var _a;
    checkRateLimit();
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', Math.min(count, 20).toString());
    url.searchParams.set('offset', offset.toString());
    // 使用 axios 发送 GET 请求
    const response = await axiosClient.get(url.toString());
    const data = response.data;
    const results = (((_a = data.web) === null || _a === void 0 ? void 0 : _a.results) || []).map(result => ({
        title: result.title || '',
        description: result.description || '',
        url: result.url || ''
    }));
    return results.map(r => `Title: ${r.title}\nDescription: ${r.description}\nURL: ${r.url}`).join('\n\n');
}
async function performLocalSearch(query, count = 5) {
    var _a, _b;
    checkRateLimit();
    const webUrl = new URL('https://api.search.brave.com/res/v1/web/search');
    webUrl.searchParams.set('q', query);
    webUrl.searchParams.set('search_lang', 'zh-cn');
    webUrl.searchParams.set('result_filter', 'locations');
    webUrl.searchParams.set('count', Math.min(count, 20).toString());
    const webResponse = await axiosClient.get(webUrl.toString());
    const webData = webResponse.data;
    const locationIds = ((_b = (_a = webData.locations) === null || _a === void 0 ? void 0 : _a.results) === null || _b === void 0 ? void 0 : _b.filter((r) => r.id != null).map(r => r.id)) || [];
    if (locationIds.length === 0) {
        return performWebSearch(query, count); // Fallback to web search
    }
    const [poisData, descriptionsData] = await Promise.all([
        getPoisData(locationIds),
        getDescriptionsData(locationIds)
    ]);
    return formatLocalResults(poisData, descriptionsData);
}
async function getPoisData(ids) {
    checkRateLimit();
    const url = new URL('https://api.search.brave.com/res/v1/local/pois');
    ids.filter(Boolean).forEach(id => url.searchParams.append('ids', id));
    const response = await axiosClient.get(url.toString());
    const poisResponse = response.data;
    return poisResponse;
}
async function getDescriptionsData(ids) {
    checkRateLimit();
    const url = new URL('https://api.search.brave.com/res/v1/local/descriptions');
    ids.filter(Boolean).forEach(id => url.searchParams.append('ids', id));
    const response = await axiosClient.get(url.toString());
    const descriptionsData = response.data;
    return descriptionsData;
}
function formatLocalResults(poisData, descData) {
    return (poisData.results || []).map(poi => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const address = [
            (_b = (_a = poi.address) === null || _a === void 0 ? void 0 : _a.streetAddress) !== null && _b !== void 0 ? _b : '',
            (_d = (_c = poi.address) === null || _c === void 0 ? void 0 : _c.addressLocality) !== null && _d !== void 0 ? _d : '',
            (_f = (_e = poi.address) === null || _e === void 0 ? void 0 : _e.addressRegion) !== null && _f !== void 0 ? _f : '',
            (_h = (_g = poi.address) === null || _g === void 0 ? void 0 : _g.postalCode) !== null && _h !== void 0 ? _h : ''
        ].filter(part => part !== '').join(', ') || 'N/A';
        return `Name: ${poi.name}
Address: ${address}
Phone: ${poi.phone || 'N/A'}
Rating: ${(_k = (_j = poi.rating) === null || _j === void 0 ? void 0 : _j.ratingValue) !== null && _k !== void 0 ? _k : 'N/A'} (${(_m = (_l = poi.rating) === null || _l === void 0 ? void 0 : _l.ratingCount) !== null && _m !== void 0 ? _m : 0} reviews)
Price Range: ${poi.priceRange || 'N/A'}
Hours: ${(poi.openingHours || []).join(', ') || 'N/A'}
Description: ${descData.descriptions[poi.id] || 'No description available'}
`;
    }).join('\n---\n') || 'No local results found';
}
// Tool handlers
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools: [WEB_SEARCH_TOOL, LOCAL_SEARCH_TOOL],
}));
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;
        // 记录收到的请求
        console.error('Received request:', JSON.stringify({
            tool: name,
            arguments: args
        }, null, 2));
        if (!args) {
            throw new Error("No arguments provided");
        }
        let results;
        switch (name) {
            case "brave_web_search": {
                if (!isBraveWebSearchArgs(args)) {
                    throw new Error("Invalid arguments for brave_web_search");
                }
                const { query, count = 10 } = args;
                results = await performWebSearch(query, count);
                break;
            }
            case "brave_local_search": {
                if (!isBraveLocalSearchArgs(args)) {
                    throw new Error("Invalid arguments for brave_local_search");
                }
                const { query, count = 5 } = args;
                results = await performLocalSearch(query, count);
                break;
            }
            default:
                results = `Unknown tool: ${name}`;
                return {
                    content: [{ type: "text", text: results }],
                    isError: true,
                };
        }
        // 记录返回的结果
        console.error('Sending response:', JSON.stringify({
            tool: name,
            results: results.substring(0, 500) + (results.length > 500 ? '...' : '')
        }, null, 2));
        return {
            content: [{ type: "text", text: results }],
            isError: false,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error
            ? `${error.message}\n${error.stack || ''}`
            : String(error);
        // 记录错误信息
        console.error('Error occurred:', errorMessage);
        return {
            content: [{ type: "text", text: `Error: ${errorMessage}` }],
            isError: true,
        };
    }
});
async function runServer() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Brave Search MCP Server running on stdio");
}
runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
