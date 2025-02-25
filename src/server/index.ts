import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import config from '../config';
import { setupApiRoutes } from './routes';

// 客户端连接管理
interface SseClient {
  id: string;
  response: express.Response;
  lastActivity: number;
}

// 全局客户端管理
const clients: Map<string, SseClient> = new Map();

/**
 * 向特定客户端发送SSE事件
 */
export function sendEvent(clientId: string, event: string, data: any): boolean {
  const client = clients.get(clientId);
  if (!client) {
    return false;
  }
  
  try {
    client.response.write(`event: ${event}\n`);
    client.response.write(`data: ${JSON.stringify(data)}\n\n`);
    client.lastActivity = Date.now();
    return true;
  } catch (error) {
    console.error(`向客户端 ${clientId} 发送事件失败:`, error);
    clients.delete(clientId); // 发送失败时移除客户端
    return false;
  }
}

/**
 * 向所有客户端广播事件
 */
export function broadcastEvent(event: string, data: any): void {
  clients.forEach((client, clientId) => {
    sendEvent(clientId, event, data);
  });
}

/**
 * 获取客户端列表
 */
export function getClientList(): string[] {
  return Array.from(clients.keys());
}

/**
 * 启动 SSE 服务器
 */
export function startSseServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = express();
    const port = config.sse.port;
    
    // 配置中间件
    app.use(cors(config.sse.cors.enabled ? {
      origin: config.sse.cors.origin,
      credentials: true
    } : {}));
    app.use(bodyParser.json());
    
    // 静态文件服务
    const publicPath = path.join(__dirname, 'public');
    app.use(express.static(publicPath));
    
    // 首页
    app.get('/', (req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });
    
    // SSE 连接端点
    app.get('/events', (req, res) => {
      // 生成客户端ID
      const clientId = `client-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // 设置 SSE 头
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      
      // 发送连接成功消息
      res.write(`event: connection\n`);
      res.write(`data: ${JSON.stringify({ clientId })}\n\n`);
      
      // 存储客户端连接
      clients.set(clientId, {
        id: clientId,
        response: res,
        lastActivity: Date.now()
      });
      
      // 处理连接关闭
      req.on('close', () => {
        clients.delete(clientId);
        console.log(`客户端 ${clientId} 已断开连接`);
      });
      
      console.log(`客户端 ${clientId} 已连接`);
      
      // 发送心跳包以保持连接
      const heartbeatInterval = setInterval(() => {
        sendEvent(clientId, 'heartbeat', { timestamp: Date.now() });
      }, 30000); // 每30秒发送一次心跳包
      
      // 连接关闭时清除心跳定时器
      req.on('close', () => {
        clearInterval(heartbeatInterval);
      });
    });
    
    // 添加API路由
    setupApiRoutes(app);
    
    // 启动超时客户端清理定时器
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      clients.forEach((client, clientId) => {
        if (now - client.lastActivity > config.sse.connectionTimeout) {
          console.log(`客户端 ${clientId} 超时，正在移除...`);
          try {
            client.response.end();
          } catch (e) {
            // 忽略关闭错误
          }
          clients.delete(clientId);
        }
      });
    }, 60000); // 每分钟检查一次
    
    // 启动服务器
    app.listen(port, () => {
      console.log(`SSE 服务器已启动，端口: ${port}`);
      console.log(`访问 http://localhost:${port} 查看客户端示例`);
      resolve();
    });
    
    // 进程退出时清理资源
    process.on('SIGINT', () => {
      clearInterval(cleanupInterval);
      clients.forEach(client => {
        try {
          client.response.end();
        } catch (e) {
          // 忽略关闭错误
        }
      });
      clients.clear();
      console.log('SSE 服务器已关闭');
      process.exit(0);
    });
  });
} 