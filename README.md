# BedLemon Web

嵌入式技术博客前端项目，基于 React + Vite + Tailwind CSS。

## 当前能力

- 代码复制界面
  - 文章代码块支持一键复制
  - 文章链接支持复制
- 订阅输出
  - 构建自动生成 `dist/rss.xml`
  - 通过 `SITE_URL` 注入 RSS 中的线上域名
- 技能标签页面
  - 标签索引：`#/tags`
  - 标签详情：`#/tag/<tagName>`

## 本地开发

```bash
npm install
npm run dev
```

默认访问：

- `http://localhost:5173/#/`

## 构建与预览

```bash
npm run build
npm run preview
```

## RSS 订阅

### 本地验证

1. 构建：
```bash
npm run build
```
2. 确认文件存在：`dist/rss.xml`
3. 预览并访问：`http://127.0.0.1:4173/rss.xml`（或你的 preview 端口）

### 线上订阅地址

- `https://huaining1.github.io/BadLemonWeb/rss.xml`

可将该地址添加到 RSS 阅读器（Inoreader / Feedly / Follow）。

## GitHub Pages 部署（手动 gh-pages）

本项目采用：

- 源码分支：`master`
- 发布分支：`gh-pages`
- 站点地址：`https://huaining1.github.io/BadLemonWeb/`

### 1) 创建 GitHub 仓库

在 GitHub 创建公开仓库：

- `BadLemonWeb`

建议不要初始化 README/.gitignore/license（空仓库）。

### 2) 配置 GitHub 远端

在本地项目目录执行：

```bash
git remote add github https://github.com/huaining1/BadLemonWeb.git
git remote -v
```

### 3) 推送源码到 GitHub master

```bash
git push github master
```

### 4) 生产构建（写入正确 SITE_URL）

PowerShell：

```bash
$env:SITE_URL="https://huaining1.github.io/BadLemonWeb"
npm run build
```

校验 `dist/rss.xml` 内应包含：

- `<link>https://huaining1.github.io/BadLemonWeb</link>`
- `<atom:link href="https://huaining1.github.io/BadLemonWeb/rss.xml" ... />`

### 5) 发布 dist 到 gh-pages 分支（临时目录法）

PowerShell 示例：

```powershell
$tempDir = Join-Path $env:TEMP "bedlemon_gh_pages"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir | Out-Null
Copy-Item -Path ".\\dist\\*" -Destination $tempDir -Recurse -Force

Set-Location $tempDir
git init -b gh-pages
git config user.name "bad-lemon-bot"
git config user.email "bad-lemon@example.com"
New-Item -ItemType File -Path ".nojekyll" -Force | Out-Null
git add .
git commit -m "deploy: publish static site"
git remote add github https://github.com/huaining1/BadLemonWeb.git
git push -f github gh-pages
```

### 6) GitHub Pages 开启

GitHub 仓库中：

1. `Settings`
2. `Pages`
3. `Source` 选择 `Deploy from a branch`
4. Branch 选择 `gh-pages` + `/ (root)`
5. 保存并等待 1-5 分钟

部署后访问：

- 首页：`https://huaining1.github.io/BadLemonWeb/`
- 标签页：`https://huaining1.github.io/BadLemonWeb/#/tags`
- RSS：`https://huaining1.github.io/BadLemonWeb/rss.xml`

## 页面路由

- 首页：`#/`
- 文章列表：`#/articles`
- 文章详情：`#/article/<articleId>`
- 标签索引：`#/tags`
- 标签详情：`#/tag/<tagName>`
- 关于：`#/about`

## 目录结构

```text
src/
├── content/posts/            # Markdown 文章
├── components/               # 组件
├── pages/                    # 页面（含 TagsPage / TagDetailPage）
├── hooks/                    # 自定义 hooks
├── utils/                    # Markdown / 工具函数
├── types/                    # 类型定义
├── App.tsx                   # Hash 路由入口
├── main.tsx                  # 渲染入口
└── index.css                 # 全局样式
vite.config.ts                # RSS 生成插件与构建配置
```

## 新增文章

在 `src/content/posts/` 新建 `.md` 文件，例如 `my-new-article.md`：

````md
---
title: "你的文章标题"
date: "2025-01-20"
category: "STM32"
tags: [STM32, GPIO, 寄存器]
description: "文章摘要"
featured: false
---

## 第一章

正文内容...

```c
void main(void) {
  HAL_Init();
}
```
````
