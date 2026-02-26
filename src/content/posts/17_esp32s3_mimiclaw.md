# ESP32-S3 部署 MimicLaw 完整教程：从零到成功调用 DeepSeek

**一块 30 块钱的开发板 + 一个大模型 API，就能做出可以听懂人话的智能硬件。**

最近我成功将开源项目 **MimicLaw** 部署到了 ESP32-S3 核心板上，并接入 DeepSeek API 运行成功。本文记录完整安装过程和踩坑经验，确保你跟着做就能跑通。

> 🔗 项目地址：https://github.com/memovai/mimiclaw

---

## 一、MimicLaw 是什么？

MimicLaw 本质是一个运行在 ESP32 上的 **LLM 客户端框架**，它可以：

- 🌐 连接 WiFi
- 🤖 调用大模型 API（OpenAI / Anthropic / DeepSeek 等）
- 📦 解析返回的 JSON
- ⚡ 本地执行逻辑（例如控制 GPIO / RGB 灯）

一句话概括：

```
ESP32-S3 + WiFi + LLM = 可被自然语言驱动的嵌入式控制器
```

它不是一个"聊天机器人"，而是一个**让大模型驱动硬件**的桥梁。

---

## 二、准备工作

### 2.1 硬件

| 物品 | 说明 |
|------|------|
| ESP32-S3 核心板 | 推荐带 USB 直连的版本（如 ESP32-S3-DevKitC），某宝 25~50 元 |
| USB 数据线 | Type-C，**必须是数据线**（纯充电线无法烧录） |

### 2.2 软件环境

| 项目 | 版本 |
|------|------|
| 操作系统 | Ubuntu（本文使用虚拟机，建议磁盘分配 **40GB 以上**） |
| ESP-IDF | v5.5.2（通过官方安装脚本安装） |
| Python | 3.8+（ESP-IDF 安装时会自动处理） |
| Git | 用于克隆代码 |

### 2.3 DeepSeek API Key

MimicLaw 需要调用大模型 API，本文以 DeepSeek 为例。

**获取方式：**

1. 访问 https://platform.deepseek.com
2. 注册 / 登录
3. 进入「API Keys」页面，创建一个新的 Key
4. 复制保存好（只显示一次！）

> 💡 DeepSeek 注册后通常会送一些免费额度，足够测试使用。

---

## 三、安装 ESP-IDF（关键步骤）

本文使用的是 **乐鑫官方安装脚本**，不需要手动 `git clone esp-idf`。

### 3.1 安装系统依赖

```bash
sudo apt update
sudo apt install -y git wget flex bison gperf python3 python3-pip python3-venv cmake ninja-build ccache libffi-dev libssl-dev dfu-util libusb-1.0-0
```

### 3.2 运行官方安装脚本

```bash
./scripts/setup_idf_ubuntu.sh
./scripts/build_ubuntu.sh
```
> 说明：这个步骤会配置 ESP-IDF v5.5 工具链，它是官方用于 ESP32 编译的框架。

> 💡 如果上述脚本方式不适用，也可以用以下方式：
> ```bash
> cd ~
> git clone -b v5.5.2 --recursive https://github.com/espressif/esp-idf.git esp-idf-v5.5.2
> cd esp-idf-v5.5.2
> ./install.sh esp32s3
> ```

安装完成后，ESP-IDF 默认位于：

```
~/.espressif/esp-idf-v5.5.2
```

### 3.3 加载 ESP-IDF 环境

**⚠️ 每次打开新终端都需要执行这一步：**

```bash
. $HOME/.espressif/esp-idf-v5.5.2/export.sh
```

> ⚠️ 注意：不要直接复制网上带 `/home/某某用户名/` 的路径，用 `$HOME` 代替，它会自动匹配你的用户目录。

验证是否加载成功：

```bash
idf.py --version
```

输出类似 `ESP-IDF v5.5.2` 即为成功。
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/12c2a27b5e4d4401845feb63df133575.png)


