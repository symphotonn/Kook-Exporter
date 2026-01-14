# Kook Chat Export

[English](#english) | [中文](#中文)

---

## English

Export chat history from Kook channels to JSON/CSV with images.

### Features

- Export messages to JSON or CSV format
- Download images along with messages (ZIP)
- Filter by date range
- Set message limit
- Bilingual UI (English/Chinese)
- Privacy-focused - all data stays local

### Installation

**From Chrome Web Store** (Coming Soon)

**Manual Installation:**
1. Download or clone this repository
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** → select this folder

### Usage

1. Log in to [Kook](https://www.kook.top)
2. Navigate to the channel you want to export
3. Click the extension icon in Chrome toolbar
4. Configure export options (format, date range, etc.)
5. Click **Export Chat History**
6. Save the file when prompted

### Export Format

```json
{
  "channelId": "1234567890",
  "exportTime": "2024-01-13T12:00:00.000Z",
  "messageCount": 150,
  "messages": [
    {
      "position": 1,
      "time": "1/13/2024, 12:00:00 PM",
      "author": "username",
      "content": "Hello!",
      "images": ["images/0001_0.jpg"]
    }
  ]
}
```

### Troubleshooting

| Problem | Solution |
|---------|----------|
| "Navigate to a channel" | Open a Kook channel page (URL: `/channels/...`) |
| "Auth token not found" | Refresh the page, make sure you're logged in |
| Export is slow | Large channels take time due to API rate limits |

### Support

If you find this extension useful, buy me a coffee ☕

<img src="donate/wechat.JPG" width="200" alt="WeChat">

- [GitHub](https://github.com/symphotonn/Kook-Exporter)

---

## 中文

导出Kook频道聊天记录到JSON/CSV文件，支持图片下载。

### 功能特点

- 导出为JSON或CSV格式
- 同时下载图片（ZIP压缩包）
- 按日期范围筛选
- 设置消息数量限制
- 双语界面（中文/英文）
- 注重隐私 - 数据仅保存在本地

### 安装方法

**从Chrome应用商店安装**（即将上线）

**手动安装：**
1. 下载或克隆此仓库
2. 打开Chrome → `chrome://extensions/`
3. 开启右上角的**开发者模式**
4. 点击**加载已解压的扩展程序** → 选择此文件夹

### 使用方法

1. 登录 [Kook](https://www.kook.top)
2. 进入要导出的频道
3. 点击Chrome工具栏中的扩展图标
4. 配置导出选项（格式、日期范围等）
5. 点击**导出聊天记录**
6. 保存文件

### 导出格式

```json
{
  "channelId": "1234567890",
  "exportTime": "2024-01-13T12:00:00.000Z",
  "messageCount": 150,
  "messages": [
    {
      "position": 1,
      "time": "2024/1/13 12:00:00",
      "author": "用户名",
      "content": "你好！",
      "images": ["images/0001_0.jpg"]
    }
  ]
}
```

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| "请进入频道后再导出" | 打开Kook频道页面（URL包含`/channels/...`） |
| "未找到认证令牌" | 刷新页面，确保已登录 |
| 导出速度慢 | 大频道需要时间，受API速率限制 |

### 支持作者

如果觉得这个扩展有用，请我喝杯咖啡吧 ☕

<img src="donate/wechat.JPG" width="200" alt="微信赞赏">

- [GitHub](https://github.com/symphotonn/Kook-Exporter)

---

## License

MIT
