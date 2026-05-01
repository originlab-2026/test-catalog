/**
 * 多平台部署配置与智能Fallback模块
 * 支持 Cloudflare Pages > Gitee Pages > GitHub Pages 优先级Fallback
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
            enabled: false
        },
        {
            id: 'gitee',
            name: 'Gitee Pages',
            priority: 2,
            baseUrl: 'https://originlab.gitee.io/test-catalog/',
            hostnameIncludes: ['gitee.io'],
            checkPath: 'favicon.ico',
            enabled: true
        },
        {
            id: 'github',
            name: 'GitHub Pages',
            priority: 3,
            baseUrl: 'https://originlab-2026.github.io/test-catalog/',
            hostnameIncludes: ['github.io'],
            checkPath: 'favicon.ico',
            enabled: true
        }
    ],

    external: {
        loveDecoding: {
            cloudflare: 'https://<预留>.pages.dev/',
            gitee: 'https://originlab.gitee.io/love-decoding-test/',
            github: 'https://originlab-2026.github.io/love-decoding-test/'
        },
        futurePartner: {
            cloudflare: 'https://<预留>.pages.dev/',
            gitee: 'https://originlab.gitee.io/future-partner-test/',
            github: 'https://originlab-2026.github.io/future-partner-test/'
        },
        catalog: {
            cloudflare: 'https://<预留>.pages.dev/',
            gitee: 'https://originlab.gitee.io/test-catalog/',
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

const PLATFORM_CACHE_KEY = 'deploy_platform_cache_v2';

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
        return platformConfig.baseUrl;
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return window.location.origin + '/';
    }

    return 'https://' + hostname + '/';
}

function getGiteePriorityUrl() {
    const platform = detectDeployPlatform();
    if (platform === 'gitee') {
        return getCurrentDeployUrl();
    }
    const giteeConfig = DEPLOY_CONFIG.platforms.find(p => p.id === 'gitee');
    return giteeConfig ? giteeConfig.baseUrl : getCurrentDeployUrl();
}

async function checkPlatformAvailability(platformId, timeout = DEPLOY_CONFIG.detection.timeout) {
    const platform = DEPLOY_CONFIG.platforms.find(p => p.id === platformId);
    if (!platform || !platform.enabled) {
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
        .sort((a, b) => a.responseTime - b.responseTime);

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
    const fallback = DEPLOY_CONFIG.platforms.find(p => p.enabled);
    return fallback ? fallback.baseUrl : '';
}

async function getBestAvailableUrl(target = null) {
    let results = getCachedResults();

    if (!results) {
        console.log('[DeployConfig] Cache miss, checking platforms...');
        results = await checkAllPlatforms();
        setCachedResults(results);
    }

    if (results.length === 0) {
        console.error('[DeployConfig] No platforms available!');
        const fallback = DEPLOY_CONFIG.platforms.find(p => p.enabled);
        return fallback ? fallback.baseUrl : null;
    }

    if (target) {
        const externalUrls = DEPLOY_CONFIG.external[target];
        if (!externalUrls) {
            console.error('[DeployConfig] Unknown target:', target);
            return null;
        }

        for (const result of results) {
            if (externalUrls[result.platformId]) {
                console.log(`[DeployConfig] Best URL for ${target}:`, externalUrls[result.platformId]);
                return externalUrls[result.platformId];
            }
        }

        for (const platform of DEPLOY_CONFIG.platforms) {
            if (externalUrls[platform.id]) {
                console.warn(`[DeployConfig] Using fallback URL for ${target}:`, externalUrls[platform.id]);
                return externalUrls[platform.id];
            }
        }
    } else {
        return results[0].url;
    }

    return null;
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
        getGiteePriorityUrl,
        checkPlatformAvailability,
        checkAllPlatforms,
        getFallbackUrl,
        getBestAvailableUrl,
        navigateWithFallback,
        preloadPlatformChecks,
        clearPlatformCache
    };
}
