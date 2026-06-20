# 板块资金流实时监控桌面端

<p align="center">
  <img src="https://img.shields.io/github/v/release/JuniperLibrary/sector-flow-tick-desktop?label=最新版本&color=2196F3" />
  <img src="https://img.shields.io/github/downloads/JuniperLibrary/sector-flow-tick-desktop/total?label=总下载量&color=4CAF50" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue" />
  <img src="https://img.shields.io/github/license/JuniperLibrary/sector-flow-tick-desktop?label=许可证" />
  <img src="https://img.shields.io/badge/bundle-4.3%20MB-22c55e" />
</p>

<p align="center">
  东方财富板块资金流实时监控 · 桌面原生体验 · 轻量快速
</p>

---

## 产品介绍

盯着盘面看板块资金轮动，是很多短线选手的日常。但打开网页版要忍受广告和杂乱的布局，用手机盯又不够直观。

**本工具直接对接东方财富板块资金流接口**，抓取板块资金数据并以表格/走势图展现，帮你快速判断资金在行业、概念、地域板块间的切换方向。

适合：
- **短线交易者** — 跟踪日内板块资金异动，发现主力动向
- **行业研究员** — 观察板块间资金轮动节奏
- **量化爱好者** — 作为板块资金数据的桌面采集终端

## 核心功能

| 功能 | 说明 |
|------|------|
| **实时采集** | 直接对接东方财富板块资金流接口，1/3/5 分钟三档采集频率，自动轮询 |
| **板块分类** | 支持行业板块 / 概念板块 / 地域板块三大类型一键切换 |
| **自定义选股** | 在东方财富返回的全集中自由勾选关注的板块，只看你关心的 |
| **资金流向简图** | 选中板块的资金流走势图，直观反映资金进出节奏 |
| **快照表格** | 最新资金流快照，排序查看各板块资金净流入/流出排名 |
| **采集控制** | 一键开始/暂停，随时控制采集节奏 |
| **状态监控** | 实时显示采集状态、最近采集时间、接口错误提示 |
| **暗色模式** | 支持暗色/亮色主题切换，盯盘更舒适 |

## 下载

前往 **[Releases](https://github.com/JuniperLibrary/sector-flow-tick-desktop/releases)** 页面下载最新版本的安装包：

| 平台 | 安装包 | 说明 |
|------|--------|------|
| Windows | `*-Setup-*.exe` | 双击安装后即可使用 |
| macOS   | `*.dmg` | 支持 Intel & Apple Silicon |

> 首次下载后如被杀毒软件拦截，请添加信任。macOS 打开后如提示「无法验证开发者」，请在「系统设置 → 隐私与安全性」中允许打开。

国内用户可访问 **[镜像加速通道](https://mirror.ghproxy.com/https://github.com/JuniperLibrary/sector-flow-tick-desktop/releases)** 下载。

---

## 技术栈

```
Tauri v2  +  Rust  +  Vite  +  React  +  TypeScript
```

- **Tauri v2** — 使用系统原生 WebView 渲染，无内置浏览器引擎
- **Rust** — 后端 IPC 命令（数据采集、配置管理、东方财富 API 解析）
- **React + TypeScript** — 前端界面，Vite 构建

> 不依赖当前仓库里的 Go Web 服务，Rust 直接请求东方财富接口，独立运行。

## 目录结构

```
src-tauri/              # Rust 后端
├── src/
│   ├── lib.rs         # Tauri IPC 命令注册（13 个命令）
│   ├── collector.rs   # 定时采集器（异步轮询）
│   ├── eastmoney.rs   # 东方财富 HTTP 接口请求与解析
│   ├── config.rs      # 本地配置持久化
│   └── models.rs      # 共享数据模型
src/                    # React 前端
├── ui/
│   └── App.tsx        # 主界面
├── api.ts             # Tauri invoke/listen 封装层
├── main.tsx           # 渲染入口
└── types.ts           # TypeScript 类型定义
```

## 开发

### 前置要求

- [Rust](https://www.rust-lang.org/tools/install)（`cargo` 1.77+）
- Node.js 20+
- macOS 用户：Xcode Command Line Tools

```bash
cd sector-flow-tick-desktop
npm install
npm run dev
```

开发模式会同时启动：

- Vite 前端开发服务器（http://localhost:5173）
- Tauri 桌面窗口（使用系统 WebView）

### 构建 & 打包

```bash
# 仅构建前端
npm run build

# 打包桌面安装程序
npm run dist
```

打包产物输出到 `src-tauri/target/release/bundle/`：

- macOS: `dmg`
- Windows: `nsis`

---

## 配置说明

应用配置保存在 Tauri `app_config_dir` 目录下的 `tick-config.json`。

| 平台 | 配置路径 |
|------|---------|
| macOS | `~/Library/Application Support/com.ashareflow.sector-flow-tick/tick-config.json` |
| Windows | `%APPDATA%/com.ashareflow.sector-flow-tick/tick-config.json` |

```json
{
  "intervalSec": 60,
  "sectorType": "industry",
  "selectedSectors": ["半导体", "AI应用", "电池"]
}
```

- `intervalSec`: 采集间隔（`60 / 180 / 300` 秒）
- `sectorType`: 板块类型（`industry` / `concept` / `region`）
- `selectedSectors`: 勾选的采集板块列表

## 东方财富板块类型

| 分类 | 接口参数 |
|------|---------|
| 行业板块 | `m:90+t:2` |
| 概念板块 | `m:90+t:3` |
| 地域板块 | `m:90+t:1` |

## 注意事项

- 东方财富接口属于第三方公共接口，存在限流、字段变动、短时不可用的风险
- 走势图为轻量版本，用于观察板块资金流的最新采集序列
- 板块快照保存在内存中，窗口关闭后不保留历史
- 应用只允许从东方财富返回的当前板块类型全集中勾选采集板块，不支持输入自定义板块名

## Roadmap

- [ ] 多板块同屏走势对比
- [ ] 历史快照回放
- [ ] CSV / SQLite 导出
- [ ] 交易时段自动启停
- [ ] 资金异动告警
