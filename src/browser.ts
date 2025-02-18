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
        if (!this.browser) {
            await this.init();
        }

        const page = await this.browser!.newPage();
        
        try {
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
        } catch (error) {
            throw new Error(`Failed to get page content: ${error}`);
        } finally {
            // 只关闭页面，不关闭浏览器
            await page.close();
        }
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
