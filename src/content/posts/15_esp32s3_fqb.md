---
title: "学习笔记：搞懂分区表，才算真正掌握 Flash 的使用"
category: "ESP32"
date: "2026-01-24"
tags: [ESP32, 通信协议,ESP-IDF]
featured: false
---
# ESP32-S3 学习笔记：搞懂分区表，才算真正掌握 Flash 的使用

## 前言：一个困扰我很久的问题

在前面学习 NVS 的时候，我知道了数据是存在 Flash 里的。但有个问题一直萦绕在我脑海里——**数据到底存在 Flash 的哪个位置？**

Flash 就像一块空地，NVS 占一块、应用程序占一块、以后用到的文件系统也要占一块。谁来规划这些"地盘"？

答案就是——**分区表**。

搞明白这个东西之后，我才觉得自己对 ESP32-S3 的 Flash 管理有了真正的理解。今天就把我的学习过程完整记录下来。

---

## 一、分区表到底是什么？

说白了，分区表就是一张**Flash 的空间规划图**。

ESP32-S3 的 Flash 里面不只存一个东西。应用程序要存、NVS 数据要存、PHY 初始化数据要存，如果搞 OTA 升级，甚至还要存两份应用程序。这么多东西堆在一块 Flash 里，必须有个东西来告诉系统："从这里到那里是放程序的，从那里到那里是放数据的"。

这就是分区表干的事。

**它被烧写在 Flash 的 `0x8000` 偏移地址处**，系统启动时会先读取这张表，然后才知道去哪里加载应用程序、去哪里读写数据。

---

## 二、看看 IDF 默认给了什么分区表

打开 `idf.py menuconfig`，进入 `Partition Table → Partition Table`，可以看到几个预设选项：

```
(X) Single factory app, no OTA
( ) Single factory app (large), no OTA
( ) Factory app, two OTA definitions
( ) Two large size OTA partitions
( ) Custom partition table CSV
```

默认选的是第一个：**单个出厂应用，不带 OTA**。

这些预设的分区表文件放在 `esp-idf/components/partition_table` 目录下。我打开了 `partitions_singleapp.csv`，内容非常简洁：

```csv
# Name,   Type, SubType, Offset,  Size, Flags
nvs,      data, nvs,     ,        0x6000,
phy_init, data, phy,     ,        0x1000,
factory,  app,  factory, ,        1M,
```

就三个分区，我整理成表格方便理解：

| 分区名称 | 类型 | 子类型 | 偏移量 | 大小 | 用途 |
|---------|------|--------|-------|------|------|
| nvs | data | nvs | 自动 | 0x6000 (24KB) | 非易失性存储，保存 Wi-Fi 凭据等配置数据 |
| phy_init | data | phy | 自动 | 0x1000 (4KB) | 物理层初始化数据，存放硬件相关的配置 |
| factory | app | factory | 自动 | 1MB | 主应用程序代码 |

**偏移量留空就是让系统自动计算**，它会根据前一个分区的结束位置自动排列，省心。

算下来总共也就 1MB 多一点，而我手上开发板的 Flash 有 **16MB**，剩下的空间完全是浪费的。所以如果我有更多存储需求，就得自己动手改了。

---

## 三、动手：自定义分区表

### 3.1 创建分区表文件

在**工程根目录**下创建一个 `partitions.csv` 文件，内容如下：

```csv
# Name,   Type, SubType, Offset,  Size, Flags
nvs,      data, nvs,     ,        0x6000,
phy_init, data, phy,     ,        0x1000,
factory,  app,  factory, ,        1M,
user_nvs, data, nvs,     ,        0x6000,
```

我在原来的基础上加了一行 `user_nvs`，也是 NVS 类型，大小 24KB。这样我就有了一个**独立的 NVS 分区**，可以把自己的业务数据和系统 NVS 分开存放。

### 3.2 配置 menuconfig

打开 `idf.py menuconfig`，进入 `Partition Table`：

1. 选择 **Custom partition table CSV**
2. 在 `Custom partition CSV file` 中填写 **partitions.csv**（要和文件名一致）

