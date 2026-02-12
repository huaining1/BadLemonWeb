import { useMemo } from "react";
import type { Page, Post } from "@/types";

interface TagsPageProps {
  posts: Post[];
  onNavigate: (page: Page, articleId?: string) => void;
}

export function TagsPage({ posts, onNavigate }: TagsPageProps) {
  const tags = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((post) => {
      post.meta.tags.forEach((tag) => {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      });
    });

    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [posts]);

  return (
    <section className="bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0">标签索引</h1>
            <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
              按标签聚合浏览所有文章，快速找到你关心的主题。
            </p>
          </div>
          <button
            onClick={() => onNavigate("articles")}
            className="rounded-lg border border-surface-200 px-3 py-2 text-sm text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
          >
            返回文章列表
          </button>
        </div>

        {tags.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tags.map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => onNavigate("tag", tag)}
                className="rounded-xl border border-surface-200 bg-white px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-sm dark:border-surface-800 dark:bg-surface-900 dark:hover:border-brand-700"
              >
                <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-100">#{tag}</p>
                <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">{count} 篇文章</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-surface-200 bg-white py-16 text-center dark:border-surface-800 dark:bg-surface-900">
            <p className="text-sm text-surface-400 dark:text-surface-500">暂无标签数据</p>
          </div>
        )}
      </div>
    </section>
  );
}