如果提示 `idf.py: command not found`，说明没有执行上面的 `export.sh`。

### 3.4 可选：设置自动加载

每次手动执行 `export.sh` 比较麻烦，可以加到 shell 配置中：

```bash
echo '. $HOME/.espressif/esp-idf-v5.5.2/export.sh' >> ~/.bashrc
source ~/.bashrc
```

---
## 四、先验证 DeepSeek API 是否可用

**在改代码之前，先确认你的 API Key 和网络没有问题。** 这一步能帮你省去很多排查时间。

```bash
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你的DeepSeek_API_Key" \
  -d '{
        "model": "deepseek-chat",
        "messages": [
          {"role": "user", "content": "Hello"}
        ],
        "stream": false
      }'
```

**成功返回** 类似以下 JSON，说明一切正常：

```json
{
  "id": "chatcmpl-xxx",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      }
    }
  ]
}
```
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/08fa1a1b0fae4ea28b7b72e9a47e947c.png)
deepseek官网：`https://platform.deepseek.com/api_keys`
使用命令：`export DEEPSEEK_API_KEY="sk-xxxxxxxxxxxxxxxx"` 可在Ubuntu临时赋值环境变量

**如果失败，请排查：**

| 现象 | 原因 |
|------|------|
| `401 Unauthorized` | API Key 填错了 |
| `connection refused` | 网络问题（虚拟机 DNS / 代理） |
| `curl: command not found` | 执行 `sudo apt install curl` |

> ⚠️ 确认 API 调通后再进行下一步。

---

## 六、下载 MimicLaw 源码

```bash
cd ~
git clone https://github.com/memovai/mimiclaw.git
cd mimiclaw
```

> 💡 如果 GitHub 访问超时，可以使用加速镜像：
> ```bash
> git clone https://ghproxy.com/https://github.com/memovai/mimiclaw.git
> ```

克隆完成后，查看项目结构：

```bash
ls -la
```

确认能看到 `CMakeLists.txt`、`main/` 目录等关键文件。

---

## 七、配置 mimi_secrets.h

这个文件存放 WiFi 密码和 API Key 等敏感信息。

### 7.1 复制示例文件

```bash
# 在项目根目录执行
cp mimi_secrets.h.example mimi_secrets.h
```

> 如果找不到 `.example` 文件，用 `find . -name "*secret*"` 搜索一下它的实际位置。

### 7.2 编辑配置

```bash
nano mimi_secrets.h
```

修改为以下内容：

```c
#pragma once

#define MIMI_SECRET_WIFI_SSID       "你的WiFi名称"
#define MIMI_SECRET_WIFI_PASS       "你的WiFi密码"

/* DeepSeek API 配置 */
#define MIMI_SECRET_API_KEY         "sk-你的DeepSeek_API_Key"
#define MIMI_SECRET_MODEL           "deepseek-chat"
#define MIMI_SECRET_MODEL_PROVIDER  "openai"
```

按 `Ctrl + O` 保存，`Ctrl + X` 退出。

**注意事项：**
- WiFi 必须是 **2.4GHz**（ESP32 不支持 5GHz）
- Provider 填 `"openai"`，因为 DeepSeek 兼容 OpenAI 协议

> ⚠️ **安全提醒：** `mimi_secrets.h` 包含你的密钥，**绝对不要提交到 Git**。建议确认项目的 `.gitignore` 已包含该文件，或手动添加：
> ```bash
> echo "mimi_secrets.h" >> .gitignore
> ```

---

## 八、修改源码以支持 DeepSeek

### 8.1 为什么要改？

MimicLaw 的 `openai` provider 默认连接的是 `api.openai.com`，而 DeepSeek 虽然兼容 OpenAI 协议，但域名和路径不同：

| 项目 | OpenAI 默认值 | DeepSeek 需改为 |
|------|-------------|----------------|
| Host | `api.openai.com` | `api.deepseek.com` |
| Path | `/v1/chat/completions` | `/chat/completions` |

