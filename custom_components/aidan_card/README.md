# Home Assistant 设备卡片组件

> 基于 [xiaoshi（消逝汇总卡片）](https://github.com/xiaoshi930/xiaoshi) 增强开发，原项目不包含以下功能。

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
![version](https://img.shields.io/badge/version-2026.7.1-blue)

## 📦 卡片列表

| 卡片类型 | 名称 | 说明 |
|---|---|---|
| `aidan-device-card` | 设备卡片 | 通用设备状态卡片（飞牛NAS / 爱快 / 路由器） |
| `aidan-camera-card` | 摄像头卡片 | 小米摄像头卡片（实时画面 + 存储 + 格式化） |
| `aidan-water-dispenser-card` | 智能插座卡片 | 小米米家智能插座 WiFi 版（开关控制 + 插头温度监测），可用于任何设备 |

> ⚡ 飞牛NAS、爱快设备卡片和智能插座卡片为原项目所没有的新增功能。

## ✨ 特性

- 🔌 **UI 集成安装** — 通过 HA 集成页面一键添加
- 🎨 **自动主题适配** — 自动跟随 HA 深色/浅色主题
- ⚡ **LitElement 实现** — 基于 HA 原生框架，性能优异
- 🔧 **可视化编辑器** — 支持 UI 配置实体选择

## 📥 安装

### 方式一：HACS（推荐）

1. 在 HACS 中添加自定义仓库：
   ```
   https://github.com/Aidan1777/aidan_card
   ```
   类型选择 **集成 (Integration)**

2. 搜索 `设备卡片` 并安装

3. 重启 Home Assistant

### 方式二：手动安装

```bash
cd /config/custom_components
git clone https://github.com/Aidan1777/aidan_card.git aidan_card
```

重启 Home Assistant。

## ⚙️ 使用

### 1. 添加集成

进入 **设置 → 设备与服务 → 添加集成**，搜索 `设备卡片`，点击添加。

### 2. 在仪表盘使用

在 Lovelace 仪表盘编辑模式中，选择"自定义卡片"：

```yaml
# 飞牛NAS 设备卡片（原项目没有）
type: custom:aidan-device-card
title: 飞牛NAS
device_type: fn_nas
sensor_cpu: sensor.fn_nas_cpu_usage
sensor_memory: sensor.fn_nas_memory_usage
sensor_temp: sensor.fn_nas_temperature
sensor_uptime: sensor.fn_nas_uptime

# 爱快路由器 设备卡片（原项目没有）
type: custom:aidan-device-card
title: 爱快
device_type: ikuai
sensor_cpu: sensor.ikuai_cpu_usage
sensor_memory: sensor.ikuai_memory_usage

# 摄像头卡片
type: custom:aidan-camera-card
entity: camera.attic_camera

# 饮水机卡片（原项目没有），设备：小米米家智能插座 WiFi 版
type: custom:aidan-water-dispenser-card
name: 客厅饮水机
entity: switch.xiaomi_plug
temperature: sensor.xiaomi_plug_temperature
```

## 🏗️ 项目结构

```
aidan_card/
├── __init__.py          # 集成入口，注册静态资源
├── config_flow.py       # UI 配置流程
├── manifest.json        # 组件清单
├── strings.json         # 多语言字符串
└── www/
    ├── aidan-card.js        # 主加载脚本
    └── aidan-phone/
        ├── device-card.js       # 设备状态卡片（飞牛NAS/爱快）
        └── appliance-card.js    # 家电卡片（小米摄像头 + 智能插座）
```

## 📋 要求

- Home Assistant ≥ 2024.1
- 支持 Lovelace 仪表盘

## 📄 许可证

MIT License
