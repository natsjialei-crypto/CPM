# Emerson Light Industrial Twin Design Language

> 艾默生轻量工业数字孪生设计语言  
> Version 1.0 · 2026-07-27

## 1. 设计语言定义

本设计语言面向工业监盘、设备管理、故障预警、能源管理、数字孪生及工程组态产品。

它将艾默生企业蓝所代表的工程可信度，与轻量工业数字孪生界面的冷灰环境、柔性悬浮卡片和高密度实时数据表达结合，形成一种：

> 以艾默生蓝建立品牌与操作秩序，以银灰构建设备环境，以能源绿表达正常运行，通过克制的数据可视化和数字孪生呈现工业系统实时状态的浅色工业科技风格。

内部推荐命名：

- 中文：艾默生轻量工业数字孪生
- 英文：Emerson Light Industrial Twin
- 简称：ELIT Design Language

核心关键词：

- 工程可信
- 精密克制
- 实时可读
- 浅色工业
- 数字孪生
- 风险优先
- 长时监控舒适

## 2. 设计依据

### 2.1 艾默生品牌基础

艾默生品牌指南定义：

- Emerson Blue：`#004B8D`
- Emerson Silver：`#9FA1A4`

艾默生蓝用于传递品牌、工程能力、可靠性和主要操作；银色用于表达技术、精密与工业材质。

来源：

- Emerson Brand Guidelines：<https://www.rongfengplc.com/wp-content/uploads/2024/06/emerson-brand-guidelines-en-us-7072752.pdf>
- Emerson Media Resources：<https://www.emerson.com/en/corporate/news/media-resources>

### 2.2 视觉参考

参考作品为 Rekavvi 的《ESS | Energy Storage System 储能能量管理系统》。作品采用冷灰浅色环境、悬浮白色面板、亮绿色健康状态、设备层级树和数字孪生场景，适配超宽屏及双屏工业监控场景。

来源：

- 站酷原作：<https://www.zcool.com.cn/work/ZNzMxOTAzMjA%3D.html>
- 站酷 UI 设计作品榜第 463 期：<https://www.zcool.com.cn/top/index.do?rankId=463&rankProductCategory=17>

本规范只提取设计原则，不复制原作的具体界面、素材或品牌表达。

## 3. 品牌色与功能色的职责

艾默生蓝和能源绿不能作为两个平级品牌主色使用。

### Emerson Blue 的职责

- 品牌识别
- 顶部导航与主导航
- 当前页面和选中状态
- 主按钮
- 链接与可交互文本
- 焦点环
- 主数据系列
- 信息状态

### Energy Green 的职责

- 正常运行
- 健康状态
- 安全范围
- SOC、SOH 等正向能源指标
- 成功反馈
- 设备在线
- 已完成状态

### 使用原则

> 蓝色说明“系统与操作”，绿色说明“设备与运行”。

禁止用绿色代替主按钮、导航选中态和品牌标题。禁止用蓝色表示设备正常，以免品牌状态与业务状态混淆。

## 4. 色彩系统

### 4.1 Emerson Blue 品牌色阶

| Token | 色值 | 用途 |
|---|---:|---|
| `blue-50` | `#EEF5FB` | 选中背景、信息提示背景 |
| `blue-100` | `#D9EAF7` | 浅色高亮、图表面积 |
| `blue-200` | `#B8D8EE` | 边框、禁用图形 |
| `blue-300` | `#82B9DD` | 次级图表、悬停辅助色 |
| `blue-400` | `#3E8FC3` | 图标、次级操作 |
| `blue-500` | `#0069A8` | 数据可视化扩展色 |
| `blue-600` | `#005A9B` | 主按钮悬停 |
| `blue-700` | `#004B8D` | Emerson Blue，品牌主色 |
| `blue-800` | `#003C71` | 主按钮按下、深色标题 |
| `blue-900` | `#002C55` | 深色导航、深色表面 |

品牌基准色固定为 `#004B8D`，不得用相近蓝色替代 Logo 或品牌核心区域。

### 4.2 Emerson Silver 与中性色

| Token | 色值 | 用途 |
|---|---:|---|
| `silver-50` | `#F7F8FA` | 页面浅色表面 |
| `silver-100` | `#EEF1F4` | 页面背景、卡片分组 |
| `silver-200` | `#E0E4E9` | 输入框、分区背景 |
| `silver-300` | `#CDD2D9` | 边框、分割线 |
| `silver-400` | `#B7BDC5` | 禁用边框、图标 |
| `silver-500` | `#9FA1A4` | Emerson Silver |
| `silver-600` | `#747A82` | 辅助文字 |
| `silver-700` | `#515760` | 正文文字 |
| `silver-800` | `#30353B` | 标题、关键标签 |
| `silver-900` | `#171A1E` | 核心数值、最高对比文本 |

