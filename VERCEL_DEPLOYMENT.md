# Vercel Deployment Guide

## Overview
This application consists of two parts:
- **Frontend**: React + Vite (deployed to Vercel)
- **Backend**: Express.js + Node.js (needs separate deployment)

## Issue: "No meter readings received yet"
This occurs when the frontend cannot reach the backend API. The frontend needs to know where your API is hosted.

## Solution

### Step 1: Deploy Backend Separately
Choose one of these platforms:

#### Option A: Railway (Recommended - Easiest)
1. Go to [railway.app](https://railway.app)
2. Create new project → Deploy from GitHub
3. Select your repository
4. Railway auto-detects Node.js and runs `npm install` + `npm run dev`
5. Add environment variables:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `APP_URL`: Your Railway app URL (e.g., `https://your-app.railway.app`)
6. Get your backend URL from Railway dashboard

#### Option B: Render
1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub, select repo
4. Build command: `npm install`
5. Start command: `npm run dev`
6. Add same environment variables
7. Get your backend URL from Render

#### Option C: Heroku (Legacy)
1. Deploy using Heroku CLI or GitHub integration
2. Add environment variables via Heroku dashboard

### Step 2: Configure Vercel Frontend

Add environment variable to Vercel:

1. Go to your Vercel project settings
2. Environment Variables
3. Add new variable:
   - Name: `VITE_API_URL`
   - Value: `https://your-backend-url.railway.app` (or whatever your backend URL is)
4. Redeploy (git push or redeploy from Vercel dashboard)

### Step 3: Test
- Visit your Vercel app (https://synoems.vercel.app/)
- You should now see live telemetry data instead of the polling message

## Local Development
For local dev, the app automatically uses `http://localhost:3000` as default, so no setup needed.

## Environment Variables Reference

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://your-backend.railway.app` | Frontend: Where to find the API |
| `GEMINI_API_KEY` | `your-key` | Backend: For AI diagnostics |
| `APP_URL` | `https://your-backend.railway.app` | Backend: For self-referential links |

## Troubleshooting

**Still seeing "No meter readings received yet"?**
1. Check Vercel logs: `vercel logs`
2. Check browser console (F12) for CORS or fetch errors
3. Verify `VITE_API_URL` is set in Vercel environment variables
4. Test backend manually: `curl https://your-backend.railway.app/api/meters/discover`
5. Check backend server is actually running on Railway/Render dashboard

**Backend returning 404?**
- Ensure backend is deployed and running
- Check the backend URL is correct
- Verify Express server is listening on `0.0.0.0:3000`

**CORS errors?**
- Check if backend has CORS middleware enabled
- Add `cors` package if needed: `npm install cors`
- Enable in server.ts: `app.use(cors())`
