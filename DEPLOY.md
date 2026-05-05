# Cloudflare Pages 与 GitHub Pages 部署（目录站）

目录站 **仅** 使用 **Cloudflare Pages**（主）与 **GitHub Pages**（备）。卡片跳转会在各目标项目内同样按「先 Cloudflare、再 GitHub」探测。

## 仓库

| 项目     | GitHub 仓库           |
|----------|------------------------|
| 爱的解码 | `love-decoding-test`   |
| 未来伴侣 | `future-partner-test`  |
| 目录     | `test-catalog`         |

## 配置位置

`js/deploy-config.js` 中的 `external`：每张卡片对应项目的 Cloudflare 与 GitHub 根 URL（仅此两处托管，无其它平台逻辑）。

## 发布步骤

1. 本地确认静态页正常后提交并推送：

```bash
cd /path/to/test-catalog
git add .
git commit -m "chore: deploy catalog (Cloudflare + GitHub only)"
git push origin main
```

（若默认分支为 `master`，将 `main` 改为 `master`。）

2. **Cloudflare Pages**：连接 GitHub 仓库，框架选 **None**，输出目录为站点根目录；部署完成后域名一般为 `https://test-catalog.pages.dev/`（与仓库名一致时）。

3. **GitHub Pages**：仓库 **Settings → Pages**，从分支 `main`（或 `master`）发布根目录。

## 验证

- 目录站：Cloudflare `https://test-catalog.pages.dev/`、GitHub `https://originlab-2026.github.io/test-catalog/`
- 控制台中的 `[DeployConfig]` 日志可确认卡片跳转探测结果。

## 故障排除

- **404**：确认已推送最新提交，Pages 源分支与目录为根目录，且存在 `index.html` / `catalog.html`。
- **Fallback 异常**：确认各 `cloudflare` / `github` URL 与线上实际域名一致；探测使用 `favicon.ico`，勿被扩展拦截。
