# skills.md

## 项目核心能力

**Facebook Marketplace AI Lister Extension** 的核心技能和技术要求。

---

## 1. 核心技术栈

### 语言和标准
- **Vanilla JavaScript (ES6+)** - 不使用任何前端框架
- **HTML5** - 标准 DOM API，无模板引擎
- **CSS3** - 使用 CSS 变量实现样式隔离，避免与 Facebook 样式冲突
- **Chrome Extension API (Manifest V3)**

### 主要 API
- `chrome.storage.local` - 本地存储（API 密钥、用户偏好）
- `chrome.runtime.sendMessage()` - Content Script ↔ Service Worker 通信
- `MutationObserver` - 监听 DOM 变化
- `FileReader API` - 读取用户上传的文件并转换为 Base64
- `Fetch API` - 发送 HTTP 请求到 Vision AI API

---

## 2. 关键技术能力

### A. DOM 操作和动态监听

**Facebook 是重度 SPA（单页应用）** - 需要持续监听 DOM 变化

```javascript
// 使用 MutationObserver 检测用户导航到列表创建页面
const observer = new MutationObserver(() => {
  if (isOnMarketplaceCreatePage()) {
    injectAIAssistantUI();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

**能力要求**：
- ✅ 实现高效的 MutationObserver（避免性能问题）
- ✅ 正确清理观察器（防止内存泄漏）
- ✅ 理解 DOM 事件冒泡和事件委托

### B. 目标定位混淆的 Facebook DOM

**Facebook 使用自动生成的混淆类名**（如 `.x1y2z3`） - 永远不要依赖 CSS 类！

**正确的定位策略**：

```javascript
// ✅ 使用 aria-label（推荐）
document.querySelector('input[aria-label="Title"]')
document.querySelector('input[aria-label="Price"]')
document.querySelector('textarea[aria-label="Description"]')
document.querySelector('select[aria-label="Category"]')

// ✅ 使用 placeholder 属性
document.querySelector('input[placeholder*="Title"]')

// ✅ 使用 data-* 属性（如果存在）
document.querySelector('[data-testid="marketplace-create-title"]')

// ❌ 永远不要这样做
document.querySelector('.x1y2z3') // Facebook 会改变这个类名
```

**能力要求**：
- ✅ 使用浏览器 DevTools 检查 aria-label 和其他属性
- ✅ 实现灵活的选择器策略（主选器 + 备选选器）
- ✅ 处理选择器失效的情况（显示用户友好的错误）

### C. Base64 图像处理

**从文件输入读取图像并编码为 Base64**

```javascript
// 标准的 FileReader 使用
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith('image/')) {
    showError('请选择有效的图片文件');
    return;
  }

  const base64 = await fileToBase64(file);
  // 发送到 Vision AI
  chrome.runtime.sendMessage({
    action: 'analyzeImage',
    base64: base64
  });
});

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // data:image/jpeg;base64,xxx
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

**能力要求**：
- ✅ 理解 FileReader API 和异步处理
- ✅ 验证文件类型和大小
- ✅ 处理大文件（可能需要压缩）
- ✅ 处理读取失败的情况

### D. API 安全性 - Service Worker 处理 API 请求

**所有 API 调用都必须在 Service Worker 中处理**（绕过 CORS 和 CSP）

