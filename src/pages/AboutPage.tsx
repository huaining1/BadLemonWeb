import qrcodeImage from "@/assets/images/qrcode.jpg";
import type { Page } from "@/types";

interface AboutPageProps {
  onNavigate: (page: Page, articleId?: string) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <section className="bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 sm:text-3xl">
              关于我
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-surface-600 dark:text-surface-300 sm:text-base">
              我是坏柠，专注嵌入式系统开发与底层技术分享。公众号会持续更新 STM32、ESP32、RTOS、Linux
              驱动与通信协议相关实战内容。
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-700 dark:bg-surface-800/40">
              <h2 className="text-base font-semibold text-surface-900 dark:text-surface-0">
                公众号：坏柠编程
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-surface-500 dark:text-surface-400">
                欢迎扫码关注，获取最新文章更新、项目经验和技术思考。
              </p>
              <p className="mt-3 text-sm text-surface-600 dark:text-surface-300">
                你也可以在公众号中留言交流，我会尽量逐步回复。
              </p>
            </div>

            <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 dark:border-brand-900/30 dark:from-brand-950/30 dark:to-surface-900">
              <img
                src={qrcodeImage}
                alt="坏柠编程公众号二维码"
                className="mx-auto aspect-square w-full max-w-[240px] rounded-lg border border-surface-200 object-cover dark:border-surface-700"
              />
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={() => onNavigate("articles")}
              className="rounded-lg bg-surface-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-surface-800 dark:bg-surface-0 dark:text-surface-900 dark:hover:bg-surface-200"
            >
              返回文章列表
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
