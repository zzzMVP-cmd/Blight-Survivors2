# 更新日志

本项目的所有显著改动都记录在此文件。

---

## [0.1.0] - 2026-10-23

### 新增
- 初始化工程化项目结构（`index.html` 只保留画布，js 按依赖顺序分文件引用、不合并）。
- 开始页：顶部一排英雄选择卡片（当前仅「战士」），底部「开始游戏」按钮默认灰色禁用、选中英雄后点亮。
- 桌面版（Electron + electron-builder）便携 exe 打包，可自由缩放窗口、最小 640×480，单文件双击即玩、无需浏览器。

### 变更
- 英雄头像由 emoji 改为图片（`assets/images/warrior.png`）。
- 英雄头像尺寸调小为 64×64；卡片布局随头像尺寸同步收敛。
- 武器图标由 emoji「⚔️」改为图片（`assets/images/weapon_warrior.png`），武器行显示为「武器小图 + 名称」。
- 打包脚本 `pack.bat` 改为构建便携 exe；`clean.bat` 清理 `release\`、`packed\`、`dist\`。
- 新增 `.gitignore`，忽略 `node_modules\`、`release\`、`packed\`、`dist\` 等依赖与构建产物。

### 修复
- 解决 npm 下载 Electron 的证书校验失败（使用国内镜像 + `--use-system-ca`）。
- 解决 winCodeSign 符号链接无权限解压导致的打包失败（`signAndEditExecutable: false` 跳过签名与 exe 元数据编辑）。

### 已知限制
- exe 使用 Electron 默认图标，暂无自定义图标（后续提供 `assets/icon.ico` 并在开启开发人员模式或管理员权限下打包即可设置）。