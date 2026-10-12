---
version: 1
name: sprite-forge-sunny-stage
description: "沿用 Sunny Stage 的紧凑素材工作台；展示版以森屿探险示例贯穿现有界面。"
colors:
  primary: "#171717"
  on-primary: "#fffef9"
  ink: "#171717"
  ink-muted: "#646464"
  canvas: "#fffef9"
  surface-1: "#ffffff"
  hairline: "rgba(23,23,23,.14)"
typography:
  body:
    fontFamily: "system-ui, Microsoft YaHei, sans-serif"
    fontSize: 14px
    lineHeight: 1.5
spacing:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
rounded:
  sm: 8px
  md: 12px
  lg: 20px
---

## 界面约束

详细视觉规则以 `docs/SUNNY_STAGE_DESIGN_LANGUAGE.zh-CN.md` 为准。沿用现有 CSS 变量、组件、侧栏和黑白模式，不重做导航或增加营销首屏。参考 Figma 的中性工具框架与彩色内容分离原则，但不引入其营销页面样式。

展示版用紧凑提示条说明“示例数据 / 不执行真实处理”，提供界面导航和重置入口。示例插画属于内容，不改变应用品牌色。图片完整适配，透明资源使用原有棋盘格和统一大图预览。只读操作提供明确反馈，不伪造真实生成、支付或文件写入成功。

新增控件沿用默认、悬停、focus-visible 和禁用状态；键盘可达，窄屏允许换行，避免固定宽度；不添加自动播放动效，遵守减少动态效果偏好。展示数据只驻留内存，刷新恢复初始状态。暂未实现的视频/音频生成仍标注待接入。