```
Partition Table (Custom partition table CSV)  --->
(partitions.csv) Custom partition CSV file
(0x8000) Offset of partition table
[*] Generate an MD5 checksum for the partition table
```

### 3.3 编译并验证

```bash
idf.py build
```

编译完成后，执行以下命令查看分区表：

```bash
idf.py partition-table
```

输出结果：

```
# ESP-IDF Partition Table
# Name, Type, SubType, Offset, Size, Flags
nvs,data,nvs,0x9000,24K,
phy_init,data,phy,0xf000,4K,
factory,app,factory,0x10000,1M,
user_nvs,data,nvs,0x110000,24K,
```

完美！可以清楚地看到每个分区的**起始偏移地址和大小**，系统自动计算好了所有偏移量。

### 3.4 在代码中使用自定义的 NVS 分区

原来的 NVS 代码需要做三处修改，核心就是把默认分区改成我们指定的分区：

```c
#include <stdio.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_system.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "esp_log.h"

static const char *TAG = "NVS";

void app_main(void)
{
    // ★ 改动1：指定我们自己的分区名
    char* partition_name = "user_nvs";

    // ★ 改动2：初始化指定分区（不再是默认的 nvs_flash_init）
    esp_err_t err = nvs_flash_init_partition(partition_name);
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase_partition(partition_name));
        err = nvs_flash_init_partition(partition_name);
    }
    ESP_ERROR_CHECK(err);

    ESP_LOGI(TAG, "打开非易失性存储 (NVS) 句柄...");
    nvs_handle_t my_handle;

    // ★ 改动3：从指定分区打开命名空间
    err = nvs_open_from_partition(partition_name, "storage", NVS_READWRITE, &my_handle);
    if (err != ESP_OK) {
        ESP_LOGI(TAG, "打开 NVS 句柄时出错 (%s)!", esp_err_to_name(err));
    } else {
        // 读取重启计数器
        int32_t restart_counter = 0;
        err = nvs_get_i32(my_handle, "restart_counter", &restart_counter);
        ESP_LOGI(TAG, "重启计数器 = %" PRIu32, restart_counter);

        // 更新重启计数器
        restart_counter++;
        err = nvs_set_i32(my_handle, "restart_counter", restart_counter);

        // 提交
        err = nvs_commit(my_handle);

        // 关闭
        nvs_close(my_handle);
    }

    // 倒计时重启
    for (int i = 10; i >= 0; i--) {
        ESP_LOGI(TAG, "将在 %d 秒后重启...", i);
        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }
    ESP_LOGI(TAG, "现在重启。");
    fflush(stdout);
    esp_restart();
}
```

**对比一下关键 API 的变化：**

| 原来（默认分区） | 现在（指定分区） |
|-----------------|----------------|
| `nvs_flash_init()` | `nvs_flash_init_partition(name)` |
| `nvs_flash_erase()` | `nvs_flash_erase_partition(name)` |
| `nvs_open(ns, mode, handle)` | `nvs_open_from_partition(name, ns, mode, handle)` |

烧录后效果和之前完全一样，重启计数器照样正常累加，只不过数据现在存储在 `user_nvs` 分区中了。

---

## 四、更进一步：自定义一个全新的分区类型

NVS 分区毕竟还是 IDF 预定义好的类型，如果我想**完全自己定义一个分区**，直接往 Flash 里读写原始数据呢？

### 4.1 修改分区表

```csv
# Name,   Type, SubType, Offset,  Size, Flags
nvs,      data, nvs,     ,        0x6000,
phy_init, data, phy,     ,        0x1000,
factory,  app,  factory, ,        1M,
user,     0x40, 0x01,    ,        0x1000,
```

这里的 `user` 分区，Type 填了 `0x40`，SubType 填了 `0x01`。

在这里需要了解一下分区表各字段的规则：

**Name 字段：** 任意名称，不超过 16 字节。

**Type 字段：**
- `app (0x00)` — 应用程序
- `data (0x01)` — 数据
- `0x00-0x3F` — 预留给 ESP-IDF 核心功能，**不要用**
- **`0x40-0xFE` — 留给我们自定义的，随便用**

