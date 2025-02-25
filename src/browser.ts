import * as puppeteer from 'puppeteer';
import type { Browser as PuppeteerBrowser, LaunchOptions } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

interface BrowserOptions {
    proxy?: string;
    timeout?: number;
    headless?: boolean | 'new' | 'shell';
}

interface BrowserInfo {
    wsEndpoint: string;
    pid: number;
}

export class Browser {
    private browser: PuppeteerBrowser | null = null;
    private options: BrowserOptions;
    private readonly infoPath = path.join(process.cwd(), '.browser-info.json');

    constructor(options: BrowserOptions = {}) {
        this.options = {
            timeout: options.timeout || 30000,
            headless: false,//options.headless ?? 'new',
            proxy: options.proxy || process.env.http_proxy || process.env.HTTP_PROXY
        };

        // 进程退出时不清理 
        // process.on('SIGINT', async () => {
        //     console.error('正在关闭浏览器...');
        //     await this.close();
        //     // 清理browser info文件
        //     if (fs.existsSync(this.infoPath)) {
        //         fs.unlinkSync(this.infoPath);
        //     }
        //     process.exit();
        // });
    }

    private saveBrowserInfo(wsEndpoint: string, pid: number) {
        const info: BrowserInfo = { wsEndpoint, pid };
        fs.writeFileSync(this.infoPath, JSON.stringify(info));
    }

    private loadBrowserInfo(): BrowserInfo | null {
        try {
            if (fs.existsSync(this.infoPath)) {
                const info = JSON.parse(fs.readFileSync(this.infoPath, 'utf8')) as BrowserInfo;
                // 检查进程是否存在
                try {
                    process.kill(info.pid, 0);
                    return info;
                } catch {
                    // 进程不存在，删除文件
                    fs.unlinkSync(this.infoPath);
                }
            }
        } catch (error) {
            console.error('加载浏览器信息失败:', error);
        }
        return null;
    }

    async init() {
        if (this.browser) {
            return;
        }

        // 尝试连接到现有实例
        const info = this.loadBrowserInfo();
        if (info) {
            try {
                this.browser = await puppeteer.connect({
                    browserWSEndpoint: info.wsEndpoint,
                });
                console.error('已连接到现有浏览器实例');
                return;
            } catch (error) {
                console.error('连接到现有浏览器实例失败:', error);
                // 删除无效的信息文件
                if (fs.existsSync(this.infoPath)) {
                    fs.unlinkSync(this.infoPath);
                }
            }
        }

        // 创建新实例
        const launchOptions = {
            headless: this.options.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080',
            ]
        } as LaunchOptions;

        if (this.options.proxy) {
            console.error('使用代理:', this.options.proxy);
            launchOptions.args?.push(`--proxy-server=${this.options.proxy}`);
        }

        this.browser = await puppeteer.launch(launchOptions);
        
        // 保存浏览器信息
        const wsEndpoint = this.browser.wsEndpoint();
        const pid = this.browser.process()?.pid;
        if (pid) {
            this.saveBrowserInfo(wsEndpoint, pid);
            console.error('已创建新的浏览器实例');
        }
    }

    async getPageContent(url: string): Promise<string> {
        // 自动初始化
        if (!this.browser) {
            await this.init();
        }

        let attempt = 0;
        const maxAttempts = 3;

        while (attempt < maxAttempts) {
            let page = null;
            try {
                // 检查浏览器连接状态，如果断开则尝试重新连接
                if (!this.browser!.connected) {
                    console.error('浏览器连接已断开，尝试重新连接...');
                    await this.close();
                    await this.init();
                }

                page = await this.browser!.newPage();
                
                // 设置页面超时
                await page.setDefaultNavigationTimeout(this.options.timeout || 30000);
                
                // 设置User-Agent
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                
                // 访问页面，使用更快的加载事件
                await page.goto(url, {
                    waitUntil: 'domcontentloaded', // 改为domcontentloaded，更快
                });

                // 等待页面内容加载
                await Promise.race([
                    page.waitForSelector('body'),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('等待body超时')), 5000)
                    )
                ]);
                
                // 检查是否需要额外等待
                const needsExtraWait = url.includes('google.com') || 
                                    url.includes('baidu.com') || 
                                    url.includes('so.com');
                
                if (needsExtraWait) {
                    // 对特定网站等待动态内容
                    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
                }

                // 获取页面内容
                const content = await page.content();
                
                return content;
            } catch (error: any) {
                attempt++;
                console.error(`获取页面内容失败(尝试 ${attempt}/${maxAttempts}):`, error);
                
                // 如果是连接问题，尝试重新初始化浏览器
                if (error.toString().includes('Protocol error') || 
                    error.toString().includes('Connection closed') ||
                    error.toString().includes('Target closed') ||
                    !this.browser?.connected) {
                    
                    console.error('检测到浏览器连接问题，尝试重新初始化...');
                    await this.close();
                    await this.init();
                }
                
                if (attempt >= maxAttempts) {
                    throw new Error(`获取页面失败(${maxAttempts}次尝试后): ${error}`);
                }
                
                // 等待一段时间再重试
                await new Promise(resolve => setTimeout(resolve, 1000));
            } finally {
                // 关闭页面
                if (page) {
                    try {
                        await page.close();
                    } catch (e) {
                        console.error('关闭页面失败:', e);
                    }
                }
            }
        }
        
        throw new Error('获取页面内容失败: 超过最大重试次数');
    }

    async close() {
        if (this.browser) {
            console.error('关闭浏览器...');
            await this.browser.close();
            this.browser = null;
            // 清理browser info文件
            if (fs.existsSync(this.infoPath)) {
                fs.unlinkSync(this.infoPath);
            }
        }
    }
}

// 创建一个默认导出的实例
export default new Browser();
