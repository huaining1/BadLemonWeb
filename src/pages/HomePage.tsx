import { useState, useMemo } from "react";
import { ALL_CATEGORY, type Post, type Page } from "@/types";
import { ArticleCard } from "@/components/home/ArticleCard";
import { Sidebar } from "@/components/home/Sidebar";

interface HomePageProps {
  posts: Post[];
  onNavigate: (page: Page, articleId?: string) => void;
}

export function HomePage({ posts, onNavigate }: HomePageProps) {
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [activeTag, setActiveTag] = useState<string | null>(null);

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

  const categoryTabs = [ALL_CATEGORY, ...Array.from(categories.keys())];

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    setActiveTag(null);
  };

  const handleTagClick = (tag: string) => {
    setActiveTag(tag === activeTag ? null : tag);
  };

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
