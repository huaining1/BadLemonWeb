import { useState, useMemo, useEffect } from "react";
import { ALL_CATEGORY, type Post, type Page } from "@/types";
import { ArticleCard } from "@/components/home/ArticleCard";
import { Sidebar } from "@/components/home/Sidebar";

const RECENT_POSTS_KEY = "bad-lemon.recentPosts";

interface HomePageProps {
  posts: Post[];
  onNavigate: (page: Page, articleId?: string) => void;
}

export function HomePage({ posts, onNavigate }: HomePageProps) {
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [recentPostIds, setRecentPostIds] = useState<string[]>([]);

  // Compute categories and their counts
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p) => map.set(p.meta.category, (map.get(p.meta.category) || 0) + 1));
    return map;
  }, [posts]);

  // Compute tags and their counts
  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p) => p.meta.tags.forEach((t) => map.set(t, (map.get(t) || 0) + 1)));
    return map;
  }, [posts]);

  // Filter posts by category + tag
  const filteredPosts = useMemo(() => {
    let result = posts;
    if (activeCategory !== ALL_CATEGORY) {
      result = result.filter((p) => p.meta.category === activeCategory);
    }
    if (activeTag) {
      result = result.filter((p) => p.meta.tags.includes(activeTag));
    }
    return result;
  }, [posts, activeCategory, activeTag]);

  const featuredPosts = useMemo(() => filteredPosts.filter((p) => p.meta.featured), [filteredPosts]);
  const regularPosts = useMemo(() => filteredPosts.filter((p) => !p.meta.featured), [filteredPosts]);
  const recentPosts = useMemo(
    () => recentPostIds.map((id) => posts.find((post) => post.meta.id === id)).filter((post): post is Post => Boolean(post)),
    [recentPostIds, posts]
  );
  const archiveGroups = useMemo(() => {
    const grouped = new Map<string, Post[]>();
    filteredPosts.forEach((post) => {
      const monthKey = post.meta.date?.slice(0, 7) || "未知时间";
      const list = grouped.get(monthKey) ?? [];
      list.push(post);
      grouped.set(monthKey, list);
    });

    return Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredPosts]);

  const categoryTabs = [ALL_CATEGORY, ...Array.from(categories.keys())];

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    setActiveTag(null);
  };

  const handleTagClick = (tag: string) => {
    setActiveTag(tag === activeTag ? null : tag);
  };

  useEffect(() => {
    const loadRecent = () => {
      try {
        const raw = window.localStorage.getItem(RECENT_POSTS_KEY);
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        const ids = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
        setRecentPostIds(ids);
      } catch {
        setRecentPostIds([]);
      }
    };

    loadRecent();
    window.addEventListener("focus", loadRecent);
    return () => window.removeEventListener("focus", loadRecent);
  }, []);

  return (
    <section className="bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* ===== Left column: articles ===== */}
          <div className="lg:col-span-8">
            {/* Category filter tabs */}
            <div className="scrollbar-hide mb-6 flex gap-2 overflow-x-auto pb-1">
              {categoryTabs.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-surface-900 text-white shadow-md dark:bg-surface-0 dark:text-surface-900"
                        : "bg-white text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
                    }`}
                  >
                    {cat}
                    {cat !== ALL_CATEGORY && (
                      <span className={`text-xs ${isActive ? "text-surface-300 dark:text-surface-500" : "text-surface-400 dark:text-surface-500"}`}>
                        {categories.get(cat)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mb-6 flex items-center justify-end">
              <button
                onClick={() => onNavigate("tags")}
                className="inline-flex items-center gap-1 rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
              >
                按标签浏览
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </div>

            {recentPosts.length > 0 && (
              <div className="mb-8 rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
                <h2 className="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-0">
                  最近阅读
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {recentPosts.slice(0, 4).map((post) => (
                    <button
                      key={post.meta.id}
                      onClick={() => onNavigate("article", post.meta.id)}
                      className="rounded-lg border border-surface-100 px-3 py-2 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40 dark:border-surface-800 dark:hover:border-brand-800 dark:hover:bg-brand-900/10"
                    >
                      <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-100">
                        {post.meta.title}
                      </p>
                      <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">{post.meta.date}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active tag indicator */}
            {activeTag && (
              <div className="mb-5 flex items-center gap-2">
                <span className="text-sm text-surface-500 dark:text-surface-400">
                  标签筛选：
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-400 px-2.5 py-0.5 text-xs font-medium text-surface-900">
                  {activeTag}
                  <button
                    onClick={() => setActiveTag(null)}
                    className="ml-0.5 hover:text-surface-700"
                  >
                    ✕
                  </button>
                </span>
              </div>
            )}

            {/* Featured posts */}
            {featuredPosts.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-surface-900 dark:text-surface-0">
                  <span className="text-lg">⭐</span> 置顶推荐
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {featuredPosts.map((post) => (
                    <ArticleCard key={post.meta.id} post={post} featured onNavigate={onNavigate} />
                  ))}
                </div>
              </div>
            )}

            {/* Regular posts */}
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-surface-900 dark:text-surface-0">
                <span className="text-lg">📝</span> 最新文章
                <span className="text-sm font-normal text-surface-400 dark:text-surface-500">
                  ({filteredPosts.length} 篇)
                </span>
              </h2>

              {regularPosts.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {regularPosts.map((post) => (
                    <ArticleCard key={post.meta.id} post={post} onNavigate={onNavigate} />
                  ))}
                </div>
              ) : featuredPosts.length === 0 ? (
                <div className="rounded-xl border border-surface-200 bg-white py-16 text-center dark:border-surface-800 dark:bg-surface-900">
                  <div className="mb-3 text-3xl">📭</div>
                  <p className="text-sm text-surface-400 dark:text-surface-500">
                    该分类下暂无文章
                  </p>
                </div>
              ) : null}
            </div>

            {archiveGroups.length > 0 && (
              <div className="mt-10 rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
                <h2 className="mb-4 text-base font-semibold text-surface-900 dark:text-surface-0">
                  归档时间线
                </h2>
                <div className="space-y-5">
                  {archiveGroups.map(([month, monthPosts]) => (
                    <div key={month}>
                      <p className="mb-2 text-sm font-medium text-surface-700 dark:text-surface-200">{month}</p>
                      <div className="space-y-1.5">
                        {monthPosts.map((post) => (
                          <button
                            key={post.meta.id}
                            onClick={() => onNavigate("article", post.meta.id)}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-surface-600 transition-colors hover:bg-surface-50 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100"
                          >
                            <span className="truncate">{post.meta.title}</span>
                            <span className="ml-2 shrink-0 text-xs text-surface-400 dark:text-surface-500">{post.meta.date}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ===== Right column: sidebar ===== */}
          <div className="lg:col-span-4">
            <Sidebar
              categories={categories}
              tags={allTags}
              activeCategory={activeCategory}
              activeTag={activeTag}
              onCategoryClick={handleCategoryClick}
              onTagClick={handleTagClick}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
