"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const yargs_1 = __importDefault(require("yargs/yargs"));
const helpers_1 = require("yargs/helpers");
// 加载环境变量
dotenv_1.default.config();
// 默认配置
const DEFAULT_CONFIG = {
    sse: {
        enabled: false,
        port: 3000,
        cors: {
            enabled: true,
            origin: '*'
        },
        rateLimit: {
            enabled: true,
            windowMs: 60000, // 1分钟
            max: 30 // 最大请求数
        },
        connectionTimeout: 30000, // 30秒无活动断开连接
    }
};
// 解析命令行参数
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .option('sse', {
    type: 'boolean',
    description: '启动 SSE 服务器模式'
})
    .option('port', {
    type: 'number',
    description: 'SSE 服务器端口'
})
    .option('config', {
    type: 'string',
    description: '配置文件路径'
})
    .parse();
/**
 * 从配置文件中加载配置
 */
function loadConfigFromFile(configPath) {
    try {
        if (fs_1.default.existsSync(configPath)) {
            const configContent = fs_1.default.readFileSync(configPath, 'utf8');
            return JSON.parse(configContent);
        }
    }
    catch (error) {
        console.error(`配置文件加载失败: ${configPath}`, error);
    }
    return {};
}
/**
 * 合并配置，按优先级: 命令行参数 > 环境变量 > 配置文件 > 默认配置
 */
function mergeConfigs() {
    // 1. 默认配置
    const config = { ...DEFAULT_CONFIG };
    // 2. 配置文件
    const configFilePath = argv.config || path_1.default.join(process.cwd(), 'config.json');
    const fileConfig = loadConfigFromFile(configFilePath);
    Object.assign(config, fileConfig);
    // 3. 环境变量
    if (process.env.SSE_PORT) {
        config.sse.port = parseInt(process.env.SSE_PORT, 10);
    }
    if (process.env.SSE_ENABLED === 'true') {
        config.sse.enabled = true;
    }
    // 4. 命令行参数 (最高优先级)
    if (argv.sse !== undefined) {
        config.sse.enabled = argv.sse;
    }
    if (argv.port !== undefined) {
        config.sse.port = argv.port;
    }
    return config;
}
// 导出配置
const config = mergeConfigs();
exports.default = config;
