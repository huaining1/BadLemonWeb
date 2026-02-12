export function Footer() {
  const columns = [
    {
      title: "技术方向",
      links: ["STM32 / GD32", "FreeRTOS / RT-Thread", "Linux 设备驱动", "RISC-V 架构", "CAN / SPI / I2C"],
    },
    {
      title: "资源",
      links: ["文章归档", "标签索引", "开源项目", "推荐书单"],
    },
    {
      title: "关于",
      links: ["关于我", "联系方式", "友情链接", "RSS 订阅"],
    },
  ];

  return (
    <footer className="border-t border-surface-200 bg-surface-900 dark:border-surface-800 dark:bg-surface-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-800 dark:bg-surface-0/10">
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                  <circle cx="12" cy="10" r="6" stroke="#D4C62E" strokeWidth="2" />
                  <path d="M12 4 C12 2 14 1 14 1" stroke="#6B8E23" strokeWidth="1.5" strokeLinecap="round" />
                  <ellipse cx="14" cy="3" rx="2.5" ry="1.5" fill="#6B8E23" transform="rotate(-30 14 3)" opacity="0.8" />
                </svg>
              </div>
              <span className="text-lg font-bold text-surface-0">
                坏柠<span className="font-light text-surface-400">编程</span>
              </span>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-surface-400">
              深入底层，理解本质。<br />
              专注嵌入式系统开发的技术博客。
            </p>
            <div className="flex gap-3">
              <a href="#" className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-800 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-200">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a href="#" className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-800 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-200">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </a>
              <a href="#" className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-800 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-200">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 0 0-7.5-7.5H4.5m0-6.75h.75c7.87 0 14.25 6.38 14.25 14.25v.75M6 18.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-semibold tracking-wide text-surface-200">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-surface-400 transition-colors hover:text-brand-400">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-surface-800 pt-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-surface-500">© 2025 坏柠编程. All rights reserved.</p>
            <p className="text-xs text-surface-600">
              Powered by React + Vite · 专注嵌入式技术分享
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
