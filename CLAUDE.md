# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

**Facebook Marketplace AI Lister Extension** 是一个 Chrome 扩展（Manifest V3），通过 Vision AI 帮助用户快速创建 Facebook Marketplace 列表。

**核心流程**：
1. 用户在 Facebook Marketplace 创建列表页面 (`https://www.facebook.com/marketplace/create/*`)
2. 上传/选择商品图片
3. 扩展发送图片到 Vision AI API
4. AI 生成：标题、价格范围、描述、推荐类别
5. 用户点击"自动填充"按钮，自动填充表单

**项目特点**：
- 🚀 **纯 Vanilla JavaScript**（ES6+）- 无框架（无 Vue、React、Angular）
- 🔒 **Manifest V3 标准** - 符合最新 Chrome 扩展规范
- 🤖 **Vision AI 集成** - 直接 REST API 调用，无代理框架（无 LangChain）
- ⚡ **轻量级** - 纯扩展，无后端服务器

---

## 架构

### 文件结构
```
extension/
├── manifest.json              # Manifest V3 配置
├── popup/
│   ├── popup.html            # 扩展弹窗 UI
│   ├── popup.js
│   └── popup.css
├── content/
│   ├── content.js            # 注入到 FB 页面的内容脚本
│   └── content.css           # UI 样式（隔离 Facebook 样式）
├── background/
│   └── service-worker.js     # Service Worker（处理 API 请求）
├── assets/
│   ├── icons/                # 扩展图标 (16x16, 48x48, 128x128)
│   └── images/               # 其他资源
└── utils/
    ├── api.js                # AI API 调用逻辑
    ├── dom-utils.js          # DOM 操作辅助函数
    └── constants.js          # 常量配置
```

### 核心模块关系
```
用户交互 (popup.html)
    ↓
Content Script (content.js)
    ↓ chrome.runtime.sendMessage()
    ↓
Service Worker (service-worker.js)
    ↓ fetch() Vision AI API
    ↓
解析 AI 响应
    ↓
DOM 自动填充
```

---

## 关键技术细节

### 1. Content Script 注入与 DOM 操作

**目标 URL**：
```javascript
// manifest.json - content_scripts
{
  "matches": ["https://www.facebook.com/marketplace/create/*"],
  "js": ["content/content.js"],
  "css": ["content/content.css"],
  "run_at": "document_end"
}
```

**MutationObserver 监听 Facebook 动态 DOM**：
```javascript
// content.js
const observer = new MutationObserver(() => {
  const form = document.querySelector('form[aria-label="Create listing"]');
  if (form && !document.querySelector('#ai-assistant-widget')) {
    injectUIWidget();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false
});
```

### 2. 目标 Facebook 表单字段

⚠️ **Facebook 使用混淆的类名（如 `.x1y2z3`）** - 永远不要依赖 CSS 类！

**使用 aria-label 和 placeholder 定位**：
```javascript
// DOM 查询示例
document.querySelector('input[aria-label="Title"]')
document.querySelector('textarea[placeholder="Description"]')
document.querySelector('input[placeholder="Price"]')
document.querySelector('select[aria-label="Category"]')

// 模糊匹配备选方案
document.querySelector('input[name*="title"]') // 如果属性可用
```

### 3. Base64 图像处理

```javascript
// content.js - 获取用户上传的图片并转换为 Base64
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result; // data:image/jpeg;base64,xxx
    sendToBackground({ action: 'analyzeImage', base64 });
  };
  reader.readAsDataURL(file);
});
```

### 4. Service Worker - API 安全调用

```javascript
// service-worker.js - 处理 Vision AI API 请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeImage') {
    callVisionAI(request.base64)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持 channel 开放用于异步响应
  }
});

async function callVisionAI(base64Image) {
  const apiKey = await chrome.storage.local.get('VISION_API_KEY');
  const response = await fetch('https://api.example.com/vision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.VISION_API_KEY}`
    },
    body: JSON.stringify({
      image: base64Image,
      prompt: `分析这个商品图片，返回 JSON 格式的建议：
      {
        "title": "商品标题",
        "priceRange": {"min": 100, "max": 200},
        "description": ["特点1", "特点2", ...],
        "category": "Electronics"
      }`
    })
  });

  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}
