export interface PostMeta {
  id: string;
  title: string;
  date: string;
  updatedAt: string;
  category: string;
  tags: string[];
  description: string;
  readingTime: number;
  featured: boolean;
}

export interface Post {
  meta: PostMeta;
  content: string;
  raw: string;
}

export interface TocItem {
  id: string;
  title: string;
  level: number;
}

export type Page = "home" | "articles" | "article" | "about" | "tags" | "tag";
export const ALL_CATEGORY = "全部";

export const CATEGORY_COLORS: Record<string, string> = {
  STM32: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ESP32: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  RTOS: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Linux驱动": "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  通信协议: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  "RISC-V": "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "嵌入式Linux": "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  调试技巧: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  系统设计: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};
