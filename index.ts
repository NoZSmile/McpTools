import { performWebSearch, fetchHTML, extractContent, searchBing, searchGoogle } from './mcp';
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

if (!command || !query) {
  showHelp();
  process.exit(1);
}

if (!Object.keys(COMMANDS).includes(command)) {
  console.error(`未知命令: ${command}`);
  console.log('\n可用命令:', Object.keys(COMMANDS).join(', '));
  process.exit(1);
}

// 检查 Brave API Key
if (command === 'web' && !process.env.BRAVE_API_KEY) {
  console.error('错误: 使用 Brave 搜索需要设置 BRAVE_API_KEY 环境变量');
  process.exit(1);
}

// 发起请求
(async () => {
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
    }
    // 操作完成后直接退出
    process.exit(0);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('错误:', error.message);
    } else {
      console.error('发生未知错误');
    }
    process.exit(1);
  }
})();


