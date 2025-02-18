# MCP Proxy Search Tools (MCP代理搜索工具)

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)
![License](https://img.shields.io/badge/license-ISC-blue)

一个基于 TypeScript 开发的多功能MCP Search Server工具，支持代理及浏览器模式，可进行url抓取或多搜索引擎和内容解析。

## ✨ 主要特性

- 🔍 多搜索引擎支持
  - Brave Search（官方API）
  - Bing
  - Google
  - 百度
  - 360搜索
- 🌐 网页内容提取
  - HTML原始内容获取
  - 智能正文提取
  - 动态页面渲染
- ⚡ 高级功能
  - 代理支持 (HTTP/SOCKS)
  - 请求速率限制
  - 浏览器自动化

## 🚀 快速开始

### 安装

```bash
# 克隆项目
git clone https://github.com/NoZSmile/McpTools.git
cd McpTools

# 安装依赖
npm install
```

### 基本使用

```bash
# 配置 Brave Search API (从 https://search.brave.com/developers 获取)
export BRAVE_API_KEY="your-api-key"

# 配置代理
export HTTP_PROXY="your http/socks proxy"


tsx index.ts  # 查看帮助

tsx index.ts startmcp  # 启动mcp server模式

# 命令模式
# 抓取网页内容
tsx index.ts fetch "https://example.com"

# 提取网页文字
tsx index.ts content "https://example.com"

# 浏览器模式获取网页内容
tsx index.ts browse "https://example.com"

# Brave搜索
tsx index.ts brave "TypeScript教程"

# Bing搜索
tsx index.ts bing "TypeScript教程"

```

## 📖 详细命令

| 命令 | 说明 | 示例 |
|------|------|------|
| brave | Brave搜索 | `brave "前端开发"` |
| fetch | 抓取网页 | `fetch https://example.com` |
| content | 提取网页正文 | `content https://example.com` |
| browse | 浏览器渲染 | `browse https://spa.example.com` |
| bing | Bing搜索 | `bing "Node.js教程"` |
| google | Google搜索 | `google "React Hooks"` |
| baidu | 百度搜索 | `baidu "Python入门"` |
| 360 | 360搜索 | `360 "Linux命令"` |
| startmcp | 启动MCP Server模式 | `startmcp` |

## ⚙️ 配置说明

### 环境变量

```bash
# Brave API密钥（必需）
export BRAVE_API_KEY="your-api-key"

# 代理设置（可选）
export http_proxy="http://127.0.0.1:7890"
export https_proxy="http://127.0.0.1:7890"

# 调试模式（可选）
export DEBUG=true
```

### TypeScript配置

项目使用 TypeScript 5.0+，配置文件位于 `tsconfig.json`。主要设置：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true
  }
}
```

## 🔧 高级配置

### 速率限制
默认配置（可在 `mcp.ts` 中修改）：
- 单位时间：1请求/秒
- 总量限制：15000请求/月

### 浏览器选项
在 `browser.ts` 中配置 Puppeteer 选项：
```typescript
const options = {
  headless: 'new',
  args: ['--no-sandbox']
}
```

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add: 新功能'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📝 问题反馈

如果你发现任何问题或有改进建议，欢迎：
1. 提交 [Issue](https://github.com/NoZSmile/McpTools/issues)
2. 发起 Pull Request
3. 通过 Email 联系我们

## 📄 许可证

本项目采用 ISC 许可证 - 详见 [LICENSE](LICENSE) 文件
