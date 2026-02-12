---
title: "CAN 总线协议精讲：从电气层到应用层的完整链路"
date: "2024-12-15"
category: "通信协议"
tags: [CAN, 总线, STM32, 通信协议]
description: "详细讲解 CAN 2.0A/B 帧结构、位填充机制、错误处理与仲裁原理，结合 STM32 bxCAN 外设的配置实战。"
featured: false
---

## CAN 总线概述

CAN（Controller Area Network）是一种多主站串行通信协议，最初由 Bosch 为汽车电子设计。它的核心特点是：

- **多主仲裁**：任何节点都可以主动发送，总线冲突通过非破坏性仲裁解决
- **差分信号**：CAN_H 和 CAN_L 差分传输，抗干扰能力强
- **错误检测**：内置 CRC 校验、位填充检查、帧格式检查等多重错误检测机制
- **实时性**：高优先级消息可以抢占低优先级消息的发送

## CAN 帧结构

### 标准帧（CAN 2.0A）

标准 CAN 帧包含 11 位标识符：

- **SOF**（Start of Frame）：显性位（0），标志帧的开始
- **ID**（Identifier）：11 位标识符，数值越小优先级越高
- **RTR**（Remote Transmission Request）：0 = 数据帧，1 = 远程帧
- **DLC**（Data Length Code）：数据字段长度，0-8 字节
- **CRC**：15 位 CRC 校验 + 1 位界定符

## 总线仲裁机制

CAN 总线使用 **CSMA/CA** 机制。当多个节点同时发送时，通过 ID 字段进行逐位仲裁：

> 关键原理：显性位（0）会覆盖隐性位（1）。发送隐性位但检测到显性位的节点知道自己输了仲裁，会主动退出发送。

```
节点A发送 ID: 0x123 = 001 0010 0011
节点B发送 ID: 0x125 = 001 0010 0101
                                 ^
                  节点A发送 0，节点B发送 1
                  总线为 0（显性）
                  节点B检测到冲突，退出仲裁
                  节点A赢得总线控制权
```

## STM32 bxCAN 配置实战

### 初始化配置

```c
CAN_HandleTypeDef hcan;

void CAN_Init(void)
{
    hcan.Instance = CAN1;
    hcan.Init.Prescaler = 6;
    hcan.Init.Mode = CAN_MODE_NORMAL;
    hcan.Init.SyncJumpWidth = CAN_SJW_1TQ;
    hcan.Init.TimeSeg1 = CAN_BS1_8TQ;
    hcan.Init.TimeSeg2 = CAN_BS2_5TQ;
    // APB1 = 42MHz，波特率 = 42M / 6 / (1+8+5) = 500Kbps
    hcan.Init.AutoBusOff = ENABLE;
    hcan.Init.AutoRetransmission = ENABLE;

    HAL_CAN_Init(&hcan);

    // 配置过滤器：接收所有消息
    CAN_FilterTypeDef filter;
    filter.FilterBank = 0;
    filter.FilterMode = CAN_FILTERMODE_IDMASK;
    filter.FilterScale = CAN_FILTERSCALE_32BIT;
    filter.FilterIdHigh = 0x0000;
    filter.FilterIdLow = 0x0000;
    filter.FilterMaskIdHigh = 0x0000;
    filter.FilterMaskIdLow = 0x0000;
    filter.FilterFIFOAssignment = CAN_FILTER_FIFO0;
    filter.FilterActivation = ENABLE;

    HAL_CAN_ConfigFilter(&hcan, &filter);
    HAL_CAN_Start(&hcan);
    HAL_CAN_ActivateNotification(&hcan,
                     CAN_IT_RX_FIFO0_MSG_PENDING);
}
```

### 发送与接收

```c
void CAN_SendMessage(uint32_t id, uint8_t *data, uint8_t len)
{
    CAN_TxHeaderTypeDef tx_header;
    uint32_t tx_mailbox;

    tx_header.StdId = id;
    tx_header.IDE = CAN_ID_STD;
    tx_header.RTR = CAN_RTR_DATA;
    tx_header.DLC = len;

    HAL_CAN_AddTxMessage(&hcan, &tx_header, data, &tx_mailbox);
}

void HAL_CAN_RxFifo0MsgPendingCallback(CAN_HandleTypeDef *hcan)
{
    CAN_RxHeaderTypeDef rx_header;
    uint8_t rx_data[8];

    HAL_CAN_GetRxMessage(hcan, CAN_RX_FIFO0,
                         &rx_header, rx_data);
    CAN_ProcessMessage(rx_header.StdId, rx_data,
                       rx_header.DLC);
}
```

## 错误处理机制

CAN 协议定义了五种错误检测方式：

1. **位错误**：发送节点检测到总线值与自己发送的不一致
2. **填充错误**：连续 6 个相同位违反位填充规则
3. **CRC 错误**：接收端计算的 CRC 与帧中的不一致
4. **格式错误**：固定格式字段出现非法值
5. **应答错误**：发送节点在 ACK 时隙未检测到显性位

每个节点维护发送错误计数器（TEC）和接收错误计数器（REC），根据计数值在三种状态间切换：**主动错误**、**被动错误**、**总线关闭**。

## 总结

CAN 总线的核心知识点：

- **帧结构**：理解标准帧/扩展帧的每个字段含义
- **仲裁机制**：基于 ID 的非破坏性仲裁，ID 值越小优先级越高
- **波特率计算**：Prescaler × (1 + BS1 + BS2) = 总时间量子数
- **过滤器配置**：掩码模式和列表模式的选择
- **错误管理**：理解错误计数器和三种错误状态
