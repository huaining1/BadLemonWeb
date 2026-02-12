import { useMemo } from "react";
import { ArticleCard } from "@/components/home/ArticleCard";
import type { Page, Post } from "@/types";

interface TagDetailPageProps {
  posts: Post[];
  tagName: string;
  onNavigate: (page: Page, articleId?: string) => void;
}

export function TagDetailPage({ posts, tagName, onNavigate }: TagDetailPageProps) {
  const filteredPosts = useMemo(
    () => posts.filter((post) => post.meta.tags.includes(tagName)),
    [posts, tagName]
  );

  return (
    <section className="bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => onNavigate("tags")}
            className="mb-3 inline-flex items-center gap-1 text-sm text-surface-500 transition-colors hover:text-brand-600 dark:text-surface-400 dark:hover:text-brand-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            返回标签索引
          </button>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0">标签：#{tagName}</h1>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
            共 {filteredPosts.length} 篇相关文章
          </p>
        </div>

        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredPosts.map((post) => (
              <ArticleCard key={post.meta.id} post={post} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-surface-200 bg-white py-16 text-center dark:border-surface-800 dark:bg-surface-900">
            <p className="text-sm text-surface-400 dark:text-surface-500">该标签下暂无文章</p>
          </div>
        )}
      </div>
    </section>
  );
}
