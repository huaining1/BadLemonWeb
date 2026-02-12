## 项目目录结构
```text
src/
├── content/posts/                    # 📝 文章存放区（Markdown 文件）
│   ├── stm32-hal-ll-register.md      #   STM32 HAL/LL/寄存器对比
│   ├── freertos-scheduler.md         #   FreeRTOS 调度器源码剖析
│   ├── linux-char-driver.md          #   Linux 字符设备驱动
│   ├── can-bus-protocol.md           #   CAN 总线协议精讲
│   ├── cortex-m-hardfault.md         #   Cortex-M HardFault 调试
│   └── spi-dma-optimization.md       #   SPI + DMA 高速传输优化
│
├── types/index.ts                    # 📐 类型定义（Post / TocItem / Page）
├── utils/
│   ├── cn.ts                         # 🔧 Tailwind class 合并工具
│   └── markdown.ts                   # ⚙️ MD 解析引擎（frontmatter + marked + TOC）
├── hooks/
│   └── useSearch.ts                  # 🔍 全站搜索 Hook
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx                # 导航栏（⌘K 搜索 + 暗色切换）
│   │   ├── Hero.tsx                  # Hero 区域
│   │   └── Footer.tsx                # 页脚
│   ├── search/
│   │   └── SearchModal.tsx           # 搜索弹窗（实时检索）
│   └── home/
│       ├── ArticleCard.tsx           # 文章卡片组件
│       └── Sidebar.tsx               # 侧边栏（分类/标签/工具）
│
├── pages/
│   ├── HomePage.tsx                  # 首页（分类筛选 + 双栏布局）
│   └── ArticlePage.tsx               # 文章页（正文 + TOC 目录）
│
├── App.tsx                           # 🏠 主入口（路由 + 搜索 + 暗色模式）
├── main.tsx                          # 渲染入口
└── index.css                         # 全局样式 + 文章排版
```

## 📝 如何新增文章

在 src/content/posts/ 目录下新建一个 .md 文件即可，格式如下：
```
---
title: "你的文章标题"
date: "2025-01-20"
category: "STM32"
tags: [STM32, GPIO, 寄存器]
description: "文章摘要，会显示在卡片和文章页顶部"
featured: false
---

## 第一章 标题

正文内容...

### 1.1 子标题

更多内容...

```c
// 代码块会自动高亮显示
void main(void) {
    HAL_Init();
}
`` `

> 引用块也有样式

- 列表项 1
- 列表项 2
```

Frontmatter 字段说明
字段|	类型	|说明
---|---|---
title	|string|	文章标题
date|	string	|日期，格式 YYYY-MM-DD，决定排序
category|	string|	分类（如 STM32、RTOS、Linux驱动、通信协议、调试技巧、系统设计）
tags	|string[]	|标签数组，用于搜索和标签云
description|	string	|摘要，显示在卡片和文章页
featured	|boolean	|true 则显示在「置顶推荐」区域

### 操作步骤
1. 新建文件：src/content/posts/my-new-article.md
2. 写入 frontmatter + 正文（如上格式）
3. 重新构建：npm run build
4. 完成！文章自动出现在首页、搜索结果和分类中

文件名即文章 ID（用于 URL），MD 内容通过 marked 库自动转换为 HTML 渲染。