# 📦 安装指南

## 方式 1：从源文件夹直接加载（开发者模式）

### 步骤

1. **打开 Chrome 浏览器**

2. **访问扩展管理页面**
   - 地址栏输入：`chrome://extensions`
   - 或菜单 → 更多工具 → 扩展程序

3. **启用开发者模式**
   - 右上角开关"开发者模式"
   - 确保开关已打开（显示蓝色）

4. **加载解包项目**
   - 点击"加载解包项目"按钮
   - 选择 Facebook Marketplace AI Lister 项目文件夹
   - 点击"选择文件夹"

5. **完成！**
   - 扩展应该出现在列表中
   - Chrome 工具栏右上角会显示扩展图标

### 验证安装

- 扩展图标出现在 Chrome 工具栏
- 无任何错误信息
- 点击扩展图标弹出 UI

---

## 方式 2：打包成 .crx 文件（可选）

如果要分享给其他人，可以打包成 .crx 文件：

### 步骤

1. **打开 Chrome 扩展管理页面**
   - `chrome://extensions`

2. **打包扩展**
   - 点击"打包扩展"按钮
   - 选择项目文件夹
   - 点击"打包扩展"

3. **完成**
   - 生成 .crx 文件（可分享）
   - 生成 .pem 密钥文件（保管好，用于更新）

### 分享 .crx 文件

其他用户可以：
1. 下载 .crx 文件
2. 拖入 Chrome 浏览器
3. 确认安装

---

## 常见问题

### Q: "请启用开发者模式"错误
**A**: 
1. 打开 `chrome://extensions`
2. 右上角找到"开发者模式"开关
3. 打开开关（显示蓝色）

### Q: "项目文件夹无效"
**A**:
- 确保文件夹中有 `manifest.json` 文件
- 检查 manifest.json 是否有语法错误
- 在 DevTools 中查看具体错误信息

### Q: 扩展图标不显示
**A**:
- 刷新页面
- 检查扩展是否启用（开关应该是蓝色）
- 重启 Chrome 浏览器

### Q: 如何卸载扩展
**A**:
1. 打开 `chrome://extensions`
2. 找到 Facebook Marketplace AI Lister
3. 点击右下角"删除"按钮

---

## 浏览器兼容性

| 浏览器 | 支持 | 要求 |
|--------|------|------|
| Chrome | ✅ 支持 | 110+ 版本 |
| Microsoft Edge | ✅ 支持 | 110+ 版本 |
| Firefox | ❌ 不支持 | 不支持 Manifest V3 |
| Safari | ❌ 不支持 | 不支持 Manifest V3 |

---

## 更新扩展

### 方式 1：开发者模式
1. 修改代码文件
2. 打开 `chrome://extensions`
3. 找到扩展，点击"刷新"按钮

### 方式 2：替换文件
1. 关闭 Chrome
2. 替换项目文件
3. 重启 Chrome

---

## 数据存储位置

所有数据存储在 Chrome 本地存储中：
- **Windows**: `%APPDATA%\Local\Google\Chrome\User Data\Default\Local Storage`
- **Mac**: `~/Library/Application Support/Google/Chrome/Default/Local Storage`
- **Linux**: `~/.config/google-chrome/Default/Local Storage`

---

## 故障排除

### 扩展崩溃
1. 刷新页面：`Ctrl + R` （Windows）或 `Cmd + R` （Mac）
2. 禁用再启用扩展
3. 打开 DevTools（F12）查看错误
4. 重启 Chrome

### API 不工作
1. 检查网络连接
2. 查看 DevTools 控制台日志
3. 检查 API 配额是否用尽
4. 访问 `chrome://extensions` → 扩展信息 → 查看错误

### 内存占用高
1. 关闭未使用的标签页
2. 禁用其他扩展
3. 清除浏览器缓存

---

## 下一步

✅ 安装完成后，请查看 [README.md](README.md) 了解使用方法。

祝使用愉快！ 🚀
