# 多平台部署指南

本指南说明如何将心理测试项目部署到 **Cloudflare Pages**（优先）与 **GitHub Pages**（备用），以及前端 Fallback 行为。

## 项目结构

共有三个独立项目，各自对应 GitHub 仓库：

| 项目 | GitHub 仓库 |
|------|-------------|
| 爱的解码 | `love-decoding-test` |
| 未来伴侣 | `future-partner-test` |
| 目录 | `test-catalog` |

## 部署配置说明

每个项目的 `js/deploy-config.js` 中配置了平台 URL 与 `external` 跨项目链接。

### 平台优先级

1. **Cloudflare Pages**（priority: 1）— 主线路；将占位符 `https://<预留>.pages.dev/` 换成真实 Pages URL 后即可参与可用性检测与跳转。
2. **GitHub Pages**（priority: 2）— 备用；检测到 Cloudflare 不可用或尚未配置时自动使用。

前端会按 **priority 优先**，在同一优先级内再比较探测响应时间。

## 步骤1: 验证 Git 安装

打开 PowerShell，执行：

```powershell
C:\Program Files\Git\bin\git.exe --version
```

如果显示版本号，说明 Git 安装正确。

## 步骤2: 配置 Git 别名（可选但推荐）

为了让 `git` 命令在 PowerShell 中可用，执行：

```powershell
Set-Alias -Name git -Value "C:\Program Files\Git\bin\git.exe"
git --version
```

## 步骤3: 进入项目目录并配置远程仓库

以「爱的解码」为例：

```powershell
cd "路径\love-decoding-test"

git remote -v

# 若需重置 origin
git remote remove origin
git remote add origin https://github.com/originlab-2026/love-decoding-test.git
git remote -v
```

另外两个仓库分别为 `future-partner-test`、`test-catalog`。

## 步骤4: 推送代码

```powershell
git add .
git commit -m "Update: deployment"
git push origin main
```

若默认分支为 `master`，将 `main` 换成 `master`。

## 步骤5: 开启 Pages 服务

### Cloudflare Pages（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. **Pages** → 创建项目 → 连接对应 GitHub 仓库
3. 框架预设选 **None**，输出目录为站点根目录（静态 HTML）
4. 部署完成后，把生成的 `https://xxx.pages.dev/` 写入三个项目里各自的 `js/deploy-config.js`：`platforms` 中 cloudflare 的 `baseUrl`，以及 `external` 里各条目的 `cloudflare` 字段（替换 `<预留>`）

### GitHub Pages

1. 仓库 **Settings** → **Pages**
2. Source: Deploy from a branch；分支选 `main` 或 `master`，目录 `/ (root)`
3. 保存后等待构建完成

## 步骤6: 验证部署

| 平台 | 爱的解码 | 未来伴侣 | 目录 |
|------|----------|----------|------|
| Cloudflare | 各自 Pages 域名 | 同上 | 同上 |
| GitHub | `https://originlab-2026.github.io/love-decoding-test/` | `https://originlab-2026.github.io/future-partner-test/` | `https://originlab-2026.github.io/test-catalog/` |

在浏览器控制台可查看 `[DeployConfig]` 日志；也可调用 `checkAllPlatforms()`、`getBestAvailableUrl('catalog')` 等（需在已加载 `deploy-config.js` 的页面）。

## 每次更新清单

1. 本地测试通过后提交并 `git push origin …`
2. Cloudflare 连接 GitHub 时会自动重新部署；GitHub Pages 随推送更新
3. 若更换了 Cloudflare 域名，同步修改所有相关仓库中的 `js/deploy-config.js`

## 故障排除

### git 不可用

每次新开 PowerShell 可执行：`Set-Alias -Name git -Value "C:\Program Files\Git\bin\git.exe"`

### Pages 404

1. 确认最新提交已推送  
2. Pages 源分支与目录正确  
3. 公开仓库且根目录存在 `index.html`  
4. `deploy-config.js` 中 URL 与实际域名一致  

### Fallback 异常

打开开发者工具 Console，查看 `[DeployConfig]`；确认 Cloudflare URL 已去掉 `<预留>` 占位符且探测未被浏览器扩展拦截。