推荐表面颜色：

| Token | 色值 |
|---|---:|
| `surface-canvas` | `#E9EDF2` |
| `surface-section` | `#F1F3F6` |
| `surface-card` | `#FFFFFF` |
| `surface-raised` | `#F9FAFB` |
| `surface-selected` | `#EEF5FB` |
| `surface-inverse` | `#002C55` |

### 4.3 设备状态色

| 状态 | Token | 色值 | 含义 |
|---|---|---:|---|
| 正常 | `status-normal` | `#39C523` | 运行、健康、在线、安全 |
| 提醒 | `status-attention` | `#F2B544` | 接近阈值、需要关注 |
| 告警 | `status-warning` | `#F28C28` | 中等级风险、异常趋势 |
| 严重 | `status-critical` | `#D93838` | 高风险、故障、越限 |
| 信息 | `status-info` | `#0069A8` | 系统消息、非故障提示 |
| 未知 | `status-unknown` | `#8C939D` | 无数据、状态未知 |
| 离线 | `status-offline` | `#626972` | 通讯中断、设备离线 |

状态不能只依赖颜色，必须同时使用以下至少一种表达：

- 状态文字
- 状态图标
- 形状差异
- 告警级别
- 辅助说明

### 4.4 色彩占比

推荐页面综合色彩占比：

- 70%：银灰和浅灰环境
- 20%：白色卡片及内容表面
- 7%：艾默生蓝
- 3%：绿色、黄色、橙色、红色等状态色

大面积蓝色只用于导航、品牌入口或深色专题页面，不应铺满所有业务卡片。

## 5. 视觉材质

### 5.1 总体材质

风格属于“浅色工业科技”，不是深蓝科技大屏，也不是强玻璃拟态。

主要材质特征：

- 冷灰环境底色
- 白色或近白色业务卡片
- 低对比边框
- 轻微内高光
- 柔和外阴影
- 局部银色设备质感
- 无高亮霓虹描边

### 5.2 卡片

基础卡片：

```css
.card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(96, 108, 122, 0.14);
  border-radius: 12px;
  box-shadow:
    0 8px 24px rgba(27, 39, 52, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.80);
}
```

浮层卡片：

```css
.card-raised {
  background: #FFFFFF;
  border: 1px solid rgba(69, 83, 99, 0.12);
  border-radius: 14px;
  box-shadow:
    0 16px 40px rgba(20, 34, 48, 0.12),
    0 2px 6px rgba(20, 34, 48, 0.06);
}
```

约束：

- 普通业务卡片圆角使用 10–12px。
- 弹窗、抽屉内部大容器可使用 12–16px。
- 不使用超过 20px 的大圆角。
- 不使用纯黑强阴影。
- 不通过阴影区分所有层级，优先使用间距和明度。

## 6. 排版系统

### 6.1 字体

推荐字体组合：

```css
--font-ui: "HarmonyOS Sans SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
--font-data: "DIN", "Inter Tight", "Arial Narrow", sans-serif;
--font-mono: "JetBrains Mono", "Roboto Mono", monospace;
```

使用规则：

- 中文界面：HarmonyOS Sans SC 或微软雅黑。
- 英文及数字：Inter、DIN 或 Inter Tight。
- OPC Item、点位地址、设备编码：等宽字体。
- 实时变化数值启用等宽数字 `font-variant-numeric: tabular-nums`。

### 6.2 字号

| Token | 字号/行高 | 用途 |
|---|---:|---|
| `display-lg` | 48/56 | 大屏核心指标 |
| `display-md` | 36/44 | 风险数量、监测点数量 |
| `title-page` | 24/32 | 页面标题 |
| `title-section` | 18/26 | 一级业务区块 |
| `title-card` | 15/22 | 卡片标题 |
| `body-md` | 14/22 | 正文、表格 |
| `body-sm` | 13/20 | 高密度数据 |
| `label` | 12/18 | 字段名、辅助标签 |
| `caption` | 11/16 | 单位、时间、备注 |

核心数据格式：

```text
77.3  %
^^^^  ^
主值  单位
```

- 主值使用 `silver-900`。
- 单位使用 `silver-600`。
- 正常状态可用绿色小图标或短标签，不把整个数值涂绿。

## 7. 间距、尺寸与圆角

采用 8px 网格系统：

| Token | 值 |
|---|---:|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 24px |
| `space-6` | 32px |
| `space-7` | 40px |
| `space-8` | 48px |

