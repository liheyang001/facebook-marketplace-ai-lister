// 常量配置
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// DOM 元素
const elements = {
  // 设置面板
  settingsToggle: document.getElementById('settings-toggle'),
  settingsBody: document.getElementById('settings-body'),
  settingsArrow: document.getElementById('settings-arrow'),
  apiKeyInput: document.getElementById('api-key'),
  toggleKeyVisibility: document.getElementById('toggle-key-visibility'),
  locationInput: document.getElementById('location'),
  saveSettingsBtn: document.getElementById('save-settings'),
  settingsStatus: document.getElementById('settings-status'),
  // 状态栏
  locationDisplay: document.getElementById('location-display'),
  apiKeyStatus: document.getElementById('api-key-status'),
  // 图片相关
  selectImageBtn: document.getElementById('select-image-btn'),
  imageInput: document.getElementById('image-input'),
  imagePreview: document.getElementById('image-preview'),
  imagePreviewContainer: document.getElementById('image-preview-container'),
  clearImageBtn: document.getElementById('clear-image-btn'),
  analyzeBtn: document.getElementById('analyze-btn'),
  resultContainer: document.getElementById('result-container'),
  resultTitle: document.getElementById('result-title'),
  resultPrice: document.getElementById('result-price'),
  resultDescription: document.getElementById('result-description'),
  resultCategory: document.getElementById('result-category'),
  autofillBtn: document.getElementById('autofill-btn'),
  newAnalysisBtn: document.getElementById('new-analysis-btn'),
  loadingContainer: document.getElementById('loading-container'),
  errorContainer: document.getElementById('error-container'),
  errorMessage: document.getElementById('error-message'),
  retryBtn: document.getElementById('retry-btn'),
  successMessage: document.getElementById('success-message')
};

// 状态变量
let selectedImageBase64 = null;
let currentAnalysisResult = null;

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

// ============ 事件监听 ============
function setupEventListeners() {
  // 设置面板展开/收起
  elements.settingsToggle.addEventListener('click', toggleSettings);

  // 显示/隐藏 API 密钥
  elements.toggleKeyVisibility.addEventListener('click', () => {
    const isPassword = elements.apiKeyInput.type === 'password';
    elements.apiKeyInput.type = isPassword ? 'text' : 'password';
    elements.toggleKeyVisibility.textContent = isPassword ? '🙈' : '👁️';
  });

  // 保存设置
  elements.saveSettingsBtn.addEventListener('click', saveSettings);

  // 图片相关
  elements.selectImageBtn.addEventListener('click', () => {
    elements.imageInput.click();
  });

  elements.imageInput.addEventListener('change', handleImageSelect);
  elements.clearImageBtn.addEventListener('click', clearImage);

  // 分析相关
  elements.analyzeBtn.addEventListener('click', analyzeImage);
  elements.autofillBtn.addEventListener('click', autofillForm);
  elements.newAnalysisBtn.addEventListener('click', resetForm);
  elements.retryBtn.addEventListener('click', analyzeImage);
}

// ============ 设置管理 ============
function toggleSettings() {
  const isHidden = elements.settingsBody.style.display === 'none';
  elements.settingsBody.style.display = isHidden ? 'block' : 'none';
  elements.settingsArrow.textContent = isHidden ? '▲' : '▼';
}

async function loadSettings() {
  try {
    const { apiKey = '', location = '' } = await chrome.storage.local.get(['apiKey', 'location']);

    if (apiKey) {
      elements.apiKeyInput.value = apiKey;
      updateApiKeyStatus(true);
    } else {
      // 如果没有 API 密钥，自动展开设置面板
      elements.settingsBody.style.display = 'block';
      elements.settingsArrow.textContent = '▲';
    }

    if (location) {
      elements.locationInput.value = location;
      updateLocationDisplay(location);
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
}

async function saveSettings() {
  const apiKey = elements.apiKeyInput.value.trim();
  const location = elements.locationInput.value.trim();

  if (!apiKey) {
    elements.settingsStatus.textContent = '❌ 请输入 API 密钥';
    elements.settingsStatus.style.color = '#ef4444';
    return;
  }

  if (!location) {
    elements.settingsStatus.textContent = '❌ 请输入你的地区';
    elements.settingsStatus.style.color = '#ef4444';
    return;
  }

  try {
    await chrome.storage.local.set({ apiKey, location });
    updateApiKeyStatus(true);
    updateLocationDisplay(location);

    elements.settingsStatus.textContent = '✅ 设置已保存！';
    elements.settingsStatus.style.color = '#10b981';

    // 保存成功后收起设置面板
    setTimeout(() => {
      elements.settingsBody.style.display = 'none';
      elements.settingsArrow.textContent = '▼';
      elements.settingsStatus.textContent = '';
    }, 1500);
  } catch (error) {
    console.error('保存设置失败:', error);
    elements.settingsStatus.textContent = '❌ 保存失败，请重试';
    elements.settingsStatus.style.color = '#ef4444';
  }
}

function updateApiKeyStatus(configured) {
  elements.apiKeyStatus.textContent = configured ? '🔑 已配置' : '🔑 未配置';
  elements.apiKeyStatus.className = configured ? 'configured' : '';
}

function updateLocationDisplay(location) {
  elements.locationDisplay.textContent = `📍 ${location}`;
  elements.locationDisplay.className = 'configured';
}

// ============ 图片处理 ============
function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 验证文件类型
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showError('请选择有效的图片格式（JPG、PNG、WebP）');
    return;
  }

  // 验证文件大小（最大 5MB）
  if (file.size > 5 * 1024 * 1024) {
    showError('图片大小不能超过 5MB');
    return;
  }

  // 读取并显示图片
  const reader = new FileReader();
  reader.onload = (e) => {
    selectedImageBase64 = e.target.result;
    displayImagePreview(e.target.result);
    elements.analyzeBtn.disabled = false;
  };

  reader.onerror = () => {
    showError('读取图片失败，请重试');
  };

  reader.readAsDataURL(file);
}

