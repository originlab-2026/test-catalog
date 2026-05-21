# 图片优化规范（由 optimize-images.mjs 实施）

| 资源类型 | 最大边长 | WebP 质量 | PNG/JPEG |
|---------|---------|-----------|----------|
| persona / dimension 插图 | 960px | 82 | PNG compressionLevel 9（兜底） |
| 首页 / 目录 Banner | 1100px | 82 | PNG 同上；JPEG 质量 85 |
| 进度条草地 | 宽 1280 × 高 48 | 80 | PNG 兜底 |
| 进度条小猫 | 160×160 | 80 | 展示约 40px |
| 收款码 | 480px | WebP 82 / JPEG 82 | 弹窗 lazy 加载 |

说明：现代浏览器优先加载 `.webp`；旧浏览器使用已缩小的 PNG/JPEG，体积仍远小于原始设计导出。
