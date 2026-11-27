# Blight Survivors 2

[Blight Survivors](https://github.com/zzzMVP-cmd/Blight-Survivors) 的二作。

原作代码无法继续改动且未工程化，本作彻底重做，采用模块化工程结构（HTML/CSS/原生 JS + Electron 桌面封装 + Capacitor 安卓封装）。

---

## 安装

游戏本体是纯 Web 技术（canvas + 原生 JS），外面套不同平台的外壳。目前提供 **Windows 桌面版**与 **安卓版**；macOS 版可以自行构建（见[构建 macOS 版](#构建-macos-版)），iOS 已放弃。

### Windows（桌面版）

| 项目 | 说明 |
|---|---|
| 安装 | 双击 `release\BlightSurvivors2_Setup_v0.7.2.exe`，装到当前用户目录，不需要管理员权限 |
| 启动 | 桌面快捷方式，或开始菜单搜索「Blight Survivors 2」 |
| 卸载 | 设置 → 应用 → 「Blight Survivors 2」 |
| 窗口 | 支持自由缩放，最小 640×480；左上角无菜单栏 |

> 安装包未做代码签名，Windows SmartScreen 可能提示「未知发布者」，点「更多信息 → 仍要运行」即可。

### 安卓（手机 / 平板）

| 项目 | 说明 |
|---|---|
| 安装 | 把 `release\BlightSurvivors2_Android_v0.7.2.apk`（约 4 MB）传到手机（数据线、网盘、微信文件传输均可），点击安装。首次需在系统里允许「安装未知来源应用」 |
| 系统要求 | Android 7.0（API 24）及以上 |
| 屏幕方向 | 锁定横屏（可左右翻转），进入后自动全屏隐藏状态栏 |
| 返回键 | 游戏中按返回键 = 暂停；暂停页再按 = 退到后台 |
| 权限 | 只需要网络权限，不读取通讯录、相册等任何隐私数据 |

安装包目前是 **debug 签名**，可直接安装自用；若要上架应用商店，需要按[构建安卓版](#构建安卓版)里的签名步骤换成 release 签名。

### macOS

| 项目 | 说明 |
|---|---|
| 获取 | 用仓库自带的 GitHub Actions 在云端 macOS 机器出包，不用自己有 Mac，见[构建 macOS 版](#构建-macos-版) |
| 产物 | `BlightSurvivors2_mac_v0.7.2_universal.dmg`（约 150 MB），Intel 与 Apple Silicon 通吃 |
| 安装 | 打开 dmg，把 `Blight Survivors 2.app` 拖进「应用程序」 |
| 首次打开 | 未签名 / 未公证，Gatekeeper 会拦。终端执行一次 `xattr -cr /Applications/Blight\ Survivors\ 2.app`，或右键 → 打开 → 仍要打开 |
| 系统要求 | macOS 11.0 及以上（universal 二进制的最低要求） |

---

## 玩法

类《吸血鬼幸存者》的俯视角生存游戏：操控英雄，在不断增强的怪物波次中活下去。

### 操作

游戏有两种操作模式，**在暂停页点「操作模式」按钮切换**，选择会被记住，下次启动沿用。首次启动时触屏设备默认摇杆，桌面默认键盘。

**键盘模式**

| 操作 | 按键 |
|---|---|
| 移动 | `W` `A` `S` `D` 或方向键 `↑` `↓` `←` `→`（可混用，对角方向归一化） |
| 攻击 | 自动出刀，无需操作 |
| 蓄力 | 按住鼠标左键，松开按**鼠标方向**立即攻击 |
| 蓄力开关 | 点武器图标，或按 `1`~`9` 切换对应武器是否蓄力 |
| 暂停 / 撤离 | `ESC`，或点右上角暂停按钮 |

**摇杆模式**

| 操作 | 方式 |
|---|---|
| 移动 | 屏幕左下角摇杆：按住白色外圈，内圈跟着手指走，英雄朝「圆心 → 内圈」的方向以正常速度移动；手指靠近圆心时不动（死区） |
| 蓄力 | 长按摇杆以外的区域 **0.3 秒**进入蓄力，方向跟随手指，松手立即挥出；0.3 秒内松手视为误触，不攻击 |
| 蓄力开关 | 点左下的武器图标 |
| 暂停 / 撤离 | 点右上角暂停按钮 |

- 摇杆只在摇杆模式显示，键盘模式下隐藏；两种模式下点武器图标都能切换蓄力。
- 蓄力期间手指怎么移动都不会中断蓄力，也不会带动英雄移动（移动只归摇杆管）。
- 左下角从上到下是**摇杆 → 武器栏**：摇杆在上、武器栏贴底，两者不重叠，单手拇指都够得着。


### 英雄

| 英雄 | 武器  | 初始伤害 | 初始 攻击间隔 | 最小 攻击间隔 |
| :-: | :---: | :----: | :---------: | :---------:|
| 战士 | 破阵斩 | 🗡25   | 2s          | 0.2s       |


### 蓄力

按住鼠标左键（触屏长按 0.3 秒）开始蓄力，松开时把累计的攻击**合并成一次伤害**，朝鼠标（手指）方向立即挥出。

| 项目 | 规则 |
|---|---|
| 蓄力条 | 英雄上方共 **8 格**，每变金一格 = 攒够一次攻击；满 8 格后条与武器一起发光 |
| 节奏 | 每变金一格的间隔 = 你当前的攻击间隔，与自动攻击的出刀节奏完全一致 |
| 满蓄耗时 | 初始攻击间隔 2s 时最坏 **16 秒**；攻速堆满 0.2s 时最坏 **1.6 秒** |
| 伤害 | **没有倍率**：攒 8 格 = 8 倍单次伤害。合并后只判一次暴击、一次穿透 |
| 方向 | 完全跟随鼠标（摇杆模式下跟随手指）；范围内没怪也照常挥出，不会作废 |
| 松手瞬间 | 立刻挥出，之后要等约 **1.8 秒**才能再次攻击（攻速堆满则无冷却） |
| 蓄力期间 | 不自动攻击，也不推进攻击间隔 |
| 松手时一格都没亮 | 本次不攻击，恢复正常自动攻击 |
| 不可蓄力 | 按住左键照常自动攻击，也不显示蓄力条；蓄力途中按快捷键会立刻清空蓄力条 |

- 蓄力条右侧显示该武器图标。
- 武器栏中**可蓄力武器排在最前**，图标下方标出快捷键数字（最左为 1）；按该数字键或直接点图标，可把武器切成**不可蓄力**。边框金色 = 可蓄力，灰色 = 不可蓄力。

### 怪物

| 怪物 | 血量 | 伤害 | 移速 | 体积 | 出场 |
| :-: | :---: | :---: | :---: | :---: | :---: |
| 史莱姆 | 30 | 10 | 40 | 17px | 第 1 波 |

- **出场**：从你周围 480px 外随机方向出现，直线朝你走。
- **攻击**：怪物没有攻击间隔，撞到你才造成伤害；你的 **0.5 秒无敌帧**决定它多久能再咬一次。同一瞬间被多只怪撞到，伤害会先累加再一起结算，不会被先撞的那只吞掉。
- **碰撞**：撞到你后自己后退一点；被你砍中也会被弹开，短暂失控。

#### 怪物成长

| 属性 | 规则 |
|---|---|
| 体积 | 每波变大一点，第 40 波停止长大（约 37px） |
| 血量 | 第 1~40 波每波 ×1.2；第 41 波起每波 **×1.44** |
| 伤害 | 与血量同规则 |
| 护盾 | 第 40 波起才出现护盾，之后每 40 波再厚一截，并随波次持续放大 |
| 数量 | 第 1 波 3 只，第 40 波封顶 **2573 只**，之后不再增长 |
| 单次伤害上限 | 不超过这只怪的「血量 + 护盾」，超出部分**优先削锐器伤**，钝器伤尽量保留 |

### 波次

- 3 秒准备后进入第一波，之后每 15 秒一波；提前清场则 1 秒后进入下一波。
- **关键节点波（第 40、80、120…波）不限时**，必须清场才进入下一波；其余波次到点强制进入下一波，没刷完的怪会留到下一波继续刷，不会丢失。
- 同屏最多 **400 只**，超出的排队等着，死一只补一只。排队的怪保留**排队时的强度**，不会因为拖到后面而突然变强、也不会凭空长出护盾。
- 场上的怪**全部显示**，不会出现「怪物凭空消失 / 凭空出现」。

### 成长与选卡

- **经验**：击杀掉落经验球，经验 = 这只怪的「血量 + 护盾」，拾取后升级，每级所需经验是上一级的 1.4 倍；升级时血量与护盾直接加满。
- **升级选卡**：每次升级三选一（可刷新）。卡池按「方向」等概率抽取——角色强化方向、增幅方向、武器强化方向各算一项，不再按卡牌类型分层；角色强化 / 增幅卡分铜 / 银 / 金 / 炫彩四档，武器强化卡不分等级。
  - 血量与护盾合并为一张**「体魄」**卡：同档位下血量与护盾的倍率相同（铜 ×1.3 / 银 ×1.6 / 金 ×2.2 / 炫彩 ×3.4）。
  - 英雄等级不足 50 时基础护盾为 0，此时「体魄」只加血量，护盾倍率照常累积，等级 50 解锁护盾时一次性兑现。

### 系统一览

| 系统 | 说明 |
|---|---|
| 攻击 | 自动出刀，蓄力松手后朝鼠标方向立即挥出 |
| 蓄力开关 | 武器栏可蓄力武器图标下有快捷键数字，按数字切换「可蓄力 / 不可蓄力」，边框金色 = 可蓄力，灰色 = 不可蓄力 |
| 伤害类型 | 锐器伤（🗡）可穿透；钝器伤（🔨）不穿透，但**破盾更快**——护盾越厚，钝器伤占比越高越划算。两种都是物理伤，数字统一为红色，靠图标区分 |
| 伤害显示 | 只有一种伤害时单行显示「暴击 + 类型 + 伤害」；两种都有时首行显示总伤害（白色），下面每行一种类型 |
| 伤害上限 | 单次伤害不超过这只怪的「血量 + 护盾」，超出时优先削锐器伤，钝器伤尽量保留 |
| 暴击 | 概率补偿机制，暴击等级越高伤害越高；锐器伤与钝器伤共用一次判定 |
| 穿透 | 锐器伤要够高才触发，触发后造成额外伤害。护盾越厚、钝器伤越低，越难触发；没护盾时只看锐器伤高低 |
| 护盾 | 你受击时伤害先被护盾值削减，再优先扣护盾 |
| 增幅 | 力量 / 速度表现增幅，分武器专属与全体两类 |
| 武器强化 | 每个武器 4 个方向，每方向 4 次（第 4 次为发黄光的「小质变」）；4 方向满后解锁「大质变」（钝器伤 +2），**大质变每局只能获取一次**，获取后该武器不再提供任何强化卡 |
| 升级强化 | 角色强化、增幅强化、恢复、吸收范围、刷新次数、卡牌数量等 |

---

## 项目结构

```
Blight Survivors2/
├─ css/style.css              ← 全部样式
├─ js/
│  ├─ systems/
│  │  ├─ heroes.js            ← 英雄数据定义
│  │  ├─ monsters.js          ← 怪物基础数值与绘制
│  │  ├─ monster-ai.js        ← 怪物行为（生成 / 移动 / 攻击 / 击退 / 分离）
│  │  ├─ attack/
│  │  │  ├─ weapon.js         ← 武器系统（剑状态机 + 连续攻击 + 剑气扇形效果）
│  │  │  ├─ charge.js         ← 蓄力系统（蓄力条绘制 + 多次攻击合并结算）
│  │  │  ├─ attack.js         ← 攻击判定（战士扇形判定等）
│  │  │  ├─ crit.js           ← 暴击系统（概率补偿）
│  │  │  └─ augment.js        ← 增幅系统（力量 / 速度表现增幅）
│  │  ├─ upgrade.js           ← 升级强化系统（卡牌选择 / 等级 / 刷新）
│  │  ├─ exp-orbs.js          ← 经验球（掉落 / 吸引 / 拾取）
│  │  ├─ shield.js            ← 护盾系统（英雄护盾结算与成长）
│  │  ├─ recovery.js          ← 恢复系统（每秒回血）
│  │  └─ wave.js              ← 波次管理（间隔 / 递增 / 同屏上限 + 排队补刷）
│  ├─ menu.js                 ← 开始页（英雄选择 + 开始按钮）
│  ├─ hud.js                  ← 游戏内 HUD（血条 / 等级 / 波次 / 经验条 / 武器栏 / 道具栏）
│  ├─ game.js                 ← 游戏主循环（玩家移动 / 摄像机 / 绘制调度）
│  └─ main.js                 ← 初始化入口（画布尺寸、构建开始页）
├─ electron/main.js           ← 桌面版窗口逻辑
├─ capacitor.config.ts        ← 安卓封装配置（appId / 应用名 / Web 目录）
├─ scripts/build-www.js       ← 把 Web 源码拷进 www\（安卓打包用）
├─ android/                   ← Capacitor 生成的安卓原生工程
│  └─ app/src/main/java/com/blight/survivors2/MainActivity.java  ← 全屏 / 横屏 / 返回键
├─ assets/images/             ← 图片资源
├─ package.json               ← 桌面版依赖与 electron-builder 配置
├─ pack.bat                   ← 打包脚本（构建 NSIS 安装版 → release\）
├─ clean.bat                  ← 清理脚本（删除 release\、packed\、dist\）
├─ CHANGELOG.md               ← 完整更新日志
├─ LICENSE                    ← 许可证（CC BY-NC-SA 4.0）
└─ README.md
```

---

## 构建

三条命令各管一个平台，互不影响。**Web 源码（`index.html` / `css` / `js` / `assets`）是唯一来源**，桌面版直接读根目录，安卓版由 `scripts/build-www.js` 拷进 `www\` 后再打包。

### 构建 Windows 桌面版

需要 Node.js 18+。

```bash
npm install
npm run dist      # 或直接双击 pack.bat
```

产物：

- `release\BlightSurvivors2_Setup_v0.7.2.exe` —— NSIS 安装版
- `release\win-unpacked\` —— 免安装文件夹版

清理临时产物：双击 `clean.bat`。

> 如果 `npm run dist` 报 `app.asar: The process cannot access the file`，说明旧的 `release\win-unpacked\` 正被别的程序占用（编辑器索引、杀毒实时扫描、资源管理器预览都会），关掉占用者或重启后再打包即可。

### 构建 macOS 版

**必须在一台 macOS 上执行**：`.dmg` 依赖 macOS 自带的 `hdiutil`，而 electron-builder 在 Windows 上会直接抛错 `Build for macOS is supported only on macOS`（`app-builder-lib/out/packager.js` 里的硬拦截，连 `zip` 也不放行），无法交叉编译。

不用自己有 Mac —— 仓库里已经放了 GitHub Actions 工作流，云端出包即可。

`package.json` 的 `mac` 段已配成 **universal（Intel + Apple Silicon 通吃）**：

```json
"mac": {
  "target": [
    { "target": "dmg", "arch": ["universal"] },
    { "target": "zip", "arch": ["universal"] }
  ],
  "category": "public.app-category.games",
  "identity": null,
  "artifactName": "BlightSurvivors2_mac_v${version}_universal.${ext}"
}
```

#### 路线 A：GitHub Actions 云端构建（推荐，不用 Mac）

工作流文件 [.github/workflows/build-mac.yml](.github/workflows/build-mac.yml)，只能手动触发（`workflow_dispatch`）。

1. 把仓库推到 GitHub（remote 已配好 `zzzMVP-cmd/Blight-Survivors2`）。
2. 打开仓库的 **Actions** 标签页，左侧选「构建 macOS 安装包」，点右侧 **Run workflow** → 再点 **Run workflow**。
3. 等 5~10 分钟。跑完后点进这次运行记录，页面底部 **Artifacts** 区下载 `BlightSurvivors2-mac-universal`。
4. 解压得到：

   - `BlightSurvivors2_mac_v0.7.2_universal.dmg` —— 约 150 MB，拖进「应用程序」即可
   - `BlightSurvivors2_mac_v0.7.2_universal.zip` —— 免安装包，解压出 `.app`

免费额度：公开仓库的 Actions 时长不限；私有仓库按 macOS 倍率 10 倍计费（一次 5~10 分钟实耗记 50~100 分钟），每月 2000 分钟免费额度，够跑二十次左右。

工作流跑在 `macos-latest`（Apple Silicon）。universal 包由 electron-builder 先各打一份 x64 与 arm64，再用 `@electron/universal` 合并成一个二进制。万一某次 runner 镜像调整导致合并失败，把 `runs-on` 改成 `macos-15-intel` 重跑即可。

#### 路线 B：本地 Mac 构建

手上有 Mac 时，一条命令即可：

```bash
npm install
npm run dist:mac       # 等价于 electron-builder --mac
```

产物在 `release/`，文件名同上（universal）。Mac 上同样**不需要** Apple Developer 账号，`identity: null` 已关掉签名。

#### macOS 打包的注意事项

- **未签名 / 未公证**：用户首次打开会被 Gatekeeper 拦下，提示「已损坏，无法打开」或「无法验证开发者」。让对方在终端执行一次 `xattr -cr /Applications/Blight\ Survivors\ 2.app` 即可解除，或右键 → 打开 → 仍要打开。
- **架构**：已固定为 `universal`，一个包同时含 x64 与 arm64，体积约是单架构的两倍（约 150 MB），换来的好处是用户不用挑机型。
- **正式分发**：需要 Apple Developer 账号（99 美元/年）配置 `identity` 与 `notarize`，否则只能自用或让用户手动解除隔离。
- **`author` 字段缺失**：`npm run dist:mac` 会打一条 `author is missed in the package.json` 警告，不影响出包（dmg 里不会写作者信息）；想让产物元数据完整，在 `package.json` 里补一行 `"author": "你的名字"` 即可。

### 构建安卓版

需要 **JDK 21 + Android SDK**（Capacitor 8 要求 Java 21、compileSdk 36）。两条路任选：

- **路线 A（推荐，轻量）**：只装 JDK 21 + Android 命令行工具，总量约 360 MB，全程命令行，不用打开图形界面。
- **路线 B**：装 Android Studio，约 1.4 GB，自带 JDK 21 与 SDK 管理器，适合还想用 IDE 调试的情况。

#### 路线 A：JDK 21 + 命令行工具（推荐）

不需要 Android Studio，也不需要登录任何账号。

1. **装 JDK 21**（约 205 MB）：<https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse>
   下载后双击安装，勾选「Set JAVA_HOME variable」，它会自动配好环境变量。
2. **装 Android 命令行工具**（约 153 MB）：<https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip>
   解压后把里面的 `cmdline-tools` 目录改名为 `latest`，放到 `C:\Android\cmdline-tools\latest\`（即最终有 `C:\Android\cmdline-tools\latest\bin\sdkmanager.bat`）。
3. **设置环境变量**（用户变量）：

   | 变量名 | 值 |
   |---|---|
   | `JAVA_HOME` | JDK 21 的安装目录（装 JDK 时勾选自动设置就不用管） |
   | `ANDROID_HOME` | `C:\Android` |

   `Path` 追加：

   ```
   %JAVA_HOME%\bin
   %ANDROID_HOME%\cmdline-tools\latest\bin
   %ANDROID_HOME%\platform-tools
   ```

4. **装 SDK 组件**（重开终端后执行，过程中会多次提示 `Accept? (y/N)`，一路输 `y`）：

   ```bash
   sdkmanager --sdk_root=%ANDROID_HOME% "platform-tools" "platforms;android-36" "build-tools;36.0.0"
   ```

5. 验证：

   ```bash
   java -version      # openjdk version "21.x"
   sdkmanager --version
   ```

#### 路线 B：安装 Android Studio

> **重要**：`developer.android.com` 在国内经常打不开（实测超时）。请改用**谷歌中国镜像域名** <https://developer.android.google.cn/studio>，内容与官网完全一致、可直接访问。

1. 打开 <https://developer.android.google.cn/studio> ，点 **Download Android Studio**，勾选同意条款后下载 Windows 版安装包（约 1.4 GB）。
   - 实测可用直链（版本可能更新，失效时回上面页面取新链接）：
     <https://edgedl.me.gvt1.com/android/studio/install/2026.2.2.10/android-studio-rabbit2-patch2-windows.exe>
2. 双击安装包，一路默认下一步。安装路径建议保持默认 `C:\Program Files\Android\Android Studio`。
3. 首次启动会弹 **Setup Wizard**，选 **Standard（标准）** 安装，它会自动下载：
   - Android SDK Platform 36（本项目 `compileSdkVersion = 36`）
   - Android SDK Build-Tools
   - Android Emulator + 系统镜像（不打算用模拟器可以跳过）
   - Android Studio 自带的 **JDK 21**（在 `C:\Program Files\Android\Android Studio\jbr`）
4. 装完后 SDK 默认落在 `C:\Users\<你的用户名>\AppData\Local\Android\Sdk`。
5. **设置环境变量**（关键，命令行打包必须靠它）：

   在「设置 → 系统 → 高级系统设置 → 环境变量」里，于**用户变量**新增：

   | 变量名 | 值 |
   |---|---|
   | `JAVA_HOME` | `C:\Program Files\Android\Android Studio\jbr` |
   | `ANDROID_HOME` | `C:\Users\<你的用户名>\AppData\Local\Android\Sdk` |

   然后在 `Path` 里追加两行：

   ```
   %JAVA_HOME%\bin
   %ANDROID_HOME%\platform-tools
   ```

6. 关掉所有终端重新打开，验证：

   ```bash
   java -version      # 应显示 openjdk version "21.x"
   echo %ANDROID_HOME%
   ```

#### 第二步：打包

```bash
npm run android:sync    # 拷贝 Web 源码到 www\ 并同步进 android\ 工程
npm run android:apk     # 生成 debug 版 apk
```

产物：`android\app\build\outputs\apk\debug\app-debug.apk`（约 4 MB，游戏本体全是 canvas 程序化绘制，不含图片素材，所以包很小）。改名后即为可安装的 apk，例如：

```bash
copy android\app\build\outputs\apk\debug\app-debug.apk release\BlightSurvivors2_Android_v0.7.2.apk
```

首次构建约 3 分钟（要下载 Gradle 本体与依赖），之后增量构建十几秒。产物信息可用 build-tools 里的 `aapt2` 核对：

```bash
aapt2 dump badging android\app\build\outputs\apk\debug\app-debug.apk
```

**国内网络已做的三处适配**（都已写进仓库，无需手动改）：

| 位置 | 内容 | 原因 |
|---|---|---|
| `android\gradle\wrapper\gradle-wrapper.properties` | `distributionUrl` 指向华为云镜像 `https://mirrors.huaweicloud.com/gradle/gradle-8.14.3-all.zip` | 官方 `services.gradle.org` 实测仅 40 KB/s，镜像可到 10 MB/s |
| `android\gradle.properties` | `android.overridePathCheck=true` | 本项目路径含中文（`游戏素材`），AGP 默认会直接中断构建 |
| `android\local.properties` | `sdk.dir` 指向本机 SDK 目录（**不提交**，已在 `.gitignore`） | Gradle 靠它定位 SDK，可代替 `ANDROID_HOME` |

依赖（AGP、androidx）走 `google()` 与 `mavenCentral()`；如果 Maven Central 慢，可在 `C:\bs2-build\init.gradle` 之类的外部脚本里加阿里云镜像，然后 `gradlew.bat assembleDebug --init-script <脚本路径>`，不必改动仓库文件：

```groovy
def MIRRORS = [
  "https://maven.aliyun.com/repository/google",
  "https://maven.aliyun.com/repository/central",
  "https://maven.aliyun.com/repository/public",
  "https://maven.aliyun.com/repository/gradle-plugin"
]
settingsEvaluated { s -> s.pluginManagement.repositories { MIRRORS.each { u -> maven { url u } }; gradlePluginPortal(); google(); mavenCentral() } }
allprojects {
  buildscript { repositories { MIRRORS.each { u -> maven { url u } }; google(); mavenCentral() } }
  repositories { MIRRORS.each { u -> maven { url u } }; google(); mavenCentral() }
}
```

安卓版本号在 `android\app\build.gradle` 里（`versionCode` / `versionName`），需与根目录 `package.json` 的 `version` 保持一致。

其他常用命令：

| 命令 | 作用 |
|---|---|
| `npm run android:open` | 同步后用 Android Studio 打开工程，可连手机点「Run」直接调试（走路线 A 没装 Studio 时不可用，改用 `adb install` 装包） |
| `cd android && gradlew.bat assembleRelease` | 生成 release 版 apk（需先配签名，见下） |

#### 第三步（可选）：换 release 签名

debug 包只能自用。要上架或长期分发，用 keytool 生成签名并在 `android/app/build.gradle` 里配置：

```bash
keytool -genkey -v -keystore blight.keystore -alias blight -keyalg RSA -keysize 2048 -validity 10000
```

```gradle
android {
    signingConfigs {
        release {
            storeFile file("../../blight.keystore")
            storePassword "你的密码"
            keyAlias "blight"
            keyPassword "你的密码"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

> keystore 与密码**不要提交到版本库**（`.gitignore` 已排除 `*.apk` / `*.aab`，记得把 keystore 也加进去）。

#### 安卓端已做的适配

| 项目 | 实现 |
|---|---|
| 全屏 | `MainActivity` 隐藏状态栏与导航栏，上滑可临时唤出 |
| 横屏 | `AndroidManifest.xml` 里 `screenOrientation="sensorLandscape"`，锁定横屏、允许左右翻转 |
| 刘海 / 安全区 | `viewport-fit=cover` + CSS 用 `env(safe-area-inset-*)` 给武器栏、暂停按钮、道具栏留位 |
| 返回键 | 游戏中 → 暂停；暂停页 → 退到后台 |
| 常亮 | `FLAG_KEEP_SCREEN_ON`，玩的时候不自动锁屏 |
| 摇杆 | 触屏默认进摇杆模式，摇杆在左下角、武器栏在它下方 |

---

## 版本

当前版本 **v0.7.2**。完整更新记录见 [CHANGELOG.md](CHANGELOG.md)。

---

## 许可证

本项目采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans)（署名-非商业性使用-相同方式共享 4.0 国际）许可，详见 [LICENSE](LICENSE)。

- **署名（BY）**：转载或改编需注明作者与来源，并标明是否修改
- **非商业性使用（NC）**：不得将本作品用于商业目的
- **相同方式共享（SA）**：改编作品需以相同许可证分发