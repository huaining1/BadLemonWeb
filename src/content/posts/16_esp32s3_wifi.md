

# 没有屏幕没有键盘，ESP32-S3 怎么连上我家 Wi-Fi？SmartConfig 配网实战

## 前言：一个看似简单却让我卡住的问题

学 ESP32-S3 学到 Wi-Fi 这一章，我满脑子想的都是赶紧联网、搞个物联网设备出来。然后我就愣住了——

**我家路由器的账号密码，怎么告诉这块板子？**

手机连 Wi-Fi 很简单，打开设置、选网络、输密码就完事了。但 ESP32-S3 呢？它没有屏幕，没有键盘，我总不能把密码硬编码在代码里吧？那换个路由器、换个环境岂不是得重新烧录一次程序？

这就是**配网**要解决的问题。今天我就记录一下，从零搞定 SmartConfig 配网的全过程。

---

## 一、ESP32-S3 有哪些配网方式？

先做个全局了解。ESP32-S3 支持四种配网方式：

| 方式 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| **AP 配网** | ESP32 开热点，手机连上后通过网页输入密码 | 可自定义协议，扩展性强 | 体验差，要来回切换 Wi-Fi |
| **蓝牙配网** | 通过 BLE 传输 Wi-Fi 信息 | 可自定义协议，体验好 | 需要蓝牙支持，代码更复杂 |
| **SmartConfig** | 手机通过 UDP 广播把密码"喊"出去，ESP32 监听抓取 | 开发快，用户体验好 | 成功率受环境影响 |
| **DPP 配网** | 扫二维码配网 | 安全性高 | 需要屏幕显示二维码 |

**我最终选了 SmartConfig。** 原因很简单：开发最快、用户操作最简单、不需要额外硬件支持。

> ⚠️ **重要提醒：无论哪种方式，目前只支持 2.4GHz Wi-Fi，不支持 5GHz！** 这是 ESP32-S3 射频模块的硬件限制，不是软件问题。我第一次配网失败就是因为连的 5G 路由……

---

## 二、SmartConfig 的原理（30 秒搞懂）

原理其实挺巧妙的：

```
手机（已连 Wi-Fi）                    ESP32-S3（未联网）
      |                                    |
      |  把 SSID + 密码编码成 UDP 报文       |
      |  通过广播/组播发出去                  |
      | ---------------------------------> |
      |                                    | 处于混杂模式
      |                                    | 监听所有无线报文
      |                                    | 从中解码出 SSID 和密码
      |                                    | 用这组信息去连接路由器
      |                                    |
      |        连接成功，回传 ACK            |
      | <--------------------------------- |
```

**一句话概括：手机把密码"广播"出去，ESP32 在旁边"偷听"到了。**

所以手机要和板子**离得近一点**，周围 2.4G 干扰越少越好，这直接影响配网成功率。

---

## 三、SmartConfig 支持的协议

SmartConfig 不止一种协议：

```c
typedef enum {
    SC_TYPE_ESPTOUCH = 0,        // 乐鑫自家协议
    SC_TYPE_AIRKISS,             // 微信生态协议
    SC_TYPE_ESPTOUCH_AIRKISS,    // 两种都支持
    SC_TYPE_ESPTOUCH_V2,         // ESPTouch 改进版，更稳定
} smartconfig_type_t;
```

| 协议 | 配网工具 | 说明 |
|------|---------|------|
| ESPTouch | ESPTouch APP（开源） | 乐鑫官方，稳定性好 |
| AirKiss | 微信小程序 | 适合微信生态产品 |
| ESPTouch + AirKiss | 两者都行 | **兼容性最好，我用的就是这个** |
| ESPTouch V2 | ESPTouch APP | 支持加密和自定义数据 |

---

## 四、代码实战：从零实现 SmartConfig

> 这类代码不建议自己从零敲，没有意义。正确的做法是：**找到官方例程 → 借助 AI 工具看懂流程 → 参考修改**。

### 整体流程

先理清楚整个配网流程，其实就六步：

```
初始化 NVS（存密码用）
    ↓
初始化网络协议栈
    ↓
注册事件回调（Wi-Fi / IP / SmartConfig 三类事件）
    ↓
启动 Wi-Fi（STA 模式）
    ↓
Wi-Fi 启动成功 → 开启 SmartConfig 监听
    ↓
收到 SSID + 密码 → 连接路由器 → 成功后关闭 SmartConfig
```

