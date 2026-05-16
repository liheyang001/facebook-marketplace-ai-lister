# 🤖 Facebook Marketplace AI Lister

A Chrome extension that uses Google Gemini Vision AI to instantly generate and auto-fill Facebook Marketplace listings from product photos.

**Upload a photo → Get AI-generated title, price, description & category → Auto-fill the form in one click.**

---

## ✨ Features

- 📸 **Multi-image analysis** — Upload up to 5 photos for better accuracy
- 🏷️ **Smart title generation** — Concise, appealing titles tailored to your market
- 💰 **Price suggestions** — Realistic price ranges based on your region
- 📝 **Auto description** — Highlights condition and key features
- 🏪 **Category detection** — Automatically picks the right Facebook category
- ✅ **One-click autofill** — Fills the entire listing form instantly
- 🤝 **Meetup preferences** — Sets public meetup, door pick-up, drop-off options
- 🙈 **Hide from friends** — Configurable per your preference
- 🌍 **Multi-language** — English, Chinese, Spanish, French, Japanese, Korean
- 🔑 **No API key required** — Works out of the box with a shared key

---

## 🚀 Getting Started

### Install (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the project folder
5. The extension icon appears in your toolbar — you're ready!

### First-time Setup

1. Click the extension icon
2. Open **⚙️ Settings**
3. Enter your **city or region** (e.g. `Sydney`, `New York`, `London`)
4. Optionally set your **meetup preferences** and **hide from friends**
5. Click **Save Settings**

### Using the Extension

1. Go to [Facebook Marketplace → Create Listing](https://www.facebook.com/marketplace/create/)
2. Click the extension icon and select your product photos
3. Click **🔍 Analyze Product** and wait 3–5 seconds
4. Review the AI-generated listing details
5. Click **✅ Autofill Form** — done!

---

## 🔑 API Key

The extension works out of the box using a shared Gemini API key (limited to 20 analyses/day per IP).

If you hit the limit, get your own **free** key from [Google AI Studio](https://aistudio.google.com/apikey) and paste it into Settings — no billing required.

---

## 🌐 How It Works

```
User uploads photo(s)
        ↓
Extension sends image to Cloudflare Worker proxy
        ↓
Worker calls Google Gemini Vision API
        ↓
AI returns: title, price range, description, category, condition, brand
        ↓
User clicks Autofill
        ↓
Content script fills the Facebook Marketplace form
```

---

## ⚙️ Settings

| Setting | Description |
|---|---|
| Gemini API Key | Your own key (optional, overrides shared key) |
| Region | Your city/region for accurate pricing |
| Language | Output language for title & description |
| Public meetup | Auto-check "Public meetup" on listings |
| Door pick-up | Auto-check "Door pick-up" |
| Door drop-off | Auto-check "Door drop-off" |
| Hide from friends | Auto-toggle "Hide from friends" |

---

## 📋 Requirements

- Chrome or Edge 110+
- Internet connection
- A Facebook account with Marketplace access

---

## 🐛 Troubleshooting

**Autofill doesn't work**
→ Make sure you're on `facebook.com/marketplace/create/` and refresh the page before trying again.

**Analysis fails / API error**
→ Check your internet connection. If using the shared key, you may have hit the daily limit — add your own free key in Settings.

**Fields not filled**
→ Facebook occasionally changes their page structure. Refresh the page and retry. If the issue persists, open a GitHub issue.

---

## 🔒 Privacy

- Photos are sent to Google Gemini API for analysis and are not stored
- Your region and preferences are saved locally in your browser only
- No personal data is collected or shared by this extension
- See [Privacy Policy](privacy-policy.html) for details

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

*Happy selling!* 🎉