function displayImagePreview(dataUrl) {
  elements.imagePreview.src = dataUrl;
  elements.imagePreviewContainer.style.display = 'block';
}

function clearImage() {
  selectedImageBase64 = null;
  elements.imageInput.value = '';
  elements.imagePreviewContainer.style.display = 'none';
  elements.analyzeBtn.disabled = true;
  hideAllContainers();
}

// ============ 图像分析 ============
async function analyzeImage() {
  if (!selectedImageBase64) {
    showError('请先选择一张图片');
    return;
  }

  // 检查设置
  const { apiKey = '', location = '' } = await chrome.storage.local.get(['apiKey', 'location']);
  if (!apiKey) {
    showError('请先在设置中填写 Gemini API 密钥');
    toggleSettings();
    return;
  }
  if (!location) {
    showError('请先在设置中填写你的地区');
    toggleSettings();
    return;
  }

  showLoading(true);
  hideAllContainers();

  try {
    // 调用 Gemini Vision API
    const result = await callGeminiVisionAPI(selectedImageBase64, location, apiKey);

    // 保存结果
    currentAnalysisResult = result;

    // 显示结果
    displayResult(result);
    showLoading(false);
  } catch (error) {
    console.error('分析失败:', error);
    showLoading(false);
    showError(error.message || '分析失败，请检查 API 密钥并重试');
  }
}

async function callGeminiVisionAPI(base64Image, location, apiKey) {
  // 提取 base64 部分（去掉 data:image/xxx;base64, 前缀）
  const base64Data = base64Image.split(',')[1];

  const prompt = `你是一个 Facebook Marketplace 列表专家。请分析这张商品图片。

用户所在地区: ${location}

请根据商品的实际状况和该地区的市场价格，生成以下 JSON 格式的建议：

{
  "title": "吸引人的商品标题（15-85个字符）",
  "priceRange": {
    "min": 最低价格（整数）,
    "max": 最高价格（整数）
  },
  "description": ["特点或优势1", "特点或优势2", "特点或优势3", "特点或优势4"],
  "category": "合适的Facebook分类（如Electronics, Clothing, Furniture等）"
}

重要：
1. 价格要考虑${location}的实际购买力和市场情况
2. 标题要简洁吸引人，避免过多符号
3. 描述要突出商品特点，尤其是新旧程度
4. 只返回 JSON，不要有其他文本`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          },
          {
            text: prompt
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(
      `${GEMINI_API_URL}?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API 错误: ${error.error?.message || '未知错误'}`);
    }

    const data = await response.json();

    // 提取文本内容
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('API 没有返回有效内容');
    }

    // 解析 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析 AI 返回的结果');
    }

    const result = JSON.parse(jsonMatch[0]);

    // 验证结果格式
    if (!result.title || !result.priceRange || !result.description || !result.category) {
      throw new Error('AI 返回的数据格式不完整');
    }

    return result;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('解析 AI 返回的结果失败');
    }
    throw error;
  }
}

// ============ 结果显示 ============
function displayResult(result) {
  elements.resultTitle.textContent = result.title;
  elements.resultPrice.textContent = `¥${result.priceRange.min} - ¥${result.priceRange.max}`;
  elements.resultDescription.textContent = result.description.join(' • ');
  elements.resultCategory.textContent = result.category;

  elements.resultContainer.style.display = 'block';
}

// ============ 自动填充 ============
async function autofillForm() {
  if (!currentAnalysisResult) {
    showError('没有要填充的数据');
    return;
  }

  try {
    // 发送消息到 content script
    const [tab] = await chrome.tabs.query({
      url: 'https://www.facebook.com/marketplace/create/*'
    });

    if (!tab) {
      showError('请在 Facebook Marketplace 创建列表页面使用此功能');
      return;
    }

    // 发送填充数据到 content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'autofill',
      data: currentAnalysisResult
    }, (response) => {
      if (chrome.runtime.lastError) {
        showError('无法连接到 Facebook 页面，请刷新页面后重试');
        return;
      }

      if (response?.success) {
        showSuccess('✅ 表单已自动填充！');
        // 2 秒后重置
        setTimeout(resetForm, 2000);
      } else {
        showError(response?.error || '自动填充失败，请手动填充');
      }
    });
  } catch (error) {
    console.error('自动填充错误:', error);
    showError('自动填充失败，请手动填充');
  }
}

// ============ UI 控制 ============
function showLoading(show) {
  elements.loadingContainer.style.display = show ? 'block' : 'none';
}

function hideAllContainers() {
  elements.resultContainer.style.display = 'none';
  elements.errorContainer.style.display = 'none';
  elements.successMessage.style.display = 'none';
}

function showError(message) {
  hideAllContainers();
  elements.errorMessage.textContent = message;
  elements.errorContainer.style.display = 'block';
}

function showSuccess(message) {
  elements.successMessage.textContent = message;
  elements.successMessage.style.display = 'block';
  setTimeout(() => {
    elements.successMessage.style.display = 'none';
  }, 3000);
}

function showNotification(message) {
  showSuccess(message);
}

function resetForm() {
  clearImage();
  currentAnalysisResult = null;
  elements.resultContainer.style.display = 'none';
  hideAllContainers();
}
