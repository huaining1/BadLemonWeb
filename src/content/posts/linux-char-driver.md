---
title: "Linux 字符设备驱动开发：从 file_operations 到用户空间交互"
date: "2024-12-22"
category: "Linux驱动"
tags: [Linux, 驱动开发, 字符设备, 内核]
description: "以一个完整的 GPIO 字符设备驱动为例，详解 Linux 驱动框架中的 cdev 注册、设备号分配、ioctl 实现以及 /dev 节点的自动创建。"
featured: false
---

## 字符设备驱动框架

Linux 设备驱动分为字符设备、块设备和网络设备三大类。字符设备是最基础的驱动类型，数据按字节流顺序访问，没有缓冲。典型的字符设备包括串口、GPIO、I2C 适配器等。

### 核心数据结构

字符设备驱动的核心是 `file_operations` 结构体，它定义了用户空间对设备文件执行各种操作时，内核应该调用哪个函数：

```c
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/module.h>
#include <linux/device.h>

static int     my_open(struct inode *inode, struct file *filp);
static int     my_release(struct inode *inode, struct file *filp);
static ssize_t my_read(struct file *filp, char __user *buf,
                       size_t count, loff_t *f_pos);
static ssize_t my_write(struct file *filp, const char __user *buf,
                        size_t count, loff_t *f_pos);
static long    my_ioctl(struct file *filp, unsigned int cmd,
                        unsigned long arg);

static struct file_operations my_fops = {
    .owner          = THIS_MODULE,
    .open           = my_open,
    .release        = my_release,
    .read           = my_read,
    .write          = my_write,
    .unlocked_ioctl = my_ioctl,
};
```

### 设备注册流程

一个完整的字符设备注册流程包括：分配设备号、初始化 cdev、创建设备类和设备节点：

```c
static dev_t dev_num;
static struct cdev my_cdev;
static struct class *my_class;

static int __init my_driver_init(void)
{
    int ret;

    // 1. 动态分配主设备号
    ret = alloc_chrdev_region(&dev_num, 0, 1, "my_device");
    if (ret < 0) return ret;

    // 2. 初始化并添加 cdev
    cdev_init(&my_cdev, &my_fops);
    my_cdev.owner = THIS_MODULE;
    ret = cdev_add(&my_cdev, dev_num, 1);

    // 3. 创建设备类
    my_class = class_create(THIS_MODULE, "my_class");

    // 4. 创建设备节点（udev 自动创建 /dev/mydev0）
    device_create(my_class, NULL, dev_num, NULL, "mydev0");

    pr_info("my_device registered, major=%d\n", MAJOR(dev_num));
    return 0;
}
```

## 用户空间与内核空间数据交换

用户空间和内核空间有不同的地址空间，不能直接互相访问。内核提供了 `copy_to_user` 和 `copy_from_user` 两个函数来安全地传递数据：

```c
static ssize_t my_read(struct file *filp, char __user *buf,
                       size_t count, loff_t *f_pos)
{
    char kernel_buf[64];
    int data_len;

    data_len = read_from_hardware(kernel_buf, sizeof(kernel_buf));

    if (count > data_len)
        count = data_len;

    if (copy_to_user(buf, kernel_buf, count))
        return -EFAULT;

    return count;
}
```

## ioctl 控制接口

对于 GPIO 控制类设备，`ioctl` 是最常用的控制接口：

```c
#define MY_IOC_MAGIC  'M'
#define MY_IOC_SET_DIR    _IOW(MY_IOC_MAGIC, 1, int)
#define MY_IOC_SET_VALUE  _IOW(MY_IOC_MAGIC, 2, int)
#define MY_IOC_GET_VALUE  _IOR(MY_IOC_MAGIC, 3, int)

static long my_ioctl(struct file *filp, unsigned int cmd,
                     unsigned long arg)
{
    int value;

    switch (cmd) {
    case MY_IOC_SET_DIR:
        gpio_direction_output(gpio_num, 0);
        break;
    case MY_IOC_SET_VALUE:
        if (copy_from_user(&value, (int __user *)arg, sizeof(int)))
            return -EFAULT;
        gpio_set_value(gpio_num, value);
        break;
    case MY_IOC_GET_VALUE:
        value = gpio_get_value(gpio_num);
        if (copy_to_user((int __user *)arg, &value, sizeof(int)))
            return -EFAULT;
        break;
    default:
        return -ENOTTY;
    }
    return 0;
}
```

## 模块卸载与资源清理

在模块卸载时，必须反向释放所有注册的资源：

```c
static void __exit my_driver_exit(void)
{
    device_destroy(my_class, dev_num);
    class_destroy(my_class);
    cdev_del(&my_cdev);
    unregister_chrdev_region(dev_num, 1);
    pr_info("my_device unregistered\n");
}

module_init(my_driver_init);
module_exit(my_driver_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("坏柠");
MODULE_DESCRIPTION("示例字符设备驱动");
```

## 总结

开发 Linux 字符设备驱动的关键步骤：

1. **定义 file_operations** 实现 open/read/write/ioctl 等操作
2. **注册设备** 通过 alloc_chrdev_region + cdev_add 注册字符设备
3. **创建节点** 通过 class_create + device_create 自动创建 /dev 节点
4. **安全数据交换** 使用 copy_to_user / copy_from_user 传递数据
5. **清理资源** 在 exit 函数中反向释放所有资源