常用尺寸：

| 元素 | 尺寸 |
|---|---:|
| 小按钮 | 32px |
| 默认按钮 | 40px |
| 大按钮 | 48px |
| 输入框 | 40px |
| 紧凑表格行 | 40px |
| 默认表格行 | 48px |
| 顶部栏 | 56–64px |
| 侧边栏展开宽度 | 224–256px |
| 侧边栏收起宽度 | 64px |

圆角：

| Token | 值 |
|---|---:|
| `radius-sm` | 4px |
| `radius-md` | 8px |
| `radius-lg` | 12px |
| `radius-xl` | 16px |
| `radius-pill` | 999px |

## 8. 页面结构

### 8.1 后台管理页面

推荐结构：

1. 顶部品牌栏
2. 左侧主导航
3. 页面标题和操作区
4. 查询筛选区
5. 列表或配置工作区
6. 弹窗或右侧详情抽屉

后台页面原则：

- 艾默生蓝用于导航、主按钮和焦点。
- 表格使用白色表面。
- 页面背景使用冷灰色。
- 状态色只出现在状态列、标签和告警信息中。
- 配置页面强调可操作性，不追求大屏式装饰。

### 8.2 前台大屏

适用于当前项目的单元风险监测大屏：

```text
┌─────────────────────────────────────────────────────────────┐
│ 品牌 / 单元名称 / 时间 / 全屏 / 状态                         │
├───────────────┬─────────────────────────┬───────────────────┤
│ 指标 1 + 趋势 │ 监测点数 / 当前风险数    │ 指标 4 + 趋势     │
│ 指标 2 + 趋势 │                         │ 指标 5 + 趋势     │
│ 指标 3 + 趋势 │ 单元概览图 / 区域告警    │ 指标 6 + 趋势     │
├───────────────┴─────────────────────────┴───────────────────┤
│ 故障事件列表 / 分页                                          │
└─────────────────────────────────────────────────────────────┘
```

布局原则：

- 左侧三个指标、右侧三个指标。
- 中间上方突出实时监测点数和当前风险数。
- 中间主体展示单元概览图。
- 故障区域使用红色状态覆盖或描边。
- 中间下方展示故障事件列表。
- 所有关键数据每 3 秒更新。

大屏中的艾默生蓝用于：

- 顶栏和品牌标识
- 当前单元名称
- 选中状态
- 中性数据图表
- 可操作控件

能源绿用于：

- 正常测点
- 正常设备区域
- 健康趋势
- 安全阈值

红色用于：

- 当前有效故障
- 故障区域
- 高优先级事件
- 风险数量非零时的风险强调

## 9. 数据可视化

### 9.1 图表颜色顺序

单系列图表：

1. 默认业务数据：Emerson Blue `#004B8D`
2. 设备健康数据：Energy Green `#39C523`
3. 风险数据：Critical Red `#D93838`

多系列图表：

| 序号 | 色值 |
|---|---:|
| Series 1 | `#004B8D` |
| Series 2 | `#39C523` |
| Series 3 | `#6C8EAD` |
| Series 4 | `#F2B544` |
| Series 5 | `#7A68A6` |
| Series 6 | `#D66B55` |

不得仅靠颜色区分多个系列，还应使用线型、点型、标签或直接标注。

### 9.2 趋势图

- 默认主曲线：Emerson Blue。
- 设备健康趋势：Energy Green。
- 告警区间：浅红色背景带。
- 网格线：`silver-200`，透明度 60%。
- 坐标文字：`silver-600`。
- 主曲线线宽：2px。
- 重点曲线线宽：2.5px。
- 面积渐变透明度不超过 24%。
- 实时数据点使用 4–6px 圆点，不使用大面积光晕。

### 9.3 风险数量

风险为零：

- 主数值使用 `silver-900`。
- 辅助正常图标使用绿色。

风险大于零：

- 数值使用 `status-critical`。
- 提供“查看事件”入口。
- 不使用持续闪烁。

### 9.4 设备层级树

- 缩进表达层级。
- 图标默认使用 `silver-700`。
- 选中行使用 `blue-50` 背景和 `blue-700` 左侧指示条。
- 状态显示在节点右侧。
- 正常、提醒、告警同时显示色块与文字/数值。
- 不将整行涂成红色或绿色。

## 10. 组件规范

### 10.1 按钮

主按钮：

```css
.button-primary {
  color: #FFFFFF;
  background: #004B8D;
  border: 1px solid #004B8D;
}

.button-primary:hover {
  background: #005A9B;
}

.button-primary:active {
  background: #003C71;
}
```

