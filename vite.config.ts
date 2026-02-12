import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_META_MODULE = "virtual:posts-meta";
const RESOLVED_POSTS_META_MODULE = "\0virtual:posts-meta";

function postsMetaPlugin() {
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [postsMetaPlugin(), react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