### 8.2 修改 API Host

打开文件：

```bash
nano main/llm/llm_proxy.c
```

找到这一行（可用 `Ctrl + W` 搜索 `provider_is_openai`）：
修改这几个函数

```c
static bool provider_is_openai(void)
{
    return strcmp(s_provider, "openai") == 0;
}

static const char *llm_api_url(void)
{
    return provider_is_openai() ? MIMI_OPENAI_API_URL : MIMI_LLM_API_URL;
}

static const char *llm_api_host(void)
{
    return provider_is_openai() ? "api.deepseek.com" : "api.anthropic.com";
}

static const char *llm_api_path(void)
{
     return provider_is_openai() ? "/chat/completions" : "/v1/messages";
}
```

修改为：

```c
static bool provider_is_openai(void)
{
    return strcmp(s_provider, "openai") == 0 || strcmp(s_provider, "deepseek") == 0;
}

static const char *llm_api_url(void)
{
    if (strcmp(s_provider, "deepseek") == 0) return MIMI_DEEPSEEK_API_URL;
    if (strcmp(s_provider, "openai") == 0) return MIMI_OPENAI_API_URL;
    return MIMI_LLM_API_URL;
}

static const char *llm_api_host(void)
{
    if (strcmp(s_provider, "deepseek") == 0) return "api.deepseek.com";
    if (strcmp(s_provider, "openai") == 0) return "api.openai.com";
    return "api.anthropic.com";
}

static const char *llm_api_path(void)
{
    if (provider_is_openai()) return "/v1/chat/completions";
    return "/v1/messages";
}
```




保存退出。

> 
> 💡 更优雅的方式是在 `mimi_secrets.h` 中添加 Host / Path 的宏定义，但这需要改动更多代码，本文先用最简单的方式。

---

## 九、编译与烧录

### 9.1 加载 ESP-IDF 环境

如果当前终端还没执行过，先加载：

```bash
. $HOME/.espressif/esp-idf-v5.5.2/export.sh
```

### 9.2 设置目标芯片

```bash
cd ~/mimiclaw
idf.py set-target esp32s3
```

> 这一步会告诉编译系统，我们的目标芯片是 ESP32-S3（而不是 ESP32 / ESP32-C3 等）。

### 9.3 清理旧的编译缓存

```bash
idf.py fullclean
```

> 为什么要执行这一步？因为在改完代码、换过 target 后，旧的缓存可能导致编译异常。`fullclean` 会删除整个 `build/` 目录，确保干净编译。

### 9.4 编译

```bash
idf.py build
```

首次编译大约需要 **5~15 分钟**，取决于电脑性能。请耐心等待 ☕

**编译成功**会看到类似输出：

```
Project build complete. To flash, run:
 idf.py flash
 or
 idf.py -p PORT flash

Generated xxx/mimiclaw.bin
```

### 9.5 连接开发板并烧录

用 USB 数据线将 ESP32-S3 连接到电脑（虚拟机需要将 USB 设备接入到 Ubuntu）。

确认设备被识别：

```bash
ls /dev/ttyACM*
# 或
ls /dev/ttyUSB*
```

看到 `/dev/ttyACM0` 之类的设备即可。

**执行烧录 + 打开串口监视器：**

```bash
idf.py -p /dev/ttyACM0 flash monitor
```
或者直接
```bash
idf.py flash monitor
```

> 💡 `flash monitor` 是两个命令的合并，烧录完成后自动打开串口监视器，方便查看运行日志。

---

## 十、串口权限问题

如果烧录时报错：

```
Permission denied: '/dev/ttyACM0'
```

这是因为当前用户没有串口设备的访问权限。

**解决：**

```bash
sudo usermod -aG dialout $USER
```

**然后必须重启**（注销不够，要完全重启）：

```bash
sudo reboot
```

重启后再次执行编译烧录即可。