次按钮：

```css
.button-secondary {
  color: #30353B;
  background: #FFFFFF;
  border: 1px solid #CDD2D9;
}
```

危险按钮：

- 页面默认使用白底红字。
- 只在二次确认弹窗中使用实心红色。

### 10.2 输入框

- 高度 40px。
- 背景 `#FFFFFF`。
- 默认边框 `silver-300`。
- Hover 边框 `blue-300`。
- Focus 边框 `blue-700`。
- Focus ring：`0 0 0 3px rgba(0, 75, 141, 0.14)`。
- 错误状态使用红色边框和文字说明。

### 10.3 表格

- 表头使用 `silver-100`。
- 表格主体使用白色。
- 分割线使用 `silver-200`。
- 行高默认 48px。
- Hover 使用 `silver-50`。
- Selected 使用 `blue-50`。
- 选中标识使用 Emerson Blue。
- 状态使用小色块、图标或标签。
- 数值右对齐，文本左对齐，操作列右对齐。
- OPC Item 和点位地址使用等宽字体。

### 10.4 抽屉和弹窗

抽屉：

- 用于对象详情、多条子配置和上下文编辑。
- 宽度建议 480–720px。
- 大型配置抽屉不小于 640px。

弹窗：

- 用于新增、轻量编辑、删除确认和状态切换确认。
- 默认宽度 480–560px。
- 删除确认不展示多余信息。

### 10.5 状态标签

状态标签采用“浅背景 + 深色文字 + 状态点”：

```css
.tag-normal {
  color: #237D17;
  background: #EFF9EC;
}

.tag-critical {
  color: #A52727;
  background: #FCECEC;
}
```

不建议使用高饱和实心状态标签填满表格。

## 11. 图标与图形

- 使用 1.5–2px 线性图标。
- 默认图标为深灰。
- 交互激活为艾默生蓝。
- 状态图标使用对应状态色。
- 同一页面不得混用线性和填充图标体系。
- 设备图标采用简化几何结构，避免写实插画。
- Logo 周围必须保留品牌安全区，不与业务状态色组合变形。

## 12. 数字孪生

数字孪生的职责是帮助用户：

- 理解设备结构
- 定位故障区域
- 查看设备状态
- 从全局下钻到局部

数字孪生不应变成游戏式漫游。

交互原则：

- 默认固定最佳观察视角。
- 只开放业务必要的旋转、缩放和聚焦。
- 避免无约束平移和翻转。
- 双击或点击设备进入详情。
- 故障设备使用红色覆盖、描边或区域光带。
- 正常设备不需要持续发绿光。
- 未配置区域的故障必须在事件列表明确提示。

## 13. 动效

动效关键词：

- 稳定
- 机械
- 精确
- 可预测

时间建议：

| 类型 | 时长 |
|---|---:|
| Hover/Press | 100–140ms |
| 小组件状态变化 | 160–200ms |
| 抽屉/弹窗 | 200–240ms |
| 图表数据更新 | 300–500ms |
| 数字孪生镜头 | 500–800ms |

缓动：

```css
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-enter: cubic-bezier(0, 0, 0.2, 1);
--ease-exit: cubic-bezier(0.4, 0, 1, 1);
```

禁止：

- 告警区域持续高频闪烁
- 数字变化反复弹跳
- 卡片大幅漂浮
- 无业务意义的粒子、扫描线和光圈

## 14. 响应式与屏幕适配

设计基准：

- 后台管理：1440×900
- 标准大屏：1920×1080
- 超宽屏：2560×1080
- 双联屏：3840×1080

适配原则：

- 超宽屏增加可并列的信息量，不成比例放大所有组件。
- 双联屏不得让关键数据、弹窗或数字孪生主体跨越屏幕接缝。
- 低于 1440px 时，优先收起侧栏并减少次级列。
- 大屏视图不得依赖页面纵向滚动查看关键状态。
- 表格可分页，不通过无限压缩字号容纳更多行。

## 15. 可访问性

- 正文文字对比度满足 WCAG AA 4.5:1。
- 大字号文字对比度不低于 3:1。
- 明亮绿色不得直接作为白底小字号文字。
- 绿色文字应使用较深色值，例如 `#237D17`。
- 所有交互控件必须具有清晰 Focus 状态。
- 可点击区域最小 40×40px，大屏触控场景建议 44×44px。
- 告警不得只依赖红色。
- 实时变化内容避免造成频繁屏幕阅读器播报。

## 16. 设计原则

### 原则一：品牌与状态分离

艾默生蓝负责品牌和操作，能源绿负责正常与健康。

### 原则二：风险优先于装饰

