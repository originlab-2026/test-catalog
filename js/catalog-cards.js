/**
 * 目录站卡片：占位封面（SHA256 匹配）时显示「敬请期待」且不可跳转；
 * 替换为正式设计稿后自动启用跳转。
 */

async function sha256HexFromBlob(blob) {
    const buf = await blob.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {string} cardId
 * @param {{ coverImage: string, placeholderSha256: string, version?: string }} cfg
 */
async function applyCatalogCardLiveState(cardId, cfg) {
    const card = document.getElementById(cardId);
    if (!card || !cfg || !cfg.placeholderSha256) return;

    let isPlaceholder = true;
    try {
        const url = `${cfg.coverImage}?v=${encodeURIComponent(cfg.version || '1')}&_=${Date.now()}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('cover fetch failed');
        const hash = await sha256HexFromBlob(await res.blob());
        isPlaceholder = hash === cfg.placeholderSha256;
    } catch (e) {
        console.warn('[CatalogCards] cover check failed:', cardId, e);
        isPlaceholder = true;
    }

    if (isPlaceholder) {
        card.classList.add('catalog-card--coming-soon');
        card.dataset.live = '0';
        card.setAttribute('aria-disabled', 'true');
    } else {
        card.classList.remove('catalog-card--coming-soon');
        card.dataset.live = '1';
        card.removeAttribute('aria-disabled');
    }
}

async function initCatalogComingSoonCards() {
    const cards = (DEPLOY_CONFIG && DEPLOY_CONFIG.catalogCards) || {};
    const tasks = Object.values(cards).map((cfg) => applyCatalogCardLiveState(cfg.cardId, cfg));
    await Promise.all(tasks);
}

function isCatalogCardLive(cardEl) {
    return cardEl && cardEl.dataset.live === '1';
}

async function navigateCatalogCard(target, cardId) {
    const card = document.getElementById(cardId);
    if (!isCatalogCardLive(card)) {
        return;
    }
    await navigateWithFallback(target, card);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sha256HexFromBlob,
        applyCatalogCardLiveState,
        initCatalogComingSoonCards,
        isCatalogCardLive,
        navigateCatalogCard
    };
}
