/**
 * 目录站：卡片跳转仅依赖 Cloudflare Pages + GitHub Pages。
 * 先探测目标站 Cloudflare，失败则使用 GitHub。
 */

const DEPLOY_CONFIG = {
    projectId: 'catalog',

    external: {
        loveDecoding: {
            cloudflare: 'https://love-decoding-test.pages.dev/',
            github: 'https://originlab-2026.github.io/love-decoding-test/'
        },
        futurePartner: {
            cloudflare: 'https://future-partner-test.pages.dev/',
            github: 'https://originlab-2026.github.io/future-partner-test/'
        },
        stressCreature: {
            cloudflare: 'https://stress-creature-test.pages.dev/',
            github: 'https://originlab-2026.github.io/stress-creature-test/'
        },
        perfectCity: {
            cloudflare: 'https://perfect-city-test.pages.dev/',
            github: 'https://originlab-2026.github.io/perfect-city-test/'
        },
        marriageReadiness: {
            cloudflare: 'https://marriage-readiness-test.pages.dev/',
            github: 'https://originlab-2026.github.io/marriage-readiness-test/'
        },
        ancientTitle: {
            cloudflare: 'https://ancient-title-test.pages.dev/',
            github: 'https://originlab-2026.github.io/ancient-title-test/'
        },
        strengthCompass: {
            cloudflare: 'https://strength-compass-test.pages.dev/',
            github: 'https://originlab-2026.github.io/strength-compass-test/'
        },
        bondType: {
            cloudflare: 'https://bond-type-test.pages.dev/',
            github: 'https://originlab-2026.github.io/bond-type-test/'
        }
    },

    /** 占位封面 SHA256（与 image-tools/placeholder-manifest.json 同步）；换正式图后自动上线 */
    catalogCards: {
        strengthCompass: {
            cardId: 'strength-compass-test-card',
            coverImage: 'assets/images/天赋自测首页.png',
            placeholderSha256: '9ce2133ec7470dfc596d03321e3bc9a938fb86febf36e1ebb6fee876ec7e3335',
            version: '1'
        },
        marriageReadiness: {
            cardId: 'marriage-readiness-card',
            coverImage: 'assets/images/结婚准备首页.png',
            placeholderSha256: '008a4517775041e762ba007e2c1114a09bdf4fd258b10497ee593cf849fec538',
            version: '2'
        },
        ancientTitle: {
            cardId: 'ancient-title-card',
            coverImage: 'assets/images/古代官衔首页.png',
            placeholderSha256: '9ce2133ec7470dfc596d03321e3bc9a938fb86febf36e1ebb6fee876ec7e3335',
            version: '2'
        },
        bondType: {
            cardId: 'bond-type-card',
            coverImage: 'assets/images/依恋类型首页.png',
            placeholderSha256: '5623906ffc9f7f54d3e6be5856a134f01e4241fc3e543137b8ae2fd225e279a2',
            version: '1'
        }
    },

    detection: {
        timeout: 3000,
        useHeadRequest: true,
        useImageFallback: true
    }
};

const EXTERNAL_TARGET_CACHE_PREFIX = 'deploy_external_target_v1_';
const EXTERNAL_TARGET_CACHE_TTL_MS = 120000;

function isPlaceholderDeployUrl(url) {
    return !url || url.includes('<预留>');
}

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

async function navigateWithFallback(target, triggerElement = null) {
    if (triggerElement) {
        triggerElement.style.opacity = '0.7';
        triggerElement.style.pointerEvents = 'none';
    }

    try {
        const url = await getBestExternalDeployUrl(target);
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

function clearDeployCaches() {
    try {
        Object.keys(DEPLOY_CONFIG.external).forEach((target) => {
            sessionStorage.removeItem(EXTERNAL_TARGET_CACHE_PREFIX + target);
        });
    } catch (e) {
        /* ignore */
    }
    console.log('[DeployConfig] External URL cache cleared');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEPLOY_CONFIG,
        checkAbsoluteUrlReachable,
        getBestExternalDeployUrl,
        navigateWithFallback,
        clearDeployCaches
    };
}
