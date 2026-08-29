# Synoquant EMS - Deployment Guide

## Problem Solved ✅

You've made the following changes to support remote deployments:

1. **API Configuration**: Created `src/utils/api.ts` utility to handle dynamic API base URLs
2. **CORS Support**: Added CORS middleware to Express backend for cross-origin requests
3. **Environment Variables**: Added `VITE_API_URL` support for Vercel deployments
4. **All Fetch Calls Updated**: Updated all 7 fetch calls to use the new API utility

## Quick Start - Vercel + Railway

### Backend Deployment (Railway - 5 minutes)

1. Go to **[railway.app](https://railway.app)**
2. Create new project → Deploy from GitHub
3. Select your repository
4. Click deploy
5. Add environment variables:
   ```
   GEMINI_API_KEY = your-gemini-api-key-here
   APP_URL = https://your-railway-app.railway.app
   ```
6. Wait for deployment
7. Copy your backend URL (e.g., `https://synoems-prod.railway.app`)

### Frontend Configuration (Vercel - 3 minutes)

1. Go to **[vercel.com](https://vercel.com)** → Your Project
2. Settings → Environment Variables
3. Add new variable:
   - Name: `VITE_API_URL`
   - Value: `https://your-railway-app.railway.app` (from Step 7 above)
4. Go to Deployments → Redeploy latest commit
5. Wait for build to complete

### Test It! 🎉

Visit: https://synoems.vercel.app/

You should now see live telemetry data!

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Vercel (Frontend)                      │
│                    https://synoems.vercel.app/                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  React + Vite App                                      │  │
│  │  - Fetches from VITE_API_URL env variable             │  │
│  │  - All API calls use /utils/api.ts helper             │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              ↓ (HTTP requests)
┌──────────────────────────────────────────────────────────────┐
│                   Railway (Backend API)                       │
│              https://your-railway-app.railway.app/            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Express.js Server                                     │  │
│  │  - CORS enabled (handles Vercel cross-origin requests)│  │
│  │  - /api/* endpoints                                    │  │
│  │  - Simulator engine & Gemini AI integration            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Local Development

No changes needed! The app uses `http://localhost:3000` by default.

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2 (different window): Frontend auto-serves at http://localhost:3000
# Just open browser to http://localhost:3000
```

---

## Environment Variables Reference

| Variable | Location | Example Value | Notes |
|----------|----------|---|---|
| `GEMINI_API_KEY` | Backend (Railway) | `your-key` | Required for AI diagnostics |
| `APP_URL` | Backend (Railway) | `https://your-railway-app.railway.app` | For self-referential links |
| `VITE_API_URL` | Frontend (Vercel) | `https://your-railway-app.railway.app` | **Critical for Vercel!** |

---

## Troubleshooting

### "No meter readings received yet" on Vercel

**Cause**: Frontend can't reach backend API

**Fix**:
1. Verify `VITE_API_URL` is set in Vercel environment variables
2. Check it matches your Railway backend URL exactly
3. Redeploy Vercel after setting the variable
4. Test backend: `curl https://your-railway-app.railway.app/health`

### CORS Errors in Browser Console

**Cause**: Backend CORS not enabled

**Fix**: Already done! CORS is enabled with `app.use(cors())`

### 404 on API endpoints

**Cause**: Backend not running or URL is wrong

**Fix**:
1. Check Railway deployment status
2. Verify backend URL in Vercel environment
3. Check backend logs in Railway dashboard

### Fetch errors even with correct URL

**Cause**: Possible build cache issue

**Fix**:
1. Vercel: Settings → Git → Redeploy (skip cache)
2. Or trigger new deployment with `git commit --allow-empty && git push`

---

## API Helper Utility

The new `src/utils/api.ts` provides three helper functions:

```typescript
// Get full API URL with base
apiUrl('/api/meters/discover') 
// Returns: 'https://your-backend.railway.app/api/meters/discover' (on Vercel)
// Returns: '/api/meters/discover' (on localhost)

// Fetch with automatic URL handling
const res = await apiFetch('/api/meters/discover');

// Fetch + JSON parsing with error handling
const data = await apiJson('/api/meters/discover');
```

All 7 API calls in the app use these utilities.

---

## Files Modified

- ✅ `src/utils/api.ts` - NEW API utility helper
- ✅ `src/App.tsx` - Updated all 7 fetch calls
- ✅ `src/components/HistorianView.tsx` - Updated fetch call
- ✅ `src/components/AiCopilotView.tsx` - Updated fetch call
- ✅ `server.ts` - Added CORS middleware
- ✅ `package.json` - Added `cors` & `@types/cors`
- ✅ `.env.example` - Documented `VITE_API_URL`
- ✅ `VERCEL_DEPLOYMENT.md` - Detailed deployment guide

---

## Next Steps

1. **Deploy Backend** → Railway (5 min)
2. **Configure Frontend** → Vercel (3 min)
3. **Test** → Visit your app
4. **Share** → It's live! 🚀

---

## Alternative Backend Hosting

If you prefer not to use Railway:

- **Render** - [render.com](https://render.com) - Similar to Railway
- **Heroku** - [heroku.com](https://heroku.com) - More established but paid
- **AWS Lambda** - Serverless but requires more setup
- **DigitalOcean** - Simple VPS option
- **Self-hosted** - Your own server/VPS

The configuration stays the same: just point `VITE_API_URL` to wherever your backend is hosted.
