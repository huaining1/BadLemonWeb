import { useMemo, useEffect, useState, useRef } from "react";
import type { Post, Page, TocItem } from "@/types";
import { processHeadings } from "@/utils/markdown";
import { CATEGORY_COLORS } from "@/types";
import qrcodeImage from "@/assets/images/qrcode.jpg";

const RECENT_POSTS_KEY = "bad-lemon.recentPosts";

interface ArticlePageProps {
  posts: Post[];
  articleId: string;
  onNavigate: (page: Page, articleId?: string) => void;
}

export function ArticlePage({ posts, articleId, onNavigate }: ArticlePageProps) {
  const post = useMemo(() => posts.find((p) => p.meta.id === articleId), [posts, articleId]);
  const articleRef = useRef<HTMLElement | null>(null);
  const copyToastTimerRef = useRef<number | null>(null);

  const { html, toc } = useMemo<{ html: string; toc: TocItem[] }>(() => {
    if (!post) return { html: "", toc: [] };
    return processHeadings(post.content);
  }, [post]);

  const [activeHeadingId, setActiveHeadingId] = useState("");
  const [commentPromptOpen, setCommentPromptOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);

  // Scroll spy: highlight current heading by scroll position
  useEffect(() => {
    if (toc.length === 0) {
      setActiveHeadingId("");
      return;
    }

    const headings = toc
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (headings.length === 0) {
      setActiveHeadingId("");
      return;
    }

    const offset = 120; // keep in sync with sticky header + top spacing
    let rafId = 0;

    const updateActiveHeading = () => {
      const currentY = window.scrollY + offset;
      let nextActiveId = headings[0].id;

      for (const heading of headings) {
        if (heading.offsetTop <= currentY) {
          nextActiveId = heading.id;
        } else {
          break;
        }
      }

      setActiveHeadingId((prev) => (prev === nextActiveId ? prev : nextActiveId));
    };

    const requestUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateActiveHeading();
      });
    };

    updateActiveHeading();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [toc, articleId]);

  // Scroll to top on article change
  useEffect(() => {
    window.scrollTo({ top: 0 });
    setCommentPromptOpen(false);
    setShowBackToTop(false);
    setReadingProgress(0);
  }, [articleId]);

  useEffect(() => {
    const toggleBackToTop = () => {
      setShowBackToTop(window.scrollY > 320);
    };

    toggleBackToTop();
    window.addEventListener("scroll", toggleBackToTop, { passive: true });
    return () => window.removeEventListener("scroll", toggleBackToTop);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCommentPromptOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!post || typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(RECENT_POSTS_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const ids = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
      const nextIds = [post.meta.id, ...ids.filter((id) => id !== post.meta.id)].slice(0, 8);
      window.localStorage.setItem(RECENT_POSTS_KEY, JSON.stringify(nextIds));
    } catch {
      // Ignore malformed localStorage data
    }
  }, [post]);

  useEffect(() => {
    let rafId = 0;

    const updateProgress = () => {
      const articleElement = articleRef.current;
      if (!articleElement) {
        setReadingProgress(0);
        return;
      }

      const start = articleElement.offsetTop - 120;
      const end = articleElement.offsetTop + articleElement.scrollHeight - window.innerHeight;

      if (end <= start) {
        setReadingProgress(window.scrollY > start ? 100 : 0);
        return;
      }

      const rawProgress = ((window.scrollY - start) / (end - start)) * 100;
      const clamped = Math.min(100, Math.max(0, rawProgress));
      setReadingProgress(clamped);
    };

    const requestUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateProgress();
      });
    };

    updateProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [articleId, html]);

  useEffect(() => {
    return () => {
      if (copyToastTimerRef.current) {
        window.clearTimeout(copyToastTimerRef.current);
      }
    };
  }, []);

  const handleCopyLink = async () => {
    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }

    setLinkCopied(true);
    if (copyToastTimerRef.current) {
      window.clearTimeout(copyToastTimerRef.current);
    }
    copyToastTimerRef.current = window.setTimeout(() => {
      setLinkCopied(false);
      copyToastTimerRef.current = null;
    }, 1800);
  };

  if (!post) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-5xl">😕</div>
          <h2 className="mb-2 text-xl font-bold text-surface-900 dark:text-surface-0">文章未找到</h2>
          <p className="mb-6 text-surface-500">该文章可能已被移除或链接无效</p>
          <button
            onClick={() => onNavigate("home")}
            className="rounded-lg bg-surface-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-surface-800 dark:bg-surface-0 dark:text-surface-900"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const colorClass = CATEGORY_COLORS[post.meta.category] || "bg-surface-100 text-surface-600";

  // Related posts: same category, exclude self
  const relatedPosts = posts
    .filter((p) => p.meta.id !== articleId && p.meta.category === post.meta.category)
    .slice(0, 4);

  return (
    <div className="bg-surface-50 dark:bg-surface-950">
      <div className="fixed left-0 right-0 top-16 z-[60] h-0.5">
        <div
          className="h-full bg-brand-400 transition-[width] duration-100"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* ===== Article header ===== */}
      <div className="border-b border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-5 flex items-center gap-2 text-sm">
            <button
              onClick={() => onNavigate("home")}
              className="flex items-center gap-1 text-surface-400 transition-colors hover:text-brand-600 dark:text-surface-500 dark:hover:text-brand-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              首页
            </button>
            <span className="text-surface-300 dark:text-surface-600">/</span>
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${colorClass}`}>
              {post.meta.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="mb-4 text-2xl font-bold leading-tight text-surface-900 sm:text-3xl lg:text-4xl dark:text-surface-0">
            {post.meta.title}
          </h1>

          {/* Description */}
          <p className="mb-5 max-w-3xl text-base leading-relaxed text-surface-500 sm:text-lg dark:text-surface-400">
            {post.meta.description}
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-surface-400 dark:text-surface-500">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-100 text-sm dark:bg-surface-800">
                🍋
              </div>
              <span className="font-medium text-surface-700 dark:text-surface-300">坏柠</span>
            </div>
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              {post.meta.date}
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {post.meta.readingTime} 分钟阅读
            </span>
          </div>

          {/* Tags */}
          <div className="mt-4 flex flex-wrap gap-2">
            {post.meta.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-500 dark:bg-surface-800 dark:text-surface-400"
              >
                # {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
            >
              复制文章链接
            </button>
            {linkCopied && (
              <span className="text-xs text-brand-600 dark:text-brand-400">链接已复制</span>
            )}
          </div>
        </div>
      </div>

      {/* ===== Content grid ===== */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main content */}
          <article ref={articleRef} className="lg:col-span-8">
            <div className="rounded-xl border border-surface-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10 dark:border-surface-800 dark:bg-surface-900">
              <div
                className="article-content"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>

            {/* Comment CTA */}
            <div className="mt-6 rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 dark:border-brand-900/30 dark:from-brand-950/30 dark:to-surface-900">
              <h3 className="text-base font-semibold text-surface-900 dark:text-surface-0">
                看完文章了？欢迎留言交流
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-surface-600 dark:text-surface-300">
                点击下方按钮，扫码关注公众号「坏柠编程」，前往公众号留言区反馈你的问题或观点。
              </p>
              <button
                onClick={() => setCommentPromptOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-surface-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-surface-800 dark:bg-surface-0 dark:text-surface-900 dark:hover:bg-surface-200"
              >
                💬 评论本文
              </button>
            </div>

            {/* Author box */}
            <div className="mt-6 flex items-center gap-4 rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-100 text-2xl dark:bg-surface-800">
                🍋
              </div>
              <div>
                <h4 className="font-semibold text-surface-900 dark:text-surface-0">坏柠</h4>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  嵌入式软件工程师，专注 STM32、FreeRTOS、Linux 驱动开发。
                </p>
              </div>
            </div>

            {/* Related posts */}
            {relatedPosts.length > 0 && (
              <div className="mt-6 rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
                <h3 className="mb-4 text-base font-semibold text-surface-900 dark:text-surface-0">
                  📖 相关推荐
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {relatedPosts.map((p) => {
                    const relColor = CATEGORY_COLORS[p.meta.category] || "bg-surface-100 text-surface-600";
                    return (
                      <button
                        key={p.meta.id}
                        onClick={() => onNavigate("article", p.meta.id)}
                        className="group rounded-lg border border-surface-100 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-sm dark:border-surface-800 dark:hover:border-brand-800"
                      >
                        <span className={`mb-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${relColor}`}>
                          {p.meta.category}
                        </span>
                        <h4 className="line-clamp-2 text-sm font-medium text-surface-700 group-hover:text-brand-700 dark:text-surface-200 dark:group-hover:text-brand-400">
                          {p.meta.title}
                        </h4>
                        <p className="mt-1 text-xs text-surface-400">{p.meta.date}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </article>

          {/* TOC sidebar */}
          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-20 space-y-5">
              {/* Table of Contents */}
              {toc.length > 0 && (
                <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-surface-0">
                    <svg className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    目录
                  </h4>
                  <nav className="space-y-0.5">
                    {toc.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveHeadingId(item.id);
                          document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className={`toc-link block rounded-md py-1.5 text-sm transition-all ${
                          item.level === 3 ? "pl-7" : "pl-3"
                        } ${
                          activeHeadingId === item.id
                            ? "active border-l-2 border-brand-400 bg-brand-50/50 font-medium text-brand-700 dark:bg-brand-900/10 dark:text-brand-400"
                            : "border-l-2 border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
                        }`}
                      >
                        {item.title}
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              {/* Quick actions */}
              <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
                <h4 className="mb-3 text-sm font-semibold text-surface-900 dark:text-surface-0">
                  ⚡ 快捷操作
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 transition-colors hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                    </svg>
                    回到顶部
                  </button>
                  <button
                    onClick={() => onNavigate("home")}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 transition-colors hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    返回首页
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {commentPromptOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center px-4"
          onClick={() => setCommentPromptOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-surface-200 bg-white p-6 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 className="text-base font-semibold text-surface-900 dark:text-surface-0">
              扫码关注后留言
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-surface-500 dark:text-surface-400">
              使用微信扫码关注公众号「坏柠编程」，进入公众号即可进行留言互动。
            </p>
            <img
              src={qrcodeImage}
              alt="坏柠编程公众号二维码"
              className="mx-auto mt-4 aspect-square w-full max-w-[220px] rounded-lg border border-surface-200 object-cover dark:border-surface-700"
            />
            <p className="mt-4 text-xs text-surface-500 dark:text-surface-400">
              公众号名称：坏柠编程
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setCommentPromptOpen(false)}
                className="flex-1 rounded-lg border border-surface-200 px-3 py-2 text-sm text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
              >
                我知道了
              </button>
              <button
                onClick={() => setCommentPromptOpen(false)}
                className="flex-1 rounded-lg bg-brand-400 px-3 py-2 text-sm font-medium text-surface-900 transition-colors hover:bg-brand-300"
              >
                去公众号留言
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-50 flex h-10 w-10 items-center justify-center rounded-full bg-surface-900 text-surface-0 shadow-lg transition-all duration-200 sm:h-11 sm:w-11 ${
          showBackToTop
            ? "translate-y-0 opacity-100 hover:-translate-y-0.5 hover:bg-surface-800 dark:hover:bg-surface-200"
            : "pointer-events-none translate-y-3 opacity-0"
        } dark:bg-surface-100 dark:text-surface-900`}
        aria-label="回到顶部"
        title="回到顶部"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
        </svg>
      </button>
    </div>
  );
}