```

### 5. DOM 自动填充

```javascript
// content.js - 填充表单字段
function autofillListing(aiResult) {
  try {
    // 标题
    const titleInput = document.querySelector('input[aria-label="Title"]');
    if (titleInput) {
      titleInput.focus();
      titleInput.value = aiResult.title;
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 价格 - 使用第一个价格值
    const priceInput = document.querySelector('input[placeholder*="Price"]');
    if (priceInput && aiResult.priceRange) {
      priceInput.value = aiResult.priceRange.min;
      priceInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 描述
    const descInput = document.querySelector('textarea[placeholder*="Description"]');
    if (descInput) {
      descInput.value = aiResult.description.join('\n');
      descInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 类别 - 通常是 select 或 button，需要特殊处理
    selectCategory(aiResult.category);

    showNotification('✅ 列表已自动填充！');
  } catch (error) {
    showNotification(`❌ 自动填充失败: ${error.message}`, 'error');
  }
}
```

---

## 开发流程

### Phase 1: Manifest V3 和内容脚本基础（第一周）
- [ ] 创建 `manifest.json`，配置内容脚本和权限
- [ ] 实现 `content.js`，注入到 FB Marketplace 页面
- [ ] 验证脚本在 `chrome://extensions` 中正常加载
- [ ] 测试：访问 `https://www.facebook.com/marketplace/create/` 看是否注入成功

### Phase 2: 注入 UI 和图片上传（第二周）
- [ ] 设计浮动"AI 助手"Widget（HTML + CSS）
- [ ] 实现文件输入和预览
- [ ] 添加加载动画和错误提示
- [ ] 处理图片 → Base64 转换
- [ ] 测试：上传图片并在控制台验证 Base64

### Phase 3: Vision AI 集成（第三周）
- [ ] 在 `chrome.storage.local` 中存储 API 密钥
- [ ] 实现 `service-worker.js` 处理 API 请求
- [ ] Content Script 与 Service Worker 消息传递
- [ ] 调用 Vision AI API 并解析响应
- [ ] 错误处理和重试逻辑

### Phase 4: DOM 自动填充和优化（第四周）
- [ ] 使用 `aria-label` 和 placeholder 精准定位 FB 表单字段
- [ ] 实现自动填充逻辑，处理各种字段类型
- [ ] 处理 Facebook 的动态 DOM 变化（MutationObserver）
- [ ] 优化 CSS 隔离，避免与 FB 样式冲突
- [ ] 完整测试和用户反馈

---

## 编码原则（Karpathy）

### ✅ 编码前思考
- **不做隐藏假设**：有歧义时先问，不要猜
- **分析现状**：先理解 Facebook 的 DOM 结构和表单字段，再动手
- **简化优先**：有更简单的方案时说出来，不要过度设计

### ✅ 简洁优先
- **最少代码**：只写解决问题所需的代码
- **不加未要求的功能**：不实现"可能有用"的特性
- **不做无关重构**：只改必须改的

### ✅ 精准修改
- **只改必须改的**：每一行修改都能追溯到需求
- **不"顺手"重构**：发现代码问题不要顺便改，专注当前任务
- **明确追溯**：所有改动都能对应到用户需求

### ✅ 目标驱动
- **定义成功标准**：每个任务都有可验证的成功条件
- **循环执行**：不是盲目执行指令，而是不断验证和调整
- **收集反馈**：测试后收集问题，下一轮改进

---

## 重要提示

### ⚠️ 禁止的技术
- ❌ 不使用 Vue、React、Angular 等框架
- ❌ 不使用 LangChain、AutoGen 等代理框架
- ❌ 不使用 Webpack、Vite 等打包工具
- ❌ 不使用 jQuery、Lodash 等第三方库（除非必要）
- ❌ 不在扩展中暴露 API 密钥

### ✅ 必须遵守
- ✅ Manifest V3（不用 Manifest v2）
- ✅ 使用 Service Worker（background.js 已废弃）
- ✅ Content Security Policy (CSP) - 配置在 manifest.json
- ✅ 所有敏感操作都通过 Service Worker 处理（API 调用）

### 🔐 安全最佳实践
- 在 `chrome.storage.local` 中存储 API 密钥（永不硬编码）
- 所有外部 API 调用都在 Service Worker 中进行（绕过 CORS 和 CSP）
- Content Script 只负责 DOM 操作，不处理敏感数据
- 验证所有来自 Content Script 的消息

---

## 常见问题 & 解决方案

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| 扩展不加载 | manifest.json 语法错误 | 检查 `chrome://extensions` 的错误信息 |
| Content Script 不运行 | URL 匹配不正确 | 确保 URL 是 `https://www.facebook.com/marketplace/create/*` |
| DOM 查询返回 null | Facebook 类名混淆或 DOM 未加载 | 使用 aria-label、placeholder，加 MutationObserver 延迟 |
| 图片上传失败 | FileReader 处理错误 | 检查文件大小，确保是图片格式 |
| API 调用超时 | 网络问题或 API 服务故障 | 实现重试逻辑和超时处理 |
| 自动填充不工作 | Facebook 可能改变了 DOM | 使用浏览器开发工具检查当前的 aria-label |

---

## 开发工具

### Chrome DevTools 检查 Content Script
```javascript
// 在 FB Marketplace 页面打开 DevTools
// 选择 Content Scripts 选项卡查看注入的脚本
// 或在控制台直接测试：
document.querySelector('input[aria-label="Title"]')
```

### 调试 Service Worker
```
chrome://extensions → Facebook Marketplace AI Lister → 点击"Service Worker"
```

### 模拟 API 响应（测试阶段）
```javascript
// 在测试中模拟 Vision AI 的响应
const mockAIResponse = {
  title: "iPhone 13 Pro 256GB Space Gray",
  priceRange: { min: 800, max: 950 },
  description: ["屏幕完好", "电池健康度 95%", "无划伤", "配件齐全"],
  category: "Electronics"
};
```

---

## 部署和发布

1. **本地测试**：
   ```
   chrome://extensions → 加载解包项目（Load unpacked）
   ```

2. **打包扩展**：
   ```
   chrome://extensions → 打包扩展 → 选择项目文件夹
   ```

3. **发布到 Chrome Web Store**：
   - 需要 Google 开发者账户（$5 注册费）
   - 上传打包的 .crx 或 .zip 文件
   - 等待审核（通常 1-3 天）
