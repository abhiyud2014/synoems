# 🚀 Synoquant EMS - Vercel Deployment Fix

## Problem Fixed ✅

Your Vercel deployment shows **"No meter readings received yet"** because the frontend can't reach the backend API.

### Why?
- ✅ Frontend deployed on Vercel  
- ❌ Backend still running locally (needs separate deployment)
- ❌ Vercel doesn't know where to find the API

---

## Solution: 3 Simple Steps

### Step 1️⃣: Deploy Backend (5 minutes)

**Choose Railway** (recommended - easiest):

1. Go to [railway.app](https://railway.app) → Login with GitHub
2. Create new project → Select your repository  
3. Railway auto-configures Node.js
4. Set environment variables:
   ```
   GEMINI_API_KEY = your-gemini-api-key-here
   APP_URL = https://your-railway-url.railway.app
   ```
5. Deployment auto-starts → You get a URL like `https://synoems-prod.railway.app`

**Save your backend URL!** ⭐

### Step 2️⃣: Configure Vercel Frontend (3 minutes)

1. Go to [vercel.com](https://vercel.com) → Your Project → Settings
2. Environment Variables → Add new:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-railway-url.railway.app` (from Step 1)
3. Deployments → Redeploy latest
4. Wait ~1 minute for build

### Step 3️⃣: Test It! (1 minute)

Visit: [https://synoems.vercel.app](https://synoems.vercel.app)

You should see **LIVE TELEMETRY** data! 🎉

---

## How It Works Now

### Before (Broken)
```
Browser (Vercel)  →  ❌ Where is the API?  →  🚫 Fails
```

### After (Fixed)
```
Browser (Vercel) → VITE_API_URL env var → Railway Backend → ✅ Success!
```

---

## What Changed in Code

We made the app **API-endpoint-agnostic**:

| File | Change |
|------|--------|
| `src/utils/api.ts` | NEW - API helper that supports custom base URLs |
| `src/main.tsx` | Initialize API URL at app startup |
| `src/App.tsx` | All 7 fetch calls updated to use helper |
| `src/components/` | All fetch calls use new helper |
| `server.ts` | Added CORS middleware (allows Vercel → Railway) |
| `package.json` | Added `cors` package |

---

## Different Ways to Set API URL

Synoquant EMS now checks for API URL in this order:

### 1. Query Parameter (for testing)
```
https://synoems.vercel.app?apiUrl=https://your-backend.railway.app
```

### 2. Environment Variable (best for production)
Set `VITE_API_URL` in Vercel dashboard
```
VITE_API_URL = https://your-backend.railway.app
```

### 3. Meta Tag (alternative)
Add to `index.html` `<head>`:
```html
<meta name="api-url" content="https://your-backend.railway.app" />
```

### 4. Default (localhost development)
```
http://localhost:3000  (auto-detected)
```

---

## Local Development (No Changes)

Everything still works locally:

```bash
npm run dev
```

Opens at `http://localhost:3000` with API on same server.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No meter readings" | Check `VITE_API_URL` is set in Vercel env vars |
| 404 API errors | Verify backend URL is correct |
| CORS errors | Already fixed! CORS enabled in server.ts |
| Build fails | Run `npm run lint` locally to check |
| Still showing white screen | Hard refresh (Ctrl+Shift+R or Cmd+Shift+R) |

---

## Environment Variables Summary

### For Railway Backend
```env
GEMINI_API_KEY = your-gemini-api-key-here
APP_URL = https://your-backend.railway.app
```

### For Vercel Frontend
```env
VITE_API_URL = https://your-backend.railway.app
```

---

## Next: Deploy to Production

Once working locally and on Vercel:

1. **Commit changes**:
   ```bash
   git add .
   git commit -m "Add support for remote API deployments"
   git push
   ```

2. **Vercel auto-deploys** (if connected to GitHub)

3. **Share the URL**: https://synoems.vercel.app

---

## Files Modified

✅ Core files for Vercel support:
- `src/utils/api.ts` (NEW)
- `src/main.tsx` (updated)
- `src/App.tsx` (updated)
- `src/components/AiCopilotView.tsx` (updated)
- `src/components/HistorianView.tsx` (updated)
- `server.ts` (CORS added)
- `package.json` (cors package)
- `.env.example` (documented VITE_API_URL)

📚 Documentation:
- `VERCEL_DEPLOYMENT.md` (detailed guide)
- `DEPLOYMENT_COMPLETE.md` (architecture overview)

---

## Support

If you get stuck:

1. Check Vercel logs: `vercel logs`
2. Check Railway logs: Dashboard → Deployments → View Logs
3. Test API manually: `curl https://your-railway-app.railway.app/health`
4. Browser console (F12): Look for fetch errors

---

**That's it!** 🎉 You now have a fully distributed deployment.