### 4.1 初始化 NVS

为什么配网要先初始化 NVS？因为配网拿到的账号密码需要**存到本地**，下次开机直接连接，不用每次都重新配。

```c
ESP_ERROR_CHECK(nvs_flash_init());
```

### 4.2 初始化网络协议栈

这段代码几乎是所有 Wi-Fi 项目的标配，直接套用就行：

```c
// 初始化网络接口
ESP_ERROR_CHECK(esp_netif_init());
// 创建默认事件循环
ESP_ERROR_CHECK(esp_event_loop_create_default());
// 创建默认的 Wi-Fi STA 网络接口
esp_netif_t *sta_netif = esp_netif_create_default_wifi_sta();
assert(sta_netif);
// 初始化 Wi-Fi
wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
ESP_ERROR_CHECK(esp_wifi_init(&cfg));
```

### 4.3 注册事件回调

这是整个配网逻辑的**核心枢纽**。ESP-IDF 用事件驱动模型，所有状态变化都通过事件通知，我们需要监听三类事件：

```c
// Wi-Fi 事件：连接、断开等
ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &event_handler, NULL));
// IP 事件：获取到 IP 地址 = 联网成功
ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &event_handler, NULL));
// SmartConfig 事件：扫描完成、找到信道、获取到密码等
ESP_ERROR_CHECK(esp_event_handler_register(SC_EVENT, ESP_EVENT_ANY_ID, &event_handler, NULL));
```

**三类事件各自的作用：**

| 事件类型 | 关键事件 | 含义 |
|---------|---------|------|
| `WIFI_EVENT` | `STA_START` | Wi-Fi 启动成功，可以开始配网了 |
| | `STA_DISCONNECTED` | 断开连接，需要重连 |
| `IP_EVENT` | `STA_GOT_IP` | 拿到 IP 地址，说明真正联网成功了 |
| `SC_EVENT` | `SCAN_DONE` | SmartConfig 扫描完成 |
| | `FOUND_CHANNEL` | 找到目标 Wi-Fi 信道 |
| | `GOT_SSID_PSWD` | **拿到 SSID 和密码了！配网的关键一步** |
| | `SEND_ACK_DONE` | 给手机回传 ACK 完成，配网流程结束 |

### 4.4 事件回调函数（配网的灵魂）

所有逻辑都在这个回调里，我加了详细注释：

```c
static void event_handler(void* arg, esp_event_base_t event_base,
                          int32_t event_id, void* event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        // ① Wi-Fi 启动成功 → 创建 SmartConfig 任务
        xTaskCreate(smartconfig_example_task, "smartconfig_task", 4096, NULL, 3, NULL);

    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        // ② 断开连接 → 自动重连
        esp_wifi_connect();
        xEventGroupClearBits(s_wifi_event_group, CONNECTED_BIT);

    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        // ③ 获取到 IP → 标记联网成功
        xEventGroupSetBits(s_wifi_event_group, CONNECTED_BIT);

    } else if (event_base == SC_EVENT && event_id == SC_EVENT_GOT_SSID_PSWD) {
        // ④ 拿到 SSID 和密码 → 这是最关键的一步！
        ESP_LOGI(TAG, "Got SSID and password");

        smartconfig_event_got_ssid_pswd_t *evt = (smartconfig_event_got_ssid_pswd_t *)event_data;
        wifi_config_t wifi_config;
        uint8_t ssid[33] = { 0 };
        uint8_t password[65] = { 0 };

        bzero(&wifi_config, sizeof(wifi_config_t));
        memcpy(wifi_config.sta.ssid, evt->ssid, sizeof(wifi_config.sta.ssid));
        memcpy(wifi_config.sta.password, evt->password, sizeof(wifi_config.sta.password));
        memcpy(ssid, evt->ssid, sizeof(evt->ssid));
        memcpy(password, evt->password, sizeof(evt->password));

        ESP_LOGI(TAG, "SSID:%s", ssid);
        ESP_LOGI(TAG, "PASSWORD:%s", password);

        // 用拿到的信息去连接路由器
        ESP_ERROR_CHECK(esp_wifi_disconnect());
        ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
        esp_wifi_connect();

    } else if (event_base == SC_EVENT && event_id == SC_EVENT_SEND_ACK_DONE) {
        // ⑤ ACK 发送完成 → 配网流程彻底结束
        xEventGroupSetBits(s_wifi_event_group, ESPTOUCH_DONE_BIT);
    }
}
```

