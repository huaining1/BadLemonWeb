import type { Post, Page } from "@/types";
import { CATEGORY_COLORS } from "@/types";

interface ArticleCardProps {
  post: Post;
  featured?: boolean;
  onNavigate: (page: Page, articleId?: string) => void;
}

export function ArticleCard({ post, featured, onNavigate }: ArticleCardProps) {
  const colorClass = CATEGORY_COLORS[post.meta.category] || "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300";

  return (
    <button
      onClick={() => onNavigate("article", post.meta.id)}
      className={`group relative flex w-full flex-col rounded-xl border bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:bg-surface-900 ${
        featured
          ? "border-surface-200 border-t-[3px] border-t-brand-400 dark:border-surface-800 dark:border-t-brand-400"
          : "border-surface-200 hover:border-brand-300 dark:border-surface-800 dark:hover:border-brand-700"
      }`}
    >
      {/* Featured badge */}
      {featured && (
        <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
          📌 置顶推荐
        </span>
      )}

      {/* Category + date row */}
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${colorClass}`}>
          {post.meta.category}
        </span>
        <span className="text-xs text-surface-400 dark:text-surface-500">{post.meta.date}</span>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-[15px] font-semibold leading-snug text-surface-900 transition-colors group-hover:text-brand-700 dark:text-surface-0 dark:group-hover:text-brand-400">
        {post.meta.title}
      </h3>

      {/* Description */}
      <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-surface-500 dark:text-surface-400">
        {post.meta.description}
      </p>

      {/* Bottom: tags + reading time */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {post.meta.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-surface-100 px-1.5 py-0.5 text-[10px] font-medium text-surface-500 dark:bg-surface-800 dark:text-surface-400"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs text-surface-400 dark:text-surface-500">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          {post.meta.readingTime} 分钟
        </span>
      </div>

      {/* Left hover accent line */}
      {!featured && (
        <div className="absolute bottom-4 left-0 top-4 w-0.5 scale-y-0 rounded-r bg-brand-400 transition-transform duration-200 group-hover:scale-y-100" />
      )}
    </button>
  );
}
