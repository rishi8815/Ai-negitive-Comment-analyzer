# 🔍 AI Negative Comment Analyzer

An AI-powered tool that scrapes Instagram comments and detects negativity using Google's Gemini AI. It classifies comments by sentiment, severity, and category — giving you a complete moderation dashboard for any public Instagram post or reel.

## ✨ Features

- **Full Comment Scraping** — Scrapes **all** comments (even 1000+) using Instagram's authenticated API with pagination
- **AI Sentiment Analysis** — Powered by Google Gemini to classify comments as negative, positive, or neutral
- **Severity Levels** — Negative comments are graded as mild, moderate, or severe
- **Category Detection** — Identifies hate speech, harassment, spam, offensive language, trolling, cyberbullying
- **Paginated Results** — Browse all comments (50 per page) with search and filtering
- **Export to JSON** — Download the full analysis report
- **Modern Dark UI** — Editorial-style dashboard built with shadcn/ui components

---

## 🚀 Quick Start

### Prerequisites

| Tool | Where to get it |
|------|----------------|
| **Node.js 20+** or **Bun** | [nodejs.org](https://nodejs.org) / [bun.sh](https://bun.sh) |
| **Gemini API Key** | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| **Instagram Account** | Needed to get a session cookie for full scraping |
| **Apify API Key** _(optional)_ | [Apify Console](https://console.apify.com/account/integrations) — only needed as a fallback |

### 1. Clone the repository

```bash
git clone https://github.com/rishi8815/Ai-negitive-Comment-analyzer.git
cd Ai-negitive-Comment-analyzer
```

### 2. Install dependencies

```bash
# Using npm
npm install

# Or using bun (recommended, faster)
bun install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root (or edit the existing one):

```env
# ──────────────────────────────────────────────
# REQUIRED: Gemini API Key
# ──────────────────────────────────────────────
# Get yours at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# ──────────────────────────────────────────────
# REQUIRED: Instagram Session Cookie
# ──────────────────────────────────────────────
# This is needed to scrape ALL comments from a post.
# Without it, only ~15 comments are accessible.
# See the "How to get your Instagram Session ID" section below.
INSTAGRAM_SESSION_ID=your_session_id_here

# ──────────────────────────────────────────────
# OPTIONAL: Apify API Key (fallback scraper)
# ──────────────────────────────────────────────
# Only used if INSTAGRAM_SESSION_ID is not set.
# Limited to ~15 comments per post (unauthenticated).
# Get yours at: https://console.apify.com/account/integrations
APIFY_API_KEY=your_apify_api_key_here
```

### 4. Run the development server

```bash
# Using npm
npm run dev

# Or using bun
bun dev
```

### 5. Open in browser

```
http://localhost:3000
```

---

## 🍪 How to Get Your Instagram Session ID

The `INSTAGRAM_SESSION_ID` is required to scrape all comments from a post. Without it, only ~15 comments from the initial page HTML are accessible.

### Step-by-step:

1. **Open Chrome** and go to [instagram.com](https://www.instagram.com)
2. **Log in** to your Instagram account
3. **Open DevTools**: Press `F12` (or right-click → Inspect)
4. Go to the **Application** tab (you may need to click `>>` to find it)
5. In the left sidebar, expand **Cookies** → click **`https://www.instagram.com`**
6. Find the cookie named **`sessionid`** in the list
7. **Double-click the Value** column to select it, then **copy** it

   > It looks something like: `12345678901%3AaBcDeFgHiJkLmN%3A12`

8. **Paste** the value into your `.env.local` file:
   ```env
   INSTAGRAM_SESSION_ID=12345678901%3AaBcDeFgHiJkLmN%3A12
   ```
9. **Restart the dev server** (`Ctrl+C` then `bun dev` again)

> ⚠️ **Note**: Session cookies expire after some time. If scraping stops working, repeat the steps above to get a fresh cookie.

---

## 📖 Usage

1. **Paste an Instagram URL** — Any public post or reel URL
2. **Set comment limit** — Choose how many comments to analyze (10–1000)
3. **Click "Begin Analysis"** — The app will scrape comments and analyze them
4. **Browse results**:
   - **All Comments tab** — Every scraped comment, 50 per page, with pagination
   - **Negative Only tab** — Filtered view with severity badges, categories, and AI reasoning
   - **Statistics** — Sentiment distribution and severity breakdown
5. **Export** — Download the full report as JSON

---

## 🏗️ Project Structure

```
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts            # POST API — orchestrates scraping + AI analysis
│   ├── AnalysisResults.tsx         # Results display with tabs & pagination
│   ├── page.tsx                    # Main input page
│   ├── layout.tsx                  # Root layout (fonts, dark mode)
│   └── globals.css                 # Global styles + shadcn theme
├── components/
│   └── ui/                         # shadcn/ui components (Button, Card, etc.)
├── lib/
│   ├── apify.ts                    # Comment scraper (GraphQL + Apify fallback)
│   ├── gemini.ts                   # Gemini AI sentiment analysis
│   └── utils.ts                    # Utility functions
├── output/                         # Generated JSON reports (auto-created)
├── .env.local                      # Environment variables (YOU CREATE THIS)
├── package.json
└── README.md
```

---

## ⚙️ How It Works

### Comment Scraping (Two Modes)

| Mode | Trigger | Capabilities |
|------|---------|-------------|
| **Direct GraphQL API** | `INSTAGRAM_SESSION_ID` is set | Paginates through Instagram's internal API — scrapes **all** comments |
| **Apify Actor** (fallback) | No session cookie | Uses CheerioCrawler, only gets ~15 comments from initial HTML |

### AI Analysis Pipeline

1. Comments are sent to **Gemini AI** in batches of 10
2. Each comment is classified as **negative**, **positive**, or **neutral**
3. Negative comments receive:
   - A **severity** rating (mild / moderate / severe)
   - **Categories** (hate speech, harassment, spam, etc.)
   - A **reason** explaining why the AI flagged it

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|---------|
| **Only ~15 comments scraped** | You need to set `INSTAGRAM_SESSION_ID` in `.env.local`. See instructions above. |
| **"Your session cookie may be expired"** | Get a fresh session cookie from Instagram (cookies expire periodically). |
| **"GEMINI_API_KEY is not configured"** | Add your Gemini API key to `.env.local` and restart the dev server. |
| **"No comments found"** | The post may have comments disabled, or Instagram blocked the request. Try again. |
| **Gemini API errors** | Check your API key is valid and you haven't exceeded your quota at [Google AI Studio](https://aistudio.google.com). |
| **Slow analysis** | Large posts (500+ comments) take time. The AI processes in batches with rate limiting. |

---

## 🔐 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key for sentiment analysis |
| `INSTAGRAM_SESSION_ID` | ✅ Recommended | Instagram session cookie for full comment scraping |
| `APIFY_API_KEY` | ❌ Optional | Apify API key (fallback scraper, limited to ~15 comments) |

---

## ⚠️ Important Notes

- **Session cookies are private** — Never share your `INSTAGRAM_SESSION_ID` or commit it to Git
- **Rate limits** — The scraper includes delays between requests to avoid Instagram blocks
- **Privacy** — Use this tool responsibly for content moderation purposes only
- **API costs** — Gemini and Apify have usage tiers. Monitor your dashboards.
- **Cookie expiry** — Instagram session cookies expire. Refresh them when scraping fails.

---

## 📝 Tech Stack

- **Next.js 15** — React framework
- **shadcn/ui** — Component library
- **Tailwind CSS v4** — Styling
- **Google Gemini AI** — Sentiment analysis
- **Instagram GraphQL API** — Comment scraping
- **Apify** — Fallback scraper

---

## � License

This project is for educational and content moderation purposes. Comply with Instagram's Terms of Service.

---

**Built with ❤️ by SHUBHANSHI(https://github.com/shubhanshi1404)**