### 4.5 SmartConfig 任务

```c
static void smartconfig_example_task(void *parm)
{
    EventBits_t uxBits;

    // 设置协议类型：同时支持 ESPTouch 和 AirKiss
    ESP_ERROR_CHECK(esp_smartconfig_set_type(SC_TYPE_ESPTOUCH_AIRKISS));
    smartconfig_start_config_t cfg = SMARTCONFIG_START_CONFIG_DEFAULT();
    // 启动 SmartConfig
    ESP_ERROR_CHECK(esp_smartconfig_start(&cfg));

    while (1) {
        // 阻塞等待：联网成功 或 配网完成
        uxBits = xEventGroupWaitBits(s_wifi_event_group,
                    CONNECTED_BIT | ESPTOUCH_DONE_BIT, true, false, portMAX_DELAY);

        if (uxBits & CONNECTED_BIT) {
            ESP_LOGI(TAG, "WiFi Connected to ap");
        }
        if (uxBits & ESPTOUCH_DONE_BIT) {
            ESP_LOGI(TAG, "smartconfig over");
            esp_smartconfig_stop();  // 停止 SmartConfig
            vTaskDelete(NULL);       // 删除自身任务
        }
    }
}
```

### 4.6 启动 Wi-Fi

```c
ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
ESP_ERROR_CHECK(esp_wifi_start());
```

---

## 五、完整代码

