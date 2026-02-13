import { CATEGORY_COLORS } from "@/types";
import qrcodeImage from "@/assets/images/qrcode.jpg";
import avatarImage from "@/assets/images/avatar.jpg";

interface SidebarProps {
  categories: Map<string, number>;
  tags: Map<string, number>;
  activeCategory: string;
  activeTag: string | null;
  onCategoryClick: (cat: string) => void;
  onTagClick: (tag: string) => void;
}

export function Sidebar({
  categories,
  tags,
  activeCategory,
  activeTag,
  onCategoryClick,
  onTagClick,
}: SidebarProps) {
  const tools = [
    { icon: "⚙️", name: "STM32CubeMX" },
    { icon: "🔨", name: "Keil MDK / IAR" },
    { icon: "💻", name: "VS Code + Cortex-Debug" },
    { icon: "🔌", name: "J-Link / ST-Link" },
    { icon: "📊", name: "逻辑分析仪" },
  ];

  return (
    <div className="sticky top-20 space-y-5">
      {/* Author card */}
      <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <div className="mb-3 h-16 w-16 overflow-hidden rounded-xl shadow-md ring-1 ring-surface-200 dark:ring-surface-700">
          <img src={avatarImage} alt="avatar" className="h-full w-full object-cover" />
        </div>
        <h3 className="text-base font-bold text-surface-900 dark:text-surface-0">坏柠</h3>
        <p className="mb-3 text-sm text-surface-500 dark:text-surface-400">嵌入式软件工程师</p>
        <div className="flex flex-wrap gap-1.5">
          {["⚙️ STM32", "🔧 FreeRTOS", "🐧 Linux", "🔌 RISC-V"].map((skill) => (
            <span
              key={skill}
              className="rounded-md bg-surface-100 px-2 py-0.5 text-[11px] font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-300"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-surface-0">
          <span>📂</span> 文章分类
        </h4>
        <div className="space-y-1">
          {Array.from(categories.entries()).map(([cat, count]) => {
            const isActive = activeCategory === cat;
            const colorClass = CATEGORY_COLORS[cat] || "";
            return (
              <button
                key={cat}
                onClick={() => onCategoryClick(cat)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                    : "text-surface-600 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800"
                }`}
              >
                <span className="flex items-center gap-2">
                  {colorClass && (
                    <span className={`inline-block h-2 w-2 rounded-full ${isActive ? "bg-brand-500" : "bg-surface-300 dark:bg-surface-600"}`} />
                  )}
                  {cat}
                </span>
                <span className={`text-xs ${isActive ? "text-brand-600 dark:text-brand-400" : "text-surface-400 dark:text-surface-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-surface-0">
          <span>🏷️</span> 热门标签
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(tags.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => {
              const isActive = activeTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => onTagClick(tag)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-brand-400 text-surface-900 shadow-sm"
                      : "bg-surface-100 text-surface-600 hover:bg-brand-50 hover:text-brand-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-brand-900/20 dark:hover:text-brand-400"
                  }`}
                >
                  {tag}
                  <span className="ml-0.5 opacity-50">({count})</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Tools */}
      <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-surface-0">
          <span>🛠</span> 常用工具
        </h4>
        <ul className="space-y-2">
          {tools.map((tool) => (
            <li key={tool.name} className="flex items-center gap-2.5 text-sm text-surface-600 dark:text-surface-300">
              <span className="text-base">{tool.icon}</span>
              {tool.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Follow WeChat Official Account */}
      <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 dark:border-brand-900/30 dark:from-brand-950/30 dark:to-surface-900">
        <h4 className="mb-2 text-sm font-semibold text-surface-900 dark:text-surface-0">📱订阅公众号</h4>
        <p className="mb-3 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
          微信扫码关注「坏柠编程」，第一时间获取嵌入式实战文章与更新。
        </p>
        <div className="rounded-xl border border-brand-100 bg-white p-3 dark:border-brand-900/30 dark:bg-surface-900">
          <img
            src={qrcodeImage}
            alt="坏柠编程公众号二维码"
            className="mx-auto aspect-square w-full max-w-[220px] rounded-lg border border-surface-200 object-cover dark:border-surface-700"
          />
          <p className="mt-3 text-center text-xs font-medium text-surface-700 dark:text-surface-200">公众号：坏柠编程</p>
        </div>
      </div>
    </div>
  );
}
