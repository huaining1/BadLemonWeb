import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/layout/Hero";
import { Footer } from "@/components/layout/Footer";
import { HomePage } from "@/pages/HomePage";
import { ArticlePage } from "@/pages/ArticlePage";
import { SearchModal } from "@/components/search/SearchModal";
import { useSearch } from "@/hooks/useSearch";
import { loadAllPosts } from "@/utils/markdown";
import type { Page } from "@/types";

// Load all markdown posts at build time (via Vite's import.meta.glob)
const allPosts = loadAllPosts();

interface AppRoute {
  page: Page;
  articleId: string;
}

function parseHashRoute(hash: string): AppRoute {
  const match = hash.match(/^#\/article\/([^/?#]+)/);
  if (!match) return { page: "home", articleId: "" };

  try {
    return { page: "article", articleId: decodeURIComponent(match[1]) };
  } catch {
    return { page: "home", articleId: "" };
  }
}

function toHash(route: AppRoute): string {
  if (route.page === "article" && route.articleId) {
    return `#/article/${encodeURIComponent(route.articleId)}`;
  }
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
  const [searchOpen, setSearchOpen] = useState(false);

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

  const navigate = useCallback((page: Page, articleId?: string) => {
    const nextRoute: AppRoute =
      page === "article" && articleId
        ? { page: "article", articleId }
        : { page: "home", articleId: "" };

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

      {currentPage === "article" && (
        <ArticlePage
          posts={allPosts}
          articleId={currentArticleId}
          onNavigate={navigate}
        />
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
