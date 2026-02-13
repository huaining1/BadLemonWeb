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

## GitHub Pages 自动部署（GitHub Actions）

本项目采用：

- 源码分支：`master`
- 发布分支：`gh-pages`
- 站点地址：`https://huaining1.github.io/BadLemonWeb/`
- 自动发布工作流：`.github/workflows/deploy-gh-pages.yml`

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

### 3) 推送源码到 GitHub master（触发自动发布）

```bash
git push github master
```

### 4) GitHub 仓库一次性设置

GitHub 仓库中：

1. `Settings -> Actions -> General -> Workflow permissions`
2. 选择 `Read and write permissions`
3. `Settings -> Pages`
4. `Source` 选择 `Deploy from a branch`
5. Branch 选择 `gh-pages` + `/ (root)`
6. 保存并等待 1-5 分钟

部署后访问：

- 首页：`https://huaining1.github.io/BadLemonWeb/`
- 标签页：`https://huaining1.github.io/BadLemonWeb/#/tags`
- RSS：`https://huaining1.github.io/BadLemonWeb/rss.xml`

### 5) 后续更新流程（新增文章）

每次新增文章后，按下面流程即可自动更新线上网页：

1. 在 `src/content/posts/` 新增或修改 `.md` 文章
2. 本地预览确认内容正常：
```bash
npm run dev
```
3. 提交代码：
```bash
git add .
git commit -m "feat: add new post"
```
4. 推送到 GitHub `master`（会自动触发部署）：
```bash
git push github master
```
5. 打开 GitHub 仓库 `Actions` 页面，确认 `Deploy to GitHub Pages` 成功
6. 等待 1-3 分钟后访问线上：
   - 首页：`https://huaining1.github.io/BadLemonWeb/`
   - 文章页：`https://huaining1.github.io/BadLemonWeb/#/article/<文章ID>`
   - RSS：`https://huaining1.github.io/BadLemonWeb/rss.xml`

也可以在 GitHub 的 `Actions` 页面手动点击 `Run workflow` 触发发布。

如果线上没更新，优先检查：

1. `master` 是否推送到 GitHub（不是只推送到 Gitee）
2. `Actions` 工作流是否失败
3. `Settings -> Pages` 是否仍指向 `gh-pages` / `(root)`

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

新增文章建议：

1. 文件名就是文章 ID，会用于 URL（如：`#/article/my-new-article`）
2. `title`、`date`、`category`、`tags`、`description` 建议完整填写
3. `date` 建议使用 `YYYY-MM-DD`，便于排序和归档
4. 写完后至少本地 `npm run dev` 检查一次，再提交推送
