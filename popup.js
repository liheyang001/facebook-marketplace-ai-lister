const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Built-in key for free use. Repo is private so this is safe to commit.
const BUILT_IN_API_KEY = 'AIzaSyDzkyPoOeagmGF3GaeXEw6pDYoRy2yvSeg';

// DOM 元素
const elements = {
  // 设置面板
  settingsToggle: document.getElementById('settings-toggle'),
  settingsBody: document.getElementById('settings-body'),
  settingsArrow: document.getElementById('settings-arrow'),
  apiKeyInput: document.getElementById('api-key'),
  toggleKeyVisibility: document.getElementById('toggle-key-visibility'),
  locationInput: document.getElementById('location'),
  languageSelect: document.getElementById('language'),
  saveSettingsBtn: document.getElementById('save-settings'),
  settingsStatus: document.getElementById('settings-status'),
  // 状态栏
  locationDisplay: document.getElementById('location-display'),
  apiKeyStatus: document.getElementById('api-key-status'),
  // 图片相关
  selectImageBtn: document.getElementById('select-image-btn'),
  imageInput: document.getElementById('image-input'),
  imagePreviewContainer: document.getElementById('image-preview-container'),
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
let selectedImages = []; // 支持多图：[{ base64, name }]
let currentAnalysisResult = null;
const MAX_IMAGES = 5;

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadLastResult();
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
    const { apiKey = '', location = '', language = 'en' } = await chrome.storage.local.get(['apiKey', 'location', 'language']);

    if (apiKey) {
      elements.apiKeyInput.value = apiKey;
      updateApiKeyStatus(true);
    }

    if (location) {
      elements.locationInput.value = location;
      updateLocationDisplay(location);
    }

    elements.languageSelect.value = language;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveSettings() {
  const apiKey = elements.apiKeyInput.value.trim();
  const location = elements.locationInput.value.trim();

  if (!location) {
    elements.settingsStatus.textContent = '❌ Please enter your region';
    elements.settingsStatus.style.color = '#ef4444';
    return;
  }

  const language = elements.languageSelect.value;

  try {
    await chrome.storage.local.set({ apiKey, location, language });
    updateApiKeyStatus(!!apiKey);
    updateLocationDisplay(location);

    elements.settingsStatus.textContent = '✅ Settings saved!';
    elements.settingsStatus.style.color = '#10b981';

    // Collapse settings after save
    setTimeout(() => {
      elements.settingsBody.style.display = 'none';
      elements.settingsArrow.textContent = '▼';
      elements.settingsStatus.textContent = '';
    }, 1500);
  } catch (error) {
    console.error('Failed to save settings:', error);
    elements.settingsStatus.textContent = '❌ Save failed, please retry';
    elements.settingsStatus.style.color = '#ef4444';
  }
}

function updateApiKeyStatus(configured) {
  elements.apiKeyStatus.textContent = configured ? '🔑 Configured' : '🔑 Not set';
  elements.apiKeyStatus.className = configured ? 'configured' : '';
}

function updateLocationDisplay(location) {
  elements.locationDisplay.textContent = `📍 ${location}`;
  elements.locationDisplay.className = 'configured';
}

async function loadLastResult() {
  try {
    const { lastResult } = await chrome.storage.local.get('lastResult');
    if (lastResult) {
      currentAnalysisResult = lastResult;
      displayResult(lastResult);
    }
  } catch (e) {
    console.error('Failed to load last result:', e);
  }
}

// ============ 图片处理 ============
async function handleImageSelect(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const remaining = MAX_IMAGES - selectedImages.length;
  if (remaining <= 0) {
    showError(`Maximum ${MAX_IMAGES} photos allowed`);
    return;
  }

  const toAdd = files.slice(0, remaining);

  for (const file of toAdd) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showError(`${file.name} format not supported. Use JPG, PNG or WebP`);
      continue;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError(`${file.name} exceeds 5MB limit`);
      continue;
    }

    const base64 = await fileToBase64(file);
    selectedImages.push({ base64, name: file.name });
  }

  // Reset input to allow re-selecting same image
  elements.imageInput.value = '';

  renderImagePreviews();
  elements.analyzeBtn.disabled = selectedImages.length === 0;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  const container = elements.imagePreviewContainer;
  container.innerHTML = '';

  selectedImages.forEach((img, index) => {
    const item = document.createElement('div');
    item.className = 'preview-item';

    const image = document.createElement('img');
    image.src = img.base64;
    image.alt = img.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => removeImage(index));

    item.appendChild(image);
    item.appendChild(removeBtn);
    container.appendChild(item);
  });

  // 如果还可以Add more photos，显示 "+" 按钮
  if (selectedImages.length < MAX_IMAGES) {
    const addBtn = document.createElement('div');
    addBtn.className = 'preview-add';
    addBtn.textContent = '+';
    addBtn.title = 'Add more photos';
    addBtn.addEventListener('click', () => elements.imageInput.click());
    container.appendChild(addBtn);
  }

  container.style.display = selectedImages.length > 0 ? 'grid' : 'none';
}

