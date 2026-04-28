// Content Script - 注入到 Facebook Marketplace 创建列表页面

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autofill') {
    autofillForm(request.data)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // 保持 channel 开放
  }
});

// 自动填充函数
async function autofillForm(data) {
  try {
    // 等待一下确保 DOM 完全加载
    await new Promise(resolve => setTimeout(resolve, 500));

    // 填充标题
    fillField('title', data.title);

    // 填充价格（使用最低价格）
    fillField('price', String(data.priceRange.min));

    // 填充描述
    fillField('description', data.description.join('\n'));

    // 填充类别
    selectCategory(data.category);

    console.log('✅ 表单填充完成');
  } catch (error) {
    console.error('填充失败:', error);
    throw new Error('填充表单时出错');
  }
}

// 通用字段填充函数
function fillField(fieldType, value) {
  let input = null;

  switch (fieldType) {
    case 'title':
      // 尝试多种方式定位标题字段
      input = document.querySelector('input[aria-label="Title"]') ||
              document.querySelector('input[placeholder*="title" i]') ||
              document.querySelector('input[placeholder*="product name" i]');
      break;

    case 'price':
      // 尝试多种方式定位价格字段
      input = document.querySelector('input[aria-label*="price" i]') ||
              document.querySelector('input[placeholder*="price" i]') ||
              document.querySelector('input[aria-label*="Price" i]');
      break;

    case 'description':
      // 尝试多种方式定位描述字段
      input = document.querySelector('textarea[aria-label*="description" i]') ||
              document.querySelector('textarea[placeholder*="description" i]') ||
              document.querySelector('textarea');
      break;
  }

  if (input) {
    try {
      // 设置值
      input.focus();
      input.value = value;

      // 触发 change 事件，让 React 检测到更改
      const changeEvent = new Event('change', { bubbles: true });
      input.dispatchEvent(changeEvent);

      // 触发 input 事件
      const inputEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(inputEvent);

      // 触发 blur 事件（有时需要）
      const blurEvent = new Event('blur', { bubbles: true });
      input.dispatchEvent(blurEvent);

      console.log(`✅ 已填充 ${fieldType}: ${value.substring(0, 50)}`);
    } catch (error) {
      console.error(`填充 ${fieldType} 失败:`, error);
      throw new Error(`无法填充${fieldType}字段`);
    }
  } else {
    console.warn(`⚠️ 未找到 ${fieldType} 字段`);
    throw new Error(`找不到${fieldType}字段，请确保在创建列表页面使用`);
  }
}

// 类别选择函数
function selectCategory(category) {
  try {
    // Facebook 的类别选择通常是 select 或 button
    const selectElement = document.querySelector('select[aria-label*="category" i]');

    if (selectElement) {
      // 尝试找到匹配的选项
      const options = selectElement.querySelectorAll('option');
      let found = false;

      for (const option of options) {
        if (option.textContent.toLowerCase().includes(category.toLowerCase())) {
          selectElement.value = option.value;
          selectElement.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`✅ 已选择类别: ${option.textContent}`);
          found = true;
          break;
        }
      }

      if (!found) {
        console.warn(`⚠️ 未找到匹配的类别: ${category}`);
      }
    } else {
      console.warn('⚠️ 未找到类别选择元素，可能需要手动选择');
    }
  } catch (error) {
    console.error('选择类别失败:', error);
    // 不抛出错误，类别选择不是必须的
  }
}

// 页面加载时的初始化
console.log('🚀 Facebook Marketplace AI Lister Content Script 已注入');

// 监听 DOM 变化，以防 Facebook 改变了页面结构
const observer = new MutationObserver(() => {
  // 可以在这里添加监听逻辑，比如检测页面是否重新加载
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 清理
window.addEventListener('unload', () => {
  observer.disconnect();
});
