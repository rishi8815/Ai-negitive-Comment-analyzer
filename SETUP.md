# Setup Guide - AI Instagram Comment Analyzer

## Step-by-Step Setup Instructions

### 1. Get Your API Keys

#### Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy the generated API key
5. Paste it in `.env.local` file as `GEMINI_API_KEY=your_key_here`

#### Apify API Key
1. Go to [Apify Console](https://console.apify.com/)
2. Sign up or log in to your account
3. Navigate to "Settings" → "Integrations"
4. Find your API token or create a new one
5. Copy the API token
6. Paste it in `.env.local` file as `APIFY_API_KEY=your_key_here`

### 2. Set Up Apify Instagram Scraper

The application uses Apify's Instagram Comment Scraper actor. Here are the available options:

**Option 1: Use Official Instagram Scraper (Recommended)**
- Actor ID: `apify/instagram-scraper`
- This is a more reliable and maintained actor
- Better for scraping Instagram content including comments

**Option 2: Use Instagram Comment Scraper**
- Actor ID: `apify/instagram-comment-scraper`
- Specifically designed for comments
- May have different input requirements

**Option 3: Use Third-Party Scrapers**
- Search for "instagram comment" in [Apify Store](https://apify.com/store)
- Choose highly-rated actors with recent updates

### 3. Configure Environment Variables

Create or update the `.env.local` file in your project root:

```env
# Gemini AI Configuration
GEMINI_API_KEY=AIzaSy... (your actual key from Google AI Studio)

# Apify API Configuration  
APIFY_API_KEY=apify_api_... (your actual token from Apify Console)
```

**Important Notes:**
- Never commit `.env.local` to version control
- Keep your API keys secret
- The `.gitignore` file already excludes `.env.local`

### 4. Install Dependencies

Using npm:
```bash
npm install
```

Using bun (faster):
```bash
bun install
```

### 5. Run the Development Server

Using npm:
```bash
npm run dev
```

Using bun:
```bash
bun dev
```

The application will be available at `http://localhost:3000`

## Troubleshooting Common Issues

### Issue: "Apify API error: Not Found"

**Possible Causes:**
1. The actor ID is incorrect
2. Your Apify API token doesn't have permission
3. The actor has been renamed or removed

**Solutions:**

1. **Check your Apify account:**
   - Log in to [Apify Console](https://console.apify.com/)
   - Go to "Actors" in the left sidebar
   - Search for "instagram" to find available Instagram scrapers
   - Note the correct actor ID (format: `username/actor-name`)

2. **Update the actor ID in `lib/apify.ts`:**
   ```typescript
   const actorId = 'your-verified-actor-id';
   ```

3. **Verify your API token:**
   - Make sure you copied the entire token from Apify Console
   - Check that there are no extra spaces or characters
   - Try generating a new token if the issue persists

4. **Alternative: Use a different Instagram scraper:**
   - Browse the [Apify Store](https://apify.com/store)
   - Find "Instagram Scraper" or similar actors
   - Check the actor's input/output format
   - Update `lib/apify.ts` to match the new actor's requirements

### Issue: "GEMINI_API_KEY is not configured"

**Solution:**
1. Make sure `.env.local` exists in the project root
2. Verify the file contains: `GEMINI_API_KEY=your_actual_key`
3. Restart the development server after adding the key

### Issue: CSS Parsing Error

**Solution:**
The Google Fonts import must come before Tailwind CSS import. This has been fixed in the latest version. If you still see this error:

1. Open `app/globals.css`
2. Make sure the first two lines are:
   ```css
   @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
   @import "tailwindcss";
   ```

### Issue: No Comments Found

**Possible Causes:**
1. The Instagram post has no comments
2. The post URL is incorrect
3. Instagram rate limiting
4. The scraper needs authentication

**Solutions:**
1. Try a different Instagram post with many comments
2. Verify the URL format: `https://www.instagram.com/p/POST_ID/` or `https://www.instagram.com/reel/REEL_ID/`
3. Wait a few minutes if you've made many requests
4. Check Apify's documentation for the specific actor you're using

## Testing the System

### 1. Quick Test with Sample Post
1. Find a public Instagram post with many comments
2. Copy the full URL (e.g., `https://www.instagram.com/p/ABC123/`)
3. Enter it in the application
4. Set comment limit to 20-50 for quick testing
5. Click "Start Analysis"

### 2. Verify Gemini AI Integration
The Gemini API will:
- Analyze comments in batches of 10
- Classify each as negative, positive, or neutral
- Provide reasoning for negative comments
- Categorize negative comments (hate speech, harassment, etc.)
- Assign severity levels (mild, moderate, severe)

### 3. Check Output Files
After analysis completes:
- Check the `output/` directory in your project
- Find the JSON file: `negative-comments-TIMESTAMP.json`
- Verify it contains the analysis results

## API Costs and Limits

### Gemini API
- Free tier: 60 requests per minute
- Each batch of 10 comments = 1 request
- 100 comments ≈ 10 requests
- Monitor usage at [Google AI Studio](https://makersuite.google.com/)

### Apify
- Free tier: $5 credit per month
- Instagram scraping varies by post size
- Typically 0.01-0.10 credits per run
- Monitor usage at [Apify Console](https://console.apify.com/)

## Next Steps

1. ✅ Configure your API keys in `.env.local`
2. ✅ Install dependencies
3. ✅ Start the dev server
4. ✅ Test with a sample Instagram post
5. ✅ Review the analysis results
6. 🎨 Customize the UI if needed
7. 📊 Adjust analysis parameters (batch size, categories, etc.)

## Need Help?

- Check the main [README.md](./README.md) for detailed documentation
- Review Apify actor documentation for input/output format
- Check Gemini API documentation for model capabilities
- Look at the source code comments for implementation details

---

**Happy Analyzing! 🚀**