function removeImage(index) {
  selectedImages.splice(index, 1);
  renderImagePreviews();
  elements.analyzeBtn.disabled = selectedImages.length === 0;
}

function clearImage() {
  selectedImages = [];
  elements.imageInput.value = '';
  elements.imagePreviewContainer.style.display = 'none';
  elements.imagePreviewContainer.innerHTML = '';
  elements.analyzeBtn.disabled = true;
  hideAllContainers();
}

// ============ 图像分析 ============
async function analyzeImage() {
  if (selectedImages.length === 0) {
    showError('Please select at least one photo');
    return;
  }

  // 检查设置
  const { apiKey = '', location = '', language = 'en' } = await chrome.storage.local.get(['apiKey', 'location', 'language']);
  const resolvedKey = apiKey || BUILT_IN_API_KEY;
  const usingBuiltIn = !apiKey && !!BUILT_IN_API_KEY;

  if (!resolvedKey) {
    showError('Please add your Gemini API key in ⚙️ Settings');
    toggleSettings();
    return;
  }
  if (!location) {
    showError('Please enter your region in ⚙️ Settings');
    toggleSettings();
    return;
  }

  hideAllContainers();
  showLoading(true);

  try {
    const result = await callGeminiVisionAPI(selectedImages, location, resolvedKey, language, usingBuiltIn);

    // 保存结果（持久化）
    currentAnalysisResult = result;
    await chrome.storage.local.set({ lastResult: result });

    displayResult(result);
    showLoading(false);
  } catch (error) {
    console.error('Analysis failed:', error);
    showLoading(false);
    showError(error.message || 'Analysis failed. Check your API key and retry');
  }
}

const LANGUAGE_NAMES = {
  en: 'English',
  zh: 'Chinese (Simplified)',
  es: 'Spanish',
  fr: 'French',
  ja: 'Japanese',
  ko: 'Korean',
};

