# 图片优化验证（优化前后对比）

## 仓库总体积

| 项目 | 优化前（约） | 优化后 |
|------|-------------|--------|
| future-partner-test/assets | 225 MB | **16 MB** |
| love-decoding-test/assets | 78 MB | **14 MB** |
| test-catalog/assets | 3 MB | **352 KB** |

## 典型单文件（未来伴侣结果页 persona）

| 文件 | 优化前 | 优化后 WebP（浏览器优先） |
|------|--------|---------------------------|
| 元气少女.png | 14.84 MB | **~81 KB** webp |
| 亲密陪伴的需求.png | 11.34 MB | **~55 KB** webp |

## 首屏 / 目录（WebP）

| 页面 | 资源 | 约体积 |
|------|------|--------|
| test-catalog | 爱的解码首页.webp | ~33 KB |
| test-catalog | 未来伴侣首页.webp（lazy） | ~45 KB |
| future-partner 首页 | 未来伴侣首页.webp | ~45 KB |
| love-decoding 首页 | 爱的五种语言首页.webp | ~33 KB |

## 答题页进度条（优化后）

| 资源 | 优化前 | 优化后 WebP |
|------|--------|-------------|
| 进度条小猫1 | 3.1 MB | **~7 KB** |
| 进度条小猫2 | 3.4 MB | **~8 KB** |
| 草地进度条 | 409 KB PNG / 612 KB webp | **~23 KB** webp |
| 进度条目录合计 | ~8.9 MB | **~80 KB** |

答题页首屏约加载：草地 webp + 小猫1 webp ≈ **30 KB**（第二帧动画帧已预加载）。

## 本地复测

```bash
cd test-catalog/image-tools
npm run verify    # 当前资源统计
npm run audit     # 仅审计目录体积
```

浏览器：**DevTools → Network**，按 Size 排序，确认结果页最大图片为数百 KB 级 WebP，而非 10MB+ PNG。

Lighthouse：对部署后的 HTTPS 地址运行 Performance 审计（本地 `file://` 无法用于 Lighthouse）。
