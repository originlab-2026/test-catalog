# Agent 备注 · test-catalog（目录站）

本项目是测试入口目录，**不负责**结果海报导出。

从本目录或某测试衍生新心理测试并上架时：

1. 在 `js/deploy-config.js` 的 `DEPLOY_CONFIG.external` 增加 Cloudflare / GitHub URL。
2. 更新 `catalog.html` / `index.html` 卡片与跳转。
3. **另外**在 `../image-tools/poster-export/configs/` 为新测试添加导出配置。
4. 占位期卡片：封面 PNG SHA256 写入 `catalogCards.*.placeholderSha256`，逻辑见 `js/catalog-cards.js`。

海报导出契约与衍生清单：仓库根目录 `AGENTS.md`。