async function callGeminiVisionAPI(images, location, apiKey, language = 'en', usingBuiltIn = false) {
  const langName = LANGUAGE_NAMES[language] || 'English';

  const prompt = `You are a Facebook Marketplace listing expert. Analyze ${images.length > 1 ? `these ${images.length} product images` : 'this product image'}.

User's region: ${location}
Output language: ${langName}

Based on the product's condition and local market prices in ${location}, generate a JSON response:

{
  "title": "Attractive listing title (15-80 characters)",
  "priceRange": {
    "min": lowest price as integer,
    "max": highest price as integer
  },
  "description": ["feature 1", "feature 2", "feature 3", "feature 4"],
  "category": "Facebook Marketplace category. Must be one of: Electronics, Clothing & Accessories, Furniture, Home Sales, Garden & Outdoor, Toys & Games, Vehicles, Musical Instruments, Sporting Goods, Books, Movies & Music, Pet Supplies, Baby & Kids, Health & Beauty, Office Supplies, Tools & Home Improvement, Antiques & Collectibles, Arts & Crafts, Clothing, Bags & Shoes, Other",
  "condition": "Must be exactly one of: New, Used - Like New, Used - Good, Used - Fair",
  "brand": "Brand name if visible/known, or null if unknown"
}

Rules:
1. Write title and description in ${langName} only
2. Price must reflect ${location} market value
3. Title must be concise and appealing, no excessive symbols
4. Description should highlight condition and key features
5. Assess condition honestly from the images
6. Return JSON only, no other text`;

  const requestBody = {
    contents: [{
      parts: [
        ...images.map(img => ({
          inlineData: {
            mimeType: img.base64.split(';')[0].split(':')[1] || 'image/jpeg',
            data: img.base64.split(',')[1]
          }
        })),
        { text: prompt }
      ]
    }]
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const detail = errorBody.error?.message || '';
      if (response.status === 429) {
        throw new Error(`Quota exhausted. Check your Google AI Studio limits.${detail ? ' (' + detail + ')' : ''}`);
      }
      throw new Error(`API error ${response.status}: ${detail || 'unknown error'}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('API returned no valid content');
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const result = JSON.parse(jsonMatch[0]);

    if (!result.title || !result.priceRange || !result.description || !result.category) {
      throw new Error('AI response is missing required fields');
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out (30s). Check your network and retry');
    }
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response');
    }
    throw error;
  }
}

// ============ 结果显示 ============
function displayResult(result) {
  elements.resultTitle.textContent = result.title;
  elements.resultPrice.textContent =
    `${result.priceRange.min} – ${result.priceRange.max}  ·  Will fill: ${result.priceRange.min} (adjust after autofill)`;
  elements.resultDescription.textContent = result.description.join(' • ');
  const conditionText = result.condition || '';
  const brandText = result.brand ? ` · Brand: ${result.brand}` : '';
  elements.resultCategory.textContent = `${result.category} · ${conditionText}${brandText}`;

  elements.resultContainer.style.display = 'block';
}

// ============ 自动填充 ============
async function autofillForm() {
  if (!currentAnalysisResult) {
    showError('No data to fill');
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({
      url: 'https://www.facebook.com/marketplace/create/*',
      active: true,
      currentWindow: true
    });

    // 如果当前窗口没找到，尝试所有窗口
    const targetTab = tab || (await chrome.tabs.query({
      url: 'https://www.facebook.com/marketplace/create/*'
    }))[0];

    if (!targetTab) {
      showError('Please open Facebook Marketplace Create Listing page first');
      return;
    }

    // 确保 content script 已注入（处理扩展安装前已打开的页面）
    try {
      await chrome.scripting.executeScript({
        target: { tabId: targetTab.id },
        files: ['content.js']
      });
    } catch (e) {
      // 已经注入过了，忽略错误
    }

    // 短暂等待 content script 初始化
    await new Promise(resolve => setTimeout(resolve, 200));

    // 发送填充数据（包含图片）
    chrome.tabs.sendMessage(targetTab.id, {
      action: 'autofill',
      data: currentAnalysisResult,
      images: selectedImages.map(img => img.base64)
    }, (response) => {
      if (chrome.runtime.lastError) {
        showError('Cannot connect to Facebook page. Please refresh it and retry');
        return;
      }

      if (response?.success) {
        const filled = response.filled?.join(', ') || 'fields';
        const skippedNote = response.skipped?.length
          ? `\n⚠️ Not found on page: ${response.skipped.join(', ')}`
          : '';
        const priceNote = response.priceRange
          ? `\n💰 Price set to ${response.priceRange.min} — adjust if needed (range: ${response.priceRange.min}–${response.priceRange.max})`
          : '';
        showSuccess(`✅ Filled: ${filled}${skippedNote}${priceNote}`);
        setTimeout(resetForm, 4000);
      } else {
        showError(response?.error || 'Autofill failed. Please fill manually');
      }
    });
  } catch (error) {
    console.error('Autofill error:', error);
    showError('Autofill failed: ' + error.message);
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
  chrome.storage.local.remove('lastResult');
  elements.resultContainer.style.display = 'none';
  hideAllContainers();
}