**SubType 字段：**
- 当 Type 是 `app` 时：`factory(0x00)`、`ota_0(0x10)` ~ `ota_15(0x1F)`、`test(0x20)`
- 当 Type 是 `data` 时：`ota(0x00)`、`phy(0x01)`、`nvs(0x02)` 等
- 当 Type 是自定义值时：**SubType 也可以是任意值 `0x00-0xFE`**

一些常见的预定义数据子类型：

| 子类型 | 值 | 用途 |
|-------|------|------|
| nvs | 0x02 | NVS 存储 |
| coredump | 0x03 | 核心转储 |
| nvs_keys | 0x04 | NVS 密钥 |
| efuse | 0x05 | 虚拟 eFuse |
| fat | 0x81 | FAT 文件系统 |
| spiffs | 0x82 | SPIFFS 文件系统 |
| littlefs | 0x83 | LittleFS 文件系统 |

### 4.2 编译验证

```bash
idf.py build
idf.py partition-table
```

```
# ESP-IDF Partition Table
# Name, Type, SubType, Offset, Size, Flags
nvs,data,nvs,0x9000,24K,
phy_init,data,phy,0xf000,4K,
factory,app,factory,0x10000,1M,
user,64,1,0x110000,4K,
```

`user` 分区出现了，Type 显示为 64（即 0x40），大小 4KB，起始地址 `0x110000`。

### 4.3 编写测试代码

```c
#include <stdio.h>
#include <esp_log.h>
#include <esp_partition.h>
#include "string.h"

static const char *TAG = "partition";

#define USER_PARTITION_TYPE    0x40
#define USER_PARTITION_SUBTYPE 0x01

static const esp_partition_t *partition_ptr = NULL;

void app_main(void)
{
    // 第一步：查找目标分区
    partition_ptr = esp_partition_find_first(USER_PARTITION_TYPE, USER_PARTITION_SUBTYPE, NULL);

    if (partition_ptr == NULL) {
        ESP_LOGE(TAG, "找不到分区！");
        return;
    }

    // 第二步：擦除（Flash 写入前必须先擦除）
    esp_partition_erase_range(partition_ptr, 0, 0x1000);

    // 第三步：写入数据
    const char *test_str = "this is flash write test!";
    esp_partition_write(partition_ptr, 0, test_str, strlen(test_str));

    // 第四步：读出数据并验证
    char read_buf[64];
    memset(read_buf, 0, sizeof(read_buf));
    esp_partition_read(partition_ptr, 0, read_buf, strlen(test_str));
    ESP_LOGI(TAG, "读取到的数据: %s", read_buf);
}
```

烧录运行，串口输出：

```
I (xxx) partition: 读取到的数据: this is flash write test!
```

写入和读出完全一致！

这里有一个关键点需要注意：**Flash 在写入之前必须先擦除**。这是 Flash 存储器的物理特性决定的，擦除后所有位变成 1，写入操作只能把 1 变成 0。所以 `esp_partition_erase_range` 这一步不能省。

### 4.4 分区操作 API 小结

| API | 功能 |
|-----|------|
| `esp_partition_find_first()` | 根据类型和子类型查找分区 |
| `esp_partition_erase_range()` | 擦除指定范围（写入前必须调用） |
| `esp_partition_write()` | 写入数据 |
| `esp_partition_read()` | 读取数据 |

---

## 五、总结

回顾整个学习过程，分区表这块知识其实并不复杂，核心就三件事：

1. **理解分区表是什么** —— Flash 的空间规划图，告诉系统各种数据存在哪里
2. **会自定义分区表** —— 创建 CSV 文件，在 menuconfig 中指定，编译生效
3. **会在代码中使用指定分区** —— NVS 用带 `_partition` 后缀的 API，自定义分区用 `esp_partition_*` 系列 API

以后学到文件系统（SPIFFS、LittleFS、FAT）的时候，同样需要在分区表里给它们分配空间。所以分区表是后续很多功能的基础，现在搞明白了，后面会轻松很多。

> 参考文档：[ESP-IDF 分区表官方文档](https://docs.espressif.com/projects/esp-idf/zh_CN/v5.4/esp32s3/api-guides/partition-tables.html)

---

*如果这篇文章对你有帮助，欢迎点赞收藏，我们下篇继续！*