```javascript
// service-worker.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeImage') {
    // 只接受来自自己扩展的消息（安全检查）
    if (sender.id !== chrome.runtime.id) {
      sendResponse({ error: 'Unauthorized' });
      return;
    }

    analyzeImageWithVisionAI(request.base64)
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // 保持 channel 开放用于异步响应
  }
});

async function analyzeImageWithVisionAI(base64Image) {
  // 从本地存储获取 API 密钥（永不硬编码）
  const { VISION_API_KEY } = await chrome.storage.local.get('VISION_API_KEY');
  if (!VISION_API_KEY) {
    throw new Error('API 密钥未配置');
  }

  const response = await fetch('https://api.example.com/vision/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VISION_API_KEY}`
    },
    body: JSON.stringify({
      image: base64Image,
      prompt: `你是一个 Facebook Marketplace 列表专家。分析这张商品图片，返回以下 JSON 格式的建议：
      {
        "title": "商品标题（15-85个字符，吸引人）",
        "priceRange": {
          "min": 100,
          "max": 200
        },
        "description": ["特点1", "特点2", "特点3"],
        "category": "Electronics"
      }`,
      language: "zh-CN"
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Vision API Error: ${error.message}`);
  }

  return response.json();
}
```

**能力要求**：
- ✅ 实现 Service Worker 消息监听和响应
- ✅ 验证消息来源（安全性）
- ✅ 处理 async/await 和 Promise
- ✅ 错误处理和重试逻辑
- ✅ 在 chrome.storage.local 中安全存储 API 密钥

---

## 3. 专项技能

### Content Script 注入
- ✅ 配置 manifest.json 的 `content_scripts` 匹配规则
- ✅ 理解内容脚本的隔离和权限限制
- ✅ DOM 操作（`createElement`、`appendChild`、`classList`）
- ✅ 事件监听和事件委托

### Service Worker（后台脚本）
- ✅ 理解 Manifest V3 中的 Service Worker 生命周期
- ✅ 处理 `chrome.runtime.onMessage` 事件
- ✅ 异步操作和错误处理
- ✅ 性能优化（避免内存泄漏）

### UI/UX 设计
- ✅ 创建浮动 Widget（绝对定位）
- ✅ 加载动画和进度指示
- ✅ 用户反馈（成功消息、错误提示）
- ✅ 响应式设计（适应不同屏幕）

### 网络和 API 集成
- ✅ RESTful API 调用（POST、GET、Error Handling）
- ✅ JSON 解析和验证
- ✅ 超时处理和重试逻辑
- ✅ CORS 理解（虽然 Service Worker 绕过了 CORS）

---

## 4. 禁止的技术和做法

### ❌ 前端框架
- 不使用 Vue、React、Angular
- 不使用 Svelte、Next.js、Nuxt 等元框架

### ❌ 构建工具
- 不使用 Webpack、Vite、Rollup 等打包工具
- 保持文件结构平坦和原生

### ❌ 第三方库
- 不使用 jQuery、Lodash、Axios 等通用库
- 不使用 LangChain、AutoGen 等 AI 代理框架
- 坚持原生 Fetch API

### ❌ 安全违规
- 不在代码中硬编码 API 密钥
- 不在 Content Script 中处理敏感数据
- 不信任来自不明来源的消息

---

## 5. 开发工作流

### 调试和测试
```javascript
// 测试 MutationObserver
console.log('Current URL:', window.location.href);
console.log('Is marketplace page:', window.location.href.includes('marketplace/create'));

// 测试 DOM 查询
console.log(document.querySelector('input[aria-label="Title"]'));

// 测试消息传递
chrome.runtime.sendMessage({ action: 'test' }, (response) => {
  console.log('Service Worker 响应:', response);
});

// 测试本地存储
chrome.storage.local.get('VISION_API_KEY', (data) => {
  console.log('API Key:', data.VISION_API_KEY ? '已配置' : '未配置');
});
```

### 性能要求
- ✅ Content Script 应该轻量级（< 50KB）
- ✅ MutationObserver 应该有节流机制
- ✅ 避免频繁的 DOM 查询和修改
- ✅ 及时清理事件监听器和观察器

### 兼容性
- ✅ 支持最新的 Chrome 版本（110+）
- ✅ 遵循 Manifest V3（不支持 Manifest v2）
- ✅ 测试多种情况（图片大小、网络延迟等）

---

## 6. 成功标准

### Phase 1 完成标志
- ✅ 扩展在 `chrome://extensions` 中正常加载
- ✅ Content Script 在 FB Marketplace 页面中运行
- ✅ 浏览器控制台无错误

### Phase 2 完成标志
- ✅ 浮动 Widget 在页面中可见
- ✅ 文件输入可以选择图片
- ✅ 图片预览正确显示

### Phase 3 完成标志
- ✅ Vision AI API 调用成功
- ✅ 返回的 JSON 格式正确
- ✅ 错误处理正常工作

### Phase 4 完成标志
- ✅ 表单字段被正确定位
- ✅ 自动填充功能正常工作
- ✅ Facebook 页面样式不被破坏
- ✅ 用户可以正常提交列表

---

## 7. 代码质量标准

- ✅ **可读性**：清晰的变量名、函数名，必要时添加注释
- ✅ **错误处理**：所有 Promise 都有 .catch()，所有 API 调用都有超时
- ✅ **安全性**：不信任用户输入，验证所有数据
- ✅ **性能**：避免阻塞操作，使用异步处理
- ✅ **可维护性**：模块化设计，功能分离