> 💡 临时方案（不推荐长期使用）：在烧录命令前加 `sudo`。

---

## 十一、成功运行的表现

串口监视器中应该依次看到：

```
✅ WiFi connected, IP: 192.168.x.x
✅ DNS resolved: api.deepseek.com
✅ TLS handshake OK
✅ HTTP POST → 200 OK
✅ Response parsed
✅ Assistant: Hello! How can I help you?
```
（实际输出格式以项目代码为准，上面是语义示意）
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/64376e2294654c38aaa1dbdc3e7ce41e.png)
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/b766e9ee5fcf4e8ead19618d14e3f6ff.png)



看到类似输出，说明你的 ESP32-S3 已经成功：

- ✅ 连接 WiFi
- ✅ 调用 DeepSeek API
- ✅ 接收并解析大模型回复

**恭喜，部署成功！🎉**

退出串口监视器：按 `Ctrl + ]`

---

## 十二、下一步可以做什么？

不要把它仅仅当聊天机器人。ESP32 + LLM 的核心价值在于：

> **LLM 作为决策层，MCU 作为执行层**

### 几个可以立刻上手的方向：

**🎨 自然语言控制 RGB 灯**

```
用户说："把灯调成暖色"
LLM 输出：{"r": 255, "g": 180, "b": 100}
ESP32 解析 JSON → 控制 PWM → 灯光变化
```

**🔌 LLM 驱动 GPIO**

让大模型根据语义输出引脚电平控制指令。

**🌡️ 语义物联网网关**

ESP32 采集传感器数据，发送给 LLM 分析，根据分析结果自动执行操作。

**🧠 边缘 AI 决策层**

本地规则引擎 + LLM 远程决策，两者结合做更复杂的判断。

---

## 十三、一图总结

```
📦 准备硬件（ESP32-S3 + USB数据线）
          ↓
🔧 安装 ESP-IDF v5.5.2
          ↓
🔑 获取 DeepSeek API Key
          ↓
🧪 curl 测试 API 是否可用
          ↓
📥 git clone MimicLaw
          ↓
📝 配置 mimi_secrets.h
          ↓
✏️ 修改 llm_proxy.c（Host + Path）
          ↓
🎯 idf.py set-target esp32s3
          ↓
🔨 idf.py build
          ↓
🔥 idf.py flash monitor
          ↓
🎉 成功运行！
```

---

## 十四、常见问题汇总

| 问题 | 解决方案 |
|------|---------|
| `idf.py: command not found` | 执行 `. $HOME/.espressif/esp-idf-v5.5.2/export.sh` |
| `No space left on device` | 扩展虚拟机磁盘 + 执行 `growpart` + `resize2fs` |
| `Permission denied: /dev/ttyACM0` | `sudo usermod -aG dialout $USER` 然后重启 |
| WiFi 连不上 | 确认是 2.4GHz 网络，检查 SSID/密码是否正确 |
| API 返回 401 | API Key 无效，重新检查 `mimi_secrets.h` |
| 编译报找不到 `mimi_secrets.h` | 确认已执行 `cp` 命令，且文件在正确目录 |
| 串口监视器乱码 | 波特率设为 115200（ESP-IDF 默认值） |
| 烧录时连接失败 | 按住 BOOT → 按 RST → 松开 RST → 开始烧录 → 松开 BOOT |

---

## 写在最后

整个部署过程核心就是这几步：

1. **装环境** — ESP-IDF
2. **拿 Key** — DeepSeek API
3. **改两行代码** — Host 和 Path
4. **编译烧录** — build + flash

一块几十块钱的开发板，就能跑通一个完整的 **硬件 + 大模型** 链路。

如果你做嵌入式开发，建议认真关注这个方向——**用自然语言控制硬件**，这不是 Demo，而是即将到到来的产品形态。

> 🔗 项目地址：https://github.com/memovai/mimiclaw
>
> 觉得有用？**点赞、收藏、转发**三连，就是对我最大的支持 👇

---