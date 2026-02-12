---
title: "FreeRTOS 调度器源码剖析：从 PendSV 到上下文切换"
date: "2025-01-03"
category: "RTOS"
tags: [FreeRTOS, 调度器, Cortex-M, RTOS]
description: "深入 FreeRTOS 的任务调度核心实现，从 SysTick 中断、就绪链表到 PendSV 异常中的上下文保存与恢复，逐行拆解调度器运行机制。"
featured: true
---

## 为什么要读调度器源码

FreeRTOS 是嵌入式领域使用最广泛的实时操作系统。很多开发者会用 `xTaskCreate`、`vTaskDelay`，但对调度器内部的运行机制并不清楚。理解调度器源码，能帮助你：

- **排查优先级反转、任务饿死等疑难 bug**
- **合理设置任务优先级和栈大小**
- **理解中断与任务的交互机制**

## 调度器的核心数据结构

### 就绪链表 pxReadyTasksLists

FreeRTOS 为每个优先级维护一个就绪链表，调度器只需从最高优先级的非空链表中取出第一个任务即可：

```c
// FreeRTOS 源码 tasks.c
PRIVILEGED_DATA static List_t pxReadyTasksLists[configMAX_PRIORITIES];

// 调度核心：找到最高优先级的就绪任务
#define taskSELECT_HIGHEST_PRIORITY_TASK()                        \
{                                                                  \
    UBaseType_t uxTopPriority = uxTopReadyPriority;                \
    while (listLIST_IS_EMPTY(                                      \
               &(pxReadyTasksLists[uxTopPriority])))               \
    {                                                              \
        --uxTopPriority;                                           \
    }                                                              \
    listGET_OWNER_OF_NEXT_ENTRY(pxCurrentTCB,                     \
                    &(pxReadyTasksLists[uxTopPriority]));          \
    uxTopReadyPriority = uxTopPriority;                            \
}
```

### 任务控制块 TCB

每个任务都有一个 TCB（Task Control Block），其中最重要的成员是 `pxTopOfStack`——指向任务栈顶，保存上下文切换时的 CPU 寄存器现场：

```c
typedef struct tskTaskControlBlock
{
    volatile StackType_t *pxTopOfStack;   // 栈顶指针（必须第一个成员）
    ListItem_t           xStateListItem;  // 状态链表节点
    ListItem_t           xEventListItem;  // 事件链表节点
    UBaseType_t          uxPriority;      // 任务优先级
    StackType_t          *pxStack;        // 栈起始地址
    char pcTaskName[configMAX_TASK_NAME_LEN];
    // ...
} tskTCB;
```

## PendSV 与上下文切换

### 为什么用 PendSV

Cortex-M 架构中，上下文切换通过 **PendSV（Pendable Service Call）** 异常实现。PendSV 被设置为最低优先级，确保它只在所有其他中断处理完毕后才执行，避免在中断嵌套中做上下文切换。

```c
// 触发 PendSV（请求上下文切换）
#define portYIELD()                                     \
{                                                        \
    portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;      \
    __dsb(portSY_FULL_READ_WRITE);                       \
    __isb(portSY_FULL_READ_WRITE);                       \
}
```

### PendSV Handler 汇编实现

这是 FreeRTOS 最核心的代码——PendSV 中断服务函数，负责保存当前任务的寄存器现场，切换到新任务的上下文：

```asm
PendSV_Handler:
    ; 保存当前上下文
    MRS     R0, PSP             ; 获取当前任务的 PSP
    STMDB   R0!, {R4-R11}       ; 手动保存 R4-R11

    ; 更新当前 TCB 的栈顶指针
    LDR     R1, =pxCurrentTCB
    LDR     R2, [R1]
    STR     R0, [R2]            ; pxCurrentTCB->pxTopOfStack = R0

    ; 调用 C 函数选择下一个任务
    BL      vTaskSwitchContext

    ; 恢复新任务的上下文
    LDR     R1, =pxCurrentTCB
    LDR     R2, [R1]
    LDR     R0, [R2]            ; R0 = 新任务的 pxTopOfStack
    LDMIA   R0!, {R4-R11}       ; 恢复 R4-R11
    MSR     PSP, R0             ; 更新 PSP
    BX      LR                  ; 返回（硬件自动恢复 R0-R3）
```

> 注意：R0-R3、R12、LR、PC、xPSR 这 8 个寄存器由 Cortex-M 硬件在进入异常时自动压栈保存，PendSV Handler 只需手动保存 R4-R11。

## SysTick 驱动时间片

SysTick 定时器中断是调度器的「心跳」，每次触发时递增 tick 计数并检查是否需要切换任务：

```c
void xPortSysTickHandler(void)
{
    portDISABLE_INTERRUPTS();
    {
        if (xTaskIncrementTick() != pdFALSE)
        {
            // 有更高优先级的任务就绪，触发 PendSV
            portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
        }
    }
    portENABLE_INTERRUPTS();
}
```

`xTaskIncrementTick()` 内部做了以下几件事：

1. 递增全局 tick 计数器 `xTickCount`
2. 检查延时链表中是否有任务到期，将其移入就绪链表
3. 如果到期的任务优先级高于当前任务，返回 `pdTRUE` 请求切换

## 关键调试技巧

### 查看任务状态

在调试器中查看 `pxReadyTasksLists` 数组，可以了解每个优先级上有哪些任务就绪。查看 `pxDelayedTaskList` 可以看到正在延时等待的任务。

### 检测栈溢出

FreeRTOS 提供两种栈溢出检测方式，通过 `configCHECK_FOR_STACK_OVERFLOW` 配置：

- **方式 1**：在任务切换时检查栈指针是否超出栈边界
- **方式 2**：在栈底填充已知模式（0xA5），检查是否被覆盖

```c
// 栈溢出钩子函数
void vApplicationStackOverflowHook(TaskHandle_t xTask,
                                    char *pcTaskName)
{
    printf("Stack overflow in task: %s\n", pcTaskName);
    while (1) {} // 停在这里用调试器检查
}
```

## 总结

理解 FreeRTOS 调度器的关键点：

- **就绪链表**是调度的数据基础，每个优先级一个链表
- **PendSV** 在最低优先级执行上下文切换，避免中断嵌套问题
- **SysTick** 驱动时间片轮转，是调度器的时钟源
- **TCB 的 pxTopOfStack** 保存任务现场，是上下文切换的核心

掌握这些机制后，你会对任务优先级设置、栈溢出排查、中断安全 API 的使用有更深刻的理解。
