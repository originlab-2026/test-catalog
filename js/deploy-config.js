/**
 * 多平台部署配置与智能 Fallback
 * Cloudflare Pages 优先，GitHub Pages 备用（按 priority 选择，同优先级再比响应时间）
 *
 * 当前项目: 目录 (catalog)
 */

const DEPLOY_CONFIG = {
    projectId: 'catalog',

    platforms: [
        {
            id: 'cloudflare',
            name: 'Cloudflare Pages',
            priority: 1,
            baseUrl: 'https://<预留>.pages.dev/',
            hostnameIncludes: ['pages.dev'],
            checkPath: 'favicon.ico',
            enabled: true
        },
        {
            id: 'github',
            name: 'GitHub Pages',
            priority: 2,
            baseUrl: 'https://originlab-2026.github.io/test-catalog/',
            hostnameIncludes: ['github.io'],
            checkPath: 'favicon.ico',
            enabled: true
        }
    ],

    external: {
        loveDecoding: {
            cloudflare: 'https://love-decoding-test.pages.dev/',
            github: 'https://originlab-2026.github.io/love-decoding-test/'
        },
        futurePartner: {
            cloudflare: 'https://future-partner-test.pages.dev/',
            github: 'https://originlab-2026.github.io/future-partner-test/'
        },
        catalog: {
            cloudflare: 'https://<预留>.pages.dev/',
            github: 'https://originlab-2026.github.io/test-catalog/'
        }
    },

    detection: {
        timeout: 3000,
        cacheTTL: 300000,
        precheckDelay: 2000,
        useHeadRequest: true,
        useImageFallback: true
    }
};

const PLATFORM_CACHE_KEY = 'deploy_platform_cache_v3';

function isPlaceholderDeployUrl(url) {
    return !url || url.includes('<预留>');
}

function detectDeployPlatform() {
    const hostname = window.location.hostname;
    for (const platform of DEPLOY_CONFIG.platforms) {
        for (const include of platform.hostnameIncludes) {
            if (hostname.includes(include)) {
                return platform.id;
            }
        }
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'localhost';
    }
    return 'unknown';
}

function getCurrentDeployUrl() {
    const platform = detectDeployPlatform();
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const platformConfig = DEPLOY_CONFIG.platforms.find(p => p.id === platform);

    if (platformConfig) {
        if (platform === 'github') {
            const parts = pathname.split('/').filter(p => p);
            if (parts.length > 0) {
                return `https://${hostname}/${parts[0]}/`;
            }
        }
        if (platform === 'cloudflare') {
            return window.location.origin + '/';
        }
        return platformConfig.baseUrl;
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return window.location.origin + '/';
    }

    return 'https://' + hostname + '/';
}

function getPrimaryDeployUrl() {
    const platform = detectDeployPlatform();
    if (platform === 'cloudflare') {
        return getCurrentDeployUrl();
    }
    const cf = DEPLOY_CONFIG.platforms.find(p => p.id === 'cloudflare');
    if (cf && cf.enabled && !isPlaceholderDeployUrl(cf.baseUrl)) {
        return cf.baseUrl;
    }
    const gh = DEPLOY_CONFIG.platforms.find(p => p.id === 'github');
    return gh ? gh.baseUrl : getCurrentDeployUrl();
}

function compareAvailabilityByPriority(a, b) {
    const pa = DEPLOY_CONFIG.platforms.find(p => p.id === a.platformId);
    const pb = DEPLOY_CONFIG.platforms.find(p => p.id === b.platformId);
    const priA = pa ? pa.priority : 999;
    const priB = pb ? pb.priority : 999;
    if (priA !== priB) return priA - priB;
    return a.responseTime - b.responseTime;
}

function firstEnabledPlatformBaseUrl() {
    const ordered = [...DEPLOY_CONFIG.platforms]
        .filter(p => p.enabled && !isPlaceholderDeployUrl(p.baseUrl))
        .sort((a, b) => a.priority - b.priority);
    return ordered[0] ? ordered[0].baseUrl : '';
}

