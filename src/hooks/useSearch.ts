import { useState, useMemo, useCallback } from "react";
import type { Post } from "@/types";

export function useSearch(posts: Post[]) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return posts.filter(
      (p) =>
        p.meta.title.toLowerCase().includes(q) ||
        p.meta.description.toLowerCase().includes(q) ||
        p.meta.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.meta.category.toLowerCase().includes(q) ||
        p.raw.toLowerCase().includes(q)
    );
  }, [query, posts]);

  const reset = useCallback(() => setQuery(""), []);

  return { query, setQuery, results, reset };
}
