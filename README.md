# Blight Survivors 2

[Blight Survivors](https://github.com/zzzMVP-cmd/Blight-Survivors) 的二作。原版代码无法继续改动且未工程化，本作彻底重做并采用模块化工程结构。

---

## 项目结构

```
Blight Survivors2/
├─ index.html            ← 只保留绘制层（canvas），按依赖顺序引用 js 文件（不合并）
├─ css/style.css         ← 全部样式
├─ js/
│  ├─ heroes.js          ← 英雄数据定义
│  ├─ menu.js            ← 开始页：英雄选择 + 开始按钮
│  ├─ game.js            ← 游戏主循环（当前为占位）
│  └─ main.js            ← 初始化入口（画布尺寸、构建开始页）
├─ electron/main.js      ← 桌面版窗口逻辑（Electron）
├─ assets/images/        ← 图片资源（warrior.png）
├─ package.json          ← 桌面版依赖与打包配置（electron-builder）
├─ pack.bat              ← 打包脚本（构建便携版 exe → release\ 目录）
├─ clean.bat             ← 清理脚本（删除 release\、packed\、dist\）
└─ README.md
```

---

## 当前进度

### 开始页（已完成）

- 屏幕上方一排英雄选择框，当前仅「战士」一个英雄
- 英雄头像使用 `assets/images/warrior.png`（卡片内自动适配尺寸）
- 底部「开始游戏」按钮，默认灰色禁用；选中某个英雄后变亮可用
- 视觉沿用原作的深色背景 + 金色渐变标题风格

### 玩法

- 尚未实现（占位画面：进入后显示已选英雄与“玩法开发中”提示）

---

## 如何运行

### 网页版（开发调试）
直接用浏览器打开 `index.html` 即可（纯静态，无需服务器）。

### 桌面版（便携 exe）
- **运行**：双击 `release\BlightSurvivors2_v0.1.0.exe` 即可，无需浏览器、无需安装，单独一个文件绿色运行。
- **可缩放窗口**：窗口支持自由缩放，最小尺寸 640×480。
- **构建**：先 `npm install` 安装依赖，再运行 `pack.bat`（或 `npm run dist`），完成后 exe 位于 `release\` 目录。

---

## 版本

- **v0.1.0**：首个版本，含开始页（英雄选择 + 开始按钮）、桌面版便携 exe 打包。

---

## 英雄

| 英雄 | 头像 | 特点 |
|------|------|------|
| 战士 | `assets/images/warrior.png` | 均衡近战英雄，生命值高（2400HP），移速较慢|