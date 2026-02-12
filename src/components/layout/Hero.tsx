export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-surface-200 bg-surface-900 dark:border-surface-800 dark:bg-surface-950">
      <div className="dot-pattern absolute inset-0 opacity-50" />
      <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-brand-400/10 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-brand-400/8 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 py-14 sm:py-20 lg:grid-cols-12 lg:py-24">
          {/* Left — Text */}
          <div className="lg:col-span-7">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-surface-700 bg-surface-800/60 px-3.5 py-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
              <span className="text-xs font-medium tracking-wide text-surface-300">嵌入式开发 · 持续更新中</span>
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              深入<span className="text-brand-300">底层</span>，理解<span className="text-brand-300">本质</span>
            </h1>
            <p className="mb-4 text-xl font-light text-surface-300 sm:text-2xl">嵌入式工程师的技术手记</p>
            <div className="animated-gradient mb-5 h-0.5 w-20 rounded-full" />
            <p className="mb-6 max-w-lg text-sm leading-relaxed text-surface-400 sm:text-base">
              坏柠的嵌入式技术博客 — 专注 MCU 开发、RTOS 内核、Linux 驱动与通信协议，用清晰的文字拆解底层每一个细节。
            </p>
            <div className="flex gap-8">
              {[
                { value: "50+", label: "技术文章" },
                { value: "6", label: "核心方向" },
                { value: "10K+", label: "月访问" },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-xl font-bold text-white sm:text-2xl">{stat.value}</div>
                  <div className="text-xs text-surface-400 sm:text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Terminal */}
          <div className="hidden lg:col-span-5 lg:flex lg:justify-end">
            <div className="w-full max-w-sm rounded-xl border border-surface-700/50 bg-surface-800/40 p-5 shadow-2xl backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <div className="h-3 w-3 rounded-full bg-green-400/80" />
                <span className="ml-2 text-xs text-surface-500">gdb-multiarch</span>
              </div>
              <div className="space-y-1.5 font-mono text-[13px]">
                <p><span className="text-brand-400">$</span><span className="text-surface-300"> whoami</span></p>
                <p className="text-surface-400">坏柠 — Embedded Engineer</p>
                <p><span className="text-brand-400">$</span><span className="text-surface-300"> cat skills.txt</span></p>
                <p className="text-surface-400">STM32, FreeRTOS, Linux Driver,</p>
                <p className="text-surface-400">RISC-V, CAN/SPI/I2C, Yocto</p>
                <p><span className="text-brand-400">$</span><span className="text-surface-300"> arm-none-eabi-gdb</span></p>
                <p className="text-green-400/70">(gdb) target remote :3333</p>
                <p className="text-green-400/70">Remote debugging using :3333</p>
                <p><span className="text-brand-400">$</span><span className="animate-pulse text-surface-300"> _</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
