// Content Script - Facebook Marketplace AI Lister

// 防止重复注入时执行多次
if (window.__aiListerInjected) {
  // 已注入，只更新消息监听器
} else {
  window.__aiListerInjected = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autofill') {
      autofillForm(request.data, request.images || [], request.preferences || {})
        .then((result) => sendResponse({
          success: true,
          filled: result.filled,
          skipped: result.skipped,
          priceRange: request.data.priceRange
        }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
    }
  });

  console.log('🚀 AI Lister content script ready');
}

// ============ 主填充流程 ============
async function autofillForm(data, images, preferences) {
  const banner = showBanner('⏳ Filling form... Please do not touch the page.');
  const filled = [];
  const skipped = [];
  await sleep(500);

  // 0. Upload images
  if (images.length > 0) {
    await uploadImages(images);
    await sleep(1000);
  }

  // 1. Title
  const titleEl = findInputByLabel('Title');
  if (titleEl) { await fillReactInput(titleEl, data.title); filled.push('Title'); await sleep(300); }
  else { skipped.push('Title'); }

  // 2. Price
  const priceEl = findInputByLabel('Price');
  if (priceEl) { await fillReactInput(priceEl, String(data.priceRange.min)); filled.push('Price'); await sleep(300); }
  else { skipped.push('Price'); }

  // 3. Category
  if (data.category) {
    let ok = await selectDropdown('Category', data.category, 'Miscellaneous');
    if (!ok) {
      // Retry: in case of timing issues or dropdown closed without selecting
      await sleep(600);
      ok = await selectDropdown('Category', 'Miscellaneous');
    }
    if (ok) filled.push('Category'); else skipped.push('Category');
    // Wait for Condition field to appear (Facebook renders it after category)
    await sleep(1500);
  }

  // 4. Condition (may only appear after category is set)
  if (data.condition) {
    const ok = await selectDropdown('Condition', data.condition);
    if (ok) filled.push('Condition'); else skipped.push('Condition');
    await sleep(800);
  }

  // 5. More details (Description + Brand)
  const details = await fillMoreDetails(data);
  filled.push(...details.filled);
  skipped.push(...details.skipped);

  // 6. Preferences (Meetup + Hide from friends)
  await fillPreferences(preferences, filled, skipped);

  if (filled.length === 0) {
    throw new Error('No form fields found. Please refresh the Facebook page and retry.');
  }

  const priceNote = data.priceRange
    ? ` · Price: ${data.priceRange.min} (range ${data.priceRange.min}–${data.priceRange.max})`
    : '';
  banner.done(`✅ Filled: ${filled.join(', ')}${priceNote}`);

  return { filled, skipped };
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
async function selectDropdown(labelText, value, fallback = null) {
  // Primary: find <label> element
  let labelEl = Array.from(document.querySelectorAll('label'))
    .find(l => l.textContent.trim().startsWith(labelText));

  // Fallback: find any span/div whose direct text matches exactly (Facebook uses these)
  if (!labelEl) {
    labelEl = Array.from(document.querySelectorAll('span,div'))
      .find(el => el.children.length <= 1 && el.textContent.trim() === labelText);
  }

  if (!labelEl) return false;

  const labelRect = labelEl.getBoundingClientRect();
  const skipText = /^(cancel|discard|close|back|leave|exit|delete|remove|next|publish|post|save|done|submit)$/i;

  const isSafe = (el) => {
    if (!el) return false;
    if (skipText.test(el.textContent.trim())) return false;
    // Must be within 400px vertically of the label
    const rect = el.getBoundingClientRect();
    if (Math.abs(rect.top - labelRect.top) > 400) return false;
    return true;
  };

  const seen = new Set();
  const candidates = [];
  const add = (el) => {
    if (!el || seen.has(el) || !isSafe(el)) return;
    seen.add(el);
    candidates.push(el);
  };

  // htmlFor-linked control
  if (labelEl.htmlFor) add(document.getElementById(labelEl.htmlFor));

  // Walk up the DOM looking for dropdown triggers (increased to 8 levels)
  let node = labelEl.parentElement;
  for (let i = 0; i < 8; i++) {
    if (!node) break;
    add(node.querySelector('[aria-haspopup],[role="combobox"],[aria-expanded]'));
    add(node.querySelector('[role="button"],button,[tabindex="0"]'));
    node = node.parentElement;
  }
  // Label itself as last resort
  add(labelEl);

  for (const el of candidates) {

    // Snapshot before click so we can find what newly appeared
    const prevOpts = new Set(document.querySelectorAll('[role="option"],[role="menuitem"],[role="radio"]'));
    const prevDialogs = new Set(document.querySelectorAll('[role="dialog"]'));

    el.click();
    await sleep(900);

    // 1. Standard ARIA options that weren't there before
    const newStdOpts = Array.from(document.querySelectorAll('[role="option"],[role="menuitem"],[role="radio"]'))
      .filter(o => !prevOpts.has(o));
    if (newStdOpts.length > 0) {
      return await clickMatchingOption(value, fallback, newStdOpts);
    }

    // 2. Newly appeared dialog — look for any clickable items inside
    const newDialog = Array.from(document.querySelectorAll('[role="dialog"]'))
      .find(d => !prevDialogs.has(d));
    if (newDialog) {
      const dialogOpts = Array.from(
        newDialog.querySelectorAll('[role="option"],[role="menuitem"],[role="button"],[role="gridcell"],li,[tabindex="0"]')
      ).filter(o => o.textContent.trim().length > 0);
      if (dialogOpts.length > 0) {
        return await clickMatchingOption(value, fallback, dialogOpts);
      }
    }
  }

  return false;
}

function getDropdownOptions() {
  // Standard ARIA roles (global — works for most dropdowns)
  const byRole = Array.from(
    document.querySelectorAll('[role="option"],[role="menuitem"],[role="radio"]')
  );
  if (byRole.length > 0) return byRole;

  // Items inside a dialog, listbox, menu, or grid overlay
  const overlay = document.querySelector('[role="dialog"],[role="listbox"],[role="menu"],[role="grid"]');
  if (overlay) {
    const items = Array.from(
      overlay.querySelectorAll('[role="option"],[role="menuitem"],[role="radio"],[role="button"],[role="gridcell"],li')
    ).filter(el => {
      const t = el.textContent.trim();
      return t.length > 0 && t.length < 100;
    });
    if (items.length > 0) return items;
  }

  return [];
}

async function clickMatchingOption(value, fallback = null, opts = null) {
  const options = opts !== null ? opts : getDropdownOptions();
  const valueLower = value.toLowerCase();

  for (const opt of options) {
    const text = opt.textContent.trim();
    if (!text) continue;
    // Match against first 50 chars to avoid subtitle contamination
    const textLower = text.substring(0, 50).toLowerCase();

    if (
      textLower === valueLower ||
      textLower.includes(valueLower) ||
      valueLower.includes(textLower) ||
      valueLower.split(/[\s\-]+/).some(w => w.length > 2 && textLower.includes(w))
    ) {
      opt.click();
      console.log(`✅ Selected: ${text.substring(0, 40)}`);
      await sleep(300);
      return true;
    }
  }

  // Try fallback within the same set of options (dialog still open)
  if (fallback && fallback.toLowerCase() !== valueLower) {
    return clickMatchingOption(fallback, null, opts);
  }

  return false;
}

// ============ More details (Description + Brand) ============
function findDescriptionEl() {
  return (
    document.querySelector('textarea[aria-label*="escription" i]') ||
    document.querySelector('textarea[placeholder*="escription" i]') ||
    document.querySelector('textarea[aria-label*="escribe" i]') ||
    document.querySelector('textarea[placeholder*="escribe" i]') ||
    document.querySelector('[contenteditable="true"][aria-label*="escription" i]') ||
    document.querySelector('[contenteditable="true"][aria-label*="escribe" i]') ||
    findInputByLabel('Description') ||
    findInputByLabel('Item description') ||
    document.querySelector('textarea') ||
    document.querySelector('[contenteditable="true"]')
  );
}

async function fillMoreDetails(data) {
  const filled = [];
  const skipped = [];
  const descText = Array.isArray(data.description) ? data.description.join('\n') : (data.description || '');
  const brand = data.brand || null;

  // Try to find description on the main form first (no click needed)
  let descEl = findDescriptionEl();

  if (!descEl) {
    // Scroll down and try "More details" button
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await sleep(600);

    const moreBtn = Array.from(
      document.querySelectorAll('[role="button"],button,[tabindex="0"]')
    ).find(el => /more\s+details?/i.test(el.textContent.trim()));

    if (moreBtn) {
      moreBtn.click();
      await sleep(800);
    }

    for (let i = 0; i < 4; i++) {
      descEl = findDescriptionEl();
      if (descEl) break;
      await sleep(400);
    }
  }

  if (descEl && descText) {
    await fillReactInput(descEl, descText);
    filled.push('Description');
    await sleep(300);
  } else if (descText) {
    skipped.push('Description');
  }

  if (brand) {
    const brandEl = findInputByLabel('Brand') || findInputByLabel('brand');
    if (brandEl) { await fillReactInput(brandEl, brand); filled.push('Brand'); }
    else { skipped.push('Brand'); }
  }

  return { filled, skipped };
}

// ============ Preferences (Meetup + Hide from friends) ============
async function fillPreferences(prefs, filled, skipped) {
  if (!prefs || Object.keys(prefs).length === 0) return;

  // Scroll to bottom so these elements are in the DOM
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  await sleep(800);

  const setCheckbox = async (labelText, shouldBeChecked) => {
    const allCheckboxes = Array.from(document.querySelectorAll(
      '[role="checkbox"],[role="switch"],input[type="checkbox"]'
    ));
      allCheckboxes.map(e => e.getAttribute('aria-label') || e.parentElement?.textContent?.trim()?.substring(0, 40)));

    const el = allCheckboxes.find(e => {
      const search = labelText.toLowerCase();
      const ariaLabel = (e.getAttribute('aria-label') || '').toLowerCase();
      // Walk up a few levels looking for matching text
      let node = e.parentElement;
      for (let i = 0; i < 4; i++) {
        if (!node) break;
        const text = Array.from(node.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && n.children.length <= 1))
          .map(n => n.textContent.trim().toLowerCase())
          .join(' ');
        if (text.includes(search)) return true;
        node = node.parentElement;
      }
      return ariaLabel.includes(search);
    });

    if (!el) {
      console.warn(`⚠️ Checkbox not found: "${labelText}"`);
      return false;
    }

    // Detect current state — Facebook may use aria-checked on a child or parent
    const getChecked = (e) =>
      e.checked !== undefined && e.tagName === 'INPUT' ? e.checked :
      e.getAttribute('aria-checked') === 'true' ||
      e.querySelector('[aria-checked="true"]') !== null ||
      e.closest('[aria-checked]')?.getAttribute('aria-checked') === 'true';

    const isChecked = getChecked(el);

    if (isChecked !== shouldBeChecked) {
      // Try clicking the element itself; if it's inside a label, click that
      const clickTarget = el.closest('label') || el;
      clickTarget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      clickTarget.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true, cancelable: true }));
      clickTarget.dispatchEvent(new MouseEvent('click',     { bubbles: true, cancelable: true }));
      await sleep(400);
      const afterChecked = getChecked(el);
    }
    return true;
  };

  if (prefs.meetupPublic) {
    const ok = await setCheckbox('Public meetup', true);
    if (ok) filled.push('Public meetup'); else skipped.push('Public meetup');
  }
  if (prefs.meetupPickup) {
    const ok = await setCheckbox('Door pick-up', true);
    if (ok) filled.push('Door pick-up'); else skipped.push('Door pick-up');
  }
  if (prefs.meetupDropoff) {
    const ok = await setCheckbox('Door drop-off', true);
    if (ok) filled.push('Door drop-off'); else skipped.push('Door drop-off');
  }
  if (prefs.hideFromFriends !== undefined) {
    const ok = await setCheckbox('Hide from friends', prefs.hideFromFriends);
    if (ok) filled.push('Hide from friends'); else skipped.push('Hide from friends');
  }
}

// ============ React 兼容填充 ============
function fillReactInput(el, value) {
  return new Promise((resolve, reject) => {
    if (!el) { reject(new Error('Element is null')); return; }
    try {
      el.focus();

      if (el.getAttribute('contenteditable') !== null) {
        // contenteditable div (Facebook sometimes uses these for description)
        el.innerText = value;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        const proto = el.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        nativeSetter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

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
