# 多平台部署指南

本指南说明如何将心理测试项目部署到多个平台（Cloudflare Pages / Gitee Pages / GitHub Pages），并实现智能 Fallback 机制。

## 项目结构

共有三个独立项目，分别对应不同的仓库：

| 项目 | 本地路径 | GitHub 仓库 | Gitee 仓库 |
|------|----------|-------------|------------|
| 爱的解码 | `心理测试 - 爱的解码` | `love-decoding-test` | `love-decoding-test` |
| 未来伴侣 | `心理测试 - 未来伴侣` | `future-partner-test` | `future-partner-test` |
| 目录 | `心理测试 - 目录` | `test-catalog` | `test-catalog` |

## 部署配置说明

每个项目的 `js/deploy-config.js` 中配置了三个平台的 URL：

### 平台优先级
1. **Cloudflare Pages** (priority: 1) - 默认禁用，填入 URL 后将启用
2. **Gitee Pages** (priority: 2) - 标准 Gitee Pages 服务
3. **GitHub Pages** (priority: 3) - 自动从 GitHub 仓库部署

### 启用 Cloudflare Pages
1. 在 Cloudflare 控制台创建 Pages 项目
2. 将生成的 URL（如 `https://your-project.pages.dev/`）填入 `js/deploy-config.js`
3. 将该平台的 `enabled` 改为 `true`
4. 同时更新所有项目中 `external` 配置里对应项目的 Cloudflare URL

## 步骤1: 验证 Git 安装

打开 PowerShell，执行：
```powershell
C:\Program Files\Git\bin\git.exe --version
```

如果显示版本号，说明 Git 安装正确。

## 步骤2: 配置 Git 别名（可选但推荐）

为了让 `git` 命令在 PowerShell 中可用，执行：
```powershell
# 为当前会话添加 git 别名
Set-Alias -Name git -Value "C:\Program Files\Git\bin\git.exe"

# 验证
git --version
```

## 步骤3: 进入项目目录并配置远程仓库

以"爱的解码"项目为例：

```powershell
cd "d:\局域网共享文件夹\Qoder项目\心理测试 - 爱的解码"

# 查看现有远程仓库
git remote -v

# 如果远程仓库不正确，先删除
git remote remove origin
git remote remove gitee

# 添加正确的远程仓库
git remote add origin https://github.com/originlab-2026/love-decoding-test.git
git remote add gitee https://gitee.com/originlab/love-decoding-test.git

# 验证
git remote -v
```

其他两个项目类似，仅仓库名称不同：
- 未来伴侣: `future-partner-test`
- 目录: `test-catalog`

## 步骤4: 推送代码到所有仓库

```powershell
# 添加所有更改
git add .

# 提交
git commit -m "Update: multi-platform fallback deployment"

# 推送到 GitHub（自动触发 GitHub Pages + Cloudflare Pages）
git push origin main
# 如果失败，尝试: git push origin master

# 推送到 Gitee（手动触发 Gitee Pages 部署）
git push gitee main
# 如果失败，尝试: git push gitee master
```

## 步骤5: 开启 Pages 服务

### Cloudflare Pages（推荐）:
1. 登录 Cloudflare Dashboard: https://dash.cloudflare.com/
2. 进入 Pages > 创建项目
3. 连接到 GitHub 仓库
4. 构建设置：框架预设选 "None"，构建输出目录留空（根目录部署）
5. 保存并部署
6. 将生成的 URL 填入 `js/deploy-config.js` 中的 `cloudflare.baseUrl`

### Gitee Pages:
1. 访问 Gitee 仓库页面
2. 进入 服务 > Gitee Pages
3. 选择部署分支（main 或 master）
4. 点击 "启动" 或 "更新"
5. 等待部署完成（通常 1-5 分钟）

### GitHub Pages:
1. 访问仓库 Settings > Pages
2. Source: Deploy from a branch
3. Branch: main 或 master / (root)
4. 点击 Save

## 步骤6: 验证部署

等待 1-5 分钟后访问各平台 URL：

| 平台 | 爱的解码 | 未来伴侣 | 目录 |
|------|----------|----------|------|
| **Cloudflare** | `https://<预留>.pages.dev/` | `https://<预留>.pages.dev/` | `https://<预留>.pages.dev/` |
| **Gitee** | `https://originlab.gitee.io/love-decoding-test/` | `https://originlab.gitee.io/future-partner-test/` | `https://originlab.gitee.io/test-catalog/` |
| **GitHub** | `https://originlab-2026.github.io/love-decoding-test/` | `https://originlab-2026.github.io/future-partner-test/` | `https://originlab-2026.github.io/test-catalog/` |

在浏览器控制台验证：
```javascript
detectDeployPlatform()      // 返回当前平台标识
checkAllPlatforms()         // 检测所有平台可用性
getBestAvailableUrl()       // 获取最优可用 URL
```

## 每次更新版本的操作清单

1. **修改代码**并在本地测试
2. **更新 `js/deploy-config.js`** 中的 URL 配置（如有变动）
3. **提交并推送到 GitHub**
   ```powershell
   git add .
   git commit -m "Update: xxx"
   git push origin main
   ```
4. **同步推送到 Gitee**
   ```powershell
   git push gitee main
   ```
5. **Cloudflare Pages** 会自动从 GitHub 同步部署
6. **Gitee Pages** 需要手动点击 "更新" 按钮重新部署
7. **验证三平台**部署是否成功

## GitHub Actions 自动化部署（可选）

在每个项目的 `.github/workflows/deploy.yml` 中添加：

```yaml
name: Deploy to Multiple Platforms

on:
  push:
    branches: [ main, master ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

## 故障排除

### 如果 git 命令不可用
每次打开 PowerShell 时执行：
```powershell
Set-Alias -Name git -Value "C:\Program Files\Git\bin\git.exe"
```

### 如果推送失败
1. 检查网络连接
2. 确认仓库地址正确
3. 确认有推送权限

### 如果 Pages 404
1. 确认代码已推送（查看最新提交时间）
2. 确认 Pages 服务已开启
3. 确认仓库是 Public（公开）
4. 确认仓库根目录有 `index.html`
5. 检查 `js/deploy-config.js` 中的 URL 是否正确

### 如果 Fallback 跳转失败
1. 打开浏览器开发者工具 > Console
2. 检查 `[DeployConfig]` 前缀的日志输出
3. 运行 `checkAllPlatforms()` 查看平台检测结果
4. 检查目标平台的 URL 是否配置正确
