# 项目名称
MCP Proxy Search Multi Tools

# 项目描述
一个基于TypeScript开发的多功能MCP工具，支持代理及浏览器模式，可进行URL抓取、多搜索引擎搜索和内容解析。支持多种搜索引擎，包括Brave、Bing、Google、百度和360。通过MCP (Model Context Protocol) 协议提供服务，可被其他应用程序调用。

# MCP工具列表
- brave_web_search - Brave搜索引擎查询
- fetch - 获取网页原始HTML内容
- fetchContent - 提取网页正文内容
- bing - Bing搜索引擎查询
- google - Google搜索引擎查询
- browse - 浏览器模式获取网页内容
- baidu - 百度搜索引擎查询
- 360 - 360搜索引擎查询
- now - 获取当前格式化时间

# 功能描述
- 支持多搜索引擎整合 (Brave、Bing、Google、百度、360)
- 支持URL抓取和原始HTML获取
- 支持网页内容解析和清理
- 支持浏览器自动化 (适用于动态渲染页面)
- 支持代理访问 (HTTP/SOCKS)
- 内置请求速率限制保护
- 支持时区调整的时间获取功能
- 使用cheerio进行高效的HTML解析
- 通过MCP协议标准化工具接口

# 技术细节
- 通过Brave API进行官方搜索 (需要API密钥)
- 使用浏览器自动化技术访问需要动态渲染的搜索引擎
- 为每个工具提供标准化的输入schema和参数验证
- 使用标准输入/输出(stdio)通信
- 错误处理和结果格式化
- 分页支持 (适用于搜索结果)

# 项目要求
- 使用TypeScript开发
- 使用Node.js运行
- 需要Brave API密钥环境变量(BRAVE_API_KEY)
- 对于浏览器功能需要相关依赖

