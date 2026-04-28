// Content Script - Facebook Marketplace AI Lister

// 防止重复注入时执行多次
if (window.__aiListerInjected) {
  // 已注入，只更新消息监听器
} else {
  window.__aiListerInjected = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autofill') {
      autofillForm(request.data, request.images || [])
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
    }
  });

  console.log('🚀 AI Lister content script ready');
}

// ============ 主填充流程 ============
async function autofillForm(data, images) {
  const banner = showBanner('⏳ Filling form... Please do not touch the page.');
  await sleep(500);

  // 0. 上传图片
  if (images.length > 0) {
    await uploadImages(images);
    await sleep(1000);
  }

  // 1. Title
  const titleEl = findInputByLabel('Title');
  if (titleEl) {
    await fillReactInput(titleEl, data.title);
    await sleep(300);
  }

  // 2. Price
  const priceEl = findInputByLabel('Price');
  if (priceEl) {
    await fillReactInput(priceEl, String(data.priceRange.min));
    await sleep(300);
  }

  // 3. Category
  if (data.category) {
    await selectDropdown('Category', data.category);
    await sleep(600);
  }

  // 4. Condition
  if (data.condition) {
    await selectDropdown('Condition', data.condition);
    await sleep(600);
  }

  // 5. More details（Description + Brand）
  await fillMoreDetails(data);

  banner.done('✅ Form filled! Please review and submit.');

  if (!titleEl && !priceEl) {
    throw new Error('No form fields found. Please refresh the Facebook page and retry.');
  }
}

// ============ 图片上传 ============
async function uploadImages(base64Images) {
  const allInputs = Array.from(document.querySelectorAll('input[type="file"]'));

  // 找第一个真正可见的 file input
  const fileInput = allInputs.find(el => {
    let parent = el.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      parent = parent.parentElement;
    }
    return true;
  }) || allInputs[0];

  if (!fileInput) {
    console.warn('⚠️ File input not found');
    return;
  }

  try {
    const files = await Promise.all(base64Images.map(async (base64, i) => {
      const res = await fetch(base64);
      const blob = await res.blob();
      const ext = blob.type.split('/')[1] || 'jpg';
      return new File([blob], `photo_${i + 1}.${ext}`, { type: blob.type });
    }));

    const dt = new DataTransfer();
    files.forEach(f => dt.items.add(f));
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log(`✅ Uploaded ${files.length} photo(s)`);
  } catch (e) {
    console.warn('⚠️ Image upload failed:', e.message);
  }
}

// ============ 通过 label 找 input ============
function findInputByLabel(labelText) {
  const label = Array.from(document.querySelectorAll('label'))
    .find(l => l.textContent.trim() === labelText);
  if (!label) return null;

  if (label.htmlFor) {
    const el = document.getElementById(label.htmlFor);
    if (el) return el;
  }

  const inner = label.querySelector('input, textarea');
  if (inner) return inner;

  let sibling = label.nextElementSibling;
  while (sibling) {
    const el = sibling.matches('input, textarea')
      ? sibling
      : sibling.querySelector('input, textarea');
    if (el) return el;
    sibling = sibling.nextElementSibling;
  }

  const parent = label.parentElement;
  if (parent) {
    const inputs = parent.querySelectorAll('input, textarea');
    if (inputs.length > 0) return inputs[0];
  }

  return null;
}

// ============ 下拉选择 ============
async function selectDropdown(labelText, value) {
  const label = Array.from(document.querySelectorAll('label'))
    .find(l => l.textContent.trim().startsWith(labelText));
  if (!label) return;

  // Build candidates by walking up the DOM tree up to 4 levels
  const candidates = [];
  const addIfNew = (el) => { if (el && !candidates.includes(el)) candidates.push(el); };

  addIfNew(label.querySelector('[role="combobox"],[role="button"],button'));
  addIfNew(label.closest('[role="combobox"],[role="button"]'));

  let node = label.parentElement;
  for (let i = 0; i < 4; i++) {
    if (!node) break;
    const found = node.querySelector('[role="combobox"],[role="button"],button,[tabindex="0"]');
    if (found && found !== label) addIfNew(found);
    node = node.parentElement;
  }
  addIfNew(label);

  let opened = false;
  for (const el of candidates) {
    el.click();
    await sleep(900);
    if (getDropdownOptions().length > 0) { opened = true; break; }
  }

  if (!opened) return;

  const matched = await clickMatchingOption(value);
  if (!matched) {
    document.body.click();
    await sleep(200);
  }
}

