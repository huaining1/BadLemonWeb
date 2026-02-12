---
title: "SPI + DMA 高速数据传输优化：突破吞吐量瓶颈"
date: "2024-10-28"
category: "通信协议"
tags: [SPI, DMA, 性能优化, STM32]
description: "当 CPU 轮询搬运 SPI 数据成为瓶颈时，DMA 是终极武器。从 DMA 通道配置、双缓冲 Ping-Pong 模式到 Cache 一致性问题全面解析。"
featured: false
---

## 为什么需要 DMA

在没有 DMA 的情况下，SPI 数据传输需要 CPU 逐字节搬运。以 SPI 外接 Flash 读取为例，CPU 的大部分时间都浪费在等待 SPI 发送/接收完成上：

```c
// CPU 轮询方式：效率极低
void SPI_ReadData(uint8_t *buf, uint32_t len)
{
    for (uint32_t i = 0; i < len; i++)
    {
        SPI1->DR = 0xFF;                   // 发送 dummy byte
        while (!(SPI1->SR & SPI_SR_RXNE)); // 等待接收完成
        buf[i] = SPI1->DR;                 // 读取数据
    }
    // CPU 利用率：~5%（95% 时间在等待）
}
```

使用 DMA 后，数据搬运完全由 DMA 控制器完成，CPU 可以去做其他事情。

## DMA 基本配置

### STM32 DMA + SPI 配置

```c
DMA_HandleTypeDef hdma_spi1_rx;
DMA_HandleTypeDef hdma_spi1_tx;

void DMA_SPI_Init(void)
{
    // RX DMA 配置
    hdma_spi1_rx.Instance = DMA2_Stream0;
    hdma_spi1_rx.Init.Channel = DMA_CHANNEL_3;
    hdma_spi1_rx.Init.Direction = DMA_PERIPH_TO_MEMORY;
    hdma_spi1_rx.Init.PeriphInc = DMA_PINC_DISABLE;
    hdma_spi1_rx.Init.MemInc = DMA_MINC_ENABLE;
    hdma_spi1_rx.Init.PeriphDataAlignment = DMA_PDATAALIGN_BYTE;
    hdma_spi1_rx.Init.MemDataAlignment = DMA_MDATAALIGN_BYTE;
    hdma_spi1_rx.Init.Mode = DMA_NORMAL;
    hdma_spi1_rx.Init.Priority = DMA_PRIORITY_HIGH;

    HAL_DMA_Init(&hdma_spi1_rx);
    __HAL_LINKDMA(&hspi1, hdmarx, hdma_spi1_rx);

    // TX DMA 配置（类似，方向为 MEMORY_TO_PERIPH）
    hdma_spi1_tx.Instance = DMA2_Stream3;
    hdma_spi1_tx.Init.Channel = DMA_CHANNEL_3;
    hdma_spi1_tx.Init.Direction = DMA_MEMORY_TO_PERIPH;
    // ... 其余配置类似

    HAL_DMA_Init(&hdma_spi1_tx);
    __HAL_LINKDMA(&hspi1, hdmatx, hdma_spi1_tx);
}
```

## 双缓冲 Ping-Pong 模式

### 原理

在连续数据流场景中（如音频采集、传感器阵列），单缓冲 DMA 存在一个问题：DMA 传输完成后需要处理数据，这段时间新的数据无处存放。

双缓冲模式使用两个缓冲区交替工作：

```c
uint8_t buffer_A[BUFFER_SIZE];
uint8_t buffer_B[BUFFER_SIZE];

void DMA_DoubleBuffer_Init(void)
{
    // 启用双缓冲模式
    HAL_DMAEx_MultiBufferStart_IT(
        &hdma_spi1_rx,
        (uint32_t)&SPI1->DR,       // 源：SPI 数据寄存器
        (uint32_t)buffer_A,         // 目标缓冲区 0
        (uint32_t)buffer_B,         // 目标缓冲区 1
        BUFFER_SIZE
    );
}

// DMA 传输完成回调
void HAL_SPI_RxCpltCallback(SPI_HandleTypeDef *hspi)
{
    // 判断当前使用的是哪个缓冲区
    if (!(DMA2_Stream0->CR & DMA_SxCR_CT))
    {
        // DMA 正在写 buffer_B，处理 buffer_A
        ProcessData(buffer_A, BUFFER_SIZE);
    }
    else
    {
        // DMA 正在写 buffer_A，处理 buffer_B
        ProcessData(buffer_B, BUFFER_SIZE);
    }
}
```

## Cache 一致性问题

### STM32F7/H7 的 DCache 陷阱

在带有 Data Cache 的 Cortex-M7 芯片（如 STM32F7/H7）上，DMA 传输会遇到 Cache 一致性问题：

> DMA 直接写入物理内存，但 CPU 可能从 DCache 读取到旧数据。反过来，CPU 写入的数据可能还在 DCache 中，DMA 从物理内存读到的也是旧数据。

解决方案：

```c
// 方案 1：DMA 缓冲区放在非缓存区域
// 在链接脚本中定义一段 non-cacheable 区域
__attribute__((section(".noncacheable")))
uint8_t dma_buffer[BUFFER_SIZE];

// 方案 2：手动管理 Cache
// DMA 接收前：Invalidate DCache
SCB_InvalidateDCache_by_Addr((uint32_t *)rx_buf, len);

// DMA 发送前：Clean DCache
SCB_CleanDCache_by_Addr((uint32_t *)tx_buf, len);
```

## 性能对比

以 SPI 读取 4KB 数据为例（SPI 时钟 21MHz，STM32F407）：

- **CPU 轮询**：约 1.6ms，CPU 占用 100%
- **中断方式**：约 1.6ms，CPU 占用约 30%（中断开销）
- **DMA 方式**：约 1.6ms，CPU 占用约 2%（仅启动和回调）

传输时间相同，但 CPU 释放率天差地别。在多任务系统中，DMA 是释放 CPU 算力的关键手段。

## 总结

SPI + DMA 优化的关键要点：

- **基本配置**：正确设置 DMA 通道、方向、数据宽度和优先级
- **双缓冲模式**：连续数据流场景下避免数据丢失
- **Cache 一致性**：STM32F7/H7 上必须处理 DCache 问题
- **性能收益**：传输时间不变，但 CPU 几乎完全释放
