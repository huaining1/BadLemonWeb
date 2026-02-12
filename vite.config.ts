import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_META_MODULE = "virtual:posts-meta";
const RESOLVED_POSTS_META_MODULE = "\0virtual:posts-meta";
const SITE_URL = (process.env.SITE_URL || "https://example.com").replace(/\/+$/, "");

function postsMetaPlugin(): Plugin {
  return {
    name: "posts-meta-plugin",
    resolveId(id: string) {
      if (id === POSTS_META_MODULE) return RESOLVED_POSTS_META_MODULE;
      return null;
    },
    load(id: string) {
      if (id !== RESOLVED_POSTS_META_MODULE) return null;

      const postsDir = path.resolve(__dirname, "src/content/posts");
      const postsMeta: Record<string, string> = {};

      if (fs.existsSync(postsDir)) {
        const files = fs
          .readdirSync(postsDir)
          .filter((name) => name.endsWith(".md"))
          .sort((a, b) => a.localeCompare(b));

        for (const file of files) {
          const absolutePath = path.join(postsDir, file);
          const stat = fs.statSync(absolutePath);
          postsMeta[`/src/content/posts/${file}`] = stat.mtime.toISOString();
        }
      }

      return `export default ${JSON.stringify(postsMeta)};`;
    },
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const data: Record<string, string> = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    data[key] = value;
  }

  return { data, body: match[2].trim() };
}

function rssFeedPlugin(): Plugin {
  return {
    name: "rss-feed-plugin",
    apply: "build",
    generateBundle() {
      const postsDir = path.resolve(__dirname, "src/content/posts");
      if (!fs.existsSync(postsDir)) return;

      const files = fs
        .readdirSync(postsDir)
        .filter((name) => name.endsWith(".md"))
        .sort((a, b) => a.localeCompare(b));

      const posts = files.map((file) => {
        const absolutePath = path.join(postsDir, file);
        const raw = fs.readFileSync(absolutePath, "utf-8");
        const stat = fs.statSync(absolutePath);
        const { data, body } = parseFrontmatter(raw);
        const id = data.id || file.replace(/\.md$/i, "");
        const title = data.title || id;
        const descriptionRaw = data.description || markdownToPlainText(body).slice(0, 140);
        const date = data.date || stat.mtime.toISOString().slice(0, 10);
        const dateObj = new Date(date);
        const timestamp = Number.isNaN(dateObj.getTime()) ? stat.mtime.getTime() : dateObj.getTime();
        const pubDate = new Date(timestamp).toUTCString();
        const url = `${SITE_URL}/#/article/${encodeURIComponent(id)}`;

        return {
          title,
          description: descriptionRaw,
          pubDate,
          timestamp,
          url,
        };
      });

      posts.sort((a, b) => b.timestamp - a.timestamp);

      const items = posts
        .map(
          (post) => [
            "<item>",
            `  <title>${escapeXml(post.title)}</title>`,
            `  <link>${escapeXml(post.url)}</link>`,
            `  <guid>${escapeXml(post.url)}</guid>`,
            `  <pubDate>${escapeXml(post.pubDate)}</pubDate>`,
            `  <description>${escapeXml(post.description)}</description>`,
            "</item>",
          ].join("\n")
        )
        .join("\n");

      const rssXml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        "<channel>",
        "  <title>坏柠编程</title>",
        `  <link>${escapeXml(SITE_URL)}</link>`,
        "  <description>嵌入式技术分享博客，持续更新底层实战内容。</description>",
        "  <language>zh-CN</language>",
        `  <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
        ...items.split("\n"),
        "</channel>",
        "</rss>",
      ].join("\n");

      this.emitFile({
        type: "asset",
        fileName: "rss.xml",
        source: rssXml,
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [postsMetaPlugin(), rssFeedPlugin(), react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
