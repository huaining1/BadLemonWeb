import { useEffect, useRef } from "react";
import type { Post } from "@/types";
import { CATEGORY_COLORS } from "@/types";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  results: Post[];
  onSelect: (id: string) => void;
}

export function SearchModal({ open, onClose, query, onQueryChange, results, onSelect }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 mx-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-2xl dark:border-surface-700 dark:bg-surface-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-surface-200 px-5 dark:border-surface-800">
          <svg className="h-5 w-5 shrink-0 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="搜索文章标题、内容、标签..."
            className="flex-1 bg-transparent py-4 text-base text-surface-900 outline-none placeholder:text-surface-400 dark:text-surface-0 dark:placeholder:text-surface-500"
          />
          <button
            onClick={onClose}
            className="rounded-md border border-surface-200 px-2 py-0.5 text-xs text-surface-400 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:hover:bg-surface-800"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim() === "" ? (
            <div className="px-4 py-12 text-center">
              <div className="mb-3 text-3xl">🔍</div>
              <p className="text-sm text-surface-400 dark:text-surface-500">输入关键词搜索文章</p>
              <p className="mt-1.5 text-xs text-surface-300 dark:text-surface-600">支持搜索标题、摘要、标签和正文内容</p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="mb-3 text-3xl">😕</div>
              <p className="text-sm text-surface-400 dark:text-surface-500">
                未找到与「<span className="font-medium text-surface-600 dark:text-surface-300">{query}</span>」相关的文章
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs text-surface-400 dark:text-surface-500">
                找到 {results.length} 篇相关文章
              </div>
              {results.map((post) => {
                const colorClass = CATEGORY_COLORS[post.meta.category] || "bg-surface-100 text-surface-600";
                return (
                  <button
                    key={post.meta.id}
                    onClick={() => onSelect(post.meta.id)}
                    className="group flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-sm dark:bg-surface-800">
                      📄
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-semibold text-surface-900 group-hover:text-brand-700 dark:text-surface-0 dark:group-hover:text-brand-400">
                        {post.meta.title}
                      </h4>
                      <p className="mt-0.5 line-clamp-1 text-xs text-surface-500 dark:text-surface-400">
                        {post.meta.description}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}>
                          {post.meta.category}
                        </span>
                        <span className="text-[11px] text-surface-400 dark:text-surface-500">{post.meta.date}</span>
                        <span className="text-[11px] text-surface-400 dark:text-surface-500">· {post.meta.readingTime} 分钟</span>
                      </div>
                    </div>
                    <svg className="mt-2 h-4 w-4 shrink-0 text-surface-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-surface-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-surface-200 px-5 py-3 dark:border-surface-800">
          <div className="flex items-center gap-3 text-xs text-surface-400 dark:text-surface-500">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-surface-200 px-1.5 py-0.5 text-[10px] dark:border-surface-700">⌘K</kbd>
              打开搜索
            </span>
          </div>
          <span className="text-xs text-surface-400 dark:text-surface-500">坏柠编程</span>
        </div>
      </div>
    </div>
  );
}
