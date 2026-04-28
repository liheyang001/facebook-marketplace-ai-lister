// Service Worker - 后台脚本
// 用于处理需要扩展权限的操作

console.log('🚀 Service Worker 已初始化');

// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ 扩展已安装');
});

// 监听来自 popup 或 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 收到消息:', request);

  // 可以在这里添加需要 Service Worker 权限的操作
  // 比如存储数据、调用 API 等
});