async function checkPlatformAvailability(platformId, timeout = DEPLOY_CONFIG.detection.timeout) {
    const platform = DEPLOY_CONFIG.platforms.find(p => p.id === platformId);
    if (!platform || !platform.enabled || isPlaceholderDeployUrl(platform.baseUrl)) {
        return { available: false, responseTime: Infinity };
    }

    const checkUrl = platform.baseUrl + platform.checkPath + '?' + Date.now();
    const startTime = performance.now();

    if (DEPLOY_CONFIG.detection.useHeadRequest) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            await fetch(checkUrl, {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const responseTime = performance.now() - startTime;
            console.log(`[DeployConfig] ${platform.name} available (${responseTime.toFixed(0)}ms)`);
            return { available: true, responseTime };
        } catch (e) {
            console.log(`[DeployConfig] ${platform.name} HEAD check failed`);
        }
    }

    if (DEPLOY_CONFIG.detection.useImageFallback) {
        return new Promise((resolve) => {
            const img = new Image();
            let resolved = false;

            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve({ available: false, responseTime: Infinity });
                }
            }, timeout);

            img.onload = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve({ available: true, responseTime: performance.now() - startTime });
                }
            };

            img.onerror = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve({ available: false, responseTime: Infinity });
                }
            };

            img.src = checkUrl;
        });
    }

    return { available: false, responseTime: Infinity };
}

async function checkAllPlatforms() {
    const enabledPlatforms = DEPLOY_CONFIG.platforms.filter(p => p.enabled);
    console.log(`[DeployConfig] Checking ${enabledPlatforms.length} platforms...`);

    const promises = enabledPlatforms.map(p =>
        checkPlatformAvailability(p.id).then(result => ({
            platformId: p.id,
            ...result,
            url: p.baseUrl
        }))
    );

    const results = await Promise.all(promises);

    const available = results
        .filter(r => r.available)
        .sort(compareAvailabilityByPriority);

    console.log('[DeployConfig] Available platforms:', available.map(r => `${r.platformId}(${r.responseTime.toFixed(0)}ms)`).join(', ') || 'none');
    return available;
}

function getCachedResults() {
    try {
        const cached = sessionStorage.getItem(PLATFORM_CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < DEPLOY_CONFIG.detection.cacheTTL) {
                console.log('[DeployConfig] Using cached results');
                return data.results;
            }
        }
    } catch (e) {
        console.warn('[DeployConfig] Cache read error:', e);
    }
    return null;
}

function setCachedResults(results) {
    try {
        sessionStorage.setItem(PLATFORM_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            results
        }));
    } catch (e) {
        console.warn('[DeployConfig] Cache write error:', e);
    }
}

async function getFallbackUrl() {
    const results = await checkAllPlatforms();
    if (results.length > 0) {
        return results[0].url;
    }
    return firstEnabledPlatformBaseUrl();
}

const EXTERNAL_TARGET_CACHE_PREFIX = 'deploy_external_target_v1_';
const EXTERNAL_TARGET_CACHE_TTL_MS = 120000;

/** 探测任意绝对 URL 是否可达（与外链站点健康检查一致） */
async function checkAbsoluteUrlReachable(fullCheckUrl, timeout = DEPLOY_CONFIG.detection.timeout) {
    const startTime = performance.now();
    if (DEPLOY_CONFIG.detection.useHeadRequest) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            await fetch(fullCheckUrl, {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            console.log(`[DeployConfig] URL reachable (HEAD): ${fullCheckUrl} (${(performance.now() - startTime).toFixed(0)}ms)`);
            return true;
        } catch (e) {
            console.log(`[DeployConfig] HEAD failed for ${fullCheckUrl}`);
        }
    }
    if (DEPLOY_CONFIG.detection.useImageFallback) {
        return new Promise((resolve) => {
            const img = new Image();
            let resolved = false;
            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve(false);
                }
            }, timeout);
            img.onload = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve(true);
                }
            };
            img.onerror = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve(false);
                }
            };
            img.src = fullCheckUrl;
        });
    }
    return false;
}

/**
 * 卡片跳转：对「目标仓库」的 Cloudflare 做可达性探测，失败再用 GitHub。
 * 不再使用目录站自身的 platforms 检测结果映射外链（此前会导致误判）。
 */