任何装饰都不能降低故障、风险数量和设备状态的辨识度。

### 原则三：科技感来自秩序

通过数据结构、空间层级、数字孪生和实时反馈体现科技感，不依赖霓虹特效。

### 原则四：一屏一个焦点

总览、设备、告警、趋势和配置页面应各有明确的视觉中心。

### 原则五：深层模型，浅层操作

后台数据层级可以复杂，前台只呈现用户当前任务需要的层级。

### 原则六：为长时间监控设计

控制对比度、亮度、动画和信息密度，避免视觉疲劳。

## 17. Do / Don't

### Do

- 使用冷灰背景和白色卡片建立工业空间。
- 使用艾默生蓝突出主操作和选中状态。
- 使用能源绿表达正常运行。
- 使用红色突出当前有效故障。
- 用趋势、事件和区域定位形成风险闭环。
- 保持设备树和表格的高可读性。
- 让数字孪生服务于状态理解和故障定位。

### Don't

- 不把系统做成常见的深蓝霓虹大屏。
- 不同时把蓝色和绿色当成品牌主色。
- 不使用大量发光边框和装饰线。
- 不将所有关键数值涂成蓝色或绿色。
- 不通过缩小字号解决信息过多。
- 不让正常设备持续发光。
- 不使用高频闪烁表达告警。
- 不为了视觉效果开放无意义的三维自由漫游。

## 18. Design Tokens

```css
:root {
  /* Brand */
  --color-brand-primary: #004B8D;
  --color-brand-hover: #005A9B;
  --color-brand-active: #003C71;
  --color-brand-subtle: #EEF5FB;
  --color-brand-silver: #9FA1A4;

  /* Surface */
  --color-surface-canvas: #E9EDF2;
  --color-surface-section: #F1F3F6;
  --color-surface-card: #FFFFFF;
  --color-surface-raised: #F9FAFB;
  --color-surface-selected: #EEF5FB;
  --color-surface-inverse: #002C55;

  /* Text */
  --color-text-primary: #171A1E;
  --color-text-secondary: #515760;
  --color-text-tertiary: #747A82;
  --color-text-disabled: #9FA6AF;
  --color-text-inverse: #FFFFFF;

  /* Border */
  --color-border-default: #CDD2D9;
  --color-border-subtle: #E0E4E9;
  --color-border-focus: #004B8D;

  /* Status */
  --color-status-normal: #39C523;
  --color-status-attention: #F2B544;
  --color-status-warning: #F28C28;
  --color-status-critical: #D93838;
  --color-status-info: #0069A8;
  --color-status-unknown: #8C939D;
  --color-status-offline: #626972;

  /* Typography */
  --font-ui: "HarmonyOS Sans SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --font-data: "DIN", "Inter Tight", "Arial Narrow", sans-serif;
  --font-mono: "JetBrains Mono", "Roboto Mono", monospace;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 40px;
  --space-8: 48px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 999px;

  /* Shadow */
  --shadow-card: 0 8px 24px rgba(27, 39, 52, 0.07);
  --shadow-raised:
    0 16px 40px rgba(20, 34, 48, 0.12),
    0 2px 6px rgba(20, 34, 48, 0.06);

  /* Motion */
  --duration-fast: 120ms;
  --duration-normal: 200ms;
  --duration-chart: 400ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

## 19. 最终设计检查清单

- [ ] 主导航、主按钮和交互焦点使用 Emerson Blue。
- [ ] 绿色只表示正常、健康、成功或安全状态。
- [ ] 当前故障统一使用 Critical Red。
- [ ] 页面主要由银灰环境和白色卡片组成。
- [ ] 未使用大面积霓虹、发光描边或无意义装饰。
- [ ] 所有图表有明确单位、时间范围和数据来源。
- [ ] 风险数量与有效事件列表口径一致。
- [ ] 故障区域既有颜色，也有图标或文字提示。
- [ ] OPC Item 和设备编码使用等宽字体。
- [ ] 实时数字使用等宽数字，更新时不产生明显跳动。
- [ ] 关键界面满足目标分辨率，不依赖缩小字号。
- [ ] 大屏关键数据在 3 秒刷新周期下仍保持稳定可读。
- [ ] 正文、按钮和状态文字满足基本对比度要求。
- [ ] 数字孪生交互服务于观察、下钻和定位。

---

一句话设计定义：

> Emerson Light Industrial Twin 是一套以艾默生蓝建立工程品牌和操作秩序、以银灰白构建精密工业空间、以能源绿和风险红表达设备实时状态，并通过克制的数据可视化与数字孪生支持长期监盘的设计语言。
