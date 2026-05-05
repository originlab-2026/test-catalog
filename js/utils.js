/**
 * 工具函数库 - 目录页面专用
 * 仅保留 UI 配置相关功能
 */

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
    try {
        const customConfig = JSON.parse(localStorage.getItem('ui_config') || '{}');
        return { ...DefaultUIConfig, ...customConfig };
    } catch (e) {
        return DefaultUIConfig;
    }
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