```c

#include <string.h>
#include <stdlib.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_system.h"
#include "nvs_flash.h"
#include "esp_netif.h"
#include "esp_smartconfig.h"
#include "esp_mac.h"

static EventGroupHandle_t s_wifi_event_group;

static const int CONNECTED_BIT = BIT0;
static const int ESPTOUCH_DONE_BIT = BIT1;
static const char *TAG = "smartconfig_example";

static void smartconfig_example_task(void * parm);

static void event_handler(void* arg, esp_event_base_t event_base,
                                int32_t event_id, void* event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        // WiFi 站点模式启动后，创建 SmartConfig 任务
        xTaskCreate(smartconfig_example_task, "smartconfig_example_task", 4096, NULL, 3, NULL);
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        wifi_event_sta_disconnected_t *evt = (wifi_event_sta_disconnected_t *)event_data;
        ESP_LOGW(TAG, "WiFi disconnected, reason=%d (%s)", (int)evt->reason,
                 evt->reason == WIFI_REASON_AUTH_EXPIRE ? "auth expire" :
                 evt->reason == WIFI_REASON_AUTH_LEAVE ? "auth leave" :
                 evt->reason == WIFI_REASON_ASSOC_EXPIRE ? "assoc expire" :
                 evt->reason == WIFI_REASON_ASSOC_TOOMANY ? "assoc too many" :
                 evt->reason == WIFI_REASON_NOT_AUTHED ? "not authed" :
                 evt->reason == WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT ? "4-way timeout" :
                 evt->reason == WIFI_REASON_HANDSHAKE_TIMEOUT ? "handshake timeout" :
                 evt->reason == WIFI_REASON_NO_AP_FOUND ? "AP not found" :
                 evt->reason == WIFI_REASON_CONNECTION_FAIL ? "connection fail" : "other");
        xEventGroupClearBits(s_wifi_event_group, CONNECTED_BIT);
        vTaskDelay(pdMS_TO_TICKS(500));
        esp_wifi_connect();
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *evt = (ip_event_got_ip_t *)event_data;
        ESP_LOGI(TAG, "Got IP: " IPSTR, IP2STR(&evt->ip_info.ip));
        xEventGroupSetBits(s_wifi_event_group, CONNECTED_BIT);
    } else if (event_base == SC_EVENT && event_id == SC_EVENT_SCAN_DONE) {
        // SmartConfig 扫描完成事件
        ESP_LOGI(TAG, "Scan done");
    } else if (event_base == SC_EVENT && event_id == SC_EVENT_FOUND_CHANNEL) {
        // SmartConfig 找到信道事件
        ESP_LOGI(TAG, "Found channel");
    } else if (event_base == SC_EVENT && event_id == SC_EVENT_GOT_SSID_PSWD) {
        // SmartConfig 获取到 SSID 和密码事件
        ESP_LOGI(TAG, "Got SSID and password");
        smartconfig_event_got_ssid_pswd_t *evt = (smartconfig_event_got_ssid_pswd_t *)event_data;
        wifi_config_t wifi_config;
        uint8_t ssid[33] = { 0 };
        uint8_t password[65] = { 0 };
        uint8_t rvd_data[33] = { 0 };

        bzero(&wifi_config, sizeof(wifi_config_t));
        memcpy(wifi_config.sta.ssid, evt->ssid, sizeof(wifi_config.sta.ssid));
        memcpy(wifi_config.sta.password, evt->password, sizeof(wifi_config.sta.password));

        memcpy(ssid, evt->ssid, sizeof(evt->ssid));
        memcpy(password, evt->password, sizeof(evt->password));
        ESP_LOGI(TAG, "SSID:%s", ssid);
        ESP_LOGI(TAG, "PASSWORD:%s", password);
        if (evt->type == SC_TYPE_ESPTOUCH_V2) {
            // 如果使用的是 ESPTouch V2，获取额外的数据
            ESP_ERROR_CHECK( esp_smartconfig_get_rvd_data(rvd_data, sizeof(rvd_data)) );
            ESP_LOGI(TAG, "RVD_DATA:");
            for (int i=0; i<33; i++) {
                printf("%02x ", rvd_data[i]);
            }
            printf("\n");
        }
        // 断开当前 WiFi 连接，设置新的 WiFi 配置并重新连接
        ESP_ERROR_CHECK( esp_wifi_disconnect() );
        ESP_ERROR_CHECK( esp_wifi_set_config(WIFI_IF_STA, &wifi_config) );
        esp_wifi_connect();
    } else if (event_base == SC_EVENT && event_id == SC_EVENT_SEND_ACK_DONE) {
        // SmartConfig 发送 ACK 完成事件，设置 SmartConfig 完成标志位
        xEventGroupSetBits(s_wifi_event_group, ESPTOUCH_DONE_BIT);
    }
}

static void initialise_wifi(void)
{
    // 初始化网络接口
    ESP_ERROR_CHECK(esp_netif_init());
    // 创建事件组
    s_wifi_event_group = xEventGroupCreate();
    // 创建默认事件循环
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    // 创建默认的 WiFi 站点模式网络接口
    esp_netif_t *sta_netif = esp_netif_create_default_wifi_sta();
    assert(sta_netif);

    // 初始化 WiFi 配置
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK( esp_wifi_init(&cfg) );

    // 注册事件处理函数
    ESP_ERROR_CHECK( esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &event_handler, NULL) );
    ESP_ERROR_CHECK( esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &event_handler, NULL) );
    ESP_ERROR_CHECK( esp_event_handler_register(SC_EVENT, ESP_EVENT_ANY_ID, &event_handler, NULL) );

    // 设置 WiFi 模式为站点模式并启动 WiFi
    ESP_ERROR_CHECK( esp_wifi_set_mode(WIFI_MODE_STA) );
    ESP_ERROR_CHECK( esp_wifi_start() );
}

static void smartconfig_example_task(void * parm)
{
    EventBits_t uxBits;
    // 设置 SmartConfig 类型为 SC_TYPE_ESPTOUCH_AIRKISS
    ESP_ERROR_CHECK( esp_smartconfig_set_type(SC_TYPE_ESPTOUCH_AIRKISS) );
    smartconfig_start_config_t cfg = SMARTCONFIG_START_CONFIG_DEFAULT();
    // 启动 SmartConfig
    ESP_ERROR_CHECK( esp_smartconfig_start(&cfg) );
    ESP_LOGI(TAG, "Waiting for phone (ESP Touch / AirKiss) to send SSID and password...");
    while (1) {
        // 等待连接标志位或 SmartConfig 完成标志位
        uxBits = xEventGroupWaitBits(s_wifi_event_group, CONNECTED_BIT | ESPTOUCH_DONE_BIT, true, false, portMAX_DELAY);
        if(uxBits & CONNECTED_BIT) {
            // 连接到 AP 后的日志
            ESP_LOGI(TAG, "WiFi Connected to ap");
        }
        if(uxBits & ESPTOUCH_DONE_BIT) {
            // SmartConfig 完成后的日志
            ESP_LOGI(TAG, "smartconfig over");
            // 停止 SmartConfig
            esp_smartconfig_stop();
            // 删除 SmartConfig 任务
            vTaskDelete(NULL);
        }
    }
}

void app_main(void)
{
    // 初始化 NVS 闪存（若失败多为分区版本或占满，擦除后重试）
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK( nvs_flash_erase() );
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK( ret );

    ESP_LOGI(TAG, "WiFi SmartConfig start. Use ESP Touch / AirKiss app to provision.");
    initialise_wifi();
}
```

