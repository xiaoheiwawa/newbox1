/**
 * 夸克网盘处理工具
 * 
 * 提供夸克网盘分享链接解析、文件下载、流媒体播放等功能。
 * 
 * @module QuarkPanHandler
 * @author 优雅
 * @since 1.0.0
 */

// 全局调试开关
let debug =  0;
// 站点名称
let siteName = '夸克';

// ==================== 日志函数 ====================

/**
 * 日志输出
 * @param {number} level - 日志级别 (0=调试, 1=成功, 2=警告, 3=错误, 4=信息)
 * @param {string} tag - 日志标签
 * @param {string} msg - 日志消息
 * @param {number} duration - 耗时(毫秒)
 */
function log(level, tag, msg, startTime) {
    if (debug == 0) return;
    if (debug == 1 && level !== 4) return;
    let prefix = ['🔍', '✅', '⚠️', '❌', '⚙️'][level] || '📝';
    let timeStr = startTime !== undefined ? ` 耗时⏱️${Date.now() - startTime}ms` : '';
    console.log(`${prefix}【${siteName}-${tag}】 ${msg}${timeStr}`);
}

// ==================== 批量并发请求工具 ====================

/**
 * 自定义批量请求（全部并发）
 */
async function batchFetch2(requests, timeout = 8000) {
    if (!requests || requests.length === 0) return [];
    let t1 = Date.now();
    
    const promises = requests.map(async (item) => {
        try {
            const url = typeof item === 'string' ? item : item.url;
            const options = typeof item === 'string' 
                ? { timeout: timeout }
                : (item.options || { timeout: timeout });
            const result = await req(url, options);
            return result.content || result;
        } catch (error) {
            log(3, '批量请求', url + ': ' + error);
            return null;
        }
    });
    
    const results = await Promise.all(promises);
    log(0, '批量请求', requests.length + '个请求全部并发', Date.now() - t1);
    return results;
}

/**
 * 获取批量请求函数
 */
function getBatchFn(requests) {
    if (typeof batchFetch === 'function') {
        return batchFetch(requests);
    }
    return batchFetch2(requests);
}

/**
 * 延迟函数
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================== 错误码定义 ====================
const ERROR_CODES = {
    // 空间相关
    32003: { message: "网盘空间不足，请清理空间或开通会员" },
    32008: { message: "存储配额已用完" },
    
    // 认证相关
    31001: { message: "未登录或Cookie已失效，请重新获取Cookie" },
    31002: { message: "登录态已过期，请重新登录" },
    32004: { message: "Cookie已失效，请重新获取" },
    32011: { message: "登录态已过期" },
    32012: { message: "认证失败，请检查Cookie" },
    32014: { message: "账号异常，请重新登录" },
    
    // 限流相关
    32001: { message: "请求过于频繁，请稍后再试" },
    32002: { message: "操作频率过高" },
    
    // 文件相关
    32005: { message: "文件不存在" },
    32006: { message: "文件已被删除" },
    32007: { message: "文件格式不支持" },
    
    // 分享相关
    32009: { message: "分享链接已失效" },
    32010: { message: "提取码错误" },
    32013: { message: "分享文件已被删除" }
};

/**
 * 夸克网盘处理类
 */
class QuarkHandler {
    constructor() {
        // 夸克分享链接正则表达式 - 匹配标准分享链接和提取密码
        this.regex = /https:\/\/pan\.quark\.cn\/s\/([^?&#]+)(?:\?.*?pwd=([^&]+))?/;
        // 请求参数
        this.pr = 'pr=ucpro&fr=pc';
        // 基础请求头
        this.baseHeader = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch',
            'Referer': 'https://pan.quark.cn',
            'Content-Type': 'application/json'
        };
        // API基础URL
        this.apiUrl = 'https://drive.quark.cn/1/clouddrive/';
        // 分享令牌缓存
        this.shareTokenCache = {};
        // 保存目录名称
        this.saveDirName = 'drpy';
        // 保存目录ID
        this.saveDirId = null;
        // 字幕文件扩展名
        this.subtitleExts = ['.srt', '.ass', '.scc', '.stl', '.ttml'];
        // 视频文件扩展名
        this.videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.ts', '.m3u8', '.rm', '.rmvb', '.3gp', '.m2ts', '.vob'];
        this.videoExtRegex = /\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|mpg|mpeg|rm|rmvb|3gp|ts|m2ts|vob)$/i;
        // 视频扩展名开关（1=启用判断，0=禁用）
        this.videoExtsEnabled = 0;
        
        // Cookie存储
        this._cookie = '';
        
        // 上次刷新时间
        this.lastRefreshTime = 0;
        this.refreshInterval = 1 * 24 * 60 * 60 * 1000;
        
        // 刷新锁
        this._isRefreshing = false;
        this._refreshPromise = null;
        
        // 播放地址临时缓存（20分钟）
        this.urlCache = {};
        this.cacheTTL = 20 * 60 * 1000;
        
        // 自动清理开关
        this.autoClean = true;
        
        // 最大遍历深度
        this.maxDepth = 5;
    }

