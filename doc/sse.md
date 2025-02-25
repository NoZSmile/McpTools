# MCP 工具集 SSE 支持实现步骤

本文档列举了为 MCP Proxy Search Multi Tools 添加 SSE (Server-Sent Events) 支持的实现步骤。

## 1. 项目结构调整

- 创建 `src/server` 目录存放 SSE 服务器相关代码
- 创建 `src/server/index.ts` 作为 SSE 服务器入口
- 创建 `src/server/routes` 目录用于 API 路由管理
- 创建 `src/server/middleware` 目录用于中间件
- 创建 `src/config` 目录用于配置管理

## 2. 添加依赖包

```bash
npm install express cors body-parser dotenv
npm install @types/express @types/cors @types/body-parser --save-dev
```

## 3. 配置管理实现

- 创建 `src/config/index.ts` 配置加载模块
- 支持从配置文件、环境变量和命令行参数获取配置
- 实现 SSE 相关配置项 (端口、CORS设置、超时等)
- 创建默认配置文件模板

## 4. 命令行参数处理

- 修改主入口文件，添加 `--sse` 参数支持
- 添加 `--port` 参数用于指定 SSE 服务器端口
- 添加 `--config` 参数用于指定配置文件路径
- 按优先级顺序确定端口: 命令行参数 > 配置文件 > 默认值

## 5. SSE 服务器核心实现

- 实现基于 Express 的 HTTP 服务器
- 实现 SSE 连接管理 (`/events` 端点)
- 实现客户端会话管理和事件发送功能
- 添加错误处理和连接生命周期管理

## 6. API 路由实现

- 为每个 MCP 工具创建 API 端点 (`/api/:tool`)
- 实现参数验证和处理
- 建立 SSE 事件发送机制
- 实现进度回调 (用于长时间运行的工具)

## 7. MCP 工具适配

- 修改现有工具实现，支持进度回调
- 创建统一的工具执行接口
- 确保工具可在 SSE 模式下正常运行
- 优化大型结果的分块传输

## 8. 安全与稳定性增强

- 实现请求速率限制
- 添加基本身份验证机制
- 处理客户端断开连接的清理工作
- 添加错误恢复和日志记录

## 9. 创建客户端示例

- 开发基本的 HTML/JS 客户端示例
- 提供 SSE 连接和工具调用演示
- 添加进度显示和结果处理示例代码
- 编写客户端使用文档

## 10. 测试与调试

- 为 SSE 服务器添加单元测试
- 开发集成测试确保工具链正常工作
- 创建负载测试评估性能
- 添加调试日志和监控支持

## 11. 文档更新

- 更新主项目 README.md，添加 SSE 模式说明
- 编写 SSE API 文档
- 添加配置项参考文档
- 提供使用示例和最佳实践

## 12. 部署考虑

- 提供 Docker 支持
- 添加进程管理配置 (PM2 等)
- 实现优雅关闭和重启
- 配置环境变量示例
