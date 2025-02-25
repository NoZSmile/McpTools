import { performWebSearch, fetchHTML, extractContent, searchBing, searchGoogle, browsePage, searchBaidu, search360, runServer } from './mcp';
import browser from './browser';
import config from './config';
import { startSseServer } from './server';
// URL是全局对象，不需要导入

const COMMANDS = {
  brave: {
    name: 'brave',
    description: '使用 Brave 搜索引擎进行网页搜索',
    usage: 'web <搜索关键词>',
    example: 'web typescript tutorial'
  },
  fetch: {
    name: 'fetch',
    description: '获取网页的原始 HTML 内容',
    usage: 'fetch <URL>',
    example: 'fetch https://example.com'
  },
  content: {
    name: 'content',
    description: '提取网页的正文内容',
    usage: 'content <URL>',
    example: 'content https://example.com'
  },
  bing: {
    name: 'bing',
    description: '使用 Bing 搜索引擎搜索',
    usage: 'bing <搜索关键词>',
    example: 'bing typescript tutorial'
  },
  google: {
    name: 'google',
    description: '使用 Google 搜索引擎搜索',
    usage: 'google <搜索关键词>',
    example: 'google typescript tutorial'
  },
  baidu: {
    name: 'baidu',
    description: '使用百度搜索引擎搜索',
    usage: 'baidu <搜索关键词>',
    example: 'baidu typescript教程'
  },
  '360': {
    name: '360',
    description: '使用360搜索引擎搜索',
    usage: '360 <搜索关键词>',
    example: '360 typescript教程'
  },
  browse: {
    name: 'browse',
    description: '使用浏览器方式获取网页内容（支持动态渲染的页面）',
    usage: 'browse <URL>',
    example: 'browse https://example.com'
  },
  startmcp: {
    name: 'startmcp',
    description: '启动 MCP Server',
    usage: 'startmcp',
    example: 'startmcp'
  },
  sse: {
    name: 'sse',
    description: '启动 SSE Server 模式',
    usage: 'sse [--port=端口号]',
    example: 'sse --port=3000'
  },
  exit: {
    name: 'exit',
    description: '关闭浏览器并退出程序',
    usage: 'exit',
    example: 'exit'
  }
};

function showHelp() {
  console.log('网页内容获取工具');
  console.log('\n用法: ts-node index.ts <命令> <搜索词或URL>');
  console.log('\n可用命令:');
  
  Object.values(COMMANDS).forEach(cmd => {
    console.log(`\n  ${cmd.name}`);
    console.log(`    描述: ${cmd.description}`);
    console.log(`    用法: ${cmd.usage}`);
    console.log(`    示例: ${cmd.example}`);
  });
}

// 获取命令行参数
const command = process.argv[2]?.toLowerCase();
const query = process.argv[3];

if (!command) {
  // 检查是否使用了--sse命令行参数
  if (config.sse.enabled) {
    console.log('正在启动 SSE 服务器模式...');
    startSseServer().catch(error => {
      console.error('SSE 服务器启动失败:', error);
      process.exit(1);
    });
  } else {
    showHelp();
    process.exit(1);
  }
} else if (command === 'sse') {
  console.log(`正在启动 SSE 服务器，端口: ${config.sse.port}...`);
  startSseServer().catch(error => {
    console.error('SSE 服务器启动失败:', error);
    process.exit(1);
  });
} else if (!Object.keys(COMMANDS).includes(command)) {
  console.error(`未知命令: ${command}`);
  console.log('\n可用命令:', Object.keys(COMMANDS).join(', '));
  process.exit(1);
} else if (command !== 'exit' && command !== 'startmcp' && !query) {
  showHelp();
  process.exit(1);
} else {
  // 检查 Brave API Key
  if (command === 'web' && !process.env.BRAVE_API_KEY) {
    console.error('错误: 使用 Brave 搜索需要设置 BRAVE_API_KEY 环境变量');
    process.exit(1);
  }

  // 处理命令
  handleCommand(command, query).catch(async (error: unknown) => {
    if (error instanceof Error) {
      console.error('错误:', error.message);
    } else {
      console.error('发生未知错误');
    }
    await browser.close();
    process.exit(1);
  });
}

// 添加进程退出时的清理
let mcpServerRunning = false;

process.on('SIGINT', async () => {
  console.error('\n正在关闭服务...');
  if (mcpServerRunning) {
    process.exit();
  }
  await browser.close();
  process.exit();
});

// 处理命令的函数
async function handleCommand(command: string, query: string) {
  try {
    switch (command) {
      case 'brave': {
        const result = await performWebSearch(query);
        console.log(result);
        break;
      }

      case 'fetch': {
        const html = await fetchHTML(query);
        console.log(html);
        break;
      }

      case 'content': {
        const content = await extractContent(query);
        console.log(content);
        break;
      }

      case 'bing': {
        const result = await searchBing(query);
        console.log(result);
        break;
      }

      case 'google': {
        const result = await searchGoogle(query);
        console.log(result);
        break;
      }

      case 'baidu': {
        const result = await searchBaidu(query);
        console.log(result);
        break;
      }

      case '360': {
        const result = await search360(query);
        console.log(result);
        break;
      }

      case 'browse': {
        const content = await browsePage(query);
        console.log(content);
        break;
      }

      case 'startmcp': {
        console.error('正在启动 MCP Server...');
        mcpServerRunning = true;
        await runServer();
        return;
      }

      case 'exit': {
        console.log('正在关闭浏览器...');
        await browser.close();
        process.exit(0);
      }
    }
    
    if (command !== 'startmcp') {
      console.log('退出');
      process.exit(0);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('错误:', error.message);
    } else {
      console.error('发生未知错误');
    }
    await browser.close();
    process.exit(1);
  }
}


