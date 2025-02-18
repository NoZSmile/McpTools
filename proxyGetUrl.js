"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyGetUrl = proxyGetUrl;
const axios_1 = __importDefault(require("axios"));
const socks_proxy_agent_1 = require("socks-proxy-agent");
/**
 * 工具函数：确保使用HTTPS协议
 */
function ensureHttps(inputUrl) {
    try {
        const urlObj = new URL(inputUrl);
        if (urlObj.protocol === 'http:') {
            urlObj.protocol = 'https:';
            return urlObj.toString();
        }
        return inputUrl;
    }
    catch (e) {
        return inputUrl;
    }
}
/**
 * 工具函数：获取环境变量中的代理设置
 */
function getEnvProxy() {
    return process.env.http_proxy || process.env.HTTP_PROXY || process.env.https_proxy || process.env.HTTPS_PROXY;
}
/**
 * 解析代理URL并返回代理配置
 */
function parseProxyUrl(proxyUrl, verbose = false) {
    try {
        const parsedUrl = new URL(proxyUrl);
        // 检查是否是 SOCKS 代理
        if (proxyUrl.startsWith('socks://') || proxyUrl.startsWith('socks5://')) {
            if (verbose)
                console.log('使用 SOCKS 代理:', proxyUrl);
            return new socks_proxy_agent_1.SocksProxyAgent(proxyUrl);
        }
        // 处理 HTTP/HTTPS 代理
        if (!parsedUrl.hostname) {
            throw new Error('代理URL缺少主机名');
        }
        const proxyPort = parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80');
        // 如果是本地代理且端口是常见的代理端口，自动使用 SOCKS5
        if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
            const commonSocksPort = ['10808', '1080', '7890'];
            if (commonSocksPort.includes(proxyPort)) {
                if (verbose)
                    console.log('检测到可能的 SOCKS5 代理，自动切换到 SOCKS5 模式');
                return new socks_proxy_agent_1.SocksProxyAgent(`socks5://${parsedUrl.hostname}:${proxyPort}`);
            }
        }
        if (verbose)
            console.log('使用 HTTP/HTTPS 代理:', proxyUrl);
        return {
            host: parsedUrl.hostname,
            port: parseInt(proxyPort),
            protocol: parsedUrl.protocol.replace(':', ''),
            auth: parsedUrl.username ? {
                username: parsedUrl.username,
                password: parsedUrl.password || ''
            } : undefined
        };
    }
    catch (e) {
        throw new Error(`代理URL格式错误: ${e.message}`);
    }
}
/**
 * 使用可选的代理发起HTTP GET请求
 * @param url 目标URL
 * @param options 请求配置选项
 * @returns Promise<响应数据>
 */
async function proxyGetUrl(url, options = {}) {
    const { proxy, timeout = 30000, headers = {}, validateStatus = () => true, maxRedirects = 5, forceHttps = true, verbose = false, useEnvProxy = true } = options;
    try {
        // 处理 URL
        let finalUrl = url;
        if (forceHttps) {
            finalUrl = ensureHttps(url);
            if (finalUrl !== url && verbose) {
                console.log('自动将 HTTP 转换为 HTTPS');
            }
        }
        if (verbose)
            console.log('正在请求:', finalUrl);
        // 验证URL
        new URL(finalUrl);
        // 构建请求配置
        const config = {
            timeout,
            validateStatus,
            maxRedirects,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                ...headers
            }
        };
        // 处理代理配置
        const finalProxy = proxy || (useEnvProxy ? getEnvProxy() : undefined);
        if (finalProxy) {
            if (verbose)
                console.log('使用代理:', finalProxy);
            const proxyConfig = parseProxyUrl(finalProxy, verbose);
            if (proxyConfig instanceof socks_proxy_agent_1.SocksProxyAgent) {
                config.httpsAgent = proxyConfig;
                config.httpAgent = proxyConfig;
            }
            else {
                config.proxy = proxyConfig;
            }
        }
        // 发起请求
        const response = await axios_1.default.get(finalUrl, config);
        // 处理错误状态码
        if (response.status >= 400 && verbose) {
            console.error('请求失败，HTTP状态码:', response.status);
            console.error('错误详情:');
            console.error(response.data);
        }
        return {
            data: response.data,
            status: response.status,
            headers: response.headers
        };
    }
    catch (error) {
        // 构建详细的错误信息
        let errorMessage = '请求失败';
        const details = {
            message: error.message,
            code: error.code,
            errno: error.errno,
            syscall: error.syscall,
            address: error.address,
            port: error.port
        };
        // 添加具体错误说明
        if (error.code === 'ENOTFOUND') {
            errorMessage = '无法解析主机名，请检查URL是否正确';
        }
        else if (error.code === 'ECONNREFUSED') {
            errorMessage = '连接被拒绝，目标服务器可能未运行';
        }
        else if (error.code === 'ECONNRESET') {
            errorMessage = '连接被重置，可能是代理服务器断开了连接';
        }
        else if (error.code === 'ETIMEDOUT') {
            errorMessage = '连接超时，请检查网络状态或增加超时时间';
        }
        const finalError = new Error(`${errorMessage} - 详细信息: ${JSON.stringify(details)}`);
        if (verbose) {
            console.error(finalError.message);
        }
        throw finalError;
    }
}
