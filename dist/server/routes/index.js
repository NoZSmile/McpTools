"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupApiRoutes = setupApiRoutes;
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const mcp_1 = require("../../mcp");
/**
 * 为 Express 应用添加 API 路由
 */
function setupApiRoutes(app) {
    // 创建API路由
    const apiRouter = express_1.default.Router();
    // API 根路径
    apiRouter.get('/', (req, res) => {
        res.json({
            status: 'ok',
            message: 'MCP Proxy Search Multi Tools API',
            tools: [
                'brave_web_search', 'fetch', 'fetchContent', 'bing',
                'google', 'browse', 'baidu', '360', 'now'
            ]
        });
    });
    // 工具验证帮助函数
    const validateClientId = (req, res) => {
        const clientId = req.query.clientId;
        if (!clientId) {
            res.status(400).json({
                error: '缺少客户端ID (clientId)'
            });
            return false;
        }
        return true;
    };
    // brave 搜索
    apiRouter.post('/brave_web_search', async (req, res) => {
        try {
            // 验证客户端ID
            if (!validateClientId(req, res))
                return;
            const clientId = req.query.clientId;
            const { query, count, offset } = req.body;
            // 回复确认收到请求
            res.status(202).json({ message: '请求已接收', toolName: 'brave_web_search' });
            // 发送开始事件
            (0, index_1.sendEvent)(clientId, 'start', {
                tool: 'brave_web_search',
                params: { query, count, offset }
            });
            try {
                // 执行搜索并获取结果
                const result = await (0, mcp_1.performWebSearch)(query, count || 10, offset || 0);
                // 发送完成事件
                (0, index_1.sendEvent)(clientId, 'complete', {
                    tool: 'brave_web_search',
                    result
                });
            }
            catch (error) {
                // 发送错误事件
                (0, index_1.sendEvent)(clientId, 'error', {
                    tool: 'brave_web_search',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : '执行请求时发生错误'
            });
        }
    });
    // 获取网页HTML
    apiRouter.post('/fetch', async (req, res) => {
        try {
            // 验证客户端ID
            if (!validateClientId(req, res))
                return;
            const clientId = req.query.clientId;
            const { url, timeout } = req.body;
            res.status(202).json({ message: '请求已接收', toolName: 'fetch' });
            (0, index_1.sendEvent)(clientId, 'start', {
                tool: 'fetch',
                params: { url, timeout }
            });
            try {
                const result = await (0, mcp_1.fetchHTML)(url, timeout);
                (0, index_1.sendEvent)(clientId, 'complete', {
                    tool: 'fetch',
                    result
                });
            }
            catch (error) {
                (0, index_1.sendEvent)(clientId, 'error', {
                    tool: 'fetch',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : '执行请求时发生错误'
            });
        }
    });
    // 提取网页内容
    apiRouter.post('/fetchContent', async (req, res) => {
        try {
            // 验证客户端ID
            if (!validateClientId(req, res))
                return;
            const clientId = req.query.clientId;
            const { url, selector } = req.body;
            res.status(202).json({ message: '请求已接收', toolName: 'fetchContent' });
            (0, index_1.sendEvent)(clientId, 'start', {
                tool: 'fetchContent',
                params: { url, selector }
            });
            try {
                const result = await (0, mcp_1.extractContent)(url, selector);
                (0, index_1.sendEvent)(clientId, 'complete', {
                    tool: 'fetchContent',
                    result
                });
            }
            catch (error) {
                (0, index_1.sendEvent)(clientId, 'error', {
                    tool: 'fetchContent',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : '执行请求时发生错误'
            });
        }
    });
    // Bing 搜索
    apiRouter.post('/bing', async (req, res) => {
        try {
            // 验证客户端ID
            if (!validateClientId(req, res))
                return;
            const clientId = req.query.clientId;
            const { query, count } = req.body;
            res.status(202).json({ message: '请求已接收', toolName: 'bing' });
            (0, index_1.sendEvent)(clientId, 'start', {
                tool: 'bing',
                params: { query, count }
            });
            try {
                const result = await (0, mcp_1.searchBing)(query, count);
                (0, index_1.sendEvent)(clientId, 'complete', {
                    tool: 'bing',
                    result
                });
            }
            catch (error) {
                (0, index_1.sendEvent)(clientId, 'error', {
                    tool: 'bing',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : '执行请求时发生错误'
            });
        }
    });
    // Google 搜索
    apiRouter.post('/google', async (req, res) => {
        try {
            // 验证客户端ID
            if (!validateClientId(req, res))
                return;
            const clientId = req.query.clientId;
            const { query, count } = req.body;
            res.status(202).json({ message: '请求已接收', toolName: 'google' });
            (0, index_1.sendEvent)(clientId, 'start', {
                tool: 'google',
                params: { query, count }
            });
            try {
                const result = await (0, mcp_1.searchGoogle)(query, count);
                (0, index_1.sendEvent)(clientId, 'complete', {
                    tool: 'google',
                    result
                });
            }
            catch (error) {
                (0, index_1.sendEvent)(clientId, 'error', {
                    tool: 'google',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : '执行请求时发生错误'
            });
        }
    });
    // 浏览器模式获取网页
    apiRouter.post('/browse', async (req, res) => {
        try {
            // 验证客户端ID
            if (!validateClientId(req, res))
                return;
            const clientId = req.query.clientId;
            const { url, timeout } = req.body;
            res.status(202).json({ message: '请求已接收', toolName: 'browse' });
            (0, index_1.sendEvent)(clientId, 'start', {
                tool: 'browse',
                params: { url, timeout }
            });
            try {
                const result = await (0, mcp_1.browsePage)(url, timeout);
                (0, index_1.sendEvent)(clientId, 'complete', {
                    tool: 'browse',
                    result
                });
            }
            catch (error) {
                (0, index_1.sendEvent)(clientId, 'error', {
                    tool: 'browse',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : '执行请求时发生错误'
            });
        }
    });
    // 百度搜索
    apiRouter.post('/baidu', async (req, res) => {
        try {
            // 验证客户端ID
            if (!validateClientId(req, res))
                return;
            const clientId = req.query.clientId;
            const { query, count } = req.body;
            res.status(202).json({ message: '请求已接收', toolName: 'baidu' });
            (0, index_1.sendEvent)(clientId, 'start', {
                tool: 'baidu',
                params: { query, count }
            });
            try {
                const result = await (0, mcp_1.searchBaidu)(query, count);
                (0, index_1.sendEvent)(clientId, 'complete', {
                    tool: 'baidu',
                    result
                });
            }
            catch (error) {
                (0, index_1.sendEvent)(clientId, 'error', {
                    tool: 'baidu',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : '执行请求时发生错误'
            });
        }
    });
    // 360搜索
    apiRouter.post('/360', async (req, res) => {
        try {
            // 验证客户端ID
            if (!validateClientId(req, res))
                return;
            const clientId = req.query.clientId;
            const { query, count } = req.body;
            res.status(202).json({ message: '请求已接收', toolName: '360' });
            (0, index_1.sendEvent)(clientId, 'start', {
                tool: '360',
                params: { query, count }
            });
            try {
                const result = await (0, mcp_1.search360)(query, count);
                (0, index_1.sendEvent)(clientId, 'complete', {
                    tool: '360',
                    result
                });
            }
            catch (error) {
                (0, index_1.sendEvent)(clientId, 'error', {
                    tool: '360',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : '执行请求时发生错误'
            });
        }
    });
    // 获取当前时间
    apiRouter.post('/now', async (req, res) => {
        try {
            // 验证客户端ID
            if (!validateClientId(req, res))
                return;
            const clientId = req.query.clientId;
            const { offset } = req.body;
            res.status(202).json({ message: '请求已接收', toolName: 'now' });
            (0, index_1.sendEvent)(clientId, 'start', {
                tool: 'now',
                params: { offset }
            });
            try {
                const result = (0, mcp_1.getNowTime)(offset);
                (0, index_1.sendEvent)(clientId, 'complete', {
                    tool: 'now',
                    result
                });
            }
            catch (error) {
                (0, index_1.sendEvent)(clientId, 'error', {
                    tool: 'now',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : '执行请求时发生错误'
            });
        }
    });
    // 注册API路由
    app.use('/api', apiRouter);
}
