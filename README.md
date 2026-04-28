# 🤖 Facebook Marketplace AI Lister

使用 Google Gemini Vision AI 快速为 Facebook Marketplace 生成商品列表信息。

## ✨ 功能

- 📸 **智能图像分析**：上传商品图片，AI 自动分析
- 🏷️ **自动生成标题**：根据商品内容生成吸引人的标题
- 💰 **智能定价**：根据商品状况和地区生成合理的价格范围
- 📝 **详细描述**：AI 生成商品的关键特点和优势
- 🏪 **自动分类**：推荐合适的 Facebook 分类
- 🌍 **地区感知**：根据你所在地区调整价格建议
- ⚡ **一键填充**：自动填充 Facebook Marketplace 表单

## 🚀 快速开始

### 1️⃣ 下载和安装

```bash
1. 解压项目文件夹
2. 打开 Chrome 浏览器
3. 访问 chrome://extensions
4. 右上角打开"开发者模式"
5. 点击"加载解包项目"
6. 选择解压的项目文件夹
7. 完成！
```

### 2️⃣ 使用步骤

```
1. 点击 Chrome 扩展栏中的"AI Marketplace Lister"图标
2. 第一次使用时，输入你的城市/地区（如"北京"、"上海"）
3. 点击"选择图片"按钮，上传商品图片
4. 点击"🔍 分析商品"按钮
5. 等待 AI 分析（通常 2-5 秒）
6. 在 Facebook Marketplace 创建列表页面点击"✅ 自动填充表单"
7. 完成！表单已自动填充
```

## 📦 文件结构

```
facebook-marketplace-ai-lister/
├── manifest.json              # Chrome 扩展配置
├── popup.html                 # 扩展弹窗 UI
├── popup.css                  # 弹窗样式
├── popup.js                   # 弹窗逻辑
├── content.js                 # 注入到 Facebook 的脚本
├── content.css                # 内容脚本样式
├── background.js              # Service Worker 后台脚本
├── README.md                  # 本文件
└── assets/                    # 图标（可选）
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## 🔧 配置

### API 密钥
API 密钥已配置在 `popup.js` 中，无需手动设置。

### 修改地址
在扩展弹窗中点击"保存"按钮即可更改地址。

## 📋 系统要求

- **Chrome/Edge 版本 110+**（需要 Manifest V3 支持）
- **互联网连接**（调用 Gemini API）
- **Facebook 账户**（用于 Marketplace）

## ⚙️ 工作原理

```
1. 用户上传图片
   ↓
2. 扩展将图片转换为 Base64
   ↓
3. 发送到 Google Gemini Vision API
   ↓
4. AI 分析商品和市场价格
   ↓
5. 返回 JSON 格式的建议（标题、价格、描述、类别）
   ↓
6. 用户点击"自动填充"
   ↓
7. Content Script 注入 Facebook 页面并填充表单
```

## 🎯 已完成功能（Sprint 1）

- ✅ Chrome 扩展 Manifest V3 配置
- ✅ 弹窗 UI 设计（图片选择、地址设置）
- ✅ Gemini Vision API 集成
- ✅ 地区感知的价格建议
- ✅ Content Script 注入和表单自动填充
- ✅ 加载和错误提示

## ⚠️ 已知限制

1. **免费配额限制**：Gemini API 免费账户每天限 15 个请求
2. **Facebook DOM 变化**：如果 Facebook 改变了表单结构，可能需要更新选择器
3. **图片大小**：最大支持 5MB 图片
4. **浏览器支持**：仅支持 Chrome/Edge（需要 Manifest V3）

## 🐛 故障排除

### 问题：扩展不加载
**解决**：检查 Chrome 版本是否 110+，在 `chrome://extensions` 中查看错误信息

### 问题：分析失败 / API 错误
**解决**：
- 确保网络连接正常
- 检查是否超过了免费配额（每天 15 个请求）
- 刷新页面后重试

### 问题：自动填充不工作
**解决**：
- 确保在 `https://www.facebook.com/marketplace/create/*` 页面使用
- 刷新 Facebook 页面后重试
- 检查浏览器控制台（F12）是否有错误信息

### 问题：找不到表单字段
**解决**：
- Facebook 可能改变了 DOM 结构
- 可以手动检查浏览器开发工具中的 aria-label 属性
- 联系开发者更新选择器

## 📞 支持

如有问题或建议，请提交 issue 或联系开发者。

## 📜 隐私政策

- 所有数据都发送到 Google Gemini API（第三方服务）
- 本地存储：仅存储用户的地址和 API 密钥
- 我们不收集、存储或分享用户的商品信息或图片
- 所有处理都在用户浏览器内进行

## 📄 许可证

MIT License

---

**祝你销售愉快！** 🎉