function getDropdownOptions() {
  // Standard ARIA roles
  const byRole = Array.from(
    document.querySelectorAll('[role="option"],[role="menuitem"],[role="radio"]')
  );
  if (byRole.length > 0) return byRole;

  // Items inside a dialog, listbox, or menu overlay
  const overlay = document.querySelector('[role="dialog"],[role="listbox"],[role="menu"]');
  if (overlay) {
    const items = Array.from(
      overlay.querySelectorAll('[role="option"],[role="menuitem"],[role="radio"],[role="button"],li')
    ).filter(el => el.textContent.trim().length > 0 && el.textContent.trim().length < 80);
    if (items.length > 0) return items;
  }

  return [];
}

async function clickMatchingOption(value) {
  const options = getDropdownOptions();
  const valueLower = value.toLowerCase();

  for (const opt of options) {
    const text = opt.textContent.trim();
    if (!text || text.length > 80) continue;
    const textLower = text.toLowerCase();

    if (
      textLower === valueLower ||
      textLower.includes(valueLower) ||
      valueLower.includes(textLower) ||
      valueLower.split(/[\s\-]+/).some(w => w.length > 2 && textLower.includes(w))
    ) {
      opt.click();
      console.log(`✅ Selected: ${text}`);
      await sleep(300);
      return true;
    }
  }
  return false;
}

// ============ More details（Description + Brand）============
async function fillMoreDetails(data) {
  const descText = Array.isArray(data.description) ? data.description.join('\n') : '';
  const brand = data.brand || null;

  // 先滚动 + 尝试点击 "More details"
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  await sleep(600);

  const moreBtn = Array.from(
    document.querySelectorAll('[role="button"],button,div,span')
  ).find(el => /more detail/i.test(el.textContent.trim()) && el.children.length < 5);

  if (moreBtn) {
    moreBtn.click();
    await sleep(800);
  }

  // 填 Description
  let descEl = null;
  for (let i = 0; i < 6; i++) {
    descEl = document.querySelector('textarea') || findInputByLabel('Description');
    if (descEl) break;
    await sleep(400);
  }
  if (descEl && descText) {
    await fillReactInput(descEl, descText);
    await sleep(300);
  }

  // 填 Brand
  if (brand) {
    const brandEl = findInputByLabel('Brand') || findInputByLabel('brand');
    if (brandEl) {
      await fillReactInput(brandEl, brand);
      console.log(`✅ Filled Brand: ${brand}`);
    }
  }
}

// ============ React 兼容填充 ============
function fillReactInput(el, value) {
  return new Promise((resolve, reject) => {
    if (!el) { reject(new Error('Element is null')); return; }
    try {
      const proto = el.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      nativeSetter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
      console.log(`✅ Filled: ${value.substring(0, 40)}`);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

// ============ Banner 提示 ============
function showBanner(message) {
  const existing = document.getElementById('__ai_lister_banner__');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = '__ai_lister_banner__';
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 999999;
    background: #667eea; color: white;
    padding: 14px 20px; text-align: center;
    font-size: 15px; font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: 0 2px 12px rgba(0,0,0,0.2);
    pointer-events: none;
  `;
  banner.textContent = message;
  document.body.appendChild(banner);

  return {
    done(msg) {
      banner.style.background = '#10b981';
      banner.textContent = msg;
      setTimeout(() => banner.remove(), 3000);
    }
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
