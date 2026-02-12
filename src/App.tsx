import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/layout/Hero";
import { Footer } from "@/components/layout/Footer";
import { HomePage } from "@/pages/HomePage";
import { ArticlePage } from "@/pages/ArticlePage";
import { AboutPage } from "@/pages/AboutPage";
import { TagsPage } from "@/pages/TagsPage";
import { TagDetailPage } from "@/pages/TagDetailPage";
import { SearchModal } from "@/components/search/SearchModal";
import { useSearch } from "@/hooks/useSearch";
import { loadAllPosts } from "@/utils/markdown";
import type { Page } from "@/types";

// Load all markdown posts at build time (via Vite's import.meta.glob)
const allPosts = loadAllPosts();

interface AppRoute {
  page: Page;
  articleId: string;
  tagName: string;
}

function parseHashRoute(hash: string): AppRoute {
  if (hash === "#/about") return { page: "about", articleId: "", tagName: "" };
  if (hash === "#/articles") return { page: "articles", articleId: "", tagName: "" };
  if (hash === "#/tags") return { page: "tags", articleId: "", tagName: "" };

  const tagMatch = hash.match(/^#\/tag\/([^/?#]+)/);
  if (tagMatch) {
    try {
      return {
        page: "tag",
        articleId: "",
        tagName: decodeURIComponent(tagMatch[1]),
      };
    } catch {
      return { page: "tags", articleId: "", tagName: "" };
    }
  }

  const match = hash.match(/^#\/article\/([^/?#]+)/);
  if (!match) return { page: "home", articleId: "", tagName: "" };

  try {
    return { page: "article", articleId: decodeURIComponent(match[1]), tagName: "" };
  } catch {
    return { page: "home", articleId: "", tagName: "" };
  }
}

function toHash(route: AppRoute): string {
  if (route.page === "article" && route.articleId) {
    return `#/article/${encodeURIComponent(route.articleId)}`;
  }
  if (route.page === "tag" && route.tagName) {
    return `#/tag/${encodeURIComponent(route.tagName)}`;
  }
  if (route.page === "about") return "#/about";
  if (route.page === "articles") return "#/articles";
  if (route.page === "tags") return "#/tags";
  return "#/";
}

export function App() {
  const initialRoute = parseHashRoute(typeof window === "undefined" ? "" : window.location.hash);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const savedTheme = window.localStorage.getItem("theme");
    if (savedTheme === "dark") return true;
    if (savedTheme === "light") return false;
    return false;
  });

  const [currentPage, setCurrentPage] = useState<Page>(initialRoute.page);
  const [currentArticleId, setCurrentArticleId] = useState(initialRoute.articleId);
  const [currentTagName, setCurrentTagName] = useState(initialRoute.tagName);
  const [searchOpen, setSearchOpen] = useState(false);
  const currentArticle = useMemo(
    () => allPosts.find((post) => post.meta.id === currentArticleId),
    [currentArticleId]
  );

  const { query, setQuery, results, reset } = useSearch(allPosts);

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleDark = useCallback(() => setDarkMode((prev) => !prev), []);

  const applyRoute = useCallback((route: AppRoute) => {
    setCurrentPage(route.page);
    setCurrentArticleId(route.articleId);
    setCurrentTagName(route.tagName);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      applyRoute(parseHashRoute(window.location.hash));
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [applyRoute]);

  useEffect(() => {
    const siteName = "坏柠编程";
    if (currentPage === "article") {
      document.title = currentArticle
        ? `${currentArticle.meta.title} | ${siteName}`
        : `文章未找到 | ${siteName}`;
      return;
    }
    if (currentPage === "articles") {
      document.title = `文章列表 | ${siteName}`;
      return;
    }
    if (currentPage === "tags") {
      document.title = `标签索引 | ${siteName}`;
      return;
    }
    if (currentPage === "tag") {
      document.title = currentTagName ? `标签：${currentTagName} | ${siteName}` : `标签详情 | ${siteName}`;
      return;
    }
    if (currentPage === "about") {
      document.title = `关于我 | ${siteName}`;
      return;
    }
    document.title = `首页 | ${siteName}`;
  }, [currentPage, currentArticle, currentTagName]);

  const navigate = useCallback((page: Page, value?: string) => {
    let nextRoute: AppRoute;
    if (page === "article" && value) {
      nextRoute = { page: "article", articleId: value, tagName: "" };
    } else if (page === "tag" && value) {
      nextRoute = { page: "tag", articleId: "", tagName: value };
    } else if (page === "about") {
      nextRoute = { page: "about", articleId: "", tagName: "" };
    } else if (page === "articles") {
      nextRoute = { page: "articles", articleId: "", tagName: "" };
    } else if (page === "tags") {
      nextRoute = { page: "tags", articleId: "", tagName: "" };
    } else {
      nextRoute = { page: "home", articleId: "", tagName: "" };
    }

    const nextHash = toHash(nextRoute);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
      return;
    }

    applyRoute(nextRoute);
  }, [applyRoute]);

  const handleSearchOpen = useCallback(() => setSearchOpen(true), []);

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false);
    reset();
  }, [reset]);

  const handleSearchSelect = useCallback(
    (id: string) => {
      setSearchOpen(false);
      reset();
      navigate("article", id);
    },
    [navigate, reset]
  );

  return (
    <div className="min-h-screen bg-white text-surface-900 transition-colors duration-300 dark:bg-surface-950 dark:text-surface-100">
      <Header
        darkMode={darkMode}
        onToggleDark={toggleDark}
        onNavigate={navigate}
        currentPage={currentPage}
        onSearchOpen={handleSearchOpen}
      />

      {currentPage === "home" && (
        <>
          <Hero />
          <HomePage posts={allPosts} onNavigate={navigate} />
        </>
      )}

      {currentPage === "articles" && (
        <HomePage posts={allPosts} onNavigate={navigate} />
      )}

      {currentPage === "tags" && (
        <TagsPage posts={allPosts} onNavigate={navigate} />
      )}

      {currentPage === "tag" && (
        <TagDetailPage posts={allPosts} tagName={currentTagName} onNavigate={navigate} />
      )}

      {currentPage === "article" && (
        <ArticlePage
          posts={allPosts}
          articleId={currentArticleId}
          onNavigate={navigate}
        />
      )}

      {currentPage === "about" && (
        <AboutPage onNavigate={navigate} />
      )}

      <Footer />

      <SearchModal
        open={searchOpen}
        onClose={handleSearchClose}
        query={query}
        onQueryChange={setQuery}
        results={results}
        onSelect={handleSearchSelect}
      />
    </div>
  );
}
