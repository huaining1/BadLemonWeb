import { marked, type Tokens } from "marked";
import type { Post, PostMeta, TocItem } from "@/types";
import postsMeta from "virtual:posts-meta";

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const markdownRenderer = new marked.Renderer();

markdownRenderer.image = ({ href, title, text }: Tokens.Image) => {
  const src = escapeHtmlAttr(href || "");
  const alt = escapeHtmlAttr(text || "");
  const titleAttr = title ? ` title="${escapeHtmlAttr(title)}"` : "";
  const referrerAttr = /^https?:\/\//i.test(href || "") ? ' referrerpolicy="no-referrer"' : "";
  return `<img src="${src}" alt="${alt}" loading="lazy" decoding="async"${referrerAttr}${titleAttr} />`;
};

/**
 * 解析 Markdown 文件头部的 YAML Frontmatter
 */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const data: Record<string, unknown> = {};
  const lines = match[1].split("\n");

  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val: unknown = line.slice(idx + 1).trim();

    if (typeof val === "string") {
      if (val.startsWith("[") && val.endsWith("]")) {
        val = val
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""));
      } else if (val === "true") {
        val = true;
      } else if (val === "false") {
        val = false;
      } else if (/^\d+$/.test(val as string)) {
        val = parseInt(val as string, 10);
      } else {
        val = (val as string).replace(/^["']|["']$/g, "");
      }
    }
    data[key] = val;
  }

  return { data, body: match[2].trim() };
}

/**
 * 根据中文字符数估算阅读时间
 */
function estimateReadingTime(text: string): number {
  const stripped = text.replace(/```[\s\S]*?```/g, "").replace(/[#*`\[\]()!<>]/g, "");
  return Math.max(1, Math.ceil(stripped.length / 400));
}

function formatDateFromIso(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_|~-]/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function generateDescriptionFromBody(markdown: string, maxLength = 50): string {
  const plain = markdownToPlainText(markdown);
  if (!plain) return "";
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength)}...`;
}

/**
 * 从渲染后的 HTML 中提取 h2/h3 标题，加入 id 属性用于目录跳转
 */
export function processHeadings(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const processed = html.replace(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
    const text = inner.replace(/<[^>]*>/g, "").trim();
    const id =
      text
        .replace(/[\s]+/g, "-")
        .replace(/[^\w\u4e00-\u9fff-]/g, "")
        .toLowerCase() || `heading-${toc.length}`;
    toc.push({ id, title: text, level: parseInt(level, 10) });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { html: processed, toc };
}

/**
 * 加载 src/content/posts/ 目录下的所有 .md 文件，
 * 解析 frontmatter + 渲染 HTML，返回 Post 数组（按日期倒序）
 */
export function loadAllPosts(): Post[] {
  const modules = import.meta.glob("/src/content/posts/*.md", {
    query: "?raw",
    import: "default",
    eager: true,
  });

  const posts: Post[] = [];

  for (const [filepath, raw] of Object.entries(modules)) {
    const rawStr = raw as string;
    const { data, body } = parseFrontmatter(rawStr);
    const filename = filepath.split("/").pop()?.replace(".md", "") || "";
    const id = (data.id as string) || filename;
    const generatedDate = formatDateFromIso(postsMeta[filepath]);
    const generatedDescription = generateDescriptionFromBody(body, 50);

    const htmlRaw = marked.parse(body, { async: false, renderer: markdownRenderer }) as string;
    const { html } = processHeadings(htmlRaw);

    const meta: PostMeta = {
      id,
      title: (data.title as string) || filename,
      date: generatedDate || (data.date as string) || "",
      category: (data.category as string) || "未分类",
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      description: generatedDescription || (data.description as string) || "",
      readingTime: (data.readingTime as number) || estimateReadingTime(body),
      featured: (data.featured as boolean) || false,
    };

    posts.push({ meta, content: html, raw: body });
  }

  posts.sort((a, b) => b.meta.date.localeCompare(a.meta.date));
  return posts;
}