async function getBestExternalDeployUrl(target) {
    const ext = DEPLOY_CONFIG.external[target];
    if (!ext) {
        console.error('[DeployConfig] Unknown external target:', target);
        return null;
    }

    const cacheKey = EXTERNAL_TARGET_CACHE_PREFIX + target;
    try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
            const { url, ts } = JSON.parse(raw);
            if (Date.now() - ts < EXTERNAL_TARGET_CACHE_TTL_MS && url) {
                console.log('[DeployConfig] Using cached external URL for', target, url);
                return url;
            }
        }
    } catch (e) {
        /* ignore */
    }

    const cfBase = (ext.cloudflare || '').replace(/\/?$/, '/');
    const ghBase = (ext.github || '').replace(/\/?$/, '/');

    let chosen = null;
    if (cfBase && !isPlaceholderDeployUrl(ext.cloudflare)) {
        const probe = cfBase + 'favicon.ico?' + Date.now();
        const ok = await checkAbsoluteUrlReachable(probe);
        if (ok) {
            chosen = cfBase;
            console.log(`[DeployConfig] ${target}: using Cloudflare`);
        } else {
            console.log(`[DeployConfig] ${target}: Cloudflare probe failed`);
        }
    }
    if (!chosen && ghBase && !isPlaceholderDeployUrl(ext.github)) {
        chosen = ghBase;
        console.log(`[DeployConfig] ${target}: using GitHub fallback`);
    }
    if (!chosen && cfBase && !isPlaceholderDeployUrl(ext.cloudflare)) {
        chosen = cfBase;
    }

    if (chosen) {
        try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ url: chosen, ts: Date.now() }));
        } catch (e) {
            /* ignore */
        }
    }
    return chosen || null;
}

async function getBestAvailableUrl(target = null) {
    if (target && DEPLOY_CONFIG.external[target]) {
        return getBestExternalDeployUrl(target);
    }

    let results = getCachedResults();

    if (!results) {
        console.log('[DeployConfig] Cache miss, checking platforms...');
        results = await checkAllPlatforms();
        setCachedResults(results);
    }

    if (results.length === 0) {
        console.error('[DeployConfig] No platforms available!');
        return firstEnabledPlatformBaseUrl() || null;
    }

    const winner = results[0];
    const p = DEPLOY_CONFIG.platforms.find(x => x.id === winner.platformId);
    if (p && !isPlaceholderDeployUrl(p.baseUrl)) {
        return winner.url;
    }
    const fb = firstEnabledPlatformBaseUrl();
    return fb || null;
}

async function navigateWithFallback(target, triggerElement = null) {
    if (triggerElement) {
        triggerElement.style.opacity = '0.7';
        triggerElement.style.pointerEvents = 'none';
    }

    try {
        const url = await getBestAvailableUrl(target);
        if (url) {
            window.location.href = url;
        } else {
            console.error('[DeployConfig] No URL available for target:', target);
            alert('暂时无法连接到目标页面，请稍后再试');
            if (triggerElement) {
                triggerElement.style.opacity = '1';
                triggerElement.style.pointerEvents = 'auto';
            }
        }
    } catch (e) {
        console.error('[DeployConfig] Navigation error:', e);
        if (triggerElement) {
            triggerElement.style.opacity = '1';
            triggerElement.style.pointerEvents = 'auto';
        }
    }
}

function preloadPlatformChecks() {
    setTimeout(() => {
        console.log('[DeployConfig] Starting background platform checks...');
        checkAllPlatforms().then(results => {
            setCachedResults(results);
            console.log('[DeployConfig] Background check complete');
        }).catch(e => {
            console.warn('[DeployConfig] Background check failed:', e);
        });
    }, DEPLOY_CONFIG.detection.precheckDelay);
}

function clearPlatformCache() {
    sessionStorage.removeItem(PLATFORM_CACHE_KEY);
    console.log('[DeployConfig] Cache cleared');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEPLOY_CONFIG,
        detectDeployPlatform,
        getCurrentDeployUrl,
        getPrimaryDeployUrl,
        checkPlatformAvailability,
        checkAllPlatforms,
        checkAbsoluteUrlReachable,
        getBestExternalDeployUrl,
        getFallbackUrl,
        getBestAvailableUrl,
        navigateWithFallback,
        preloadPlatformChecks,
        clearPlatformCache
    };
}
