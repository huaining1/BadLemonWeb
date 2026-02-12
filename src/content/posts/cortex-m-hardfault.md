---
title: "Cortex-M HardFault 调试实战：从寄存器现场恢复调用栈"
date: "2024-11-15"
category: "调试技巧"
tags: [Cortex-M, HardFault, 调试, ARM]
description: "遇到 HardFault 不要慌。通过 SCB 寄存器判断故障类型，利用栈帧中保存的 LR/PC 定位崩溃点，配合 addr2line 精准溯源。"
featured: false
---

## HardFault 是什么

在 Cortex-M 处理器中，当 CPU 遇到无法处理的错误时，会触发 **HardFault** 异常。常见的触发原因包括：

- **非对齐内存访问**（在未启用非对齐访问的平台上）
- **访问非法地址**（如未映射的内存区域）
- **除以零**（如果启用了 DIV_0_TRP）
- **执行未定义的指令**
- **栈溢出**导致的内存越界

## 第一步：判断故障类型

Cortex-M3/M4/M7 提供了详细的故障状态寄存器，可以精确判断错误类型：

```c
void HardFault_Handler(void)
{
    // 读取故障状态寄存器
    volatile uint32_t hfsr = SCB->HFSR;  // HardFault 状态
    volatile uint32_t cfsr = SCB->CFSR;  // 可配置故障状态
    volatile uint32_t mmfar = SCB->MMFAR; // 内存管理故障地址
    volatile uint32_t bfar = SCB->BFAR;   // 总线故障地址

    // FORCED 位：表示其他故障升级为 HardFault
    if (hfsr & SCB_HFSR_FORCED_Msk)
    {
        // 检查具体的故障类型
        if (cfsr & 0xFF)        // MemManage fault
            printf("MemManage Fault: 0x%02lX\n", cfsr & 0xFF);
        if (cfsr & 0xFF00)      // BusFault
            printf("Bus Fault: 0x%02lX\n", (cfsr >> 8) & 0xFF);
        if (cfsr & 0xFFFF0000)  // UsageFault
            printf("Usage Fault: 0x%04lX\n", (cfsr >> 16) & 0xFFFF);
    }

    while (1) { __NOP(); }  // 停在这里，用调试器检查
}
```

## 第二步：从栈帧恢复 PC

进入异常时，Cortex-M 硬件会自动将 8 个寄存器压入栈中。通过读取栈帧中的 PC 值，可以定位到崩溃前执行的最后一条指令：

```c
// 在 HardFault_Handler 的汇编入口中获取 SP
__attribute__((naked)) void HardFault_Handler(void)
{
    __asm volatile(
        "TST   LR, #4          \n"  // 检查 EXC_RETURN bit 2
        "ITE   EQ               \n"
        "MRSEQ R0, MSP          \n"  // 用的是 MSP
        "MRSNE R0, PSP          \n"  // 用的是 PSP
        "B     HardFault_Handler_C \n"
    );
}

void HardFault_Handler_C(uint32_t *stack_frame)
{
    uint32_t r0  = stack_frame[0];
    uint32_t r1  = stack_frame[1];
    uint32_t r2  = stack_frame[2];
    uint32_t r3  = stack_frame[3];
    uint32_t r12 = stack_frame[4];
    uint32_t lr  = stack_frame[5];  // 返回地址
    uint32_t pc  = stack_frame[6];  // 崩溃点地址 !!!
    uint32_t psr = stack_frame[7];

    printf("HardFault!\n");
    printf("R0=0x%08lX R1=0x%08lX R2=0x%08lX R3=0x%08lX\n",
           r0, r1, r2, r3);
    printf("R12=0x%08lX LR=0x%08lX PC=0x%08lX PSR=0x%08lX\n",
           r12, lr, pc, psr);

    while (1) {}
}
```

## 第三步：addr2line 定位源码

拿到 PC 地址后，使用 `addr2line` 工具将地址映射回源码文件和行号：

```bash
# 将崩溃地址转换为源码位置
arm-none-eabi-addr2line -e firmware.elf -f -C 0x08003A42

# 输出示例：
# main
# /home/user/project/src/main.c:142
```

## 常见 HardFault 场景与解决方案

### 栈溢出

栈溢出是最常见的 HardFault 原因。在 FreeRTOS 中，可以通过以下方式排查：

```c
// 在 FreeRTOSConfig.h 中启用栈溢出检测
#define configCHECK_FOR_STACK_OVERFLOW  2

// 查看任务剩余栈空间
UBaseType_t watermark = uxTaskGetStackHighWaterMark(NULL);
printf("Stack remaining: %lu words\n", watermark);
```

### 空指针解引用

访问地址 0x00000000 附近的内存通常意味着空指针解引用。可以配置 MPU 将地址 0 区域设为不可访问，这样就会得到明确的 MemManage Fault。

## 总结

HardFault 调试的三步法：

1. **读 SCB 寄存器** 判断故障类型（CFSR/HFSR/BFAR/MMFAR）
2. **从栈帧提取 PC** 定位崩溃点的机器码地址
3. **addr2line 溯源** 将地址映射回源码文件和行号

养成在项目中预置 HardFault Handler 的习惯，关键时刻能节省大量调试时间。
