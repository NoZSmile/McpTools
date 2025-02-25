import express from 'express';
import { sendEvent } from '../index';
import { 
  performWebSearch, 
  fetchHTML, 
  extractContent, 
  searchBing, 
  searchGoogle, 
  browsePage, 
  searchBaidu, 
  search360, 
  getNowTime 
} from '../../mcp';

/**
 * 为 Express 应用添加 API 路由
 */
export function setupApiRoutes(app: express.Application): void {
  // 创建API路由
  const apiRouter = express.Router();
  
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
  const validateClientId = (req: express.Request, res: express.Response): boolean => {
    const clientId = req.query.clientId as string;
    
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
      if (!validateClientId(req, res)) return;

      const clientId = req.query.clientId as string;
      const { query, count, offset } = req.body;
      
      // 生成请求ID
      const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // 回复确认收到请求
      res.status(202).json({ message: '请求已接收', toolName: 'brave_web_search', requestId });
      
      // 发送开始事件
      sendEvent(clientId, 'start', { 
        tool: 'brave_web_search',
        requestId,
        params: { query, count, offset }
      });
      
      try {
        // 执行搜索并获取结果
        const result = await performWebSearch(
          query, 
          count || 10, 
          offset || 0
        );
        
        // 发送完成事件
        sendEvent(clientId, 'complete', {
          tool: 'brave_web_search',
          requestId,
          result
        });
      } catch (error) {
        // 发送错误事件
        sendEvent(clientId, 'error', {
          tool: 'brave_web_search',
          requestId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : '执行请求时发生错误'
      });
    }
  });

  // 获取网页HTML
  apiRouter.post('/fetch', async (req, res) => {
    try {
      // 验证客户端ID
      if (!validateClientId(req, res)) return;

      const clientId = req.query.clientId as string;
      const { url, timeout } = req.body;
      
      // 生成请求ID
      const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      res.status(202).json({ message: '请求已接收', toolName: 'fetch', requestId });
      
      sendEvent(clientId, 'start', { 
        tool: 'fetch',
        requestId,
        params: { url, timeout }
      });
      
      try {
        const result = await fetchHTML(url, timeout);
        sendEvent(clientId, 'complete', {
          tool: 'fetch',
          requestId,
          result
        });
      } catch (error) {
        sendEvent(clientId, 'error', {
          tool: 'fetch',
          requestId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : '执行请求时发生错误'
      });
    }
  });

  // 提取网页内容
  apiRouter.post('/fetchContent', async (req, res) => {
    try {
      // 验证客户端ID
      if (!validateClientId(req, res)) return;

      const clientId = req.query.clientId as string;
      const { url, selector } = req.body;
      
      // 生成请求ID
      const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      res.status(202).json({ message: '请求已接收', toolName: 'fetchContent', requestId });
      
      sendEvent(clientId, 'start', { 
        tool: 'fetchContent',
        requestId,
        params: { url, selector }
      });
      
      try {
        const result = await extractContent(url, selector);
        sendEvent(clientId, 'complete', {
          tool: 'fetchContent',
          requestId,
          result
        });
      } catch (error) {
        sendEvent(clientId, 'error', {
          tool: 'fetchContent',
          requestId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : '执行请求时发生错误'
      });
    }
  });

  // Bing 搜索
  apiRouter.post('/bing', async (req, res) => {
    try {
      // 验证客户端ID
      if (!validateClientId(req, res)) return;

      const clientId = req.query.clientId as string;
      const { query, count } = req.body;
      
      // 生成请求ID
      const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      res.status(202).json({ message: '请求已接收', toolName: 'bing', requestId });
      
      sendEvent(clientId, 'start', { 
        tool: 'bing',
        requestId,
        params: { query, count }
      });
      
      try {
        const result = await searchBing(query, count);
        sendEvent(clientId, 'complete', {
          tool: 'bing',
          requestId,
          result
        });
      } catch (error) {
        sendEvent(clientId, 'error', {
          tool: 'bing',
          requestId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : '执行请求时发生错误'
      });
    }
  });

  // Google 搜索
  apiRouter.post('/google', async (req, res) => {
    try {
      // 验证客户端ID
      if (!validateClientId(req, res)) return;

      const clientId = req.query.clientId as string;
      const { query, count } = req.body;
      
      // 生成请求ID
      const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      res.status(202).json({ message: '请求已接收', toolName: 'google', requestId });
      
      sendEvent(clientId, 'start', { 
        tool: 'google',
        requestId,
        params: { query, count }
      });
      
      try {
        const result = await searchGoogle(query, count);
        sendEvent(clientId, 'complete', {
          tool: 'google',
          requestId,
          result
        });
      } catch (error) {
        sendEvent(clientId, 'error', {
          tool: 'google',
          requestId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : '执行请求时发生错误'
      });
    }
  });

  // 浏览器模式获取网页
  apiRouter.post('/browse', async (req, res) => {
    try {
      // 验证客户端ID
      if (!validateClientId(req, res)) return;

      const clientId = req.query.clientId as string;
      const { url, timeout } = req.body;
      
      // 生成请求ID
      const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      res.status(202).json({ message: '请求已接收', toolName: 'browse', requestId });
      
      sendEvent(clientId, 'start', { 
        tool: 'browse',
        requestId,
        params: { url, timeout }
      });
      
      try {
        const result = await browsePage(url, timeout);
        sendEvent(clientId, 'complete', {
          tool: 'browse',
          requestId,
          result
        });
      } catch (error) {
        sendEvent(clientId, 'error', {
          tool: 'browse',
          requestId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : '执行请求时发生错误'
      });
    }
  });

  // 百度搜索
  apiRouter.post('/baidu', async (req, res) => {
    try {
      // 验证客户端ID
      if (!validateClientId(req, res)) return;

      const clientId = req.query.clientId as string;
      const { query, count } = req.body;
      
      // 生成请求ID
      const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      res.status(202).json({ message: '请求已接收', toolName: 'baidu', requestId });
      
      sendEvent(clientId, 'start', { 
        tool: 'baidu',
        requestId,
        params: { query, count }
      });
      
      try {
        const result = await searchBaidu(query, count);
        sendEvent(clientId, 'complete', {
          tool: 'baidu',
          requestId,
          result
        });
      } catch (error) {
        sendEvent(clientId, 'error', {
          tool: 'baidu',
          requestId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : '执行请求时发生错误'
      });
    }
  });

  // 360搜索
  apiRouter.post('/360', async (req, res) => {
    try {
      // 验证客户端ID
      if (!validateClientId(req, res)) return;

      const clientId = req.query.clientId as string;
      const { query, count } = req.body;
      
      // 生成请求ID
      const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      res.status(202).json({ message: '请求已接收', toolName: '360', requestId });
      
      sendEvent(clientId, 'start', { 
        tool: '360',
        requestId,
        params: { query, count }
      });
      
      try {
        const result = await search360(query, count);
        sendEvent(clientId, 'complete', {
          tool: '360',
          requestId,
          result
        });
      } catch (error) {
        sendEvent(clientId, 'error', {
          tool: '360',
          requestId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : '执行请求时发生错误'
      });
    }
  });

  // 获取当前时间
  apiRouter.post('/now', async (req, res) => {
    try {
      // 验证客户端ID
      if (!validateClientId(req, res)) return;

      const clientId = req.query.clientId as string;
      const { format } = req.body;
      
      // 生成请求ID
      const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      res.status(202).json({ message: '请求已接收', toolName: 'now', requestId });
      
      sendEvent(clientId, 'start', { 
        tool: 'now',
        requestId,
        params: { format }
      });
      
      try {
        // 将format参数转换为底层函数需要的offset参数
        // 这里我们仍然使用默认的offset值8，因为format参数实际上不会被getNowTime函数使用
        const offset = 8;
        const result = await getNowTime(offset);
        sendEvent(clientId, 'complete', {
          tool: 'now',
          requestId,
          result
        });
      } catch (error) {
        sendEvent(clientId, 'error', {
          tool: 'now',
          requestId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : '执行请求时发生错误'
      });
    }
  });

  // 注册API路由
  app.use('/api', apiRouter);
} 