编译烧录后，串口会打印：

```
I (583) smartconfig: SC version: V3.0.2
I (583) smartconfig_example: Waiting for 乐鑫小程序 / ESP Touch / AirKiss to send WiFi...
I (5403) wifi:ic_enable_sniffer
I (5403) smartconfig: Start to find channel...
I (5403) smartconfig_example: Scan done
```

这说明 ESP32-S3 已经进入了监听状态，等待手机发送配网信息。

---

## 六、手机端操作

### 方式一：乐鑫微信小程序

微信搜索乐鑫官方小程序，找到 **AirKiss 配网**工具。
![请添加图片描述](https://i-blog.csdnimg.cn/direct/1e16565c9a264865b9269363b07f2b5f.png)

### 方式二：ESPTouch APP
使用乐鑫官方esptouch配网：安卓下载地址：
https://github.com/EspressifApp/EsptouchForAndroid/releases/tag/v2.0.0/esptouch-v2.0.0.apk
iOS 用户在应用商店搜索 **ESPTouch**。

配置| 连接成功
---|---
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/9458a34c77c542ed86c35d468991f165.jpeg)|![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/d1a325fcdc2441bc8947b024666104e8.jpeg)|

连接成功则可以看到打印了wifi的信息**操作步骤：**
1. 手机先连上一个 **2.4GHz 的 Wi-Fi**（重要！）
2. 打开配网工具，输入当前 Wi-Fi 的密码
3. 点击配网
4. 等待几秒到几十秒

配网成功后，串口会打印：

```
I (8453) smartconfig: TYPE: ESPTOUCH
I (8453) smartconfig: T|AP MAC: 0c:4b:54:ab:24:e5
I (8453) smartconfig: Found channel on 1-1. Start to get ssid and password...
I (8453) smartconfig_example: Found channel
I (10623) smartconfig: T|pswd: 123123123
I (10623) smartconfig: T|ssid: TP-LINK_24E5
I (10623) smartconfig: T|bssid: 0c:4b:54:ab:24:e5
I (10623) wifi:ic_disable_sniffer
I (10623) smartconfig_example: Got SSID and password
I (10633) smartconfig_example: SSID:TP-LINK_24E5
I (10633) smartconfig_example: PASSWORD:123123123
W (10643) wifi:Password length matches WPA2 standards, authmode threshold changes from OPEN to WPA2
I (10673) wifi:new:<1,1>, old:<1,1>, ap:<255,255>, sta:<1,1>, prof:1, snd_ch_cfg:0x0
I (10683) wifi:state: init -> auth (0xb0)
I (10683) wifi:state: auth -> assoc (0x0)
I (10693) wifi:state: assoc -> run (0x10)
I (10903) wifi:connected with TP-LINK_24E5, aid = 3, channel 1, 40U, bssid = 0c:4b:54:ab:24:e5
I (10903) wifi:security: WPA2-PSK, phy: bgn, rssi: -37
I (10903) wifi:pm start, type: 1
```

看到 `WiFi Connected to ap` 和 IP 地址就说明成功了！

### 配网失败？排查这三点

| 原因 | 解决方案 |
|------|---------|
| 手机连的是 5GHz Wi-Fi | **切换到 2.4GHz** |
| 密码输错或包含特殊字符 | 仔细核对密码 |
| 周围 2.4GHz 干扰太多 | 手机靠近板子，多试几次 |

---

## 七、进阶：记住配网信息，避免每次都重新配

上面的代码有个问题：**每次重启都要重新配网**。这在实际产品中肯定不行，用户配一次就应该记住了。

解决方案很简单：`esp_wifi_set_config` 会自动把 Wi-Fi 配置保存到 NVS 中，下次启动用 `esp_wifi_get_config` 读出来，有数据就直接连接，没有才进入配网模式。

只需要修改 `smartconfig_example_task` 函数：

