# Privacy Policy - Kook Chat Export

Last updated: January 2025

## Overview

Kook Chat Export is a browser extension that exports chat history from Kook channels. This extension is designed with privacy as a priority.

## Data Collection

**We do NOT collect any data.** This extension:

- Does NOT send any data to external servers
- Does NOT use analytics or tracking
- Does NOT store your personal information
- Does NOT share any data with third parties

## How the Extension Works

1. **Authentication Token**: The extension temporarily captures your Kook authentication token from your browser session to make API requests. This token is stored only in `sessionStorage` (cleared when you close the browser) and is never transmitted anywhere except to Kook's official API.

2. **Exported Data**: All exported chat messages and images are saved directly to your local device. No data leaves your computer.

3. **Permissions Used**:
   - `storage`: Save user preferences locally
   - `downloads`: Save exported files to your device
   - `activeTab`: Access the current Kook page
   - `scripting`: Inject content script to capture authentication
   - `host_permissions` for Kook domains: Make API requests to export messages

## Data Storage

- User preferences (export format, settings) are stored locally in Chrome's storage
- Authentication tokens are stored in `sessionStorage` (temporary, cleared on browser close)
- No data is stored on any external server

## Contact

For questions about this privacy policy, please open an issue on GitHub:
https://github.com/symphotonn/Kook-Exporter

---

# 隐私政策 - Kook聊天导出

最后更新：2025年1月

## 概述

Kook聊天导出是一个浏览器扩展，用于导出Kook频道的聊天记录。本扩展以隐私保护为优先设计原则。

## 数据收集

**我们不收集任何数据。** 本扩展：

- 不向外部服务器发送任何数据
- 不使用分析或追踪功能
- 不存储您的个人信息
- 不与第三方共享任何数据

## 扩展工作原理

1. **认证令牌**：扩展临时捕获您浏览器会话中的Kook认证令牌，用于发起API请求。此令牌仅存储在`sessionStorage`中（关闭浏览器时清除），除了Kook官方API外不会传输到任何地方。

2. **导出数据**：所有导出的聊天消息和图片都直接保存到您的本地设备。数据不会离开您的电脑。

## 联系方式

如有关于此隐私政策的问题，请在GitHub上提交issue：
https://github.com/symphotonn/Kook-Exporter