    /**
     * 获取Cookie
     */
    get cookie() {
        if (this._cookie) return this._cookie;
        if (globalThis.quark_cookie) this._cookie = globalThis.quark_cookie;
        return this._cookie;
    }

    /**
     * 设置Cookie
     */
    set cookie(value) {
        this._cookie = value || '';
        if (value) globalThis.quark_cookie = value;
    }

    /**
     * 获取请求头
     */
    getHeaders() {
        return { ...this.baseHeader, Cookie: this.cookie };
    }
    
    /**
     * 延时函数
     */
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * 获取缓存的播放地址
     */
    getCachedUrl(shareId, fileId) {
        const cacheKey = `${shareId}_${fileId}`;
        const cached = this.urlCache[cacheKey];
        if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
            return cached.urls;
        }
        if (cached) delete this.urlCache[cacheKey];
        return null;
    }

    /**
     * 设置缓存的播放地址
     */
    setCachedUrl(shareId, fileId, urls) {
        const cacheKey = `${shareId}_${fileId}`;
        this.urlCache[cacheKey] = { urls: urls, timestamp: Date.now() };
    }

    /**
     * 统一请求函数
     * @param {string} url - 请求地址
     * @param {object} options - 请求配置
     * @param {number} retries - 重试次数
     * @param {string} requestType - 请求类型标识
     */
    async request(url, options, retries = 2, requestType = '未知') {
        const startTime = Date.now();
        log(0, '请求', '【' + requestType + '】→ ' + url);
        log(0, '请求', '【' + requestType + '】方法: ' + (options.method || 'GET'));
        
        if (options.data && debug >= 2) {
            const dataStr = JSON.stringify(options.data);
            if (dataStr.length > 500) {
                log(0, '请求', '【' + requestType + '】请求体(预览): ' + dataStr.substring(0, 500) + '...');
            } else {
                log(0, '请求', '【' + requestType + '】请求体: ' + dataStr);
            }
        }
        
        for (let i = 0; i <= retries; i++) {
            try {
                const response = await req(url, options);
                log(0, '响应', '【' + requestType + '】状态码: ' + (response.status || response.code || '未知'));
                
                if (response.content) {
                    try {
                        const json = JSON.parse(response.content);
                        if (debug >= 2) {
                            const jsonStr = JSON.stringify(json, null, 2);
                            if (jsonStr.length > 1000) {
                                log(0, '响应', '【' + requestType + '】响应体(预览): ' + jsonStr.substring(0, 1000) + '...');
                            } else {
                                log(0, '响应', '【' + requestType + '】响应体: ' + jsonStr);
                            }
                        }
                        
                        const code = json.code || json.status || json.errno;
                        if (code && code != 200 && code != 0) {
                            const totalTime = Date.now() - startTime;
                            log(3, '请求', '【' + requestType + '】失败 (code: ' + code + ')', totalTime);
                            return {
                                error: true,
                                code: code,
                                message: ERROR_CODES[code]?.message || '请求失败'
                            };
                        }
                        return json;
                    } catch {
                        return { content: response.content, status: response.status };
                    }
                }
                return { status: response.status };
            } catch (error) {
                log(3, '错误', '【' + requestType + '】失败 (' + (i + 1) + '/' + (retries + 1) + '): ' + (error?.message || error));
                if (i === retries) {
                    const totalTime = Date.now() - startTime;
                    log(3, '请求', '【' + requestType + '】最终失败', totalTime);
                    return { 
                        error: true, 
                        code: 31001, 
                        message: ERROR_CODES[31001]?.message || '未登录或Cookie已失效，请重新获取Cookie' 
                    };
                }
                await this.delay(100 * (i + 1));
            }
        }
    }

    /**
     * 确保Cookie有效
     */
    async ensureValidCookie() {
        const CACHE_TIME = 1 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const timeSinceLastRefresh = now - this.lastRefreshTime;
        
        const needRefresh = () => {
            if (this.lastRefreshTime === 0) return true;
            if (timeSinceLastRefresh >= CACHE_TIME) return true;
            if (!this.cookie || !this.cookie.includes('__puus=')) return true;
            return false;
        };
        
        if (!needRefresh()) {
            log(0, 'Cookie', '有效');
            return true;
        }
        
        log(0, 'Cookie', '开始刷新...');
        const originalCookie = this.cookie;
        const success = await this.refreshQuarkCookie();
        
        if (success && this.cookie && this.cookie.includes('__puus=')) {
            this.lastRefreshTime = now;
            log(1, 'Cookie', '刷新成功');
            return true;
        }
        
        this.cookie = originalCookie;
        if (originalCookie && originalCookie.includes('__puus=')) {
            log(2, 'Cookie', '使用旧Cookie');
            return true;
        }
        
        log(3, 'Cookie', '无效');
        return false;
    }

    /**
     * 刷新夸克Cookie
     */
    async refreshQuarkCookie() {
        if (this._isRefreshing) return await this._refreshPromise;
        
        this._isRefreshing = true;
        this._refreshPromise = (async () => {
            if (!this.cookie) return false;
            
            try {
                const url = `${this.apiUrl}file/sort?pr=ucpro&fr=pc&uc_param_str=&pdir_fid=0&_page=1&_size=50&_fetch_total=1&_fetch_sub_dirs=0&_sort=file_type:asc,updated_at:desc`;
                const resp = await req(url, {
                    method: "GET",
                    headers: {
                        "User-Agent": this.baseHeader['User-Agent'],
                        Origin: 'https://pan.quark.cn',
                        Referer: 'https://pan.quark.cn/',
                        Cookie: this.cookie
                    }
                });
                
                const setCookie = resp.headers?.['set-cookie'] || resp.headers?.['Set-Cookie'];
                if (setCookie) {
                    this.cookie = this.mergeCookies(this.cookie, setCookie);
                    log(1, 'Cookie', '刷新成功');
                    return true;
                }
                return false;
            } catch (error) {
                log(3, 'Cookie', '刷新异常: ' + error.message);
                return false;
            }
        })();
        
        try {
            return await this._refreshPromise;
        } finally {
            this._isRefreshing = false;
            this._refreshPromise = null;
        }
    }

    /**
     * 合并Cookie
     */
    mergeCookies(oldCookie, setCookie) {
        const oldCookies = {};
        if (oldCookie) {
            oldCookie.split(';').forEach(part => {
                const trimmed = part.trim();
                if (trimmed) {
                    const eqIndex = trimmed.indexOf('=');
                    if (eqIndex > 0) {
                        oldCookies[trimmed.substring(0, eqIndex)] = trimmed.substring(eqIndex + 1);
                    }
                }
            });
        }
        
        const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];
        for (const item of cookieArray) {
            const cookiePart = item.split(';')[0].trim();
            const eqIndex = cookiePart.indexOf('=');
            if (eqIndex > 0) {
                oldCookies[cookiePart.substring(0, eqIndex)] = cookiePart.substring(eqIndex + 1);
            }
        }
        
        return Object.entries(oldCookies).map(([key, value]) => `${key}=${value}`).join('; ');
    }

    /**
     * 解析分享链接
     * 从分享URL中提取shareId和密码
     * @param {string} url - 夸克分享链接
     * @returns {Object|null} 包含shareId、folderId、sharePwd的对象，解析失败返回null
     */
    getShareData(url) {
        const matches = this.regex.exec(url);
        if (!matches || !matches[1]) return null;
        
        let shareId = matches[1];
        if (shareId.indexOf("?") > 0) shareId = shareId.split('?')[0];
        const passCode = matches[2] || '';
        
        log(0, '解析', 'shareId: ' + shareId + ', passCode: ' + (passCode || '无'));
        return { shareId: shareId, folderId: '0', sharePwd: passCode };
    }

    /**
     * 初始化夸克
     */
    async initQuark(db, cfg) {
        log(4, '初始化', '开始初始化...');
        if (cfg?.quark_cookie) {
            this.cookie = cfg.quark_cookie;
            log(4, '初始化', '从配置加载Cookie');
        }
        if (cfg?.quark_videoExtsEnabled !== undefined) {
            this.videoExtsEnabled = cfg.quark_videoExtsEnabled;
            log(4, '初始化', 'videoExtsEnabled=' + this.videoExtsEnabled);
        }
        if (cfg?.quark_autoClean !== undefined) {
            this.autoClean = cfg.quark_autoClean;
            log(4, '初始化', 'autoClean=' + this.autoClean);
        }
        if (cfg?.quark_maxDepth !== undefined) {
            this.maxDepth = cfg.quark_maxDepth;
            log(4, '初始化', 'maxDepth=' + this.maxDepth);
        }
        if (this.lastRefreshTime === 0) this.lastRefreshTime = Date.now();
        await this.ensureValidCookie();
        log(4, '初始化', '完成');
    }

    /**
     * 最长公共子序列
     */
    lcs(str1, str2) {
        if (!str1 || !str2) return { length: 0, sequence: '', offset: 0 };
        let sequence = '';
        const str1Length = str1.length, str2Length = str2.length;
        const num = Array(str1Length).fill().map(() => Array(str2Length).fill(0));
        let maxlen = 0, lastSubsBegin = 0, thisSubsBegin = null;
        for (let i = 0; i < str1Length; i++) {
            for (let j = 0; j < str2Length; j++) {
                if (str1[i] === str2[j]) {
                    num[i][j] = (i === 0 || j === 0) ? 1 : 1 + num[i - 1][j - 1];
                    if (num[i][j] > maxlen) {
                        maxlen = num[i][j];
                        thisSubsBegin = i - num[i][j] + 1;
                        if (lastSubsBegin === thisSubsBegin) {
                            sequence += str1[i];
                        } else {
                            lastSubsBegin = thisSubsBegin;
                            sequence = str1.substr(lastSubsBegin, i + 1 - lastSubsBegin);
                        }
                    }
                }
            }
        }
        return { length: maxlen, sequence: sequence, offset: thisSubsBegin };
    }

    /**
     * 查找最佳匹配
     */
    findBestLCS(mainItem, targetItems) {
        const results = [];
        let bestMatchIndex = 0;
        for (let i = 0; i < targetItems.length; i++) {
            const currentLCS = this.lcs(mainItem.name || mainItem.file_name, targetItems[i].name || targetItems[i].file_name);
            results.push({ target: targetItems[i], lcs: currentLCS });
            if (currentLCS.length > results[bestMatchIndex].lcs.length) bestMatchIndex = i;
        }
        return { allLCS: results, bestMatch: results[bestMatchIndex], bestMatchIndex: bestMatchIndex };
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (!bytes || bytes == 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let i = 0, size = bytes;
        while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
        return size.toFixed(2) + ' ' + units[i];
    }

    /**
     * 判断是否为视频文件
     */
    isVideoFile(item) {
        if (!item) return false;
        if (item.dir === true) return false;
        const fileName = (item.file_name || '').toLowerCase();
        if (this.videoExtsEnabled === 1) {
            return this.videoExtRegex.test(fileName) || item.obj_category === 'video';
        } else {
            return item.obj_category === 'video';
        }
    }

    /**
     * 清理保存目录
     */
    async clearSaveDir() {
        if (!this.saveDirId) return { success: true };
        
        log(0, '清理目录', '开始清理 ' + this.saveDirName + ' 目录');
        const url = `${this.apiUrl}file/sort?pdir_fid=${this.saveDirId}&_page=1&_size=200&_sort=file_type:asc,updated_at:desc&${this.pr}`;
        const listData = await this.request(url, { method: 'GET', headers: this.getHeaders() }, 3, '清理目录-获取列表');
        
        if (listData.code && listData.code !== 200 && listData.code !== 0) {
            log(3, '清理目录', '获取列表失败: code=' + listData.code);
            return { error: true, code: listData.code, message: ERROR_CODES[listData.code]?.message || '获取目录文件列表失败' };
        }
        
        if (listData.data?.list?.length > 0) {
            const fileIds = listData.data.list.filter(item => this.isVideoFile(item)).map(v => v.fid);
            if (fileIds.length > 0) {
                const deleteUrl = `${this.apiUrl}file/delete?${this.pr}`;
                const deleteResult = await this.request(deleteUrl, {
                    method: 'POST',
                    data: { action_type: 2, filelist: fileIds, exclude_fids: [] },
                    headers: this.getHeaders()
                }, 3, '清理目录-删除文件');
                
                if (deleteResult.code && deleteResult.code !== 200 && deleteResult.code !== 0) {
                    log(3, '清理目录', '删除失败: code=' + deleteResult.code);
                    return { error: true, code: deleteResult.code, message: ERROR_CODES[deleteResult.code]?.message || '清理目录失败' };
                }
                log(1, '清理目录', '删除 ' + fileIds.length + ' 个视频文件');
            }
        }
        
        return { success: true };
    }

    /**
     * 创建保存目录
     */
    async createSaveDir(clean) {
        if (this.saveDirId) {
            if (clean) {
                const clearResult = await this.clearSaveDir();
                if (clearResult && clearResult.error) return clearResult;
            }
            return { success: true, dirId: this.saveDirId };
        }
        
        log(0, '目录', '创建保存目录: ' + this.saveDirName);
        const url = `${this.apiUrl}file/sort?pdir_fid=0&_page=1&_size=200&_sort=file_type:asc,updated_at:desc&${this.pr}`;
        const listData = await this.request(url, { method: 'GET', headers: this.getHeaders() }, 3, '创建目录-获取根目录');
        
        if (listData.code && listData.code !== 200 && listData.code !== 0) {
            const errorMsg = ERROR_CODES[listData.code]?.message || listData.message || '获取目录列表失败';
            log(3, '目录', '获取失败: code=' + listData.code);
            return { error: true, code: listData.code, message: errorMsg };
        }
        
        if (listData.message && listData.code !== 200 && listData.code !== 0) {
            return { error: true, code: listData.code || -1, message: listData.message };
        }
        
        if (listData.data?.list) {
            for (const item of listData.data.list) {
                if (item.file_name === this.saveDirName && item.dir === true) {
                    this.saveDirId = item.fid;
                    log(1, '目录', '已存在，ID: ' + this.saveDirId);
                    if (clean) {
                        const clearResult = await this.clearSaveDir();
                        if (clearResult && clearResult.error) return clearResult;
                    }
                    return { success: true, dirId: this.saveDirId };
                }
            }
        }
    
        if (!this.saveDirId) {
            const createUrl = `${this.apiUrl}file?${this.pr}`;
            const create = await this.request(createUrl, {
                method: 'POST',
                data: { pdir_fid: '0', file_name: this.saveDirName, dir_path: '', dir_init_lock: false },
                headers: this.getHeaders()
            }, 3, '创建目录-新建目录');
            
            if (create.code && create.code !== 200 && create.code !== 0) {
                const errorMsg = ERROR_CODES[create.code]?.message || create.message || '创建目录失败';
                log(3, '目录', '创建失败: code=' + create.code);
                return { error: true, code: create.code, message: errorMsg };
            }
            
            if (create.data?.fid) {
                this.saveDirId = create.data.fid;
                log(1, '目录', '创建成功，ID: ' + this.saveDirId);
                return { success: true, dirId: this.saveDirId };
            }
        }
        
        return { error: true, code: -1, message: '创建保存目录失败' };
    }

    /**
     * 获取分享令牌
     */
    async getShareToken(shareData) {
        if (!this.shareTokenCache[shareData.shareId]) {
            log(0, '分享令牌', '获取令牌: ' + shareData.shareId);
            const url = `${this.apiUrl}share/sharepage/token?${this.pr}`;
            const result = await this.request(url, {
                method: 'POST',
                data: { pwd_id: shareData.shareId, passcode: shareData.sharePwd || '' },
                headers: this.getHeaders()
            }, 3, '获取分享令牌');
            if (result.data?.stoken) {
                this.shareTokenCache[shareData.shareId] = result.data;
                log(1, '分享令牌', '获取成功');
            } else {
                log(3, '分享令牌', '获取失败: ' + shareData.shareId);
            }
        }
    }

    /**
     * 公用分页函数（并发）
     */
    async getPages(buildRequest, size = 100) {
        const firstReq = buildRequest(1);
        const firstResult = await this.request(firstReq.url, firstReq.options, 3, '获取第一页');
        if (firstResult.error || !firstResult.data?.list) {
            return [];
        }
        
        const total = firstResult.metadata?._total || 0;
        const totalPages = Math.ceil(total / size);
        if (totalPages <= 1) {
            return firstResult.data.list;
        }
        
        const all = [...firstResult.data.list];
        const requests = [];
        for (let page = 2; page <= totalPages; page++) {
            const req = buildRequest(page);
            requests.push({ url: req.url, options: req.options });
        }
        
        log(0, '分页', '总页数: ' + totalPages + ', 并发获取剩余 ' + (totalPages - 1) + ' 页');
        const results = await getBatchFn(requests);
        for (const result of results) {
            if (result) {
                try {
                    const json = typeof result === 'string' ? JSON.parse(result) : result;
                    if (json.data?.list) {
                        all.push(...json.data.list);
                    }
                } catch (e) {}
            }
        }
        return all;
    }

    /**
     * 获取分享目录所有页面（不需要Cookie）
     */
    async getSharePages(shareId, folderId, stoken, size = 100) {
        const buildRequest = (page) => {
            const url = this.apiUrl + 'share/sharepage/detail?pwd_id=' + shareId + '&stoken=' + encodeURIComponent(stoken) + '&pdir_fid=' + folderId + '&force=0&_page=' + page + '&_size=' + size + '&_sort=file_type:asc,file_name:asc&' + this.pr;
            return {
                url: url,
                options: { method: 'GET', headers: this.baseHeader }
            };
        };
        return await this.getPages(buildRequest, size);
    }

    // ==================== 并发获取文件列表（优化版） ====================

    /**
     * 通过分享链接获取文件列表（并发优化版）
     * 使用 getBatchFn 并发获取所有子目录
     * @param {Object|string} shareInfo - 分享数据对象或分享链接
     * @param {number} maxDepth - 最大遍历深度（默认使用 this.maxDepth）
     * @returns {Array} 视频文件列表
     */
    async getFilesByShareUrl(shareInfo, maxDepth = null) {
        const startTime = Date.now();
        const depth = maxDepth !== null ? maxDepth : this.maxDepth;
        log(0, '文件列表', '开始获取 (最大深度: ' + depth + ')');
        await this.ensureValidCookie();
        
        const shareData = typeof shareInfo === 'string' ? this.getShareData(shareInfo) : shareInfo;
        if (!shareData) {
            log(3, '文件列表', '分享数据无效');
            return [];
        }
        
        await this.getShareToken(shareData);
        if (!this.shareTokenCache[shareData.shareId]) {
            log(3, '文件列表', '获取分享令牌失败');
            return [];
        }
        
        const videos = [];
        const subtitles = [];
        const stoken = this.shareTokenCache[shareData.shareId].stoken;
        
        /**
         * 处理文件项，提取视频和字幕
         */
        const processItems = (items) => {
            for (const item of items) {
                const fileName = item.file_name || '';
                if (item.dir === true) continue;
                if (item.file === true && item.size >= 1024 * 1024 * 5) {
                    let isVideo = false;
                    if (this.videoExtsEnabled === 1) {
                        isVideo = this.videoExts.some(ext => fileName.toLowerCase().endsWith(ext)) || item.obj_category === 'video';
                    } else {
                        isVideo = item.obj_category === 'video';
                    }
                    if (isVideo) {
                        item.stoken = stoken;
                        item.formatted_size = this.formatFileSize(item.size);
                        item.thumbnail = item.thumbnail || item.big_thumbnail || '';
                        item.file_type = 'video';
                        videos.push(item);
                    }
                } else if (item.type === 'file' && this.subtitleExts.some(ext => fileName.toLowerCase().endsWith(ext))) {
                    subtitles.push(item);
                }
            }
        };
        
        /**
         * 使用 getBatchFn 并发获取指定层级的子目录
         */
        const fetchLevel = async (dirs, currentDepth) => {
            if (currentDepth >= depth || dirs.length === 0) return [];
            
            // 构建所有子目录的请求
            const requests = dirs.map(dir => {
                const url = this.apiUrl + 'share/sharepage/detail?pwd_id=' + shareData.shareId + 
                            '&stoken=' + encodeURIComponent(stoken) + '&pdir_fid=' + dir.fid + 
                            '&force=0&_page=1&_size=100&_sort=file_type:asc,file_name:asc&' + this.pr;
                return { url, options: { method: 'GET', headers: this.baseHeader } };
            });
            
            log(0, '并发获取', '第' + currentDepth + '层，' + requests.length + '个目录');
            // 🔥 使用 getBatchFn 并发请求所有子目录
            const results = await getBatchFn(requests);
            
            const allItems = [];
            const nextLevelDirs = [];
            
            for (const result of results) {
                if (result) {
                    try {
                        const json = typeof result === 'string' ? JSON.parse(result) : result;
                        if (json.data?.list) {
                            const items = json.data.list;
                            allItems.push(...items);
                            // 收集下一层的子目录
                            if (currentDepth + 1 < depth) {
                                for (const item of items) {
                                    if (item.dir === true) {
                                        nextLevelDirs.push({ fid: item.fid });
                                    }
                                }
                            }
                        }
                    } catch (e) {}
                }
            }
            
            // 处理当前层的文件
            processItems(allItems);
            
            // 如果有下一层，继续并发获取
            if (nextLevelDirs.length > 0 && currentDepth + 1 < depth) {
                await fetchLevel(nextLevelDirs, currentDepth + 1);
            }
            return allItems;
        };
        
        // 第一步：获取根目录
        const rootItems = await this.getSharePages(shareData.shareId, shareData.folderId, stoken, 100);
        if (!rootItems || rootItems.length === 0) {
            log(0, '文件列表', '根目录无内容');
            return [];
        }
        
        // 处理根目录
        processItems(rootItems);
        
        // 收集根目录下的子目录
        const rootDirs = [];
        for (const item of rootItems) {
            if (item.dir === true && depth > 0) {
                rootDirs.push({ fid: item.fid });
            }
        }
        
        // 🔥 使用 getBatchFn 并发获取所有子目录
        if (rootDirs.length > 0) {
            await fetchLevel(rootDirs, 1);
        }
        
        // 字幕匹配
        if (subtitles.length > 0) {
            log(0, '文件列表', '找到 ' + subtitles.length + ' 个字幕文件，开始匹配');
            for (const item of videos) {
                const matchSubtitle = this.findBestLCS(item, subtitles);
                if (matchSubtitle.bestMatch) {
                    item.subtitle = matchSubtitle.bestMatch.target;
                    log(0, '字幕匹配', item.file_name + ' -> ' + matchSubtitle.bestMatch.target.file_name);
                }
            }
        }
        
        // 按集数排序
        videos.sort((a, b) => {
            const numA = parseInt((a.file_name || '').replace(/[^\d]/g, '')) || 0;
            const numB = parseInt((b.file_name || '').replace(/[^\d]/g, '')) || 0;
            return numA - numB;
        });
        
        const elapsed = Date.now() - startTime;
        log(1, '文件列表', '找到 ' + videos.length + ' 个视频 (遍历深度: ' + depth + ')', elapsed);
        return videos;
    }

    /**
     * 保存文件到个人网盘
     */
    async saveDirect(shareId, stoken, fileId, fileToken) {
        const dirResult = await this.createSaveDir(false);
        if (dirResult.error) {
            return { error: true, code: dirResult.code, message: dirResult.message };
        }
        
        if (!stoken) {
            await this.getShareToken({ shareId });
            if (!this.shareTokenCache[shareId]) {
                return { error: true, code: -2, message: '获取分享令牌失败' };
            }
            stoken = this.shareTokenCache[shareId].stoken;
        }
        
        log(0, '保存', '保存文件: ' + fileId);
        const saveUrl = `${this.apiUrl}share/sharepage/save?${this.pr}`;
        const saveResult = await this.request(saveUrl, {
            method: 'POST',
            data: {
                fid_list: [fileId],
                fid_token_list: [fileToken],
                to_pdir_fid: this.saveDirId,
                pwd_id: shareId,
                stoken: stoken,
                pdir_fid: '0',
                scene: 'link'
            },
            headers: this.getHeaders()
        }, 3, '保存文件');
        
        // 检查错误
        if (saveResult.code && saveResult.code !== 200 && saveResult.code !== 0) {
            log(3, '保存', '失败: code=' + saveResult.code);
            return { error: true, code: saveResult.code, message: ERROR_CODES[saveResult.code]?.message || '保存文件失败' };
        }
        
        if (saveResult.data?.task_resp?.code) {
            return { error: true, code: saveResult.data.task_resp.code, message: saveResult.data.task_resp.message || '保存文件失败' };
        }
        
        if (saveResult.data?.task_id) {
            if (saveResult.data.task_resp?.data?.save_as?.save_as_top_fids?.length > 0) {
                log(1, '保存', '保存成功');
                return saveResult.data.task_resp.data.save_as.save_as_top_fids[0];
            }
            for (let retry = 0; retry < 10; retry++) {
                await this.delay(1000);
                const taskUrl = `${this.apiUrl}task?task_id=${saveResult.data.task_id}&retry_index=${retry}&${this.pr}`;
                const taskResult = await this.request(taskUrl, { method: 'GET', headers: this.getHeaders() }, 3, '查询保存任务-' + (retry + 1));
                if (taskResult.code && taskResult.code !== 200 && taskResult.code !== 0) {
                    return { error: true, code: taskResult.code, message: ERROR_CODES[taskResult.code]?.message || '查询任务状态失败' };
                }
                if (taskResult.data?.save_as?.save_as_top_fids?.length > 0) {
                    log(1, '保存', '保存成功');
                    return taskResult.data.save_as.save_as_top_fids[0];
                }
            }
        }
        
        return { error: true, code: -3, message: '保存文件超时，请稍后重试' };
    }

    /**
     * 获取直播转码播放地址
     */
    async getLiveTranscoding(shareId, stoken, fileId, fileToken) {
        // 先检查缓存
        const cacheKey = `${shareId}_${fileId}_transcoding`;
        const cachedResult = this.urlCache[cacheKey];
        if (cachedResult && (Date.now() - cachedResult.timestamp) < this.cacheTTL) {
            return cachedResult.urls;
        }
        
        log(0, '转码', '获取转码地址: ' + fileId);
        try {
            // 转存文件
            const saveFileId = await this.saveDirect(shareId, stoken, fileId, fileToken);
            if (!saveFileId || saveFileId.error) {
                log(3, '转码', '转存失败: ' + (saveFileId?.message || '未知错误'));
                return null;
            }
            
            // 请求转码画质
            const url = `${this.apiUrl}file/v2/play?${this.pr}`;
            const result = await this.request(url, {
                method: 'POST',
                data: {
                    fid: saveFileId,
                    resolutions: 'normal,low,high,super,2k,4k',
                    supports: 'fmp4'
                },
                headers: this.getHeaders()
            }, 3, '获取转码地址');
            
            const videoList = result.data?.video_list || null;
            if (videoList && videoList.length > 0) {
                // 缓存播放地址
                this.urlCache[cacheKey] = { urls: videoList, timestamp: Date.now() };
                log(1, '转码', '获取成功，共 ' + videoList.length + ' 种画质');
                
                // 异步删除临时文件
                this.delay(3000).then(() => {
                    this.deleteFile(saveFileId).catch(e => {});
                });
                
                return videoList;
            } else {
                log(2, '转码', '未获取到转码地址');
                return null;
            }
        } catch (error) {
            log(3, '转码', '异常: ' + error.message);
            return null;
        }
    }

    /**
     * 删除文件
     */
    async deleteFile(fileId) {
        if (!fileId) return;
        log(0, '删除', '删除文件: ' + fileId);
        const deleteUrl = `${this.apiUrl}file/delete?${this.pr}`;
        await this.request(deleteUrl, {
            method: 'POST',
            data: { action_type: 2, filelist: [fileId], exclude_fids: [] },
            headers: this.getHeaders()
        }, 3, '删除临时文件');
    }

    /**
     * 获取下载令牌
     */
    async getToken() {
        let t = Math.floor(Date.now() / 1e3);
        let data = {
            "conversation_id": "300000" + t,
            "conversation_type": 3,
            "msg_id": t + "000"
        };
        
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/3.23.2 Chrome/112.0.5615.165 Electron/24.1.3.8 Safari/537.36 Channel/pckk_other_ch',
            'Content-Type': 'application/json',
            'origin': 'https://pan.quark.cn',
            'referer': 'https://pan.quark.cn/'
        };
        
        log(0, 'Token', '获取下载令牌...');
        const response = await req('https://drive-social-api.quark.cn/1/clouddrive/chat/conv/file/acquire_dl_token?pr=ucpro&fr=pc&sys=darwin&ve=3.19', {
            method: 'POST',
            headers: { ...headers, 'Cookie': this.cookie },
            data: data
        });
        if (response.code == 200 && response.content) {
            const result = JSON.parse(response.content);
            const token = result.data?.token;
            log(0, 'Token', token ? '获取成功' : '获取失败');
            return token;
        }
        return null;
    }

    /**
     * 获取无限画质链接
     */
    async getUrl(shareId, stoken, fileId, fileToken) {
        log(0, 'getUrl', '获取无限画质链接: ' + fileId);
        const token = await this.getToken();
        if (!token) {
            log(3, 'getUrl', '获取令牌失败');
            return null;
        }
        
        let data = {
            "fids": [fileId],
            "fids_token": [fileToken],
            "pwd_id": shareId,
            "stoken": stoken,
            "speedup_session": "",
            "token": token
        };
        
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/3.20.0 Chrome/112.0.5615.165 Electron/24.1.3.8 Safari/537.36 Channel/pckk_other_ch',
            'Content-Type': 'application/json'
        };
        
        const response = await req('https://drive-pc.quark.cn/1/clouddrive/file/download?pr=ucpro&fr=pc', {
            method: 'POST',
            headers: { ...headers, 'Cookie': this.cookie },
            data: data
        });
        
        if (response.code == 200 && response.content) {
            const result = JSON.parse(response.content);
            if (result.data && Array.isArray(result.data)) {
                const urls = result.data.map(item => ({
                    name: item.video_max_resolution || '原画',
                    url: item.download_url
                }));
                log(1, 'getUrl', '获取成功，共 ' + urls.length + ' 种画质');
                return urls;
            }
        }
        log(3, 'getUrl', '获取失败');
        return null;
    }

    /**
     * 获取下载链接
     */
    async getDownload(shareId, stoken, fileId, fileToken, clean = false) {
        // 先检查缓存
        const cachedResult = this.getCachedUrl(shareId, fileId);
        if (cachedResult) return cachedResult;
        
        log(0, '下载', '获取下载链接: ' + fileId);
        await this.ensureValidCookie();
        
        const dirResult = await this.createSaveDir(clean);
        if (dirResult.error) {
            return { error: true, code: dirResult.code, message: dirResult.message };
        }
        
        const saveFileId = await this.saveDirect(shareId, stoken, fileId, fileToken);
        
        // 检查保存是否失败，直接返回 saveDirect 的错误信息
        if (saveFileId && saveFileId.error) {
            return saveFileId;
        }
        
        if (!saveFileId) {
            return {
                error: true,
                code: -1,
                message: '文件转存失败，请检查分享链接是否有效'
            };
        }
        
        const url = `${this.apiUrl}file/download?${this.pr}`;
        const result = await this.request(url, {
            method: 'POST',
            data: { fids: [saveFileId] },
            headers: this.getHeaders()
        }, 3, '获取下载链接');
        
        // 检查错误码
        if (result.code && result.code !== 200 && result.code !== 0) {
            log(3, '下载', '失败: code=' + result.code);
            return {
                error: true,
                code: result.code,
                message: ERROR_CODES[result.code]?.message || '获取下载链接失败'
            };
        }
        
        if (result.data?.task_resp?.code) {
            return {
                error: true,
                code: result.data.task_resp.code,
                message: result.data.task_resp.message || '获取下载链接失败'
            };
        }
        
        const downloadResult = result.data?.[0] || null;
        
        if (downloadResult) {
            this.setCachedUrl(shareId, fileId, downloadResult);
            return downloadResult;
        }
        
        return {
            error: true,
            code: -2,
            message: '获取下载链接失败，请稍后重试'
        };
    }

    /**
     * 测试URL支持性
     */
    async testSupport(url, headers) {
        try {
            const resp = await req(url, {
                method: 'GET',
                headers: { ...this.baseHeader, ...headers, 'Range': 'bytes=0-0' }
            });
            
            if (resp.code === 206 || resp.code === 200) {
                const isAccept = resp.headers?.['accept-ranges'] === 'bytes';
                const contentRange = resp.headers?.['content-range'];
                const contentLength = parseInt(resp.headers?.['content-length'] || '0');
                const isSupport = isAccept || !!contentRange || contentLength === 1 || resp.status === 200;
                return [isSupport, resp.headers || {}];
            }
            return [false, null];
        } catch {
            return [false, null];
        }
    }
}

export const Quark = new QuarkHandler();