```c
static void smartconfig_example_task(void * parm)
{
    EventBits_t uxBits;
    wifi_config_t myconfig;
    memset(&myconfig, 0, sizeof(myconfig));

    ESP_LOGI(TAG, "检查是否已有 Wi-Fi 配置...");
    if (esp_wifi_get_config(WIFI_IF_STA, &myconfig) == ESP_OK
            && strlen((char *)myconfig.sta.ssid) > 0) {
        ESP_LOGI(TAG, "已有配置，SSID: %s，直接连接...", (char *)myconfig.sta.ssid);
        esp_wifi_connect();
    } else {
        ESP_ERROR_CHECK(esp_smartconfig_set_type(SC_TYPE_ESPTOUCH_AIRKISS));
        smartconfig_start_config_t cfg = SMARTCONFIG_START_CONFIG_DEFAULT();
        ESP_ERROR_CHECK(esp_smartconfig_start(&cfg));
        ESP_LOGI(TAG, "Waiting for phone (ESP Touch / AirKiss) to send SSID and password...");
    }

    while (1) {
        // 等待连接标志位或 SmartConfig 完成标志位
        uxBits = xEventGroupWaitBits(s_wifi_event_group, CONNECTED_BIT | ESPTOUCH_DONE_BIT, true, false, portMAX_DELAY);
        if(uxBits & CONNECTED_BIT) {
            // 连接到 AP 后的日志
            ESP_LOGI(TAG, "WiFi Connected to ap");
        }
        if(uxBits & ESPTOUCH_DONE_BIT) {
            // SmartConfig 完成后的日志
            ESP_LOGI(TAG, "smartconfig over");
            // 停止 SmartConfig
            esp_smartconfig_stop();
            // 删除 SmartConfig 任务
            vTaskDelete(NULL);
        }
    }
}
```

**效果：**
- 第一次启动 → 进入配网模式 → 配网成功后自动保存
- 后续启动 → 直接连接，秒联网

---

## 八、怎么重新配网？

配网信息存在 NVS 里了，那想换个路由器怎么办？

### 方法一：开发调试阶段

直接擦除整个 Flash：

```bash
idf.py erase_flash
```

简单粗暴，但只适合调试。

### 方法二：产品阶段

给用户一个**重置入口**，比如长按某个按键 10 秒，触发重置：

```c
// 清除 Wi-Fi 配置，恢复出厂设置
esp_wifi_restore();
// 然后重启设备，就会重新进入配网模式
esp_restart();
```

这才是实际产品该有的做法。

---

## 九、整体流程回顾

用一张图总结整个 SmartConfig 配网流程：

```
设备上电
  ↓
初始化 NVS + Wi-Fi
  ↓
检查 NVS 中有没有保存的 Wi-Fi 配置
  ↓
┌─── 有 ───→ 直接 esp_wifi_connect() → 联网成功 ✅
│
└─── 没有 ──→ 启动 SmartConfig 监听
                  ↓
              手机 APP 发送 SSID + 密码
                  ↓
              ESP32 抓取到 → esp_wifi_set_config() 保存
                  ↓
              esp_wifi_connect() → 联网成功 ✅
                  ↓
              esp_smartconfig_stop() → 配网结束
```

---

## 十、总结与踩坑记录

### 学到了什么

1. **配网的本质**就是把路由器的 SSID 和密码传给设备，不同方式只是"传递管道"不同
2. **SmartConfig 的原理**是 ESP32 在混杂模式下监听 UDP 广播，手机把密码编码后广播出去
3. **事件驱动模型**是 ESP-IDF Wi-Fi 编程的核心，所有状态变化都通过事件回调处理
4. **配网信息会自动存到 NVS**，`esp_wifi_get_config` 就能读出来

### 踩过的坑

| 坑 | 原因 | 教训 |
|----|------|------|
| 配网一直失败 | 手机连的 5GHz Wi-Fi | **一定要 2.4GHz！** |
| 每次重启都要重新配 | 没有判断 NVS 中是否已有配置 | 加上 `esp_wifi_get_config` 判断 |
| 配网时好时坏 | 周围 2.4GHz 设备太多 | 靠近一点，多试几次 |
| 换路由后连不上 | 旧密码还存在 NVS 里 | 加重置按键调用 `esp_wifi_restore()` |

### 一点感悟

说实话，这部分代码**不需要自己从零写**。Wi-Fi 配网的 API 很多，事件回调关系也复杂，死记硬背完全没有意义。正确的学习方式是：

1. 找到 ESP-IDF 官方例程（`examples/wifi/smart_config`）
2. 借助 AI 工具理解每一段代码的作用
3. 在例程基础上根据自己的需求修改

把精力放在**理解流程和解决实际问题**上，而不是记忆 API。

---
