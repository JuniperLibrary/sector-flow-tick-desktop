# 资金流向实时监控

<p align="center">
  <img src="https://img.shields.io/github/v/release/JuniperLibrary/sector-flow-tick-desktop?label=最新版本&color=2196F3" />
  <img src="https://img.shields.io/github/downloads/JuniperLibrary/sector-flow-tick-desktop/total?label=总下载量&color=4CAF50" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue" />
  <img src="https://img.shields.io/github/license/JuniperLibrary/sector-flow-tick-desktop?label=许可证" />
</p>

独立的东方财富板块资金流实时监控桌面端，使用 `Electron + Vite + React` 实现，不依赖当前仓库里的 Go Web 服务。

## 下载

前往 **[Releases](https://github.com/JuniperLibrary/sector-flow-tick-desktop/releases)** 页面下载最新版本的安装包：

| 平台 | 安装包 | 说明 |
|------|--------|------|
| Windows | `*-Setup-*.exe` | 双击安装后即可使用 |
| macOS   | `*.dmg` | 支持 Intel & Apple Silicon |

> 首次下载后如被杀毒软件拦截，请添加信任。macOS 打开后如提示「无法验证开发者」，请在「系统设置 → 隐私与安全性」中允许打开。

## 功能

- 直接请求东方财富板块资金流接口采集数据
- 支持按板块类型切换：
  - 行业板块
  - 概念板块
  - 地域板块
- 支持从东方财富返回的当前板块类型全集中勾选“自定义采集板块”
- 只支持 1 分钟 / 3 分钟 / 5 分钟三种采集频率档位
- 支持开始 / 暂停采集
- 支持展示：
  - 最新板块快照表格
  - 选中板块资金流走势简图
  - 最近采集时间
  - 错误状态
- 支持打包为桌面安装程序：
  - macOS `dmg`
  - Windows `nsis`

## 目录

- `electron/`
  - `main.cjs` Electron 主进程
  - `preload.cjs` preload 桥接
  - `collector.cjs` 采集器
  - `eastmoney.cjs` 东方财富接口请求与解析
  - `config.cjs` 本地配置持久化
- `src/`
  - `ui/App.tsx` 主界面
  - `main.tsx` 渲染入口
  - `types.ts` 前后端共享类型
- `scripts/dev.mjs` 本地开发启动脚本

## 开发

```bash
cd sector-flow-tick-desktop
npm install
npm run dev
```

开发模式会同时启动：

- Vite 前端开发服务器
- Electron 桌面窗口

## 构建

```bash
cd sector-flow-tick-desktop
npm run build
```

前端静态产物会输出到 `dist/`。

## 打包安装程序

```bash
cd sector-flow-tick-desktop
npm run dist
```

默认配置：

- macOS: `dmg`
- Windows: `nsis`

说明：

- 建议在对应操作系统上打对应平台安装包
- Windows 安装包建议在 Windows 环境执行 `npm run dist`

## 配置说明

应用配置会保存在 Electron `userData` 目录下的 `tick-config.json`。

当前配置字段：

```json
{
  "intervalSec": 60,
  "sectorType": "industry",
  "selectedSectors": ["半导体", "AI应用", "电池"]
}
```

字段含义：

- `intervalSec`: 采集间隔，固定为 `60 / 180 / 300` 秒之一
- `sectorType`: 板块类型，可选：
  - `industry`
  - `concept`
  - `region`
- `selectedSectors`: 当前板块类型下已选择的采集板块

## 东方财富板块类型

当前板块类型通过不同 `fs` 参数切换：

- 行业板块：`m:90+t:2`
- 概念板块：`m:90+t:3`
- 地域板块：`m:90+t:1`

应用只允许从东方财富返回的当前板块类型全集中勾选采集板块，不支持输入超出东财统计范围的自定义板块名。

## 注意事项

- 东方财富接口属于第三方公共接口，存在限流、字段变动、短时不可用的风险
- 当前走势图为轻量版，主要用于观察板块资金流的最新采集序列
- 板块快照保存在内存中，窗口关闭后不保留历史

## 后续可扩展

- 多板块同屏走势
- 历史快照回放
- CSV / SQLite 导出
- 交易时段自动启停
- 告警与异动提示
