/**
 * 工具函数库 - 目录页面专用
 * localStorage 使用项目命名空间，避免与 github.io 同源下其它测试站串数据
 */

const StorageKeys = {
    UI_CONFIG: 'ui_config'
};

const STORAGE_NAMESPACE = 'test_catalog';
const LEGACY_STORAGE_KEYS = new Set([StorageKeys.UI_CONFIG]);

class StorageUtil {
    static getScopedKey(key) {
        return `${STORAGE_NAMESPACE}:${String(key)}`;
    }

    static parseStoredValue(raw) {
        if (raw === null || raw === undefined) return null;
        if (raw === '') return '';
        try {
            return JSON.parse(raw);
        } catch (e) {
            return raw;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(this.getScopedKey(key), JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    }

    static get(key, defaultValue = null) {
        try {
            const scopedKey = this.getScopedKey(key);
            const scopedItem = localStorage.getItem(scopedKey);
            if (scopedItem !== null) {
                return this.parseStoredValue(scopedItem);
            }

            const legacyItem = localStorage.getItem(key);
            if (legacyItem !== null) {
                const parsed = this.parseStoredValue(legacyItem);
                try {
                    localStorage.setItem(scopedKey, JSON.stringify(parsed));
                } catch (e) {
                    /* no-op */
                }
                localStorage.removeItem(key);
                return parsed;
            }

            return defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    }

    static remove(key) {
        localStorage.removeItem(this.getScopedKey(key));
        localStorage.removeItem(key);
    }
}

/**
 * 默认 UI 配置
 */
const DefaultUIConfig = {
    theme: 'default',
    primaryColor: '#3a3a3a',
    secondaryColor: '#9ca3af',
    backgroundColor: '#e8eaed',
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: {
        title: '2rem',
        subtitle: '1.25rem',
        body: '1rem',
        small: '0.875rem'
    },
    borderRadius: '12px',
    maxWidth: '800px'
};

/**
 * 获取当前 UI 配置（合并默认配置和自定义配置）
 */
function getUIConfig() {
    const customConfig = StorageUtil.get(StorageKeys.UI_CONFIG, {});
    const base = customConfig && typeof customConfig === 'object' && !Array.isArray(customConfig)
        ? customConfig
        : {};
    return { ...DefaultUIConfig, ...base };
}

/**
 * 应用 UI 配置到页面
 */
function applyUIConfig(config = null) {
    const uiConfig = config || getUIConfig();
    const root = document.documentElement;

    root.style.setProperty('--primary-color', uiConfig.primaryColor);
    root.style.setProperty('--secondary-color', uiConfig.secondaryColor);
    root.style.setProperty('--background-color', uiConfig.backgroundColor);
    root.style.setProperty('--font-family', uiConfig.fontFamily);
    root.style.setProperty('--border-radius', uiConfig.borderRadius);
    root.style.setProperty('--max-width', uiConfig.maxWidth);
}
